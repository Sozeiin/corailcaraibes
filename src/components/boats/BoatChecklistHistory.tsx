import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChecklistDetailsModal } from './ChecklistDetailsModal';
import { 
  ClipboardCheck, 
  Calendar, 
  User, 
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { safeRemoveChild, safeAppendChild } from '@/lib/domUtils';

interface BoatChecklistHistoryProps {
  boatId: string;
}

interface ChecklistHistoryItem {
  id: string;
  checklist_date: string;
  overall_status: string;
  general_notes?: string;
  signature_date?: string;
  technician: { name: string } | null;
  rental: { customer_name: string; start_date: string; end_date: string } | null;
  checklist_type: 'checkin' | 'checkout' | 'maintenance';
}

export const BoatChecklistHistory = ({ boatId }: BoatChecklistHistoryProps) => {
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['boat-checklist-history', boatId],
    queryFn: async () => {
      // First get all checklists for this boat
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('boat_checklists')
        .select(`
          id,
          checklist_date,
          overall_status,
          general_notes,
          signature_date,
          technician_name,
          technician:profiles!boat_checklists_technician_id_fkey(name)
        `)
        .eq('boat_id', boatId)
        .order('checklist_date', { ascending: false });

      if (checklistsError) throw checklistsError;

      // Then get rental data to determine checklist type
      const { data: rentalsData, error: rentalsError } = await supabase
        .from('boat_rentals')
        .select('id, customer_name, start_date, end_date')
        .eq('boat_id', boatId);

      if (rentalsError) throw rentalsError;

      // Map checklists with rental information
      return (checklistsData || []).map(checklist => {
        // Find matching rental based on checklist date
        const matchingRental = rentalsData?.find(rental => {
          const checklistDate = new Date(checklist.checklist_date);
          const startDate = new Date(rental.start_date);
          const endDate = new Date(rental.end_date);
          // Check if checklist date is within rental period (±1 day buffer)
          return checklistDate >= new Date(startDate.getTime() - 24*60*60*1000) && 
                 checklistDate <= new Date(endDate.getTime() + 24*60*60*1000);
        });

        // Déterminer le type de checklist en fonction des dates
        let checklist_type: 'checkin' | 'checkout' | 'maintenance' = 'maintenance';

        if (matchingRental) {
          const checklistTime = new Date(checklist.checklist_date).getTime();
          const startTime = new Date(matchingRental.start_date).getTime();
          const endTime = new Date(matchingRental.end_date).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          
          // Check-in : checklist proche de la date de début (±1 jour)
          const isNearStart = Math.abs(checklistTime - startTime) <= oneDayMs;
          
          // Check-out : checklist proche de la date de fin (±1 jour)
          const isNearEnd = Math.abs(checklistTime - endTime) <= oneDayMs;
          
          if (isNearStart) {
            checklist_type = 'checkin';
          } else if (isNearEnd) {
            checklist_type = 'checkout';
          }
          // Sinon reste 'maintenance' (checklist faite pendant la période de location)
        }

        return {
          ...checklist,
          rental: matchingRental || null,
          checklist_type
        };
      }) as ChecklistHistoryItem[];
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'needs_attention':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'major_issues':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <ClipboardCheck className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800">OK</Badge>;
      case 'needs_attention':
        return <Badge className="bg-yellow-100 text-yellow-800">Attention requise</Badge>;
      case 'major_issues':
        return <Badge className="bg-red-100 text-red-800">Problèmes majeurs</Badge>;
      default:
        return <Badge variant="outline">Statut inconnu</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'checkin':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Check-in</Badge>;
      case 'checkout':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Check-out</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Maintenance</Badge>;
    }
  };

  const handleDownloadPdf = async (checklistId: string, customerName: string, type: string) => {
    setDownloadingPdf(checklistId);
    try {
      console.log('🔽 Starting PDF download for checklist:', checklistId);
      
      const { data, error } = await supabase.functions.invoke('generate-checklist-pdf', {
        body: {
          checklistId,
          customerName: customerName || 'Client',
          type: type === 'checkin' ? 'checkin' : 'checkout'
        }
      });

      if (error) {
        console.error('❌ PDF generation error:', error);
        throw error;
      }

      console.log('✅ PDF generation response:', {
        success: data?.success,
        itemsCount: data?.itemsCount,
        categoriesCount: data?.categoriesCount,
        hasHtml: !!data?.html
      });

      if (data?.success && data?.html) {
        // Create a blob with the HTML content and download it
        const blob = new Blob([data.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `checklist-${type}-${customerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`;
        
        try {
          const cleanup = safeAppendChild(document.body, link);
          link.click();
          cleanup();
          URL.revokeObjectURL(url);
        } catch (error) {
          console.error('Download error:', error);
          URL.revokeObjectURL(url);
          throw error;
        }
        
        toast({
          title: '📄 Rapport téléchargé',
          description: 'Le fichier HTML a été téléchargé. Ouvrez-le dans votre navigateur et utilisez Ctrl+P pour l\'imprimer en PDF.',
        });
      } else {
        throw new Error('Format de réponse invalide');
      }
    } catch (error: any) {
      console.error('❌ Erreur téléchargement PDF:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la génération du rapport',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(null);
    }
  };

  if (isLoading) {
    return <div>Chargement de l'historique des checklists...</div>;
  }

  if (!checklists || checklists.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune checklist</h3>
          <p className="text-muted-foreground text-center">
            Aucune checklist check-in/check-out n'a encore été enregistrée pour ce bateau.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Check-in / Check-out</h3>
        <Badge variant="outline">{checklists.length} checklist(s)</Badge>
      </div>

      <div className="space-y-4">
        {checklists.map((checklist) => (
          <Card key={checklist.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(checklist.overall_status)}
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Checklist {getTypeBadge(checklist.checklist_type)}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {new Date(checklist.checklist_date).toLocaleDateString()}
                        </span>
                      </div>
                      {(checklist.technician || (checklist as any).technician_name) && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{checklist.technician?.name || (checklist as any).technician_name}</span>
                        </div>
                      )}
                      {checklist.rental && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Client: {checklist.rental.customer_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(checklist.overall_status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {checklist.general_notes && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    {checklist.general_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  {checklist.signature_date && (
                    <span>
                      Signée le {new Date(checklist.signature_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedChecklist(checklist.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir détails
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadPdf(
                      checklist.id, 
                      checklist.rental?.customer_name || 'Client',
                      checklist.checklist_type
                    )}
                    disabled={downloadingPdf === checklist.id}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {downloadingPdf === checklist.id ? 'Téléchargement...' : 'PDF'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedChecklist && (
        <ChecklistDetailsModal
          checklistId={selectedChecklist}
          isOpen={!!selectedChecklist}
          onClose={() => setSelectedChecklist(null)}
        />
      )}
    </div>
  );
};