import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Wrench, 
  Calendar, 
  User, 
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { InterventionDetailsDialog } from '@/components/maintenance/InterventionDetailsDialog';

interface BoatInterventionHistoryProps {
  boatId: string;
}

export const BoatInterventionHistory = ({ boatId }: BoatInterventionHistoryProps) => {
  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  
  const { data: history, isLoading } = useQuery({
    queryKey: ['boat-intervention-history', boatId],
    queryFn: async () => {
      const { data: interventions, error } = await supabase
        .from('interventions')
        .select(`
          *,
          technician:profiles!interventions_technician_id_fkey(name),
          intervention_parts(
            quantity,
            unit_cost,
            total_cost,
            part_name
          )
        `)
        .eq('boat_id', boatId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return interventions || [];
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Terminée</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">En cours</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Programmée</Badge>;
    }
  };

  if (isLoading) {
    return <div>Chargement de l'historique des interventions...</div>;
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucune intervention</h3>
          <p className="text-muted-foreground text-center">
            Aucune intervention n'a encore été enregistrée pour ce bateau.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Interventions de maintenance</h3>
        <Badge variant="outline">{history.length} intervention(s)</Badge>
      </div>

      <div className="space-y-4">
        {history.map((intervention) => (
          <Card key={intervention.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(intervention.status)}
                  <div>
                    <CardTitle className="text-lg">{intervention.title}</CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {intervention.scheduled_date 
                            ? new Date(intervention.scheduled_date).toLocaleDateString()
                            : 'Date non définie'
                          }
                        </span>
                      </div>
                      {(intervention.technician || (intervention as any).technician_name) && (
                        <div className="flex items-center space-x-1">
                          <User className="h-4 w-4" />
                          <span>{intervention.technician?.name || (intervention as any).technician_name}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Wrench className="h-4 w-4" />
                        <span>{intervention.intervention_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(intervention.status)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedInterventionId(intervention.id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir détails
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {intervention.description && (
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Description</span>
                  </div>
                  <p className="text-sm text-muted-foreground pl-6">
                    {intervention.description}
                  </p>
                </div>
              )}

              {intervention.intervention_parts && intervention.intervention_parts.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Pièces utilisées</span>
                  </div>
                  <div className="pl-6 space-y-2">
                    {intervention.intervention_parts.map((part, partIndex) => (
                      <div key={partIndex} className="flex items-center justify-between text-sm">
                        <span>{part.part_name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">
                            Qty: {part.quantity}
                          </span>
                          <span className="font-medium">
                            {part.total_cost}€
                          </span>
                        </div>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-end">
                      <span className="text-sm font-semibold">
                        Total pièces: {
                          intervention.intervention_parts
                            .reduce((sum, part) => sum + (part.total_cost || 0), 0)
                            .toFixed(2)
                        }€
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Créée le {new Date(intervention.created_at).toLocaleDateString()}
                </span>
                {intervention.completed_date && (
                  <span>
                    Terminée le {new Date(intervention.completed_date).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <InterventionDetailsDialog
        isOpen={!!selectedInterventionId}
        onClose={() => setSelectedInterventionId(null)}
        interventionId={selectedInterventionId || ''}
      />
    </div>
  );
};