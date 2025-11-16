import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';

interface PreparationPDFProps {
  preparation: any;
  boxes: any[];
  bases: any;
  hidePrices?: boolean;
}

export function PreparationPDF({ preparation, boxes, bases, hidePrices = false }: PreparationPDFProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  // Récupérer tous les articles des cartons
  const { data: allBoxItems = [] } = useOfflineData<any>({
    table: 'shipment_box_items',
    dependencies: [preparation.id]
  });

  const generatePDF = async () => {
    setGenerating(true);
    try {
      // Récupérer les informations de prix depuis stock_items
      const stockItemIds = allBoxItems
        .map((item: any) => item.stock_item_id)
        .filter(Boolean);

      let stockItemsData: any[] = [];
      if (stockItemIds.length > 0) {
        const { data } = await supabase
          .from('stock_items')
          .select('id, name, reference, unit_price, supplier_reference')
          .in('id', stockItemIds);
        stockItemsData = data || [];
      }

      const pdf = new jsPDF();
      let yPosition = 20;

      // ========== PAGE 1: DOCUMENT DOUANIER OFFICIEL ==========
      
      // Bordure du document
      pdf.setDrawColor(44, 62, 80);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, 190, 277);

      // En-tête officiel
      pdf.setFillColor(44, 62, 80);
      pdf.rect(10, 10, 190, 25, 'F');
      
      pdf.setFontSize(20);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DÉCLARATION D\'EXPÉDITION', 105, 23, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text('Document Douanier / Customs Declaration', 105, 30, { align: 'center' });

      yPosition = 45;

      // QR Code de la préparation (en haut à droite)
      const prepQRData = JSON.stringify({
        type: 'shipment',
        ref: preparation.reference,
        id: preparation.id,
        date: preparation.created_at
      });
      const prepQRCode = await QRCode.toDataURL(prepQRData, { width: 200 });
      pdf.addImage(prepQRCode, 'PNG', 155, 40, 35, 35);

      // Informations générales
      pdf.setFontSize(11);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      
      pdf.text('INFORMATIONS GÉNÉRALES', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      pdf.text(`Référence d'expédition:`, 20, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(preparation.reference, 80, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`Désignation:`, 20, yPosition);
      pdf.text(preparation.name, 80, yPosition);
      yPosition += 6;

      pdf.text(`Date d'expédition:`, 20, yPosition);
      pdf.text(new Date(preparation.created_at).toLocaleDateString('fr-FR'), 80, yPosition);
      yPosition += 6;

      pdf.text(`Statut:`, 20, yPosition);
      const statusText = {
        draft: 'Brouillon',
        in_progress: 'En cours',
        ready: 'Prête',
        shipped: 'Expédiée',
        received: 'Reçue'
      }[preparation.status] || preparation.status;
      pdf.text(statusText, 80, yPosition);
      yPosition += 10;

      // Informations d'expédition
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('ORIGINE ET DESTINATION', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);

      pdf.text(`Base expéditrice:`, 20, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(bases[preparation.source_base_id]?.name || 'Non spécifiée', 80, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.text(`Base destinataire:`, 20, yPosition);
      pdf.setFont('helvetica', 'bold');
      pdf.text(bases[preparation.destination_base_id]?.name || 'Non spécifiée', 80, yPosition);
      yPosition += 10;

      // Informations de suivi si disponibles
      if (preparation.tracking_number || preparation.carrier) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('INFORMATIONS DE SUIVI', 20, yPosition);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        if (preparation.carrier) {
          pdf.text(`Transporteur:`, 20, yPosition);
          pdf.text(preparation.carrier, 80, yPosition);
          yPosition += 6;
        }

        if (preparation.tracking_number) {
          pdf.text(`Numéro de suivi:`, 20, yPosition);
          pdf.setFont('helvetica', 'bold');
          pdf.text(preparation.tracking_number, 80, yPosition);
          yPosition += 6;
        }
        yPosition += 4;
      }

      // Calcul de la valorisation totale
      let totalValue = 0;
      const itemsWithPrices = allBoxItems.map((item: any) => {
        const stockItem = stockItemsData.find((s: any) => s.id === item.stock_item_id);
        const unitPrice = stockItem?.unit_price || 0;
        const itemTotal = unitPrice * item.quantity;
        totalValue += itemTotal;
        return {
          ...item,
          unit_price: unitPrice,
          total_price: itemTotal,
          supplier_reference: stockItem?.supplier_reference
        };
      });

      // Résumé avec valorisation
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('RÉSUMÉ DE L\'EXPÉDITION', 20, yPosition);
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Nombre total de cartons:`, 20, yPosition);
      pdf.text(`${preparation.total_boxes}`, 80, yPosition);
      yPosition += 6;

      pdf.text(`Nombre total d'articles:`, 20, yPosition);
      pdf.text(`${preparation.total_items}`, 80, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'bold');
      pdf.text(`Valorisation totale:`, 20, yPosition);
      pdf.setFontSize(12);
      pdf.text(`${totalValue.toFixed(2)} €`, 80, yPosition);
      pdf.setFontSize(10);
      yPosition += 15;

      // Tableau récapitulatif
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('RÉCAPITULATIF PAR CARTON', 20, yPosition);
      yPosition += 8;

      // En-têtes du tableau
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, yPosition - 5, 170, 8, 'F');
      pdf.setFontSize(9);
      pdf.text('Carton', 25, yPosition);
      pdf.text('Articles', 70, yPosition);
      if (!hidePrices) {
        pdf.text('Valorisation', 150, yPosition);
      }
      yPosition += 8;

      // Lignes du tableau
      pdf.setFont('helvetica', 'normal');
      for (const box of boxes) {
        if (yPosition > 260) {
          pdf.addPage();
          pdf.setDrawColor(44, 62, 80);
          pdf.setLineWidth(0.5);
          pdf.rect(10, 10, 190, 277);
          yPosition = 30;
        }

        const boxItems = itemsWithPrices.filter((item: any) => item.box_id === box.id);
        const boxValue = boxItems.reduce((sum: number, item: any) => sum + item.total_price, 0);

        pdf.text(box.box_identifier, 25, yPosition);
        pdf.text(`${box.total_items}`, 70, yPosition);
        if (!hidePrices) {
          pdf.text(`${boxValue.toFixed(2)} €`, 150, yPosition);
        }
        yPosition += 6;
      }

      yPosition += 10;

      // Notes si présentes
      if (preparation.notes && yPosition < 240) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('NOTES ET OBSERVATIONS', 20, yPosition);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const splitNotes = pdf.splitTextToSize(preparation.notes, 170);
        pdf.text(splitNotes, 20, yPosition);
        yPosition += splitNotes.length * 4 + 10;
      }

      // Zone de signatures (en bas de la première page)
      const signatureY = 250;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, signatureY, 90, signatureY);
      pdf.line(110, signatureY, 180, signatureY);
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Signature Expéditeur', 25, signatureY + 5);
      pdf.text('Date: ______________', 25, signatureY + 10);
      pdf.text('Signature Destinataire', 115, signatureY + 5);
      pdf.text('Date: ______________', 115, signatureY + 10);

      // ========== PAGES SUIVANTES: DÉTAIL PAR CARTON ==========
      
      for (const box of boxes) {
        pdf.addPage();
        pdf.setDrawColor(44, 62, 80);
        pdf.setLineWidth(0.5);
        pdf.rect(10, 10, 190, 277);
        
        yPosition = 20;

        // En-tête du carton
        pdf.setFillColor(44, 62, 80);
        pdf.rect(10, 10, 190, 20, 'F');
        
        pdf.setFontSize(16);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`CARTON: ${box.box_identifier}`, 20, 23);

        // QR Code du carton
        const boxQRData = JSON.stringify({
          type: 'box',
          box_id: box.id,
          identifier: box.box_identifier,
          shipment_ref: preparation.reference
        });
        const boxQRCode = await QRCode.toDataURL(boxQRData, { width: 200 });
        pdf.addImage(boxQRCode, 'PNG', 160, 35, 30, 30);

        yPosition = 40;

        // Informations du carton
        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        
        pdf.text(`Statut: ${box.status === 'closed' ? 'Fermé et scellé' : 'Ouvert'}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Nombre d'articles: ${box.total_items}`, 20, yPosition);
        yPosition += 6;

        const boxItems = itemsWithPrices.filter((item: any) => item.box_id === box.id);
        const boxValue = boxItems.reduce((sum: number, item: any) => sum + item.total_price, 0);
        if (!hidePrices) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Valorisation du carton: ${boxValue.toFixed(2)} €`, 20, yPosition);
          yPosition += 10;
        }
        yPosition += 5;

        // Tableau détaillé des articles
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('CONTENU DÉTAILLÉ', 20, yPosition);
        yPosition += 8;

        // En-têtes du tableau détaillé
        pdf.setFillColor(240, 240, 240);
        pdf.rect(15, yPosition - 5, 180, 10, 'F');
        pdf.setFontSize(8);
        pdf.text('Article', 18, yPosition);
        pdf.text('Réf.', 80, yPosition);
        pdf.text('Qté', hidePrices ? 150 : 120, yPosition);
        if (!hidePrices) {
          pdf.text('P.U.', 140, yPosition);
          pdf.text('Total', 165, yPosition);
        }
        yPosition += 10;

        // Lignes du tableau
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        
        for (const item of boxItems) {
          if (yPosition > 260) {
            pdf.addPage();
            pdf.setDrawColor(44, 62, 80);
            pdf.setLineWidth(0.5);
            pdf.rect(10, 10, 190, 277);
            yPosition = 30;
          }

          // Ligne alternée
          if (boxItems.indexOf(item) % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(15, yPosition - 4, 180, 7, 'F');
          }

          const itemName = item.item_name.length > 25 
            ? item.item_name.substring(0, 25) + '...' 
            : item.item_name;
          
          pdf.text(itemName, 18, yPosition);
          pdf.text(item.item_reference || '-', 80, yPosition);
          pdf.text(`${item.quantity}`, hidePrices ? 150 : 120, yPosition);
          if (!hidePrices) {
            pdf.text(`${item.unit_price.toFixed(2)} €`, 140, yPosition);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${item.total_price.toFixed(2)} €`, 165, yPosition);
            pdf.setFont('helvetica', 'normal');
          }
          
          yPosition += 7;

          // Référence fournisseur si disponible
          if (item.supplier_reference) {
            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`Réf. fourn.: ${item.supplier_reference}`, 18, yPosition);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(9);
            yPosition += 5;
          }
        }

        // Total du carton
        if (!hidePrices) {
          yPosition += 5;
          pdf.setDrawColor(44, 62, 80);
          pdf.line(15, yPosition, 195, yPosition);
          yPosition += 8;
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text('TOTAL CARTON:', 120, yPosition);
          pdf.setFontSize(12);
          pdf.text(`${boxValue.toFixed(2)} €`, 165, yPosition);
        }
      }

      // Pied de page sur toutes les pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(100, 100, 100);
        
        // Ligne de séparation
        pdf.setDrawColor(200, 200, 200);
        pdf.line(10, 280, 200, 280);
        
        pdf.text(`Page ${i} sur ${pageCount}`, 170, 285);
        pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, 285);
        pdf.text(`Réf: ${preparation.reference}`, 95, 285);
      }

      // Télécharger le PDF
      const pdfType = hidePrices ? 'douanes' : 'complet';
      const fileName = `${pdfType}_expedition_${preparation.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: hidePrices ? 'PDF douanes généré' : 'PDF complet généré',
        description: 'Le document d\'expédition pour les douanes a été téléchargé avec succès.'
      });

    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF douanier.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF}
      disabled={generating || boxes.length === 0}
      variant="outline"
      className="flex items-center gap-2"
    >
      <FileText className="h-4 w-4" />
      {generating ? 'Génération...' : (hidePrices ? 'PDF Douanes (sans prix)' : 'PDF Complet (avec prix)')}
    </Button>
  );
}