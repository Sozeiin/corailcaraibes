import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, Package, Scan, QrCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StockItemAutocomplete } from '@/components/stock/StockItemAutocomplete';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useQueryClient } from '@tanstack/react-query';
import { safeRemoveById, safeRemoveChild } from '@/lib/domUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

export interface InterventionPart {
  id?: string;
  stockItemId?: string;
  componentId?: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  availableQuantity?: number;
  reservationId?: string;
  notes?: string;
}

interface InterventionPartsManagerProps {
  parts: InterventionPart[];
  onPartsChange: (parts: InterventionPart[]) => void;
  disabled?: boolean;
  boatId?: string;
}

export function InterventionPartsManager({ parts, onPartsChange, disabled = false, boatId }: InterventionPartsManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [stockSearchValue, setStockSearchValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    const video = document.getElementById('intervention-scanner-video') as HTMLVideoElement;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
    safeRemoveById('intervention-scanner-canvas');
  }, []);

  // Fetch available stock items
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-for-intervention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('id,name,reference,quantity,unit_price,stock_reservations(quantity)')
        .eq('base_id', user?.baseId)
        .order('name');

      if (error) throw error;
      return (
        data?.map(item => {
          const reserved = (item as any).stock_reservations?.reduce((sum: number, r: any) => sum + r.quantity, 0) || 0;
          return { ...item, quantity: item.quantity - reserved, available_quantity: item.quantity - reserved };
        }) || []
      ).filter(item => item.available_quantity > 0);
    }
  });

  // Fetch boat components if boatId is provided
  const { data: boatComponents = [] } = useQuery({
    queryKey: ['boat-components', boatId],
    queryFn: async () => {
      if (!boatId) return [];
      
      const { data, error } = await supabase
        .from('boat_components')
        .select('*')
        .eq('boat_id', boatId)
        .order('component_name');

      if (error) throw error;
      return data;
    },
    enabled: !!boatId
  });

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

  const enhanceImageForScanning = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Amélioration de contraste pour codes-barres endommagés
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      // Augmenter le contraste
      const factor = 1.5;
      const intercept = 128 * (1 - factor);
      
      data[i] = Math.max(0, Math.min(255, data[i] * factor + intercept));     // R
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] * factor + intercept)); // G
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] * factor + intercept)); // B
      
      // Conversion binaire pour améliorer la lisibilité
      if (brightness < 128) {
        data[i] = data[i + 1] = data[i + 2] = 0; // Noir
      } else {
        data[i] = data[i + 1] = data[i + 2] = 255; // Blanc
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const startInterventionScan = async () => {
    console.log('🚀 SCAN INTERVENTION - Sortie de stock');
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

      // Attendre que le Dialog soit ouvert et que la vidéo soit disponible
      setTimeout(() => {
        const video = document.getElementById('intervention-scanner-video') as HTMLVideoElement;
        if (video) {
          video.srcObject = stream;
          video.play();
          
          // Démarrer le scan une fois la vidéo prête
          video.onloadedmetadata = () => {
            startScanLoop(video, stream);
          };
        }
      }, 100);

    } catch (error) {
      console.error('❌ ERREUR SCANNER INTERVENTION:', error);
      setIsScanning(false);
      toast({
        title: 'Erreur Scanner',
        description: `Impossible d'accéder à la caméra: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const startScanLoop = (video: HTMLVideoElement, stream: MediaStream) => {
    let scanning = true;
    let attemptCount = 0;
    let lastScanTime = 0;
    const scanCooldown = 100;
    const codeReader = new BrowserMultiFormatReader();

    const canvas = document.createElement('canvas');
    canvas.id = 'intervention-scanner-canvas';
    const ctx = canvas.getContext('2d');

    const performScan = () => {
      if (!scanning || !isScanning) return;
      
      const now = Date.now();
      if (now - lastScanTime < scanCooldown) {
        requestAnimationFrame(performScan);
        return;
      }
      lastScanTime = now;
      attemptCount++;

      try {
        if (video.videoWidth === 0 || video.videoHeight === 0) {
          requestAnimationFrame(performScan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Zone de scan focalisée
        const cropX = canvas.width * 0.1;
        const cropY = canvas.height * 0.3;
        const cropWidth = canvas.width * 0.8;
        const cropHeight = canvas.height * 0.4;

        const croppedCanvas = document.createElement('canvas');
        const croppedCtx = croppedCanvas.getContext('2d');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        
        croppedCtx?.drawImage(
          canvas, cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        try {
          const result = codeReader.decodeFromCanvas(croppedCanvas);
          if (scanning && result) {
            const code = result.getText().trim();
            console.log('📷 CODE DETECTE:', code);
            scanning = false;
            handleInterventionScan(code, attemptCount);
            return;
          }
        } catch (normalError) {
          // Tentative avec amélioration d'image
          if (scanning && croppedCtx) {
            try {
              enhanceImageForScanning(croppedCanvas, croppedCtx);
              const enhancedResult = codeReader.decodeFromCanvas(croppedCanvas);
              
              if (scanning && enhancedResult) {
                const code = enhancedResult.getText().trim();
                console.log('📷 CODE DETECTE (amélioré):', code);
                scanning = false;
                handleInterventionScan(code, attemptCount);
                return;
              }
            } catch (enhancedError) {
              // Continuer le scan
            }
          }
        }
        
        if (scanning) {
          requestAnimationFrame(performScan);
        }

      } catch (error) {
        console.error('Erreur scan:', error);
        if (scanning) {
          requestAnimationFrame(performScan);
        }
      }
    };

    requestAnimationFrame(performScan);
  };

  const handleInterventionScan = async (code: string, attemptCount: number) => {
    if (validateBarcodeFormat(code)) {
      console.log(`✅ CODE VALIDE pour intervention en ${attemptCount} tentatives:`, code);
      
      setTimeout(() => {
        setIsScanning(false);
        processInterventionScan(code);
      }, 500);
    }
  };

  const processInterventionScan = async (code: string) => {
    console.log('🔍 Processing intervention scan:', code);
    const trimmedCode = code.trim();
    
    // Recherche de l'article dans le stock
    let stockItem = stockItems.find(item => 
      item.reference && item.reference.toLowerCase() === trimmedCode.toLowerCase()
    );
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.reference && 
        item.reference.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
    }
    
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.name.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
    }

    if (stockItem) {
      // Vérifier si l'article n'est pas déjà dans la liste
      const existingPart = parts.find(part => part.stockItemId === stockItem.id);
      
      if (existingPart) {
        // Augmenter la quantité si possible
        if (existingPart.quantity < (stockItem.available_quantity || 0)) {
          const updatedParts = parts.map(part => 
            part.stockItemId === stockItem.id 
              ? { 
                  ...part, 
                  quantity: part.quantity + 1,
                  totalCost: (part.quantity + 1) * part.unitCost
                }
              : part
          );
          onPartsChange(updatedParts);
          
          toast({
            title: 'Quantité augmentée',
            description: `${stockItem.name} - Quantité: ${existingPart.quantity + 1}`,
          });
        } else {
          toast({
            title: 'Stock insuffisant',
            description: `${stockItem.name} - Stock disponible: ${stockItem.available_quantity}`,
            variant: 'destructive'
          });
        }
      } else {
        // Ajouter la nouvelle pièce
        const newPart: InterventionPart = {
          stockItemId: stockItem.id,
          partName: stockItem.name,
          quantity: 1,
          unitCost: stockItem.unit_price || 0,
          totalCost: stockItem.unit_price || 0,
          availableQuantity: stockItem.available_quantity,
          notes: ''
        };

        onPartsChange([...parts, newPart]);
        
        toast({
          title: 'Pièce scannée ajoutée',
          description: `${stockItem.name} ajouté à l'intervention`,
        });
      }

      // Décrémenter automatiquement le stock
      try {
        const { error } = await supabase
          .from('stock_items')
          .update({ 
            quantity: stockItem.quantity - 1,
            last_updated: new Date().toISOString()
          })
          .eq('id', stockItem.id);

        if (error) throw error;

        // Créer un mouvement de stock pour traçabilité - utiliser la bonne structure
        await supabase
          .from('stock_movements')
          .insert({
            sku: stockItem.reference || stockItem.name,
            qty: -1,
            movement_type: 'outbound_intervention',
            base_id: user?.baseId || '',
            actor: user?.email || '',
            notes: `Sortie automatique pour intervention - Scanner`
          });

        // Actualiser les données de stock
        queryClient.invalidateQueries({ queryKey: ['stock-items-for-intervention'] });
        
        toast({
          title: 'Stock mis à jour',
          description: `${stockItem.name} - Stock: ${stockItem.quantity - 1}`,
        });
        
      } catch (error) {
        console.error('Erreur mise à jour stock:', error);
        toast({
          title: 'Erreur stock',
          description: 'Impossible de mettre à jour le stock',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: 'Article non trouvé',
        description: `Aucun article trouvé pour le code: ${code}`,
        variant: 'destructive'
      });
    }
  };

  const addCustomPart = () => {
    const newPart: InterventionPart = {
      partName: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      notes: ''
    };

    onPartsChange([...parts, newPart]);
  };

  const updatePart = async (index: number, field: keyof InterventionPart, value: any) => {
    const updatedParts = [...parts];

    if (field === 'quantity') {
      const max = updatedParts[index].availableQuantity || 0;
      if (value > max) {
        return;
      }
      updatedParts[index].quantity = value;
      // Stock reservation update removed for simplicity
    } else {
      updatedParts[index] = { ...updatedParts[index], [field]: value };
    }

    if (field === 'quantity' || field === 'unitCost') {
      updatedParts[index].totalCost = updatedParts[index].quantity * updatedParts[index].unitCost;
    }

    onPartsChange(updatedParts);
  };

  const removePart = async (index: number) => {
    const part = parts[index];
    // Stock reservation cleanup removed
    const updatedParts = parts.filter((_, i) => i !== index);
    onPartsChange(updatedParts);
  };

  const totalCost = parts.reduce((sum, part) => sum + part.totalCost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pièces utilisées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!disabled && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <StockItemAutocomplete
                  stockItems={stockItems.filter(item => !parts.some(part => part.stockItemId === item.id))}
                  value={stockSearchValue}
                  onChange={setStockSearchValue}
                  onSelect={async (item) => {
                    const newPart: InterventionPart = {
                      stockItemId: item.id,
                      partName: item.name,
                      quantity: 1,
                      unitCost: (item as any).unit_price || 0,
                      totalCost: (item as any).unit_price || 0,
                      availableQuantity: (item as any).available_quantity,
                      notes: ''
                    };

                    onPartsChange([...parts, newPart]);
                    setStockSearchValue(''); // Clear search after selection
                  }}
                  placeholder="Rechercher une pièce dans le stock..."
                />
              </div>
              <Button variant="outline" onClick={addCustomPart}>
                Pièce personnalisée
              </Button>
            </div>
            
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                onClick={startInterventionScan}
                disabled={isScanning}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              >
                {isScanning ? (
                  <>
                    <QrCode className="h-4 w-4 animate-pulse" />
                    Scanner en cours...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4" />
                    Scanner Code-barres (Sortie Stock)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {parts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune pièce ajoutée
          </div>
        ) : (
          <div className="space-y-4">
            {parts.map((part, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{part.partName || 'Nouvelle pièce'}</h4>
                      {part.stockItemId && (
                        <Badge variant="secondary">
                          Stock: {part.availableQuantity}
                        </Badge>
                      )}
                    </div>
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                     {!part.stockItemId && (
                       <div>
                         <Label>Nom de la pièce</Label>
                         <Input
                           value={part.partName}
                           onChange={(e) => updatePart(index, 'partName', e.target.value)}
                           placeholder="Nom de la pièce"
                           disabled={disabled}
                         />
                       </div>
                     )}
                     
                     {boatId && boatComponents.length > 0 && (
                       <div>
                         <Label>Composant</Label>
                          <Select 
                            value={part.componentId || 'none'} 
                            onValueChange={(value) => updatePart(index, 'componentId', value === 'none' ? undefined : value)}
                            disabled={disabled}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un composant" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Aucun composant</SelectItem>
                             {boatComponents.map((component) => (
                               <SelectItem key={component.id} value={component.id}>
                                 {component.component_name} ({component.component_type})
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                     )}
                     
                     <div>
                       <Label>Quantité</Label>
                       <Input
                         type="number"
                         min="1"
                         max={part.availableQuantity || undefined}
                         value={part.quantity}
                         onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                         disabled={disabled}
                       />
                     </div>

                     <div>
                       <Label>Prix unitaire (€)</Label>
                       <Input
                         type="number"
                         min="0"
                         step="0.01"
                         value={part.unitCost}
                         onChange={(e) => updatePart(index, 'unitCost', parseFloat(e.target.value) || 0)}
                         disabled={disabled}
                       />
                     </div>

                     <div>
                       <Label>Coût total (€)</Label>
                       <Input
                         value={part.totalCost.toFixed(2)}
                         disabled
                       />
                     </div>
                   </div>

                   <div>
                     <Label>Notes</Label>
                     <Input
                       value={part.notes || ''}
                       onChange={(e) => updatePart(index, 'notes', e.target.value)}
                       placeholder="Notes sur cette pièce..."
                       disabled={disabled}
                     />
                   </div>

                  {part.stockItemId && part.quantity > (part.availableQuantity || 0) && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Attention: Quantité demandée ({part.quantity}) supérieure au stock disponible ({part.availableQuantity})
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total des pièces:</span>
                <span className="text-xl font-bold text-blue-600">{totalCost.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Scanner Dialog */}
      <Dialog open={isScanning} onOpenChange={(open) => {
        if (!open) {
          stopScan();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Scanner Code-barres
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={stopScan}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <video
                id="intervention-scanner-video"
                className="w-full h-64 bg-black rounded-lg"
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-red-500 opacity-50 rounded-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/3 border-2 border-white opacity-75"></div>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Positionnez le code-barres dans le cadre pour le scanner
            </div>
            <Button variant="outline" onClick={stopScan} className="w-full">
              Fermer le scanner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}