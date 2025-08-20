import React, { useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  QrCode, 
  Camera, 
  Plus,
  Minus,
  Package,
  Scan,
  Check,
  X,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateStockItemFromScanner } from './CreateStockItemFromScanner';
import { StockItemAutocomplete } from './StockItemAutocomplete';
import { searchGlobalStockItems, createLocalStockCopy, GlobalStockItem } from '@/lib/stockUtils';

interface StockScannerProps {
  stockItems: any[];
}

interface ScannedOperation {
  id: number;
  code: string;
  timestamp: string;
  operation: 'add' | 'remove';
  quantity: number;
  stockItem: any | null;
  status: 'pending' | 'completed' | 'error';
  isImported?: boolean;
  sourceBase?: string;
}

export function StockScanner({ stockItems }: StockScannerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [currentOperation, setCurrentOperation] = useState<'add' | 'remove' | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isScanning, setIsScanning] = useState(false);
  const [operations, setOperations] = useState<ScannedOperation[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [codeToCreate, setCodeToCreate] = useState('');
  
  // Debug logs for dialog state
  console.log('CreateDialog state:', { isCreateDialogOpen, codeToCreate });

  const validateBarcodeFormat = useCallback((code: string): boolean => {
    if (!code || typeof code !== 'string') return false;
    const trimmedCode = code.trim();
    if (trimmedCode.length < 3 || trimmedCode.length > 30) return false;
    
    // Accepter les caractères alphanumériques, tirets, points et underscores
    const validCharsRegex = /^[A-Za-z0-9\-_.]+$/;
    if (!validCharsRegex.test(trimmedCode)) return false;
    
    // Rejeter les codes trop simples
    const invalidPatterns = [
      /^0+$/, /^1+$/, /^\d{1,2}$/, /^[A-Z]{1}$/
    ];
    return !invalidPatterns.some(pattern => pattern.test(trimmedCode));
  }, []);

  const startScan = async (operation: 'add' | 'remove') => {
    console.log('🚀 Démarrage du scan pour opération:', operation);
    setCurrentOperation(operation);
    setIsScanning(true);
    
    try {
      console.log('📷 Demande d\'accès à la caméra...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L\'accès à la caméra n\'est pas supporté par ce navigateur');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      console.log('✅ Caméra accessible, création de l\'interface...');

      // Créer la vidéo
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';

      // Overlay principal
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.9); z-index: 9999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
      `;

      // Container vidéo
      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
        position: relative; width: 90%; max-width: 400px; aspect-ratio: 16/9;
        border-radius: 12px; overflow: hidden; border: 2px solid ${operation === 'add' ? '#22c55e' : '#ef4444'};
      `;

      // Zone de scan
      const scanZone = document.createElement('div');
      scanZone.style.cssText = `
        position: absolute; top: 30%; left: 10%; right: 10%; height: 40%;
        border: 2px solid ${operation === 'add' ? '#22c55e' : '#ef4444'};
        background: rgba(${operation === 'add' ? '34,197,94' : '239,68,68'}, 0.1);
      `;

      // Texte d'instruction
      const instructionText = document.createElement('div');
      instructionText.style.cssText = 'color: white; text-align: center; margin-bottom: 20px; font-size: 18px;';
      instructionText.textContent = operation === 'add' ? 'Scanner pour AJOUTER' : 'Scanner pour RETIRER';

      // Bouton fermer
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Fermer';
      closeButton.style.cssText = `
        padding: 12px 24px; background: #ef4444; color: white; border: none;
        border-radius: 6px; margin-top: 20px; cursor: pointer; font-size: 16px;
      `;

      // Assemblage
      videoContainer.appendChild(video);
      videoContainer.appendChild(scanZone);
      overlay.appendChild(instructionText);
      overlay.appendChild(videoContainer);
      overlay.appendChild(closeButton);
      document.body.appendChild(overlay);

      // Scanner ZXing
      const codeReader = new BrowserMultiFormatReader();
      let scanning = true;

      const cleanup = () => {
        console.log('🧹 Nettoyage du scanner...');
        scanning = false;
        stream.getTracks().forEach(track => track.stop());
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        setIsScanning(false);
      };

      closeButton.onclick = cleanup;

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve);
        };
      });

      console.log('🔍 Démarrage du décodage...');

      // Décodage continu
      codeReader.decodeFromVideoDevice(undefined, video, (result, error) => {
        if (result && scanning) {
          const code = result.getText().trim();
          console.log('📷 Code détecté:', code);
          
          if (validateBarcodeFormat(code)) {
            console.log('✅ Code valide:', code);
            cleanup();
            processScannedCode(code, operation);
          }
        }
        
        if (error && error.name !== 'NotFoundException') {
          console.log('⚠️ Erreur scan:', error.name);
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur scanner:', error);
      setIsScanning(false);
      
      toast({
        title: 'Erreur scanner',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        variant: 'destructive'
      });
    }
  };

  const processScannedCode = async (code: string, operation: 'add' | 'remove') => {
    console.log('🔍 Processing scanned code:', code, 'Operation:', operation);
    const trimmedCode = code.trim();
    let matchType = '';
    let isImported = false;
    let sourceBase = '';
    
    console.log('📦 Available stock items:', stockItems.length);
    
    // 1. Recherche locale d'abord (logique existante)
    let stockItem = stockItems.find(item => 
      item.reference && item.reference.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (stockItem) {
      matchType = 'Référence exacte (local)';
    }
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.reference && 
        item.reference.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
      if (stockItem) {
        matchType = 'Référence partielle (local)';
      }
    }
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.name.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
      if (stockItem) {
        matchType = 'Nom d\'article (local)';
      }
    }

    // 2. Si pas trouvé localement, recherche globale
    if (!stockItem) {
      console.log('Article non trouvé localement, recherche globale...');
      
      try {
        const globalItem = await searchGlobalStockItems(trimmedCode);
        
        if (globalItem && globalItem.baseId !== user?.baseId) {
          console.log('Article trouvé dans une autre base:', globalItem);
          
          // Créer une copie locale automatiquement
          const copyResult = await createLocalStockCopy(
            globalItem,
            user?.baseId || '',
            operation === 'add' ? 1 : 0,
            `Importé de ${globalItem.baseName}`
          );

          if (copyResult.success) {
            // Transformer l'item global en format local
            stockItem = {
              id: copyResult.itemId,
              name: globalItem.name,
              reference: globalItem.reference,
              category: globalItem.category,
              quantity: operation === 'add' ? 1 : 0,
              minThreshold: globalItem.minThreshold,
              unit: globalItem.unit,
              location: `Importé de ${globalItem.baseName}`,
              baseId: user?.baseId,
              lastUpdated: new Date().toISOString()
            };
            
            matchType = `Importé de ${globalItem.baseName}`;
            isImported = true;
            sourceBase = globalItem.baseName;
            
            // Actualiser les données de stock
            queryClient.invalidateQueries({ queryKey: ['stock'] });
            
            toast({
              title: 'Article importé',
              description: `${globalItem.name} importé depuis ${globalItem.baseName} et ajouté à votre stock`,
            });
          } else {
            toast({
              title: 'Erreur d\'importation',
              description: copyResult.error || 'Impossible d\'importer l\'article',
              variant: 'destructive'
            });
            return;
          }
        }
      } catch (error) {
        console.error('Erreur lors de la recherche globale:', error);
        
        // Si erreur de recherche globale, proposer la création
        console.log('❌ Global search error, opening create dialog:', error);
        console.log('Setting codeToCreate to:', trimmedCode);
        setCodeToCreate(trimmedCode);
        setIsCreateDialogOpen(true);
        console.log('CreateDialog should be open now');
        return;
      }
    }

    // 3. Recherche approximative locale si toujours pas trouvé
    if (!stockItem && trimmedCode.length >= 5) {
      const codeBase = trimmedCode.replace(/[-_.]/g, '').toLowerCase();
      stockItem = stockItems.find(item => {
        if (!item.reference) return false;
        const refBase = item.reference.replace(/[-_.]/g, '').toLowerCase();
        return refBase.includes(codeBase) || codeBase.includes(refBase);
      });
      if (stockItem && !isImported) {
        matchType = 'Référence similaire (local)';
      }
    }

    // 4. Si toujours pas trouvé, proposer la création
    if (!stockItem) {
      console.log('❌ No stock item found, opening create dialog');
      console.log('Setting codeToCreate to:', trimmedCode);
      setCodeToCreate(trimmedCode);
      setIsCreateDialogOpen(true);
      console.log('CreateDialog should be open now');
      return;
    }

    console.log('✅ Stock item found:', stockItem.name, 'Match type:', matchType);

    setScannedCode(trimmedCode);
    setCurrentOperation(operation);
    
    const newOperation: ScannedOperation = {
      id: Date.now(),
      code: trimmedCode,
      timestamp: new Date().toISOString(),
      operation,
      quantity: 1,
      stockItem,
      status: 'pending',
      isImported,
      sourceBase
    };
    
    console.log('➕ Adding new operation to list:', newOperation);
    setOperations(prev => {
      const newOps = [newOperation, ...prev.slice(0, 9)];
      console.log('📋 Updated operations list:', newOps.length);
      return newOps;
    });
    
    toast({
      title: isImported ? 'Article importé et trouvé' : 'Article trouvé',
      description: `${stockItem.name} (${matchType}) - Stock: ${stockItem.quantity}`,
    });
  };

  const handleManualCode = () => {
    if (!scannedCode.trim() || !currentOperation) return;
    processScannedCode(scannedCode, currentOperation);
    setScannedCode('');
  };

  const handleItemSelect = (item: any) => {
    if (!currentOperation) return;
    
    const newOperation: ScannedOperation = {
      id: Date.now(),
      code: item.reference || item.name,
      timestamp: new Date().toISOString(),
      operation: currentOperation,
      quantity: 1,
      stockItem: item,
      status: 'pending'
    };
    
    setOperations(prev => [newOperation, ...prev.slice(0, 9)]);
    setScannedCode('');
    
    toast({
      title: 'Article sélectionné',
      description: `${item.name} - Stock: ${item.quantity}`,
    });
  };

  const executeOperation = async (operationId: number) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation) return;

    try {
      const newQuantity = operation.operation === 'add' 
        ? operation.stockItem.quantity + operation.quantity
        : operation.stockItem.quantity - operation.quantity;

      if (newQuantity < 0) {
        toast({
          title: 'Erreur',
          description: 'Quantité insuffisante en stock',
          variant: 'destructive'
        });
        return;
      }

      const { error } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', operation.stockItem.id);

      if (error) throw error;

      setOperations(prev => 
        prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'completed' as const }
            : op
        )
      );

      queryClient.invalidateQueries({ queryKey: ['stock'] });

      toast({
        title: 'Stock mis à jour',
        description: `${operation.stockItem.name}: ${operation.operation === 'add' ? '+' : '-'}${operation.quantity}`,
      });

    } catch (error) {
      console.error('Erreur:', error);
      setOperations(prev => 
        prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'error' as const }
            : op
        )
      );
      
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour le stock',
        variant: 'destructive'
      });
    }
  };

  const updateOperationQuantity = (operationId: number, quantity: number) => {
    if (quantity < 1) return;
    setOperations(prev => 
      prev.map(op => 
        op.id === operationId 
          ? { ...op, quantity }
          : op
      )
    );
  };

  const handleItemCreated = () => {
    // Actualiser les données de stock après création
    queryClient.invalidateQueries({ queryKey: ['stock'] });
    setCodeToCreate('');
    setIsCreateDialogOpen(false);
  };

  const canManageStock = user?.role === 'direction' || user?.role === 'chef_base' || user?.role === 'technicien';

  // Debug logs pour vérifier les permissions
  console.log('StockScanner - User data:', { 
    user: user, 
    role: user?.role, 
    canManageStock: canManageStock 
  });

  if (!canManageStock) {
    console.log('StockScanner - Access denied, user cannot manage stock');
    return (
      <div className="text-center p-4">
        <p className="text-muted-foreground">
          Accès non autorisé. Contactez votre administrateur.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Rôle requis: direction, chef_base ou technicien
        </p>
        {user && (
          <p className="text-xs text-muted-foreground mt-1">
            Votre rôle: {user.role || 'non défini'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Actions de scan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-700">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              Entrée Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => startScan('add')} 
              disabled={isScanning}
              className="w-full bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Scanner pour ajouter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-red-700">
              <Minus className="h-4 w-4 sm:h-5 sm:w-5" />
              Sortie Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => startScan('remove')} 
              disabled={isScanning}
              className="w-full bg-red-600 hover:bg-red-700 text-sm"
              size="sm"
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Scanner pour retirer
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Saisie manuelle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            Saisie Manuelle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <StockItemAutocomplete
              stockItems={stockItems}
              value={scannedCode}
              onChange={setScannedCode}
              onSelect={handleItemSelect}
              placeholder="Rechercher un article ou saisir un code..."
              className="text-sm"
            />
            <Button 
              onClick={() => setCurrentOperation('add')}
              variant={currentOperation === 'add' ? 'default' : 'outline'}
              size="sm"
              className="px-3"
              title="Ajouter au stock"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button 
              onClick={() => setCurrentOperation('remove')}
              variant={currentOperation === 'remove' ? 'default' : 'outline'}
              size="sm"
              className="px-3"
              title="Retirer du stock"
            >
              <Minus className="h-3 w-3" />
            </Button>
          </div>
          <Button 
            onClick={handleManualCode} 
            disabled={!scannedCode.trim() || !currentOperation}
            className="w-full text-sm"
            size="sm"
          >
            <Scan className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Valider la saisie manuelle
          </Button>
        </CardContent>
      </Card>

      {/* Opérations en attente */}
      {operations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Opérations en cours ({operations.filter(op => op.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operations.map((operation) => (
                <div key={operation.id} className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {operation.operation === 'add' ? (
                        <Plus className="h-3 w-3 text-green-600" />
                      ) : (
                        <Minus className="h-3 w-3 text-red-600" />
                      )}
                      <span className="font-medium text-sm truncate">
                        {operation.stockItem.name}
                      </span>
                      {operation.isImported && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          <Download className="h-2 w-2" />
                          Importé
                        </Badge>
                      )}
                      <Badge 
                        variant={operation.status === 'completed' ? 'default' : 
                                operation.status === 'error' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {operation.status === 'completed' ? 'Terminé' : 
                         operation.status === 'error' ? 'Erreur' : 'En attente'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Stock actuel: {operation.stockItem.quantity} • Code: {operation.code}
                      {operation.sourceBase && ` • Importé de: ${operation.sourceBase}`}
                    </p>
                  </div>
                  
                  {operation.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        type="number"
                        min="1"
                        value={operation.quantity}
                        onChange={(e) => updateOperationQuantity(operation.id, parseInt(e.target.value) || 1)}
                        className="w-16 h-8 text-xs"
                      />
                      <Button 
                        onClick={() => executeOperation(operation.id)}
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={() => setOperations(prev => prev.filter(op => op.id !== operation.id))}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création d'article */}
      <CreateStockItemFromScanner
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        scannedCode={codeToCreate}
        onItemCreated={handleItemCreated}
      />
    </div>
  );
}
