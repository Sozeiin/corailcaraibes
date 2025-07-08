import React, { useState, useRef } from 'react';
import Quagga from 'quagga';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// Déclarer les types Capacitor pour éviter les erreurs TS
declare global {
  interface Window {
    Capacitor?: any;
  }
}

export function MobileScanning() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeMode, setActiveMode] = useState<'scan' | 'manual'>('scan');
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
      await startImprovedCameraScan();
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

  const startImprovedCameraScan = async () => {
    // Créer un conteneur pour le scanner amélioré
    const scannerContainer = document.createElement('div');
    scannerContainer.id = 'improved-barcode-scanner';
    scannerContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: black;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding: 20px;
      overflow-y: auto;
    `;

    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = `
      width: 100%;
      max-width: 640px;
      color: white;
      margin-bottom: 20px;
      text-align: center;
    `;

    const titleText = document.createElement('h2');
    titleText.textContent = 'Scanner de Codes-Barres';
    titleText.style.cssText = `
      color: white;
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: bold;
    `;

    const instructionText = document.createElement('p');
    instructionText.textContent = 'Placez le code-barres dans le cadre vert. Tous les codes détectés apparaîtront ci-dessous.';
    instructionText.style.cssText = `
      color: #cccccc;
      margin: 0;
      font-size: 14px;
    `;

    headerDiv.appendChild(titleText);
    headerDiv.appendChild(instructionText);

    const videoContainer = document.createElement('div');
    videoContainer.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 640px;
      height: 400px;
      background: black;
      border: 2px solid #00ff00;
      border-radius: 8px;
      margin-bottom: 20px;
    `;

    const targetOverlay = document.createElement('div');
    targetOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      height: 60%;
      border: 2px solid #00ff00;
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
      animation: pulse 2s infinite;
    `;

    videoContainer.appendChild(targetOverlay);

    const detectedCodesContainer = document.createElement('div');
    detectedCodesContainer.style.cssText = `
      width: 100%;
      max-width: 640px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      max-height: 200px;
      overflow-y: auto;
    `;

    const detectedCodesTitle = document.createElement('h3');
    detectedCodesTitle.textContent = 'Codes détectés (cliquez pour sélectionner) :';
    detectedCodesTitle.style.cssText = `
      color: white;
      margin: 0 0 10px 0;
      font-size: 16px;
      font-weight: bold;
    `;

    const noCodesMessage = document.createElement('p');
    noCodesMessage.textContent = 'Aucun code détecté pour le moment...';
    noCodesMessage.style.cssText = `
      color: #888;
      margin: 0;
      font-style: italic;
      text-align: center;
    `;

    detectedCodesContainer.appendChild(detectedCodesTitle);
    detectedCodesContainer.appendChild(noCodesMessage);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    `;

    const manualInputButton = document.createElement('button');
    manualInputButton.textContent = '✏️ Saisir Manuellement';
    manualInputButton.style.cssText = `
      padding: 12px 20px;
      background: #4444ff;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: bold;
    `;

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ Fermer';
    closeButton.style.cssText = `
      padding: 12px 20px;
      background: #ff4444;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      font-weight: bold;
    `;

    buttonContainer.appendChild(manualInputButton);
    buttonContainer.appendChild(closeButton);

    scannerContainer.appendChild(headerDiv);
    scannerContainer.appendChild(videoContainer);
    scannerContainer.appendChild(detectedCodesContainer);
    scannerContainer.appendChild(buttonContainer);
    document.body.appendChild(scannerContainer);

    let isScanning = true;
    const detectedCodes = new Map(); // Map pour éviter les doublons avec compteur

    // Fonction de nettoyage
    const cleanup = () => {
      isScanning = false;
      try {
        Quagga.stop();
      } catch (e) {
        console.log('Erreur lors de l\'arrêt de Quagga:', e);
      }
      if (scannerContainer.parentNode) {
        document.body.removeChild(scannerContainer);
      }
    };

    // Fonction pour ajouter un code détecté à la liste
    const addDetectedCode = (code: string, format: string) => {
      if (detectedCodes.has(code)) {
        // Incrémenter le compteur
        const existing = detectedCodes.get(code);
        existing.count++;
        existing.element.querySelector('.code-count').textContent = `(${existing.count}x)`;
        return;
      }
      
      detectedCodes.set(code, { count: 1, element: null });
      
      // Supprimer le message "Aucun code"
      if (noCodesMessage.parentNode) {
        noCodesMessage.remove();
      }
      
      const codeElement = document.createElement('div');
      codeElement.style.cssText = `
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #00ff00;
        border-radius: 6px;
        padding: 12px;
        margin: 8px 0;
        color: white;
        cursor: pointer;
        font-family: monospace;
        font-size: 16px;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;
      
      const codeInfo = document.createElement('div');
      const codeText = document.createElement('div');
      codeText.textContent = code;
      codeText.style.fontWeight = 'bold';
      
      const formatText = document.createElement('div');
      formatText.textContent = format.toUpperCase();
      formatText.style.cssText = 'font-size: 12px; color: #aaa;';
      
      codeInfo.appendChild(codeText);
      codeInfo.appendChild(formatText);
      
      const countBadge = document.createElement('span');
      countBadge.className = 'code-count';
      countBadge.textContent = '(1x)';
      countBadge.style.cssText = `
        background: rgba(0, 255, 0, 0.3);
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: bold;
      `;
      
      codeElement.appendChild(codeInfo);
      codeElement.appendChild(countBadge);
      
      // Stocker l'élément dans la map
      detectedCodes.get(code).element = codeElement;
      
      codeElement.onmouseover = () => {
        codeElement.style.background = 'rgba(0, 255, 0, 0.4)';
        codeElement.style.transform = 'scale(1.02)';
      };
      
      codeElement.onmouseout = () => {
        codeElement.style.background = 'rgba(0, 255, 0, 0.2)';
        codeElement.style.transform = 'scale(1)';
      };
      
      codeElement.onclick = () => {
        if (navigator.vibrate) {
          navigator.vibrate(200);
        }
        cleanup();
        processScannedCode(code, 'camera');
        toast({
          title: 'Code sélectionné',
          description: `Code choisi: ${code}`,
        });
      };
      
      detectedCodesContainer.appendChild(codeElement);
    };

    closeButton.onclick = cleanup;

    // Gestionnaire pour saisie manuelle
    manualInputButton.onclick = () => {
      const manualCode = prompt('Entrez le code-barres manuellement (par exemple: 6974202727048):');
      if (manualCode && manualCode.trim()) {
        cleanup();
        processScannedCode(manualCode.trim(), 'manual');
        toast({
          title: 'Code saisi manuellement',
          description: `Code: ${manualCode.trim()}`,
        });
      }
    };

    try {
      // Configuration de Quagga optimisée pour une détection précise
      await new Promise((resolve, reject) => {
        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoContainer,
            constraints: {
              width: 640,
              height: 400,
              facingMode: "environment", // Caméra arrière
              focusMode: "continuous",    // Mise au point continue
              exposureMode: "continuous"  // Exposition automatique
            }
          },
          locator: {
            patchSize: "x-large",  // Zone de détection plus grande
            halfSample: false      // Pas de réduction pour max précision
          },
          numOfWorkers: navigator.hardwareConcurrency || 4, // Adaptatif selon CPU
          frequency: 2,          // Réduit pour éviter spam mais assez rapide
          decoder: {
            readers: [
              "ean_reader",      // EAN-13/8 (codes produits)
              "code_128_reader", // Code 128 (logistique)
              "upc_reader",      // UPC-A/E (produits US)
              "code_39_reader"   // Code 39 (industriel)
            ],
            multiple: false,
            debug: {
              drawBoundingBox: false,
              showFrequency: false,
              drawScanline: false,
              showPattern: false
            }
          },
          locate: true,
          debug: false
        }, (err) => {
          if (err) {
            console.error('Erreur d\'initialisation Quagga:', err);
            reject(err);
            return;
          }
          console.log("Quagga initialisé avec succès");
          resolve(null);
        });
      });

      // Démarrer Quagga
      Quagga.start();

      // Gestionnaire de détection optimisé avec filtrage intelligent
      Quagga.onDetected((result) => {
        if (!isScanning) return;

        const code = result.codeResult.code;
        const format = result.codeResult.format;
        const confidence = result.codeResult.decodedCodes[0]?.confidence || 0;
        
        console.log('Code détecté:', code, 'Format:', format, 'Confiance:', confidence);
        
        // Filtrage intelligent des codes valides
        const isValidCode = 
          code && 
          code.length >= 8 &&                    // Longueur minimale pour EAN-8
          code.length <= 14 &&                   // Longueur maximale pour EAN-13
          /^[0-9]+$/.test(code) &&              // Uniquement des chiffres
          confidence > 80;                       // Confiance élevée
        
        if (isValidCode) {
          addDetectedCode(code, format);
          
          // Vibration pour confirmer la détection
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        }
      });

    } catch (error) {
      console.error('Erreur lors du scan Quagga:', error);
      
      // Fallback vers saisie manuelle
      const fallbackDiv = document.createElement('div');
      fallbackDiv.style.cssText = `
        color: #ff4444;
        padding: 20px;
        text-align: center;
        font-size: 16px;
        background: rgba(255, 68, 68, 0.1);
        border-radius: 8px;
        border: 1px solid #ff4444;
      `;
      fallbackDiv.innerHTML = `
        <strong>Erreur: impossible d'accéder à la caméra</strong><br>
        Utilisez le bouton "Saisir Manuellement" ci-dessous.
      `;
      
      detectedCodesContainer.appendChild(fallbackDiv);
      
      toast({
        title: 'Erreur de scanner',
        description: 'Impossible d\'accéder à la caméra. Utilisez la saisie manuelle.',
        variant: 'destructive'
      });
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

    if (isValid && item.stockItem) {
      // Intégrer au stock - incrémenter la quantité
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
          description: `${item.stockItem.name} : +1 unité ajoutée`
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Scanner Mobile Amélioré</h2>
          <p className="text-muted-foreground">
            Scanner optimisé avec sélection de codes multiples et saisie manuelle
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearHistory}>
            <History className="h-4 w-4 mr-2" />
            Effacer Historique
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Scanner Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanning Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Interface de Scan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode Selection */}
            <div className="flex gap-2">
              <Button
                variant={activeMode === 'scan' ? 'default' : 'outline'}
                onClick={() => setActiveMode('scan')}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Caméra
              </Button>
              <Button
                variant={activeMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setActiveMode('manual')}
                className="flex-1"
              >
                <Scan className="h-4 w-4 mr-2" />
                Manuel
              </Button>
            </div>

            {/* Camera View */}
            {activeMode === 'scan' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">
                  {isScanning ? 'Scan en cours...' : 'Scanner amélioré avec sélection multiple'}
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={startScan}
                    disabled={isScanning}
                    className="w-full"
                    size="lg"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {isScanning ? 'Scan en cours...' : 'Démarrer le Scanner Amélioré'}
                  </Button>
                  
                  <Alert>
                    <Smartphone className="h-4 w-4" />
                    <AlertDescription>
                      Le nouveau scanner vous montre tous les codes détectés et vous permet de choisir le bon.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Manual Entry */}
            {activeMode === 'manual' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Entrez le code-barres (ex: 6974202727048)"
                    value={currentScan}
                    onChange={(e) => setCurrentScan(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualEntry()}
                  />
                  <Button onClick={handleManualEntry}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                    Entrez le code exact de votre article. Exemple : 6974202727048
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {scannedItems.filter(item => item.status === 'validated').length}
                </div>
                <div className="text-sm text-muted-foreground">Validés</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {scannedItems.filter(item => item.status === 'pending').length}
                </div>
                <div className="text-sm text-muted-foreground">En attente</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {scannedItems.filter(item => item.status === 'rejected').length}
                </div>
                <div className="text-sm text-muted-foreground">Rejetés</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scanned Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Articles Scannés ({scannedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {scannedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun article scanné</p>
                  <p className="text-sm">Utilisez le scanner amélioré ou la saisie manuelle</p>
                </div>
              ) : (
                scannedItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-medium">{item.code}</div>
                        {item.stockItem && (
                          <div className="text-sm text-green-600 font-medium">
                            {item.stockItem.name} (Stock: {item.stockItem.quantity})
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleString('fr-FR')} • {item.method}
                          {item.found && ' • Trouvé en stock'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateItem(item.id, true)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => validateItem(item.id, false)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {item.status === 'validated' && (
                          <Badge className="bg-green-100 text-green-800">
                            Validé
                          </Badge>
                        )}
                        
                        {item.status === 'rejected' && (
                          <Badge className="bg-red-100 text-red-800">
                            Rejeté
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Info */}
      <Card>
        <CardHeader>
          <CardTitle>Scanner Amélioré - Nouvelles Fonctionnalités</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Améliorations du Scanner</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <QrCode className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium">Détection Multiple</div>
                    <div className="text-sm text-muted-foreground">Affiche tous les codes détectés avec compteur</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Scan className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-medium">Sélection Interactive</div>
                    <div className="text-sm text-muted-foreground">Cliquez sur le bon code parmi ceux détectés</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Check className="h-8 w-8 text-purple-600" />
                  <div>
                    <div className="font-medium">Validation Améliorée</div>
                    <div className="text-sm text-muted-foreground">Codes numériques uniquement, longueur minimale</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Guide d'Utilisation</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">1. Cliquez "Démarrer le Scanner"</span>
                  <Badge variant="outline">✓</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">2. Placez le code dans le cadre vert</span>
                  <Badge variant="outline">✓</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">3. Choisissez le bon code dans la liste</span>
                  <Badge variant="outline">✓</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">4. Ou utilisez la saisie manuelle</span>
                  <Badge variant="outline">✓</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}