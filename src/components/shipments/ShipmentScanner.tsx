import React, { useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { QrCode, Scan, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { searchGlobalStockItems } from '@/lib/stockUtils';
import { StockItemAutocomplete } from '@/components/stock/StockItemAutocomplete';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { safeRemoveById } from '@/lib/domUtils';

interface ShipmentScannerProps {
  boxId: string;
  onItemScanned: () => void;
}

export function ShipmentScanner({ boxId, onItemScanned }: ShipmentScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleScanSuccess = async (scannedCode: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // Rechercher l'article dans le stock global
      const stockItem = await searchGlobalStockItems(scannedCode);
      
      if (!stockItem) {
        toast({
          title: 'Article non trouvé',
          description: `Aucun article trouvé pour le code: ${scannedCode}`,
          variant: 'destructive'
        });
        return;
      }

      // Vérifier si l'article est dans la même base que l'utilisateur
      if (stockItem.baseId !== user?.baseId) {
        toast({
          title: 'Article non disponible',
          description: 'Cet article n\'appartient pas à votre base.',
          variant: 'destructive'
        });
        return;
      }

      // Vérifier le stock disponible
      if (stockItem.quantity <= 0) {
        toast({
          title: 'Stock insuffisant',
          description: `L'article "${stockItem.name}" n'est pas disponible en stock.`,
          variant: 'destructive'
        });
        return;
      }

      // Vérifier si l'article existe déjà dans ce carton
      const { data: existingItems } = await supabase
        .from('shipment_box_items')
        .select('*')
        .eq('box_id', boxId)
        .eq('stock_item_id', stockItem.id);

      let quantity = 1;
      
      if (existingItems && existingItems.length > 0) {
        // Mettre à jour la quantité
        const currentItem = existingItems[0];
        quantity = currentItem.quantity + 1;
        
        const { error: updateError } = await supabase
          .from('shipment_box_items')
          .update({ quantity })
          .eq('id', currentItem.id);

        if (updateError) throw updateError;
      } else {
        // Créer un nouvel enregistrement
        const { error: insertError } = await supabase
          .from('shipment_box_items')
          .insert({
            box_id: boxId,
            stock_item_id: stockItem.id,
            item_name: stockItem.name,
            item_reference: stockItem.reference,
            quantity: 1,
            scanned_by: user?.id
          });

        if (insertError) throw insertError;
      }

      // Décrémenter le stock source
      const newQuantity = stockItem.quantity - 1;
      const { error: stockError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', stockItem.id);

      if (stockError) throw stockError;

      // Créer un mouvement de stock pour traçabilité
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          sku: stockItem.reference || stockItem.id,
          movement_type: 'outbound_distribution',
          qty: -1,
          notes: `Expédition - Carton scanné`,
          actor: user?.id,
          base_id: user?.baseId
        });

      if (movementError) {
        console.warn('Erreur lors de la création du mouvement de stock:', movementError);
      }

      toast({
        title: 'Article ajouté',
        description: `"${stockItem.name}" ajouté au carton (Qté: ${quantity})`,
      });

      onItemScanned();

    } catch (error: any) {
      console.error('Erreur lors du scan:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'article au carton.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [showSearchMode, setShowSearchMode] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // Récupérer les articles de stock pour l'autocomplete
  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;
  const { data: rawStockItems = [] } = useOfflineData<any>({ 
    table: 'stock_items', 
    baseId, 
    dependencies: [user?.role, user?.baseId] 
  });

  const stockItems = rawStockItems.map((item: any) => ({
    id: item.id,
    name: item.name,
    reference: item.reference || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    location: item.location || ''
  }));

  // Fonction d'amélioration d'image pour codes endommagés
  const enhanceImageForScanning = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const factor = 1.5;
      const intercept = 128 * (1 - factor);
      
      data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept));
      
      if (brightness < 128) {
        data[i] = data[i + 1] = data[i + 2] = 0;
      } else {
        data[i] = data[i + 1] = data[i + 2] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const startScan = useCallback(async () => {
    setIsScanning(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Caméra non supportée');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { min: 720, ideal: 1920, max: 1920 },
          height: { min: 480, ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      });

      const overlay = document.createElement('div');
      overlay.id = 'shipment-scanner-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.95); z-index: 10000; display: flex; flex-direction: column;
        align-items: center; justify-content: center; padding: 20px;
      `;

      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.style.cssText = `
        width: 100%; max-width: 400px; height: 300px; 
        border: 3px solid #22c55e; border-radius: 12px; 
        object-fit: cover; box-shadow: 0 0 30px rgba(255,255,255,0.3);
      `;

      const title = document.createElement('h2');
      title.textContent = 'Scanner pour expédition';
      title.style.cssText = 'color: #22c55e; margin-bottom: 15px; text-align: center; font-size: 20px; font-weight: bold;';

      const status = document.createElement('div');
      status.textContent = 'Placez le code-barres devant la caméra';
      status.style.cssText = 'color: white; margin: 15px 0; text-align: center; font-size: 16px;';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = 'Fermer';
      closeBtn.style.cssText = `
        padding: 12px 30px; background: #ef4444; color: white;
        border: none; border-radius: 8px; font-size: 16px; 
        cursor: pointer; margin-top: 15px;
      `;

      overlay.appendChild(title);
      overlay.appendChild(video);
      overlay.appendChild(status);
      overlay.appendChild(closeBtn);
      document.body.appendChild(overlay);

      const codeReader = new BrowserMultiFormatReader();
      let scanning = true;

      const cleanup = () => {
        scanning = false;
        try {
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.warn('Erreur arrêt stream:', error);
        }
        
        // Nettoyage sécurisé avec timeout et fallback
        setTimeout(() => {
          try {
            safeRemoveById('shipment-scanner-overlay');
          } catch (error) {
            // Fallback direct si safeRemoveById échoue
            const overlay = document.getElementById('shipment-scanner-overlay');
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }
          setIsScanning(false);
        }, 100);
      };

      closeBtn.onclick = cleanup;

      // Scanner optimisé avec tentatives multiples
      const scanLoop = async () => {
        if (!scanning) return;
        
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Tentative 1: Image normale
          try {
            const result = codeReader.decodeFromCanvas(canvas);
            if (result && scanning) {
              const code = result.getText().trim();
              status.textContent = `✅ Code détecté: ${code}`;
              cleanup();
              await handleScanSuccess(code);
              return;
            }
          } catch (normalError) {
            // Tentative 2: Image améliorée pour codes endommagés
            if (ctx) {
              try {
                enhanceImageForScanning(canvas, ctx);
                const enhancedResult = codeReader.decodeFromCanvas(canvas);
                
                if (enhancedResult && scanning) {
                  const code = enhancedResult.getText().trim();
                  status.textContent = `✅ Code détecté (amélioré): ${code}`;
                  cleanup();
                  await handleScanSuccess(code);
                  return;
                }
              } catch (enhancedError) {
                // Continue scanning
              }
            }
          }
        } catch (error) {
          // Continue scanning
        }
        
        if (scanning) {
          setTimeout(scanLoop, 80); // Plus rapide pour meilleure réactivité
        }
      };

      video.addEventListener('loadedmetadata', () => {
        video.play().then(() => scanLoop());
      });

    } catch (error: any) {
      console.error('Erreur scanner:', error);
      setIsScanning(false);
      toast({
        title: 'Erreur Scanner',
        description: 'Impossible d\'accéder à la caméra',
        variant: 'destructive'
      });
    }
  }, [enhanceImageForScanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim());
      setManualCode('');
    }
  };

  const handleStockItemSelect = (item: any) => {
    setShowSearchMode(false);
    setSearchValue('');
    // Utiliser la référence ou le nom comme code de scan
    const code = item.reference || item.name;
    handleScanSuccess(code);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Mode Expédition
        </h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Scannez les articles à ajouter dans ce carton. Le stock sera automatiquement décrémenté.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4">
          <Button 
            onClick={startScan}
            disabled={isScanning || isProcessing}
            className="flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            {isScanning ? 'Scanner actif...' : 'Démarrer le scanner'}
          </Button>

          <div className="space-y-3">
            <div className="text-center text-sm text-muted-foreground">ou</div>
            
            {/* Recherche d'article */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowSearchMode(!showSearchMode)}
                className="flex items-center gap-2"
                disabled={isProcessing}
              >
                <Search className="h-4 w-4" />
                Rechercher article
              </Button>
            </div>

            {showSearchMode && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <StockItemAutocomplete
                  stockItems={stockItems}
                  value={searchValue}
                  onChange={setSearchValue}
                  onSelect={handleStockItemSelect}
                  placeholder="Rechercher par nom ou référence..."
                  className="w-full"
                />
              </div>
            )}
            
            {/* Saisie manuelle */}
            <form onSubmit={handleManualSubmit} className="space-y-2">
              <Input
                placeholder="Code article, référence, ou nom..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                disabled={isProcessing}
              />
              <Button 
                type="submit" 
                variant="outline"
                disabled={isProcessing || !manualCode.trim()}
                className="w-full"
              >
                <Scan className="h-4 w-4 mr-2" />
                Ajouter cet article
              </Button>
            </form>
          </div>
        </div>
      </Card>
      
      {isProcessing && (
        <div className="text-center text-sm text-muted-foreground">
          Traitement en cours...
        </div>
      )}
    </div>
  );
}