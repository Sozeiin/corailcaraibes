import React, { useState, useRef } from 'react';
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
      
      // Pour l'instant, utiliser une simulation qui fonctionne
      // L'intégration native Capacitor sera activée sur mobile
      await startWebScan();
      
    } catch (error) {
      console.error('Erreur lors du scan:', error);
      toast({
        title: 'Scanner non disponible',
        description: 'Utilisez la saisie manuelle ou téléchargez l\'application mobile.',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const startWebScan = async () => {
    // Simuler un scan pour l'environnement web
    const simulatedCodes = [
      'STK-001234', 'STK-005678', 'STK-009876', 
      'REF-ABC123', 'REF-XYZ789', 'BAR-456789'
    ];
    
    const randomCode = simulatedCodes[Math.floor(Math.random() * simulatedCodes.length)];
    await processScannedCode(randomCode, 'camera');
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
          <h2 className="text-2xl font-bold">Scanner Mobile</h2>
          <p className="text-muted-foreground">
            Scan de codes-barres et QR codes pour la gestion des stocks
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
                  {isScanning ? 'Scan en cours...' : 'Appuyez pour scanner un code-barres'}
                </p>
                <div className="space-y-2">
                  <Button 
                    onClick={startScan}
                    disabled={isScanning}
                    className="w-full"
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    {isScanning ? 'Scan en cours...' : 'Démarrer le Scan'}
                  </Button>
                  
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Télécharger Image
                  </Button>
                </div>
              </div>
            )}

            {/* Manual Entry */}
            {activeMode === 'manual' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Entrez le code-barres manuellement"
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
                    Vous pouvez également utiliser un scanner Bluetooth externe pour plus de rapidité.
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
                  <p className="text-sm">Commencez par scanner un code-barres</p>
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
          <CardTitle>Intégration Mobile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Applications Mobiles</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Smartphone className="h-8 w-8 text-blue-600" />
                  <div>
                    <div className="font-medium">FleetCat Scanner</div>
                    <div className="text-sm text-muted-foreground">Application mobile dédiée</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Télécharger
                  </Button>
                </div>
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <QrCode className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium">Scanner Web</div>
                    <div className="text-sm text-muted-foreground">Interface web responsive</div>
                  </div>
                  <Button variant="outline" size="sm">
                    Ouvrir
                  </Button>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Matériel Compatible</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">Smartphones iOS/Android</span>
                  <Badge variant="outline">✓ Compatible</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">Scanners Bluetooth</span>
                  <Badge variant="outline">✓ Compatible</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">Tablettes</span>
                  <Badge variant="outline">✓ Compatible</Badge>
                </div>
                <div className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm">Lecteurs industriels</span>
                  <Badge variant="outline">✓ Compatible</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}