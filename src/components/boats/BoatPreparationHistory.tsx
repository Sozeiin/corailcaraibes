import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PreparationChecklistDialog } from '@/components/preparation/PreparationChecklistDialog';
import { 
  Ship, 
  Calendar, 
  User, 
  Eye,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle
} from 'lucide-react';

interface BoatPreparationHistoryProps {
  boatId: string;
}

interface PreparationHistoryItem {
  id: string;
  status: string;
  created_at: string;
  completion_date?: string;
  anomalies_count: number;
  technician?: { name: string } | null;
  planning_activity?: { 
    title: string; 
    scheduled_start: string; 
    scheduled_end: string;
  } | null;
  template?: { name: string } | null;
}

export const BoatPreparationHistory = ({ boatId }: BoatPreparationHistoryProps) => {
  const [selectedPreparation, setSelectedPreparation] = useState<string | null>(null);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);

  const { data: preparations, isLoading } = useQuery({
    queryKey: ['boat-preparation-history', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_preparation_checklists')
        .select(`
          id,
          status,
          created_at,
          completion_date,
          anomalies_count,
          technician_id,
          planning_activity_id,
          template_id
        `)
        .eq('boat_id', boatId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Get technician names separately
      const technicianIds = data.map(p => p.technician_id).filter(Boolean);
      const { data: technicians } = technicianIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, name')
        .in('id', technicianIds) : { data: [] };

      // Get planning activities separately
      const activityIds = data.map(p => p.planning_activity_id).filter(Boolean);
      const { data: activities } = activityIds.length > 0 ? await supabase
        .from('planning_activities')
        .select('id, title, scheduled_start, scheduled_end')
        .in('id', activityIds) : { data: [] };

      // Get templates separately
      const templateIds = data.map(p => p.template_id).filter(Boolean);
      const { data: templates } = templateIds.length > 0 ? await supabase
        .from('preparation_checklist_templates')
        .select('id, name')
        .in('id', templateIds) : { data: [] };

      // Combine the data
      return data.map(preparation => ({
        ...preparation,
        technician: technicians?.find(t => t.id === preparation.technician_id) || null,
        planning_activity: activities?.find(a => a.id === preparation.planning_activity_id) || null,
        template: templates?.find(t => t.id === preparation.template_id) || null
      }));
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Ship className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-green-100 text-green-800">Prêt</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'anomaly':
        return <Badge className="bg-red-100 text-red-800">Anomalie</Badge>;
      default:
        return <Badge variant="outline">Statut inconnu</Badge>;
    }
  };

  const handleViewDetails = (preparationId: string) => {
    setSelectedPreparation(preparationId);
    setChecklistDialogOpen(true);
  };

  if (isLoading) {
    return <div>Chargement de l'historique des préparations...</div>;
  }

  if (!preparations || preparations.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Ship className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune préparation</h3>
          <p className="text-muted-foreground text-center">
            Aucune préparation n'a encore été enregistrée pour ce bateau.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Préparations de bateau</h3>
          <Badge variant="outline">{preparations.length} préparation(s)</Badge>
        </div>

        <div className="space-y-4">
          {preparations.map((preparation) => (
            <Card key={preparation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(preparation.status)}
                    <div>
                      <CardTitle className="text-lg">
                        {preparation.planning_activity?.title || 'Préparation standard'}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(preparation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {preparation.technician && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4" />
                            <span>{preparation.technician.name}</span>
                          </div>
                        )}
                        {preparation.template && (
                          <div className="flex items-center space-x-1">
                            <Ship className="h-4 w-4" />
                            <span>Template: {preparation.template.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(preparation.status)}
                    {preparation.anomalies_count > 0 && (
                      <Badge variant="destructive">
                        {preparation.anomalies_count} anomalie{preparation.anomalies_count > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {preparation.planning_activity && (
                  <div className="mb-4">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span>
                          Programmée du {new Date(preparation.planning_activity.scheduled_start).toLocaleString()} 
                          au {new Date(preparation.planning_activity.scheduled_end).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Créée le {new Date(preparation.created_at).toLocaleDateString()}
                    </div>
                    {preparation.completion_date && (
                      <div>
                        Terminée le {new Date(preparation.completion_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(preparation.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedPreparation && (
        <PreparationChecklistDialog
          preparationId={selectedPreparation}
          open={checklistDialogOpen}
          onOpenChange={(open) => {
            setChecklistDialogOpen(open);
            if (!open) {
              setSelectedPreparation(null);
            }
          }}
          readOnly={true}
        />
      )}
    </>
  );
};