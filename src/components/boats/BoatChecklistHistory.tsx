import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { formatDateSafe } from '@/lib/dateUtils';

interface BoatChecklistHistoryProps {
  boatId: string;
}

interface EngineHoursSnapshot {
  component_id: string;
  component_name: string;
  component_type: string;
  hours: number;
}

interface ChecklistHistoryItem {
  id: string;
  checklist_date: string;
  overall_status: string;
  general_notes?: string;
  signature_date?: string;
  technician: { name: string } | null;
  technician_name?: string;
  engine_hours_snapshot?: EngineHoursSnapshot[] | null;
  // Stored values (preferred)
  checklist_type: 'checkin' | 'checkout' | 'maintenance' | null;
  customer_name: string | null;
  rental_id: string | null;
  // Inferred values (fallback for old data)
  rental?: { customer_name: string; start_date: string; end_date: string } | null;
  display_type: 'checkin' | 'checkout' | 'maintenance';
  display_customer_name: string | null;
}

export const BoatChecklistHistory = ({ boatId }: BoatChecklistHistoryProps) => {
  const { user } = useAuth();
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const { toast } = useToast();

  // Wait for auth context to be fully loaded
  const isReadyForQuery = !!user?.id && (user?.role === 'direction' || !!user?.baseId);

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['boat-checklist-history', boatId, user?.baseId, user?.id],
    queryFn: async () => {
      console.log('[BoatChecklistHistory] Fetching checklists for boat:', boatId);
      
      // Fetch checklists with new stored columns
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('boat_checklists')
        .select(`
          id,
          checklist_date,
          overall_status,
          general_notes,
          signature_date,
          technician_name,
          checklist_type,
          customer_name,
          rental_id,
          engine_hours_snapshot,
          technician:profiles!boat_checklists_technician_id_fkey(name)
        `)
        .eq('boat_id', boatId)
        .order('checklist_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (checklistsError) {
        console.error('[BoatChecklistHistory] Error:', checklistsError);
        throw checklistsError;
      }

      console.log('[BoatChecklistHistory] Fetched', checklistsData?.length, 'checklists');

      // Only fetch rentals if we need them for fallback (old data without stored type)
      const needsRentalFallback = checklistsData?.some(c => !c.checklist_type);
      let rentalsData: any[] = [];
      
      if (needsRentalFallback) {
        const { data, error: rentalsError } = await supabase
          .from('boat_rentals')
          .select('id, customer_name, start_date, end_date')
          .eq('boat_id', boatId);

        if (!rentalsError) {
          rentalsData = data || [];
        }
      }

      // Map checklists with proper type and customer name
      return (checklistsData || []).map(checklist => {
        // If we have stored values, use them directly
        if (checklist.checklist_type && checklist.customer_name) {
          return {
            ...checklist,
            display_type: checklist.checklist_type,
            display_customer_name: checklist.customer_name,
            rental: null, // Not needed when we have stored values
          } as unknown as ChecklistHistoryItem;
        }

        // Fallback: infer from rental dates (for old checklists)
        const matchingRental = rentalsData?.find(rental => {
          const checklistDate = new Date(checklist.checklist_date);
          const startDate = new Date(rental.start_date);
          const endDate = new Date(rental.end_date);
          return checklistDate >= new Date(startDate.getTime() - 24*60*60*1000) && 
                 checklistDate <= new Date(endDate.getTime() + 24*60*60*1000);
        });

        let inferred_type: 'checkin' | 'checkout' | 'maintenance' = 'maintenance';
        if (matchingRental) {
          const checklistTime = new Date(checklist.checklist_date).getTime();
          const startTime = new Date(matchingRental.start_date).getTime();
          const endTime = new Date(matchingRental.end_date).getTime();
          const oneDayMs = 24 * 60 * 60 * 1000;
          
          if (Math.abs(checklistTime - startTime) <= oneDayMs) {
            inferred_type = 'checkin';
          } else if (Math.abs(checklistTime - endTime) <= oneDayMs) {
            inferred_type = 'checkout';
          }
        }

        return {
          ...checklist,
          display_type: checklist.checklist_type || inferred_type,
          display_customer_name: checklist.customer_name || matchingRental?.customer_name || null,
          rental: matchingRental || null,
        } as unknown as ChecklistHistoryItem;
      });
    },
    enabled: !!boatId && isReadyForQuery,
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

  // Calculate engine hours delta for a checkout by finding the matching checkin
  const getEngineHoursWithDelta = (checklist: ChecklistHistoryItem) => {
    if (!checklist.engine_hours_snapshot || !Array.isArray(checklist.engine_hours_snapshot)) return null;
    const engines = checklist.engine_hours_snapshot as EngineHoursSnapshot[];
    if (engines.length === 0) return null;

    if (checklist.display_type !== 'checkout' || !checklists) {
      return engines.map(eng => ({ ...eng, delta: null as number | null }));
    }

    // Find the matching checkin
    const matchingCheckin = checklists.find(c => {
      if (c.display_type !== 'checkin' || !c.engine_hours_snapshot) return false;
      // Match by rental_id first
      if (checklist.rental_id && c.rental_id && c.rental_id === checklist.rental_id) return true;
      // Fallback: same customer_name, most recent checkin before this checkout
      if (checklist.display_customer_name && c.display_customer_name === checklist.display_customer_name) {
        return new Date(c.checklist_date) <= new Date(checklist.checklist_date);
      }
      return false;
    });

    if (!matchingCheckin?.engine_hours_snapshot) {
      return engines.map(eng => ({ ...eng, delta: null as number | null }));
    }

    const checkinEngines = matchingCheckin.engine_hours_snapshot as EngineHoursSnapshot[];
    return engines.map(eng => {
      const checkinEng = checkinEngines.find(e => e.component_id === eng.component_id);
      return {
        ...eng,
        delta: checkinEng ? eng.hours - checkinEng.hours : null,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Check-in / Check-out</h3>
        <Badge variant="outline">{checklists.length} checklist(s)</Badge>
      </div>

      <div className="space-y-4">
        {checklists.map((checklist) => {
          const enginesWithDelta = getEngineHoursWithDelta(checklist);
          return (
          <Card key={checklist.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(checklist.overall_status)}
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Checklist {getTypeBadge(checklist.display_type)}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDateSafe(checklist.checklist_date)}
                        </span>
                      </div>
                      {(checklist.technician || checklist.technician_name) && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{checklist.technician?.name || checklist.technician_name}</span>
                        </div>
                      )}
                      {checklist.display_customer_name && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>Client: {checklist.display_customer_name}</span>
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
              {enginesWithDelta && enginesWithDelta.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-foreground mr-1">Moteurs:</span>
                  {enginesWithDelta.map((engine) => (
                    <Badge key={engine.component_id} variant="outline" className="text-xs">
                      {engine.component_name}: {engine.hours}h
                      {engine.delta != null && engine.delta > 0 && (
                        <span className="ml-1 font-bold text-green-600">(+{engine.delta}h)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}

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
                      Signée le {formatDateSafe(checklist.signature_date)}
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
                      checklist.display_customer_name || 'Client',
                      checklist.display_type
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
        );
        })}
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