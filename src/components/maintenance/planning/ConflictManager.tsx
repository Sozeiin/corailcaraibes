import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Users, 
  Ship, 
  Calendar, 
  CheckCircle, 
  X, 
  Clock,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PlanningConflict {
  id: string;
  activity_id_1: string;
  activity_id_2: string;
  conflict_type: 'technician_overlap' | 'boat_overlap';
  severity: 'warning' | 'error';
  auto_detected: boolean;
  resolved: boolean;
  resolution_notes?: string;
  created_at: string;
  activity1?: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    technician?: { name: string };
    boat?: { name: string };
  };
  activity2?: {
    id: string;
    title: string;
    scheduled_start: string;
    scheduled_end: string;
    technician?: { name: string };
    boat?: { name: string };
  };
}

interface ConflictManagerProps {
  baseId: string;
}

export function ConflictManager({ baseId }: ConflictManagerProps) {
  const [selectedConflict, setSelectedConflict] = useState<PlanningConflict | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conflicts with activity details
  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: ['planning-conflicts', baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planning_conflicts')
        .select(`
          *,
          activity1:planning_activities!activity_id_1(
            id,
            title,
            scheduled_start,
            scheduled_end,
            technician:profiles(name),
            boat:boats(name)
          ),
          activity2:planning_activities!activity_id_2(
            id,
            title,
            scheduled_start,
            scheduled_end,
            technician:profiles(name),
            boat:boats(name)
          )
        `)
        .eq('resolved', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(conflict => ({
        ...conflict,
        activity1: Array.isArray(conflict.activity1) ? conflict.activity1[0] : conflict.activity1,
        activity2: Array.isArray(conflict.activity2) ? conflict.activity2[0] : conflict.activity2
      })) as PlanningConflict[];
    }
  });

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: async ({ conflictId, notes }: { conflictId: string; notes: string }) => {
      const { error } = await supabase
        .from('planning_conflicts')
        .update({
          resolved: true,
          resolution_notes: notes
        })
        .eq('id', conflictId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-conflicts'] });
      setSelectedConflict(null);
      setResolutionNotes('');
      toast({
        title: "Conflit résolu",
        description: "Le conflit a été marqué comme résolu.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de résoudre le conflit.",
        variant: "destructive",
      });
    }
  });

  // Auto-resolve conflict mutation
  const autoResolveConflictMutation = useMutation({
    mutationFn: async (conflict: PlanningConflict) => {
      // For technician overlaps, suggest moving one activity
      if (conflict.conflict_type === 'technician_overlap' && conflict.activity2) {
        const newStartTime = new Date(conflict.activity1?.scheduled_end || '');
        const duration = new Date(conflict.activity2.scheduled_end).getTime() - 
                        new Date(conflict.activity2.scheduled_start).getTime();
        const newEndTime = new Date(newStartTime.getTime() + duration);

        // Update the second activity's schedule
        const { error: updateError } = await supabase
          .from('planning_activities')
          .update({
            scheduled_start: newStartTime.toISOString(),
            scheduled_end: newEndTime.toISOString()
          })
          .eq('id', conflict.activity_id_2);

        if (updateError) throw updateError;
      }

      // Mark conflict as resolved
      const { error } = await supabase
        .from('planning_conflicts')
        .update({
          resolved: true,
          resolution_notes: 'Résolution automatique: horaires ajustés'
        })
        .eq('id', conflict.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planning-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['planning-activities'] });
      toast({
        title: "Conflit résolu automatiquement",
        description: "Les horaires ont été ajustés pour éviter le conflit.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de résoudre automatiquement le conflit.",
        variant: "destructive",
      });
    }
  });

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'technician_overlap': return <Users className="w-4 h-4" />;
      case 'boat_overlap': return <Ship className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getConflictTitle = (type: string) => {
    switch (type) {
      case 'technician_overlap': return 'Conflit de technicien';
      case 'boat_overlap': return 'Conflit de bateau';
      default: return 'Conflit de planification';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Gestionnaire de Conflits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Chargement des conflits...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Gestionnaire de Conflits
          {conflicts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {conflicts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {conflicts.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p>Aucun conflit détecté</p>
            <p className="text-sm">Votre planification est cohérente !</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getConflictIcon(conflict.conflict_type)}
                      <h4 className="font-medium">
                        {getConflictTitle(conflict.conflict_type)}
                      </h4>
                    </div>
                    <Badge variant={getSeverityColor(conflict.severity)}>
                      {conflict.severity}
                    </Badge>
                  </div>

                  {/* Conflict details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {format(new Date(conflict.created_at), 'dd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                    </div>

                    {/* Activity 1 */}
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="font-medium text-sm">{conflict.activity1?.title}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(conflict.activity1?.scheduled_start || ''), 'HH:mm', { locale: fr })} - 
                          {format(new Date(conflict.activity1?.scheduled_end || ''), 'HH:mm', { locale: fr })}
                        </span>
                        {conflict.conflict_type === 'technician_overlap' && conflict.activity1?.technician && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {conflict.activity1.technician.name}
                          </span>
                        )}
                        {conflict.conflict_type === 'boat_overlap' && conflict.activity1?.boat && (
                          <span className="flex items-center gap-1">
                            <Ship className="w-3 h-3" />
                            {conflict.activity1.boat.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>

                    {/* Activity 2 */}
                    <div className="bg-muted/50 p-3 rounded">
                      <p className="font-medium text-sm">{conflict.activity2?.title}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(conflict.activity2?.scheduled_start || ''), 'HH:mm', { locale: fr })} - 
                          {format(new Date(conflict.activity2?.scheduled_end || ''), 'HH:mm', { locale: fr })}
                        </span>
                        {conflict.conflict_type === 'technician_overlap' && conflict.activity2?.technician && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {conflict.activity2.technician.name}
                          </span>
                        )}
                        {conflict.conflict_type === 'boat_overlap' && conflict.activity2?.boat && (
                          <span className="flex items-center gap-1">
                            <Ship className="w-3 h-3" />
                            {conflict.activity2.boat.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {conflict.conflict_type === 'technician_overlap' && (
                      <Button
                        size="sm"
                        onClick={() => autoResolveConflictMutation.mutate(conflict)}
                        disabled={autoResolveConflictMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Résolution auto
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedConflict(conflict)}
                      className="flex items-center gap-1"
                    >
                      Résoudre manuellement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Manual resolution dialog */}
        {selectedConflict && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-2">Résolution manuelle</h4>
            <Textarea
              placeholder="Notes de résolution..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="mb-3"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => resolveConflictMutation.mutate({
                  conflictId: selectedConflict.id,
                  notes: resolutionNotes
                })}
                disabled={resolveConflictMutation.isPending}
              >
                Marquer comme résolu
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedConflict(null);
                  setResolutionNotes('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}