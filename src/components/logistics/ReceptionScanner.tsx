import React, { useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  QrCode, 
  Camera, 
  Plus,
  Package,
  Check,
  X,
  MapPin,
  AlertCircle,
  Download
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { searchGlobalStockItems, createLocalStockCopy } from '@/lib/stockUtils';
import { safeRemoveChild, safeRemoveById } from '@/lib/domUtils';

interface ReceptionOperation {
  id: number;
  code: string;
  timestamp: string;
  quantity: number;
  stockItem: any | null;
  status: 'pending' | 'completed' | 'error';
  targetBaseId: string;
  notes?: string;
  isImported?: boolean;
  sourceBase?: string;
}

export function ReceptionScanner() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [scannedCode, setScannedCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [operations, setOperations] = useState<ReceptionOperation[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [codeToCreate, setCodeToCreate] = useState('');
  const [selectedTargetBase, setSelectedTargetBase] = useState<string>(user?.baseId || '');

  // Récupérer les bases disponibles
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les articles du stock (tous pour recherche)
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const validateBarcodeFormat = useCallback((code: string): boolean => {
    if (!code || typeof code !== 'string') return false;
    const trimmedCode = code.trim();
    if (trimmedCode.length < 3 || trimmedCode.length > 30) return false;
    
    const validCharsRegex = /^[A-Za-z0-9\-_.]+$/;
    if (!validCharsRegex.test(trimmedCode)) return false;
    
    const invalidPatterns = [
      /^0+$/, /^1+$/, /^\d{1,2}$/, /^[A-Z]{1}$/
    ];
    return !invalidPatterns.some(pattern => pattern.test(trimmedCode));
  }, []);

  const startScan = async () => {
    if (!selectedTargetBase) {
      toast({
        title: 'Base requise',
        description: 'Veuillez sélectionner une base de destination',
        variant: 'destructive'
      });
      return;
    }

    setIsScanning(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920, min: 720 },
          height: { ideal: 1080, min: 480 }
        }
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;

      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve(null));
        };
      });

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
      `;

      const videoContainer = document.createElement('div');
      videoContainer.style.cssText = `
        position: relative;
        width: ${isMobile ? '95%' : '90%'};
        max-width: ${isMobile ? '400px' : '600px'};
        aspect-ratio: ${isMobile ? '4/3' : '16/9'};
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(34,197,94,0.3);
      `;

      video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
      `;

      const scanOverlay = document.createElement('div');
      scanOverlay.style.cssText = `
        position: absolute;
        top: ${isMobile ? '25%' : '30%'};
        left: ${isMobile ? '5%' : '10%'};
        right: ${isMobile ? '5%' : '10%'};
        height: ${isMobile ? '50%' : '40%'};
        border: 3px solid #22c55e;
        border-radius: 8px;
        background: rgba(34,197,94,0.1);
        box-shadow: 
          inset 0 0 20px rgba(34,197,94,0.3),
          0 0 20px rgba(34,197,94,0.5);
      `;

      const scanLine = document.createElement('div');
      scanLine.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, #22c55e, transparent);
        animation: scan-sweep 2s linear infinite;
      `;

      const style = document.createElement('style');
      style.textContent = `
        @keyframes scan-sweep {
          0% { transform: translateY(0); opacity: 1; }
          50% { opacity: 1; }
          100% { transform: translateY(${isMobile ? '150px' : '200px'}); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      scanOverlay.appendChild(scanLine);

      const targetBaseName = bases.find(b => b.id === selectedTargetBase)?.name || 'Base sélectionnée';
      const instructionText = document.createElement('div');
      
      // Security fix: Replace innerHTML with secure DOM creation
      const title = document.createElement('p');
      title.textContent = '📦 Scanner pour réceptionner';
      title.style.cssText = `color: white; margin-bottom: 15px; font-size: ${isMobile ? '14px' : '18px'}; text-align: center; font-weight: 500;`;
      
      const baseInfo = document.createElement('p');
      baseInfo.textContent = `Réception pour: ${targetBaseName}`;
      baseInfo.style.cssText = `color: #22c55e; font-size: ${isMobile ? '12px' : '14px'}; text-align: center; margin-bottom: 10px;`;
      
      const instructions = document.createElement('p');
      instructions.textContent = 'Positionnez le code-barres dans la zone verte';
      instructions.style.cssText = `color: #22c55e; font-size: ${isMobile ? '10px' : '12px'}; text-align: center; margin-bottom: 20px;`;
      
      instructionText.appendChild(title);
      instructionText.appendChild(baseInfo);
      instructionText.appendChild(instructions);

      const statusText = document.createElement('p');
      statusText.textContent = '🔍 Recherche active...';
      statusText.style.cssText = `
        color: #22c55e;
        margin-top: 20px;
        font-size: ${isMobile ? '12px' : '16px'};
        text-align: center;
        font-weight: 500;
        padding: ${isMobile ? '8px 16px' : '10px 20px'};
        background: rgba(34,197,94,0.1);
        border-radius: 20px;
        border: 1px solid rgba(34,197,94,0.3);
      `;

      const closeButton = document.createElement('button');
      closeButton.textContent = '✕ Fermer';
      closeButton.style.cssText = `
        padding: ${isMobile ? '12px 20px' : '12px 24px'};
        background: rgba(255,68,68,0.9);
        color: white;
        border: none;
        border-radius: 25px;
        font-size: ${isMobile ? '14px' : '16px'};
        font-weight: 500;
        cursor: pointer;
        margin-top: ${isMobile ? '20px' : '30px'};
        box-shadow: 0 4px 15px rgba(255,68,68,0.3);
      `;

      videoContainer.appendChild(video);
      videoContainer.appendChild(scanOverlay);
      overlay.appendChild(instructionText);
      overlay.appendChild(videoContainer);
      overlay.appendChild(statusText);
      overlay.appendChild(closeButton);
      document.body.appendChild(overlay);

      const codeReader = new BrowserMultiFormatReader();
      let isScanning = true;
      let scanController: any = null;
      let consecutiveScans: string[] = [];

      const cleanup = () => {
        isScanning = false;
        if (scanController) {
          try {
            scanController.stop();
          } catch (e) {
            // Scanner stopped silently
          }
        }
        stream.getTracks().forEach(track => track.stop());
        safeRemoveChild(overlay);
        safeRemoveChild(style);
        setIsScanning(false);
      };

      closeButton.onclick = cleanup;

      try {
        scanController = await codeReader.decodeFromVideoDevice(
          undefined, 
          video, 
          (result, error) => {
            if (result && isScanning) {
              const scannedCode = result.getText().trim();
              
              if (validateBarcodeFormat(scannedCode)) {
                consecutiveScans.push(scannedCode);
                
                if (consecutiveScans.length > 3) {
                  consecutiveScans.shift();
                }
                
                const mostFrequent = consecutiveScans.reduce((a, b, i, arr) =>
                  arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
                );
                
                const confirmationCount = consecutiveScans.filter(code => code === mostFrequent).length;
                
                if (confirmationCount >= 2) {
                  statusText.textContent = `✅ Code validé: ${mostFrequent}`;
                  statusText.style.color = '#22c55e';
                  
                  setTimeout(() => {
                    cleanup();
                    processScannedCode(mostFrequent);
                  }, 500);
                } else {
                  statusText.textContent = `🔄 Confirmation... (${confirmationCount}/2)`;
                }
              }
            }
          }
        );
      } catch (error) {
        console.error('Erreur du scanner:', error);
        statusText.textContent = '❌ Erreur de scanner';
        cleanup();
      }
      
    } catch (error) {
      console.error('Erreur caméra:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'accéder à la caméra',
        variant: 'destructive'
      });
      setIsScanning(false);
    }
  };

  const processScannedCode = async (code: string) => {
    const trimmedCode = code.trim();
    let matchType = '';
    let isImported = false;
    let sourceBase = '';
    
    // Recherche dans les articles existants (toutes bases confondues via la base de données)
    let stockItem = stockItems.find(item => 
      item.reference && item.reference.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (stockItem) {
      matchType = 'Référence exacte';
    }
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.reference && 
        item.reference.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
      if (stockItem) {
        matchType = 'Référence partielle';
      }
    }
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.name.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
      if (stockItem) {
        matchType = 'Nom d\'article';
      }
    }

    // Si pas trouvé dans la recherche locale, essayer la recherche globale
    if (!stockItem) {
      try {
        const globalItem = await searchGlobalStockItems(trimmedCode);
        
        if (globalItem) {
          
          // Pour la réception, on crée directement l'article dans la base de destination
          // avec la quantité de réception
          const copyResult = await createLocalStockCopy(
            globalItem,
            selectedTargetBase,
            1, // Quantité initiale pour la réception
            `Réceptionné - Référence ${globalItem.baseName}`
          );

          if (copyResult.success) {
            // Transformer l'item global en format local pour la réception
            stockItem = {
              id: copyResult.itemId,
              name: globalItem.name,
              reference: globalItem.reference,
              category: globalItem.category,
              quantity: 1,
              min_threshold: globalItem.minThreshold,
              unit: globalItem.unit,
              photo_url: null,
              location: `Réceptionné - Référence ${globalItem.baseName}`,
              base_id: selectedTargetBase,
              last_updated: new Date().toISOString(),
              last_purchase_cost: 0,
              last_purchase_date: new Date().toISOString(),
              last_supplier_id: '',
              unit_price: 0
            };
            
            matchType = `Importé de ${globalItem.baseName}`;
            isImported = true;
            sourceBase = globalItem.baseName;
            
            // Actualiser les données
            queryClient.invalidateQueries({ queryKey: ['stock-items-all'] });
            
            toast({
              title: 'Article importé pour réception',
              description: `${globalItem.name} importé depuis ${globalItem.baseName} pour réception`,
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
        console.error('Erreur lors de la recherche globale pour réception:', error);
      }
    }

    if (!stockItem) {
      // Proposer de créer l'article
      setCodeToCreate(trimmedCode);
      setIsCreateDialogOpen(true);
      return;
    }

    setScannedCode(trimmedCode);
    
    const newOperation: ReceptionOperation = {
      id: Date.now(),
      code: trimmedCode,
      timestamp: new Date().toISOString(),
      quantity: 1,
      stockItem,
      status: 'pending',
      targetBaseId: selectedTargetBase,
      isImported,
      sourceBase
    };
    
    setOperations(prev => [newOperation, ...prev.slice(0, 9)]);
    
    toast({
      title: isImported ? 'Article importé et prêt pour réception' : 'Article trouvé',
      description: `${stockItem.name} (${matchType}) - Prêt pour réception`,
    });
  };

  const handleManualCode = () => {
    if (!scannedCode.trim() || !selectedTargetBase) return;
    processScannedCode(scannedCode);
    setScannedCode('');
  };

  const executeReception = async (operationId: number) => {
    const operation = operations.find(op => op.id === operationId);
    if (!operation || !operation.stockItem) return;

    try {
      // Vérifier si l'article existe déjà dans la base de destination
      const { data: existingItem } = await supabase
        .from('stock_items')
        .select('*')
        .eq('name', operation.stockItem.name)
        .eq('base_id', operation.targetBaseId)
        .maybeSingle();

      if (existingItem) {
        // Mettre à jour la quantité existante
        const { error } = await supabase
          .from('stock_items')
          .update({ 
            quantity: existingItem.quantity + operation.quantity,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Créer un nouvel article dans la base de destination
        const { error } = await supabase
          .from('stock_items')
          .insert({
            name: operation.stockItem.name,
            reference: operation.stockItem.reference,
            category: operation.stockItem.category,
            quantity: operation.quantity,
            min_threshold: operation.stockItem.min_threshold || 1,
            unit: operation.stockItem.unit || 'pièce',
            location: `Réception ${new Date().toLocaleDateString('fr-FR')}`,
            base_id: operation.targetBaseId,
            last_updated: new Date().toISOString()
          });

        if (error) throw error;
      }

      setOperations(prev => 
        prev.map(op => 
          op.id === operationId 
            ? { ...op, status: 'completed' as const }
            : op
        )
      );

      queryClient.invalidateQueries({ queryKey: ['stock-items-all'] });

      const baseName = bases.find(b => b.id === operation.targetBaseId)?.name;
      toast({
        title: 'Réception validée',
        description: `${operation.stockItem.name} ajouté au stock de ${baseName}`,
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
        description: 'Impossible de réceptionner l\'article',
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

  const updateOperationNotes = (operationId: number, notes: string) => {
    setOperations(prev => 
      prev.map(op => 
        op.id === operationId 
          ? { ...op, notes }
          : op
      )
    );
  };

  const createNewStockItem = async (productName: string, productReference: string) => {
    try {
      const { error } = await supabase
        .from('stock_items')
        .insert({
          name: productName,
          reference: productReference || null,
          category: 'Autre',
          quantity: 1,
          min_threshold: 1,
          unit: 'pièce',
          location: `Réception ${new Date().toLocaleDateString('fr-FR')}`,
          base_id: selectedTargetBase,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['stock-items-all'] });

      toast({
        title: 'Article créé',
        description: `${productName} créé et ajouté au stock`,
      });

      setIsCreateDialogOpen(false);
      setCodeToCreate('');

    } catch (error) {
      console.error('Erreur création article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'article',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Sélection de la base de destination */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            Base de réception
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedTargetBase} onValueChange={setSelectedTargetBase}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une base" />
            </SelectTrigger>
            <SelectContent>
              {bases.map((base) => (
                <SelectItem key={base.id} value={base.id}>
                  {base.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Actions de scan */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-700">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Réception Articles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={startScan} 
              disabled={isScanning || !selectedTargetBase}
              className="w-full bg-green-600 hover:bg-green-700 text-sm"
              size="sm"
            >
              <Camera className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Scanner pour réceptionner
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
            <Input
              placeholder="Code-barres ou référence"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button 
            onClick={handleManualCode} 
            disabled={!scannedCode.trim() || !selectedTargetBase}
            className="w-full text-sm"
            size="sm"
          >
            <Package className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
            Valider la réception
          </Button>
        </CardContent>
      </Card>

      {/* Opérations en attente */}
      {operations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Réceptions en cours ({operations.filter(op => op.status === 'pending').length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {operations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="h-3 w-3 text-green-600" />
                        <span className="font-medium text-sm truncate">
                          {operation.stockItem?.name || 'Article inconnu'}
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
                          {operation.status === 'completed' ? 'Réceptionné' : 
                           operation.status === 'error' ? 'Erreur' : 'En attente'}
                        </Badge>
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Code: {operation.code} • Destination: {bases.find(b => b.id === operation.targetBaseId)?.name}
                        {operation.sourceBase && ` • Importé de: ${operation.sourceBase}`}
                      </p>
                    </div>
                  </div>
                  
                  {operation.status === 'pending' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Quantité</Label>
                        <Input
                          type="number"
                          min="1"
                          value={operation.quantity}
                          onChange={(e) => updateOperationQuantity(operation.id, parseInt(e.target.value) || 1)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (optionnel)</Label>
                        <Input
                          placeholder="État, remarques..."
                          value={operation.notes || ''}
                          onChange={(e) => updateOperationNotes(operation.id, e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <Button 
                          onClick={() => executeReception(operation.id)}
                          size="sm"
                          className="h-8 px-3 text-xs flex-1"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Réceptionner
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de création d'article */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Article inconnu
            </DialogTitle>
            <DialogDescription>
              L'article avec le code "{codeToCreate}" n'existe pas. Voulez-vous le créer ?
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createNewStockItem(
                formData.get('productName') as string,
                formData.get('productReference') as string
              );
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="productName">Nom de l'article *</Label>
              <Input
                id="productName"
                name="productName"
                required
                placeholder="Ex: Pièce détachée moteur"
              />
            </div>
            <div>
              <Label htmlFor="productReference">Référence</Label>
              <Input
                id="productReference"
                name="productReference"
                defaultValue={codeToCreate}
                placeholder="Référence du produit"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1">
                Créer et réceptionner
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Annuler
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
