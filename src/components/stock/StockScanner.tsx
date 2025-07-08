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
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreateStockItemFromScanner } from './CreateStockItemFromScanner';

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

  const validateBarcodeFormat = useCallback((code: string): boolean => {
    if (!code || typeof code !== 'string') return false;
    if (code.length < 4 || code.length > 20) return false;
    const alphanumericRegex = /^[A-Za-z0-9\-_]+$/;
    if (!alphanumericRegex.test(code)) return false;
    const invalidPatterns = [
      /^0+$/, /^1+$/, /^\d{1,3}$/, /^[A-Z]{1,2}$/
    ];
    return !invalidPatterns.some(pattern => pattern.test(code));
  }, []);

  const startScan = async (operation: 'add' | 'remove') => {
    setCurrentOperation(operation);
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
        box-shadow: 0 10px 30px rgba(0,255,0,0.3);
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
        border: 3px solid ${operation === 'add' ? '#22c55e' : '#ef4444'};
        border-radius: 8px;
        background: rgba(${operation === 'add' ? '34,197,94' : '239,68,68'},0.1);
        box-shadow: 
          inset 0 0 20px rgba(${operation === 'add' ? '34,197,94' : '239,68,68'},0.3),
          0 0 20px rgba(${operation === 'add' ? '34,197,94' : '239,68,68'},0.5);
      `;

      const scanLine = document.createElement('div');
      scanLine.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, transparent, ${operation === 'add' ? '#22c55e' : '#ef4444'}, transparent);
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

      const instructionText = document.createElement('div');
      instructionText.innerHTML = `
        <p style="color: white; margin-bottom: 15px; font-size: ${isMobile ? '14px' : '18px'}; text-align: center; font-weight: 500;">
          ${operation === 'add' ? '📦 Scan pour AJOUTER au stock' : '📤 Scan pour RETIRER du stock'}
        </p>
        <p style="color: ${operation === 'add' ? '#22c55e' : '#ef4444'}; font-size: ${isMobile ? '12px' : '14px'}; text-align: center; margin-bottom: 20px;">
          Positionnez le code-barres dans la zone colorée
        </p>
      `;

      const statusText = document.createElement('p');
      statusText.textContent = '🔍 Recherche active...';
      statusText.style.cssText = `
        color: ${operation === 'add' ? '#22c55e' : '#ef4444'};
        margin-top: 20px;
        font-size: ${isMobile ? '12px' : '16px'};
        text-align: center;
        font-weight: 500;
        padding: ${isMobile ? '8px 16px' : '10px 20px'};
        background: rgba(${operation === 'add' ? '34,197,94' : '239,68,68'},0.1);
        border-radius: 20px;
        border: 1px solid rgba(${operation === 'add' ? '34,197,94' : '239,68,68'},0.3);
      `;

      const closeButton = document.createElement('button');
      closeButton.innerHTML = '✕ Fermer';
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
            console.log('Arrêt du scanner:', e);
          }
        }
        stream.getTracks().forEach(track => track.stop());
        if (overlay.parentNode) {
          document.body.removeChild(overlay);
        }
        if (style.parentNode) {
          document.head.removeChild(style);
        }
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
                  statusText.style.color = operation === 'add' ? '#22c55e' : '#ef4444';
                  
                  setTimeout(() => {
                    cleanup();
                    processScannedCode(mostFrequent, operation);
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

  const processScannedCode = (code: string, operation: 'add' | 'remove') => {
    const stockItem = stockItems.find(item => 
      item.reference === code || 
      item.name.toLowerCase().includes(code.toLowerCase())
    );

    if (!stockItem) {
      setCodeToCreate(code);
      setIsCreateDialogOpen(true);
      return;
    }

    setScannedCode(code);
    setCurrentOperation(operation);
    
    const newOperation: ScannedOperation = {
      id: Date.now(),
      code,
      timestamp: new Date().toISOString(),
      operation,
      quantity: 1,
      stockItem,
      status: 'pending'
    };
    
    setOperations(prev => [newOperation, ...prev.slice(0, 9)]);
    
    toast({
      title: 'Article scanné',
      description: `${stockItem.name} - Stock actuel: ${stockItem.quantity}`,
    });
  };

  const handleManualCode = () => {
    if (!scannedCode.trim() || !currentOperation) return;
    processScannedCode(scannedCode, currentOperation);
    setScannedCode('');
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

  if (!canManageStock) {
    return null;
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
            <Input
              placeholder="Code-barres ou référence"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              className="text-sm"
            />
            <Button 
              onClick={() => setCurrentOperation('add')}
              variant={currentOperation === 'add' ? 'default' : 'outline'}
              size="sm"
              className="px-3"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button 
              onClick={() => setCurrentOperation('remove')}
              variant={currentOperation === 'remove' ? 'default' : 'outline'}
              size="sm"
              className="px-3"
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
            Valider
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