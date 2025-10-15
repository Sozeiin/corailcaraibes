import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface BarcodeDownloaderProps {
  barcode: string;
  itemName: string;
  reference?: string;
}

export function BarcodeDownloader({ barcode, itemName, reference }: BarcodeDownloaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current && barcode) {
      try {
        JsBarcode(canvasRef.current, barcode, {
          format: 'CODE128',
          width: 2,
          height: 100,
          displayValue: true,
          fontSize: 14,
          margin: 10,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [barcode]);

  const downloadPNG = (size: 'small' | 'medium' | 'large') => {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Dimensions en pixels (à 300 DPI)
    const dimensions = {
      small: { width: 591, height: 354 },   // 5x3cm à 300DPI
      medium: { width: 1181, height: 591 }, // 10x5cm à 300DPI
      large: { width: 1772, height: 945 },  // 15x8cm à 300DPI
    };

    const { width, height } = dimensions[size];
    tempCanvas.width = width;
    tempCanvas.height = height;

    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Nom de l'article en haut
    ctx.fillStyle = '#000000';
    ctx.font = `${size === 'small' ? 16 : size === 'medium' ? 24 : 32}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(itemName, width / 2, size === 'small' ? 30 : size === 'medium' ? 50 : 70);

    // Code-barres
    const barcodeHeight = size === 'small' ? 150 : size === 'medium' ? 250 : 350;
    const barcodeWidth = width - 40;
    const barcodeY = size === 'small' ? 50 : size === 'medium' ? 80 : 120;

    // Créer un barcode temporaire pour cette taille
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, barcode, {
      format: 'CODE128',
      width: size === 'small' ? 2 : size === 'medium' ? 3 : 4,
      height: barcodeHeight,
      displayValue: true,
      fontSize: size === 'small' ? 20 : size === 'medium' ? 28 : 36,
      margin: 0,
    });

    ctx.drawImage(
      barcodeCanvas,
      (width - barcodeCanvas.width) / 2,
      barcodeY,
      barcodeCanvas.width,
      barcodeCanvas.height
    );

    // Référence en bas (si existe)
    if (reference) {
      ctx.font = `${size === 'small' ? 12 : size === 'medium' ? 18 : 24}px Arial`;
      ctx.fillText(`Réf: ${reference}`, width / 2, height - 20);
    }

    // Télécharger
    tempCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-${barcode}-${size}.png`;
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Étiquette téléchargée',
          description: `Format ${size === 'small' ? 'petit' : size === 'medium' ? 'moyen' : 'grand'} (${dimensions[size].width}x${dimensions[size].height}px)`,
        });
      }
    });
  };

  const downloadPDF = () => {
    if (!canvasRef.current) return;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Étiquette format Avery 5160 (30 étiquettes par page)
    const labelWidth = 66.7;  // mm
    const labelHeight = 25.4; // mm
    const marginLeft = 5.08;
    const marginTop = 12.7;

    // Créer le canvas avec l'étiquette
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    tempCanvas.width = 800;
    tempCanvas.height = 300;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Nom
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(itemName, tempCanvas.width / 2, 30);

    // Barcode
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, barcode, {
      format: 'CODE128',
      width: 2,
      height: 120,
      displayValue: true,
      fontSize: 16,
      margin: 0,
    });

    ctx.drawImage(
      barcodeCanvas,
      (tempCanvas.width - barcodeCanvas.width) / 2,
      60,
      barcodeCanvas.width,
      barcodeCanvas.height
    );

    // Référence
    if (reference) {
      ctx.font = '14px Arial';
      ctx.fillText(`Réf: ${reference}`, tempCanvas.width / 2, 250);
    }

    // Ajouter au PDF
    const imgData = tempCanvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', marginLeft, marginTop, labelWidth, labelHeight);

    pdf.save(`etiquette-${barcode}.pdf`);

    toast({
      title: 'Étiquette PDF téléchargée',
      description: 'Format Avery 5160 compatible',
    });
  };

  if (!barcode) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Aucun code-barres disponible pour cet article
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">{itemName}</h3>
            {reference && (
              <p className="text-sm text-muted-foreground">Réf: {reference}</p>
            )}
          </div>
          
          <div className="bg-white p-4 rounded border">
            <canvas ref={canvasRef} />
          </div>
          
          <div className="text-center">
            <p className="text-sm font-mono bg-muted px-3 py-1 rounded">
              {barcode}
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Télécharger étiquette PNG</h4>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPNG('small')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Petit
              <span className="block text-xs text-muted-foreground">5x3cm</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPNG('medium')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Moyen
              <span className="block text-xs text-muted-foreground">10x5cm</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadPNG('large')}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Grand
              <span className="block text-xs text-muted-foreground">15x8cm</span>
            </Button>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Imprimer étiquette</h4>
          <Button
            onClick={downloadPDF}
            className="w-full"
          >
            <Printer className="h-4 w-4 mr-2" />
            Télécharger PDF (Avery 5160)
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Format compatible imprimante étiquettes standard
          </p>
        </div>
      </div>
    </div>
  );
}