import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface PreparationPDFProps {
  preparation: any;
  boxes: any[];
  bases: any;
}

export function PreparationPDF({ preparation, boxes, bases }: PreparationPDFProps) {
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
      const pdf = new jsPDF();
      let yPosition = 20;

      // En-tête
      pdf.setFontSize(18);
      pdf.setTextColor(44, 62, 80);
      pdf.text('PRÉPARATION D\'EXPÉDITION', 20, yPosition);
      yPosition += 15;

      // Informations générales
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      pdf.text(`Référence: ${preparation.reference}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Nom: ${preparation.name}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Base expéditrice: ${bases[preparation.source_base_id]?.name || 'Inconnue'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Base destinataire: ${bases[preparation.destination_base_id]?.name || 'Inconnue'}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Date de création: ${new Date(preparation.created_at).toLocaleDateString('fr-FR')}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Statut: ${preparation.status}`, 20, yPosition);
      yPosition += 15;

      // Résumé
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text('RÉSUMÉ', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Nombre total de cartons: ${preparation.total_boxes}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`Nombre total d'articles: ${preparation.total_items}`, 20, yPosition);
      yPosition += 20;

      // Détail par carton
      pdf.setFontSize(14);
      pdf.setTextColor(44, 62, 80);
      pdf.text('DÉTAIL DES CARTONS', 20, yPosition);
      yPosition += 15;

      for (const box of boxes) {
        // Vérifier si on a assez de place sur la page
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        // En-tête du carton
        pdf.setFontSize(12);
        pdf.setTextColor(44, 62, 80);
        pdf.text(`Carton: ${box.box_identifier}`, 20, yPosition);
        yPosition += 8;

        pdf.setTextColor(0, 0, 0);
        pdf.text(`Statut: ${box.status === 'closed' ? 'Fermé' : 'Ouvert'}`, 20, yPosition);
        yPosition += 8;
        pdf.text(`Nombre d'articles: ${box.total_items}`, 20, yPosition);
        yPosition += 10;

        // Articles du carton
        const boxItems = allBoxItems.filter((item: any) => item.box_id === box.id);
        
        if (boxItems.length > 0) {
          pdf.setFontSize(10);
          pdf.setTextColor(100, 100, 100);
          pdf.text('Articles:', 30, yPosition);
          yPosition += 6;

          for (const item of boxItems) {
            if (yPosition > 270) {
              pdf.addPage();
              yPosition = 20;
            }

            const itemText = `• ${item.item_name}${item.item_reference ? ` (${item.item_reference})` : ''} - Qté: ${item.quantity}`;
            pdf.text(itemText, 35, yPosition);
            yPosition += 6;
          }
        }

        yPosition += 10; // Espacement entre les cartons
      }

      // Notes si présentes
      if (preparation.notes) {
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }

        pdf.setFontSize(14);
        pdf.setTextColor(44, 62, 80);
        pdf.text('NOTES', 20, yPosition);
        yPosition += 10;

        pdf.setFontSize(10);
        pdf.setTextColor(0, 0, 0);
        const splitNotes = pdf.splitTextToSize(preparation.notes, 170);
        pdf.text(splitNotes, 20, yPosition);
      }

      // Pied de page sur chaque page
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} sur ${pageCount}`, 170, 285);
        pdf.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 20, 285);
      }

      // Télécharger le PDF
      const fileName = `expedition_${preparation.reference}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF généré',
        description: 'Le document de préparation a été téléchargé avec succès.'
      });

    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer le PDF.',
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button 
      onClick={generatePDF}
      disabled={generating}
      variant="outline"
      className="flex items-center gap-2"
    >
      <FileText className="h-4 w-4" />
      {generating ? 'Génération...' : 'Télécharger PDF'}
    </Button>
  );
}