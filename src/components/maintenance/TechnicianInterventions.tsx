import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Settings, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Intervention } from '@/types';

export function TechnicianInterventions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [completingInterventions, setCompletingInterventions] = useState<Set<string>>(new Set());

  // Récupération de toutes les interventions pertinentes pour le technicien
  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['technician-interventions', user?.id],
    queryFn: async () => {
      if (!user || user.role !== 'technicien') return [];

      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model)
        `)
        .or(`technician_id.eq.${user.id},and(base_id.eq.${user.baseId},technician_id.is.null)`)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && user.role === 'technicien'
  });

  // Mes interventions assignées
  const myInterventions = interventions.filter(i => i.technician_id === user?.id);
  
  // Interventions disponibles (non assignées dans ma base)
  const availableInterventions = interventions.filter(i => 
    i.technician_id === null && 
    i.base_id === user?.baseId &&
    i.status !== 'completed' &&
    i.status !== 'cancelled'
  );

  const handleCompleteIntervention = async (interventionId: string) => {
    if (!user) return;
    
    setCompletingInterventions(prev => new Set(prev).add(interventionId));

    try {
      const { error } = await supabase
        .from('interventions')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', interventionId);

      if (error) throw error;

      toast({
        title: "Intervention terminée",
        description: "L'intervention a été marquée comme terminée.",
      });

      // Actualiser les données
      queryClient.invalidateQueries({ queryKey: ['technician-interventions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-interventions'] });
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer l'intervention.",
        variant: "destructive"
      });
    } finally {
      setCompletingInterventions(prev => {
        const next = new Set(prev);
        next.delete(interventionId);
        return next;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      'scheduled': { variant: 'outline' as const, label: 'Programmée', color: 'text-blue-600' },
      'in_progress': { variant: 'default' as const, label: 'En cours', color: 'text-orange-600' },
      'completed': { variant: 'default' as const, label: 'Terminée', color: 'text-green-600' },
      'cancelled': { variant: 'secondary' as const, label: 'Annulée', color: 'text-gray-600' },
    };
    
    const config = configs[status as keyof typeof configs] || configs.scheduled;
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mes Interventions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-marine-600" />
            Mes Interventions ({myInterventions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myInterventions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune intervention assignée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intervention</TableHead>
                  <TableHead>Bateau</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myInterventions.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intervention.title}</p>
                        {intervention.description && (
                          <p className="text-sm text-gray-600 truncate">
                            {intervention.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intervention.boats?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {intervention.boats?.model || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {intervention.scheduled_date ? 
                        new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : 
                        'Non planifiée'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(intervention.status)}
                    </TableCell>
                    <TableCell>
                      {intervention.status === 'in_progress' || intervention.status === 'scheduled' ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`complete-${intervention.id}`}
                            checked={false}
                            onCheckedChange={() => handleCompleteIntervention(intervention.id)}
                            disabled={completingInterventions.has(intervention.id)}
                          />
                          <label 
                            htmlFor={`complete-${intervention.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            Terminer
                          </label>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">
                          {intervention.status === 'completed' ? 'Terminée' : 'N/A'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Interventions Disponibles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Interventions Disponibles ({availableInterventions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {availableInterventions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune intervention disponible</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Intervention</TableHead>
                  <TableHead>Bateau</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableInterventions.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intervention.title}</p>
                        {intervention.description && (
                          <p className="text-sm text-gray-600 truncate">
                            {intervention.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intervention.boats?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {intervention.boats?.model || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {intervention.scheduled_date ? 
                        new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : 
                        'Non planifiée'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(intervention.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}