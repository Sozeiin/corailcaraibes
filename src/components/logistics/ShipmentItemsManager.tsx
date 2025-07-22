import React, { useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StockItemAutocomplete } from '../stock/StockItemAutocomplete';
import { 
  Plus, 
  Package, 
  Trash2,
  Edit,
  QrCode,
  Camera
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ShipmentItemsManagerProps {
  shipment: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ShipmentItemsManager({ shipment, isOpen, onClose }: ShipmentItemsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [packageNumber, setPackageNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Récupérer les articles du stock de la base
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-logistics', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('base_id', user?.baseId)
        .gt('quantity', 0) // Seulement les articles en stock
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les articles de l'expédition
  const { data: shipmentItems = [] } = useQuery({
    queryKey: ['shipment-items', shipment?.id],
    queryFn: async () => {
      if (!shipment?.id) return [];
      
      const { data, error } = await supabase
        .from('logistics_shipment_items')
        .select(`
          *,
          stock_item:stock_items(*)
        `)
        .eq('shipment_id', shipment.id)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!shipment?.id
  });

  // Validation du format de code-barres
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

  // Fonction de scan avec caméra
  const startScan = async () => {
    if (!canModifyShipment) return;
    
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
        z-index: 10000;
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

      const instructionText = document.createElement('div');
      instructionText.innerHTML = `
        <p style="color: white; margin-bottom: 15px; font-size: ${isMobile ? '14px' : '18px'}; text-align: center; font-weight: 500;">
          📦 Scanner pour ajouter à l'expédition
        </p>
        <p style="color: #22c55e; font-size: ${isMobile ? '12px' : '14px'}; text-align: center; margin-bottom: 20px;">
          Positionnez le code-barres dans la zone verte
        </p>
      `;

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

  // Traiter le code scanné
  const processScannedCode = (code: string) => {
    const trimmedCode = code.trim();
    
    // Recherche exacte par référence (insensible à la casse)
    let stockItem = stockItems.find(item => 
      item.reference && item.reference.toLowerCase() === trimmedCode.toLowerCase()
    );
    
    // Recherche partielle dans les références
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.reference && 
        item.reference.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
    }
    
    // Recherche par nom contenant le code
    if (!stockItem) {
      stockItem = stockItems.find(item => 
        item.name.toLowerCase().includes(trimmedCode.toLowerCase()) &&
        trimmedCode.length >= 3
      );
    }

    if (!stockItem) {
      toast({
        title: 'Article non trouvé',
        description: `Aucun article trouvé pour le code: ${trimmedCode}`,
        variant: 'destructive'
      });
      return;
    }

    // Sélectionner l'article trouvé
    setSelectedStockItem(stockItem);
    setSearchQuery(stockItem.name);
    setQuantity(1);

    toast({
      title: 'Article trouvé',
      description: `${stockItem.name} - Stock: ${stockItem.quantity}`,
    });
  };

  const addItemToShipment = async () => {
    if (!selectedStockItem || quantity <= 0) return;

    try {
      setIsAddingItem(true);

      // Vérifier si on a assez de stock
      if (selectedStockItem.quantity < quantity) {
        toast({
          title: 'Stock insuffisant',
          description: `Seulement ${selectedStockItem.quantity} unités disponibles`,
          variant: 'destructive'
        });
        return;
      }

      // Ajouter l'article à l'expédition
      const { error: insertError } = await supabase
        .from('logistics_shipment_items')
        .insert({
          shipment_id: shipment.id,
          stock_item_id: selectedStockItem.id,
          product_name: selectedStockItem.name,
          product_reference: selectedStockItem.reference,
          quantity_shipped: quantity,
          package_number: packageNumber || null
        });

      if (insertError) throw insertError;

      // Décrémenter le stock
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: selectedStockItem.quantity - quantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', selectedStockItem.id);

      if (updateError) throw updateError;

      // Mettre à jour le nombre total de colis dans l'expédition
      const totalPackages = shipmentItems.length + 1;
      const { error: shipmentError } = await supabase
        .from('logistics_shipments')
        .update({ total_packages: totalPackages })
        .eq('id', shipment.id);

      if (shipmentError) throw shipmentError;

      toast({
        title: 'Article ajouté',
        description: `${quantity} x ${selectedStockItem.name} ajouté à l'expédition`
      });

      // Réinitialiser le formulaire
      setSelectedStockItem(null);
      setQuantity(1);
      setPackageNumber('');
      setSearchQuery('');

      // Actualiser les données
      queryClient.invalidateQueries({ queryKey: ['shipment-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });

    } catch (error) {
      console.error('Erreur ajout article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'article à l\'expédition',
        variant: 'destructive'
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const removeItemFromShipment = async (item: any) => {
    try {
      // Remettre en stock
      const { error: stockError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: item.stock_item.quantity + item.quantity_shipped,
          last_updated: new Date().toISOString()
        })
        .eq('id', item.stock_item_id);

      if (stockError) throw stockError;

      // Supprimer de l'expédition
      const { error: deleteError } = await supabase
        .from('logistics_shipment_items')
        .delete()
        .eq('id', item.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Article retiré',
        description: `${item.quantity_shipped} x ${item.product_name} retiré de l'expédition`
      });

      // Actualiser les données
      queryClient.invalidateQueries({ queryKey: ['shipment-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });

    } catch (error) {
      console.error('Erreur suppression article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'article',
        variant: 'destructive'
      });
    }
  };

  const canModifyShipment = shipment?.status === 'preparing';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestion des articles - {shipment?.shipment_number}
          </DialogTitle>
          <DialogDescription>
            Ajouter ou retirer des articles de l'expédition vers {shipment?.base_destination?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ajouter un article */}
          {canModifyShipment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Ajouter un article
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startScan}
                    disabled={isScanning}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scanner
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Rechercher un article</Label>
                  <StockItemAutocomplete
                    stockItems={stockItems}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={(item) => {
                      setSelectedStockItem(item);
                      setSearchQuery(item.name);
                    }}
                    placeholder="Rechercher un article dans le stock..."
                  />
                </div>

                {selectedStockItem && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{selectedStockItem.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Réf: {selectedStockItem.reference} • Stock: {selectedStockItem.quantity}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {selectedStockItem.category}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantité à expédier</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max={selectedStockItem.quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageNumber">N° de colis (optionnel)</Label>
                        <Input
                          id="packageNumber"
                          placeholder="Ex: COLIS-001"
                          value={packageNumber}
                          onChange={(e) => setPackageNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={addItemToShipment}
                      disabled={isAddingItem || quantity <= 0 || quantity > selectedStockItem.quantity}
                      className="w-full mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isAddingItem ? 'Ajout...' : 'Ajouter à l\'expédition'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Liste des articles dans l'expédition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Articles dans l'expédition
                <Badge variant="secondary">{shipmentItems.length} articles</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun article dans cette expédition</p>
                  {canModifyShipment && (
                    <p className="text-sm">Ajoutez des articles depuis le stock</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {shipmentItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{item.product_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Réf: {item.product_reference} • Quantité: {item.quantity_shipped}
                              {item.package_number && ` • Colis: ${item.package_number}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {canModifyShipment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItemFromShipment(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations sur l'expédition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations expédition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Destination</p>
                  <p className="text-muted-foreground">{shipment?.base_destination?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Statut</p>
                  <Badge variant={shipment?.status === 'preparing' ? 'secondary' : 'default'}>
                    {shipment?.status === 'preparing' ? 'En préparation' : 
                     shipment?.status === 'ready' ? 'Prêt' : 
                     shipment?.status === 'shipped' ? 'Expédié' : shipment?.status}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">Total colis</p>
                  <p className="text-muted-foreground">{shipment?.total_packages || 0}</p>
                </div>
                <div>
                  <p className="font-medium">Transporteur</p>
                  <p className="text-muted-foreground">{shipment?.carrier || 'Non défini'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}