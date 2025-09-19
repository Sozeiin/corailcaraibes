import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Ship, Calendar, Clock, CheckCircle, AlertTriangle, Play } from 'lucide-react';
import { PreparationChecklistDialog } from '@/components/preparation/PreparationChecklistDialog';
import { toast } from 'sonner';

interface TechnicianPreparation {
  id: string;
  boat: {
    id: string;
    name: string;
    model: string;
  };
  status: 'in_progress' | 'ready' | 'anomaly';
  planning_activity: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
  };
  anomalies_count: number;
  created_at: string;
}

export function TechnicianPreparations() {
  const { user } = useAuth();
  const [selectedPreparation, setSelectedPreparation] = useState<TechnicianPreparation | null>(null);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);

  // Fetch technician's assigned preparations
  const { data: preparations = [] } = useQuery({
    queryKey: ['technician-preparations', user?.id],
    queryFn: async () => {
      // First get planning activities assigned to technician
      const { data: activities, error: activitiesError } = await supabase
        .from('planning_activities')
        .select(`
          id,
          title,
          scheduled_start,
          scheduled_end,
          boats(id, name, model)
        `)
        .eq('technician_id', user?.id)
        .eq('activity_type', 'preparation')
        .in('status', ['planned', 'in_progress']);

      if (activitiesError) throw activitiesError;

      if (!activities || activities.length === 0) {
        return [];
      }

      // Get the preparation checklists for these activities
      const { data: checklists, error: checklistsError } = await supabase
        .from('boat_preparation_checklists')
        .select(`
          id,
          status,
          anomalies_count,
          created_at,
          planning_activity_id
        `)
        .in('planning_activity_id', activities.map(a => a.id))
        .in('status', ['in_progress', 'anomaly', 'ready']);

      if (checklistsError) throw checklistsError;

      // Combine the data
      const combinedData = checklists?.map(checklist => {
        const activity = activities.find(a => a.id === checklist.planning_activity_id);
        return {
          id: checklist.id,
          status: checklist.status,
          anomalies_count: checklist.anomalies_count,
          created_at: checklist.created_at,
          boat: activity?.boats,
          planning_activity: {
            id: activity?.id,
            title: activity?.title,
            scheduled_start: activity?.scheduled_start,
            scheduled_end: activity?.scheduled_end
          }
        };
      }) || [];

      return combinedData as TechnicianPreparation[];
    },
    enabled: !!user?.id
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />En cours</Badge>;
      case 'ready':
        return (
          <div className="flex flex-col items-center gap-1">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />Terminé
            </Badge>
            <span className="text-xs text-green-600 font-medium">Prêt pour check-in</span>
          </div>
        );
      case 'anomaly':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Anomalie</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStartPreparation = (preparation: TechnicianPreparation) => {
    setSelectedPreparation(preparation);
    setChecklistDialogOpen(true);
  };

  const isOverdue = (scheduledEnd: string) => {
    return new Date(scheduledEnd) < new Date();
  };

  const getTimeUntilDeadline = (scheduledEnd: string) => {
    const now = new Date();
    const deadline = new Date(scheduledEnd);
    const diffMs = deadline.getTime() - now.getTime();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return `En retard de ${Math.abs(diffHours)}h`;
    } else if (diffHours < 24) {
      return `${diffHours}h restantes`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `${diffDays}j restantes`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Mes préparations</h2>
        <p className="text-gray-600">Préparations de bateaux qui vous sont assignées</p>
      </div>

      {preparations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Ship className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Aucune préparation assignée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {preparations.map((prep) => (
            <Card key={prep.id} className={isOverdue(prep.planning_activity.scheduled_end) ? 'border-red-300' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ship className="w-5 h-5" />
                  {prep.boat.name} ({prep.boat.model})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusBadge(prep.status)}
                  {isOverdue(prep.planning_activity.scheduled_end) && (
                    <Badge variant="destructive">En retard</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Début prévu
                    </p>
                    <p>{new Date(prep.planning_activity.scheduled_start).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Fin prévue
                    </p>
                    <p className={isOverdue(prep.planning_activity.scheduled_end) ? 'text-red-600 font-medium' : ''}>
                      {new Date(prep.planning_activity.scheduled_end).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Temps restant</p>
                    <p className={isOverdue(prep.planning_activity.scheduled_end) ? 'text-red-600 font-medium' : ''}>
                      {getTimeUntilDeadline(prep.planning_activity.scheduled_end)}
                    </p>
                  </div>
                </div>

                {prep.anomalies_count > 0 && (
                  <div className="mb-4">
                    <Badge variant="destructive" className="mr-2">
                      {prep.anomalies_count} anomalie{prep.anomalies_count > 1 ? 's' : ''}
                    </Badge>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={() => handleStartPreparation(prep)}>
                    <Play className="w-4 h-4 mr-2" />
                    Ouvrir la checklist
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPreparation && (
        <PreparationChecklistDialog
          preparationId={selectedPreparation.id}
          open={checklistDialogOpen}
          onOpenChange={setChecklistDialogOpen}
        />
      )}
    </div>
  );
}