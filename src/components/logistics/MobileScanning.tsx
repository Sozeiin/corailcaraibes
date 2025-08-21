import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  QrCode, 
  Package, 
  Search,
  CheckCircle,
  AlertCircle,
  Camera
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function MobileScanning() {
  const [scanResult, setScanResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();

  const handleScan = () => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setScanResult('PRODUCT-12345');
      setIsScanning(false);
      toast({
        title: "Code scanné",
        description: "Produit PRODUCT-12345 trouvé",
      });
    }, 2000);
  };

  const handleManualEntry = (value: string) => {
    setScanResult(value);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Scanner Mobile</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Scannez les codes-barres ou saisissez manuellement les références
        </p>
      </div>

      {/* Scanner Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Scanner de codes-barres
          </CardTitle>
          <CardDescription>
            Utilisez l'appareil photo pour scanner les codes-barres
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleScan}
            disabled={isScanning}
            className="w-full"
            size="lg"
          >
            {isScanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                Scan en cours...
              </>
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                Démarrer le scan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Saisie manuelle
          </CardTitle>
          <CardDescription>
            Entrez manuellement la référence du produit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Référence produit..."
            value={scanResult}
            onChange={(e) => handleManualEntry(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Results */}
      {scanResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Résultat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">{scanResult}</p>
                  <p className="text-sm text-muted-foreground">Produit scanné</p>
                </div>
              </div>
              <Badge variant="outline">Trouvé</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start">
            <Package className="h-4 w-4 mr-2" />
            Ajouter au stock
          </Button>
          <Button variant="outline" className="w-full justify-start">
            <AlertCircle className="h-4 w-4 mr-2" />
            Signaler un problème
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}