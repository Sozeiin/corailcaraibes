import React, { useState, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

// Déclarer les types Capacitor pour éviter les erreurs TS
declare global {
  interface Window {
    Capacitor?: any;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  QrCode, 
  Camera, 
  Package, 
  Check, 
  X,
  Smartphone,
  Scan,
  Upload,
  Download,
  History,
  Plus
} from 'lucide-react';

export function MobileScanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeMode, setActiveMode] = useState<'scan' | 'manual'>('scan');
  const [scanMode, setScanMode] = useState<'stock_entry' | 'preparation' | 'shipping'>('stock_entry');
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [currentScan, setCurrentScan] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Récupérer les articles de stock pour validation
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const startScan = async () => {
    try {
      setIsScanning(true);
      
      // Utiliser directement l'API caméra web pour simplifier
      await startWebCameraScan();
      
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      toast({
        title: 'Erreur de scanner',
        description: error instanceof Error ? error.message : 'Impossible d\'accéder à la caméra',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Fonction pour valider un code-barres détecté
  const validateBarcodeFormat = useCallback((code: string): boolean => {
    if (!code || typeof code !== 'string') return false;
    
    // Filtrer les codes trop courts ou trop longs
    if (code.length < 4 || code.length > 20) return false;
    
    // Vérifier que le code contient au moins des caractères alphanumériques
    const alphanumericRegex = /^[A-Za-z0-9\-_]+$/;
    if (!alphanumericRegex.test(code)) return false;
    
    // Exclure les codes qui semblent être des erreurs de scan
    const invalidPatterns = [
      /^0+$/, // Que des zéros
      /^1+$/, // Que des uns
      /^\d{1,3}$/, // Trop court pour être un vrai code-barres
      /^[A-Z]{1,2}$/, // Trop court
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(code));
  }, []);

  const startWebCameraScan = async () => {
    // Configuration optimisée pour la caméra
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment',
        width: { ideal: 1920, min: 720 },
        height: { ideal: 1080, min: 480 }
      }
    });

    // Créer un élément vidéo optimisé
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // Éviter les problèmes d'autoplay

    // Attendre que la vidéo soit complètement prête
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(() => resolve(null));
      };
    });

    // Interface utilisateur mobile-first
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

    // Zone de scan visuelle responsive
    const scanOverlay = document.createElement('div');
    scanOverlay.style.cssText = `
      position: absolute;
      top: ${isMobile ? '25%' : '30%'};
      left: ${isMobile ? '5%' : '10%'};
      right: ${isMobile ? '5%' : '10%'};
      height: ${isMobile ? '50%' : '40%'};
      border: 3px solid #00ff00;
      border-radius: 8px;
      background: rgba(0,255,0,0.1);
      box-shadow: 
        inset 0 0 20px rgba(0,255,0,0.3),
        0 0 20px rgba(0,255,0,0.5);
    `;

    // Animation de scan
    const scanLine = document.createElement('div');
    scanLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #00ff00, transparent);
      animation: scan-sweep 2s linear infinite;
    `;

    // CSS responsive pour l'animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes scan-sweep {
        0% { transform: translateY(0); opacity: 1; }
        50% { opacity: 1; }
        100% { transform: translateY(${isMobile ? '150px' : '200px'}); opacity: 0; }
      }
      @media (max-width: 640px) {
        .scan-instruction { font-size: 14px !important; }
        .scan-status { font-size: 12px !important; padding: 8px 16px !important; }
        .scan-button { padding: 8px 16px !important; font-size: 14px !important; }
      }
    `;
    document.head.appendChild(style);

    scanOverlay.appendChild(scanLine);

    const instructionText = document.createElement('div');
    
    // Security fix: Replace innerHTML with secure DOM creation
    const mainInstruction = document.createElement('p');
    mainInstruction.className = 'scan-instruction';
    mainInstruction.textContent = '📱 Positionnez le code-barres dans la zone verte';
    mainInstruction.style.cssText = `color: white; margin-bottom: 15px; font-size: ${isMobile ? '14px' : '18px'}; text-align: center; font-weight: 500;`;
    
    const stabilityTip = document.createElement('p');
    stabilityTip.className = 'scan-instruction';
    stabilityTip.textContent = 'Maintenez l\'appareil stable pour une meilleure détection';
    stabilityTip.style.cssText = `color: #00ff00; font-size: ${isMobile ? '12px' : '14px'}; text-align: center; margin-bottom: 20px;`;
    
    instructionText.appendChild(mainInstruction);
    instructionText.appendChild(stabilityTip);

    const statusText = document.createElement('p');
    statusText.textContent = '🔍 Recherche active...';
    statusText.className = 'scan-status';
    statusText.style.cssText = `
      color: #00ff00;
      margin-top: 20px;
      font-size: ${isMobile ? '12px' : '16px'};
      text-align: center;
      font-weight: 500;
      padding: ${isMobile ? '8px 16px' : '10px 20px'};
      background: rgba(0,255,0,0.1);
      border-radius: 20px;
      border: 1px solid rgba(0,255,0,0.3);
    `;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: ${isMobile ? '10px' : '15px'};
      margin-top: ${isMobile ? '20px' : '30px'};
      flex-direction: ${isMobile ? 'column' : 'row'};
      width: ${isMobile ? '90%' : 'auto'};
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Fermer';
    closeButton.className = 'scan-button';
    closeButton.style.cssText = `
      padding: ${isMobile ? '12px 20px' : '12px 24px'};
      background: rgba(255,68,68,0.9);
      color: white;
      border: none;
      border-radius: 25px;
      font-size: ${isMobile ? '14px' : '16px'};
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255,68,68,0.3);
      width: ${isMobile ? '100%' : 'auto'};
    `;

    const flashButton = document.createElement('button');
    flashButton.textContent = '💡 Flash';
    flashButton.className = 'scan-button';
    flashButton.style.cssText = `
      padding: ${isMobile ? '12px 20px' : '12px 24px'};
      background: rgba(255,255,255,0.1);
      color: white;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 25px;
      font-size: ${isMobile ? '14px' : '16px'};
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
      width: ${isMobile ? '100%' : 'auto'};
    `;

    buttonContainer.appendChild(flashButton);
    buttonContainer.appendChild(closeButton);

    videoContainer.appendChild(video);
    videoContainer.appendChild(scanOverlay);
    overlay.appendChild(instructionText);
    overlay.appendChild(videoContainer);
    overlay.appendChild(statusText);
    overlay.appendChild(buttonContainer);
    document.body.appendChild(overlay);

    // Configuration ZXing optimisée
    const codeReader = new BrowserMultiFormatReader();
    
    // Optimiser les hints pour ZXing
    const hints = new Map();
    hints.set('TRY_HARDER', true);
    hints.set('POSSIBLE_FORMATS', [
      'CODE_128',
      'CODE_39',
      'EAN_13',
      'EAN_8',
      'UPC_A',
      'UPC_E',
      'QR_CODE',
      'DATA_MATRIX'
    ]);

    let isScanning = true;
    let scanController: any = null;
    let consecutiveScans: string[] = [];
    let flashEnabled = false;

    // Gestion du flash
    const toggleFlash = async () => {
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        
        if (capabilities.torch) {
          flashEnabled = !flashEnabled;
          await track.applyConstraints({
            advanced: [{ torch: flashEnabled } as any]
          });
          flashButton.style.background = flashEnabled 
            ? 'rgba(255,255,0,0.3)' 
            : 'rgba(255,255,255,0.1)';
        }
      } catch (error) {
        console.log('Flash non supporté:', error);
      }
    };

    flashButton.onclick = toggleFlash;

    // Fonction de nettoyage
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
    };

    closeButton.onclick = cleanup;

    try {
      // Démarrage du scan avec configuration optimisée
      scanController = await codeReader.decodeFromVideoDevice(
        undefined, 
        video, 
        (result, error) => {
          if (result && isScanning) {
            const scannedCode = result.getText().trim();
            
            // Validation du code détecté
            if (validateBarcodeFormat(scannedCode)) {
              // Système de confirmation par scans consécutifs
              consecutiveScans.push(scannedCode);
              
              // Garder seulement les 3 derniers scans
              if (consecutiveScans.length > 3) {
                consecutiveScans.shift();
              }
              
              // Vérifier la cohérence des scans
              const uniqueCodes = [...new Set(consecutiveScans)];
              const mostFrequent = consecutiveScans.reduce((a, b, i, arr) =>
                arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
              );
              
              // Si on a 2 scans identiques sur les 3 derniers, c'est validé
              const confirmationCount = consecutiveScans.filter(code => code === mostFrequent).length;
              
              if (confirmationCount >= 2) {
                statusText.textContent = `✅ Code validé: ${mostFrequent}`;
                statusText.style.color = '#00ff00';
                statusText.style.background = 'rgba(0,255,0,0.2)';
                
                // Feedback visuel de succès
                scanOverlay.style.borderColor = '#00ff00';
                scanOverlay.style.backgroundColor = 'rgba(0,255,0,0.3)';
                
                setTimeout(() => {
                  cleanup();
                  processScannedCode(mostFrequent, 'camera');
                  
                  toast({
                    title: '🎯 Code-barres validé',
                    description: `Code scanné avec succès: ${mostFrequent}`,
                  });
                }, 500);
              } else {
                statusText.textContent = `🔄 Confirmation en cours... (${confirmationCount}/2)`;
                statusText.style.color = '#ffaa00';
              }
            } else {
              statusText.textContent = '⚠️ Code invalide détecté, nouveau scan...';
              statusText.style.color = '#ff8800';
            }
          } else if (error && isScanning) {
            statusText.textContent = '🔍 Recherche active...';
            statusText.style.color = '#00aaff';
          }
        }
      );
      
    } catch (error) {
      console.error('Erreur du scanner ZXing:', error);
      statusText.textContent = '❌ Erreur de scanner - Vérifiez les permissions de caméra';
      statusText.style.color = '#ff4444';
      statusText.style.background = 'rgba(255,68,68,0.2)';
    }
  };

  const processScannedCode = async (code: string, method: 'camera' | 'manual' | 'image') => {
    // Chercher dans le stock si l'article existe
    const stockItem = stockItems.find(item => 
      item.reference === code || 
      item.name.toLowerCase().includes(code.toLowerCase())
    );

    const newItem = {
      id: Date.now(),
      code: code,
      timestamp: new Date().toISOString(),
      method: method,
      status: 'pending',
      stockItem: stockItem || null,
      found: !!stockItem
    };
    
    setScannedItems(prev => [newItem, ...prev]);
    
    toast({
      title: stockItem ? 'Article trouvé' : 'Code scanné',
      description: stockItem 
        ? `${stockItem.name} - Quantité: ${stockItem.quantity}`
        : `Code: ${code} - Vérifiez manuellement`
    });
  };

  const handleManualEntry = () => {
    if (!currentScan.trim()) return;
    processScannedCode(currentScan, 'manual');
    setCurrentScan('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Pour une vraie implémentation, il faudrait utiliser une bibliothèque
    // comme ZXing ou QuaggaJS pour décoder les codes-barres depuis l'image
    const simulatedBarcode = `IMG-${Date.now()}`;
    processScannedCode(simulatedBarcode, 'image');
  };

  const validateItem = async (itemId: number, isValid: boolean) => {
    const item = scannedItems.find(i => i.id === itemId);
    if (!item) return;

    setScannedItems(prev => 
      prev.map(i => 
        i.id === itemId 
          ? { ...i, status: isValid ? 'validated' : 'rejected' }
          : i
      )
    );

    if (isValid && scanMode === 'stock_entry' && item.stockItem) {
      // Mode entrée stock : ajouter au stock
      try {
        const { error } = await supabase
          .from('stock_items')
          .update({ 
            quantity: item.stockItem.quantity + 1,
            last_updated: new Date().toISOString()
          })
          .eq('id', item.stockItem.id);

        if (error) throw error;

        toast({
          title: 'Stock mis à jour',
          description: `${item.stockItem.name} : +1 unité ajoutée au stock`
        });

        queryClient.invalidateQueries({ queryKey: ['stock-items'] });
      } catch (error) {
        console.error('Erreur mise à jour stock:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de mettre à jour le stock',
          variant: 'destructive'
        });
      }
    }
  };

  const clearHistory = () => {
    setScannedItems([]);
    toast({
      title: 'Historique effacé',
      description: 'L\'historique des scans a été vidé'
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-0">
      {/* Header avec mode de scan */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Scanner Mobile</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Scannez les codes-barres et gérez le stock en temps réel
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex flex-col xs:flex-row gap-2">
          <select 
            value={scanMode} 
            onChange={(e) => setScanMode(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm flex-1"
          >
            <option value="stock_entry">Entrée en stock</option>
            <option value="preparation">Préparation commande</option>
            <option value="shipping">Expédition</option>
          </select>
        </div>
      </div>

      {/* Méthodes de scan responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Scanner caméra */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5" />
              Scanner Caméra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Utilisez la caméra pour scanner les codes-barres
            </p>
            <Button 
              onClick={startScan} 
              disabled={isScanning}
              className="w-full text-sm"
              size="sm"
            >
              <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              {isScanning ? 'Scan en cours...' : 'Démarrer le scan'}
            </Button>
          </CardContent>
        </Card>

        {/* Saisie manuelle */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5" />
              Saisie Manuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Saisir le code-barres"
              value={currentScan}
              onChange={(e) => setCurrentScan(e.target.value)}
              className="text-sm"
            />
            <Button 
              onClick={handleManualEntry} 
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Ajouter
            </Button>
          </CardContent>
        </Card>

        {/* Upload image */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
              Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full text-sm"
              size="sm"
            >
              <Scan className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Sélectionner
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Historique des scans */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <History className="h-4 w-4 sm:h-5 sm:w-5" />
              Historique des scans ({scannedItems.length})
            </CardTitle>
            {scannedItems.length > 0 && (
              <Button 
                onClick={clearHistory} 
                variant="outline" 
                size="sm"
                className="text-xs"
              >
                Effacer tout
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {scannedItems.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-sm sm:text-base">Aucun scan enregistré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scannedItems.slice(0, 10).map((item) => (
                <div key={item.id} className="flex flex-col xs:flex-row xs:items-center justify-between gap-2 p-3 border rounded-lg">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs sm:text-sm font-mono bg-gray-100 px-2 py-1 rounded truncate">
                        {item.code}
                      </code>
                      <Badge 
                        variant={item.found ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.found ? 'Trouvé' : 'Inconnu'}
                      </Badge>
                    </div>
                    
                    {item.stockItem && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.stockItem.name} - Stock: {item.stockItem.quantity}
                      </p>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleTimeString('fr-FR')} • {item.method}
                    </p>
                  </div>
                  
                  {item.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button 
                        onClick={() => validateItem(item.id, true)}
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button 
                        onClick={() => validateItem(item.id, false)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {item.status !== 'pending' && (
                    <Badge 
                      variant={item.status === 'validated' ? 'default' : 'destructive'}
                      className="text-xs flex-shrink-0"
                    >
                      {item.status === 'validated' ? 'Validé' : 'Rejeté'}
                    </Badge>
                  )}
                </div>
              ))}
              
              {scannedItems.length > 10 && (
                <div className="text-center pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    +{scannedItems.length - 10} autres scans...
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}