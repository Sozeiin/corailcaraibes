import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Settings, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Intervention } from '@/types';

// Type pour les données de l'intervention depuis Supabase
interface InterventionWithBoats {
  id: string;
  title: string;
  description: string | null;
  boat_id: string | null;
  technician_id: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string | null;
  completed_date: string | null;
  base_id: string | null;
  created_at: string;
  boats?: {
    name: string;
    model: string;
  } | null;
}

export function TechnicianInterventions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [completingInterventions, setCompletingInterventions] = useState<Set<string>>(new Set());
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionWithBoats | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

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

  const handleRowClick = (intervention: InterventionWithBoats) => {
    setSelectedIntervention(intervention);
    setIsDetailDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailDialogOpen(false);
    setSelectedIntervention(null);
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

  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
                  <TableRow 
                    key={intervention.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(intervention)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {truncateText(intervention.title, 25)}
                        </p>
                        {intervention.description && (
                          <p className="text-xs text-gray-600">
                            {truncateText(intervention.description, 35)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {truncateText(intervention.boats?.name || 'N/A', 15)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {truncateText(intervention.boats?.model || 'N/A', 15)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {intervention.scheduled_date ? 
                        new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(intervention.status)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {intervention.status === 'in_progress' || intervention.status === 'scheduled' ? (
                        <div className="flex items-center gap-1">
                          <Checkbox
                            id={`complete-${intervention.id}`}
                            checked={false}
                            onCheckedChange={() => handleCompleteIntervention(intervention.id)}
                            disabled={completingInterventions.has(intervention.id)}
                          />
                          <label 
                            htmlFor={`complete-${intervention.id}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            OK
                          </label>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {intervention.status === 'completed' ? 'OK' : '-'}
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

      {/* Dialog de détails */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Détails de l'intervention</DialogTitle>
          </DialogHeader>
          
          {selectedIntervention && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Titre</label>
                  <p className="text-sm text-gray-900 mt-1">{selectedIntervention.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Statut</label>
                  <div className="mt-1">
                    {getStatusBadge(selectedIntervention.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Bateau</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedIntervention.boats?.name || 'Non spécifié'} - {selectedIntervention.boats?.model || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date programmée</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedIntervention.scheduled_date ? 
                      new Date(selectedIntervention.scheduled_date).toLocaleDateString('fr-FR') : 
                      'Non planifiée'
                    }
                  </p>
                </div>
              </div>

              {selectedIntervention.completed_date && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Date de fin</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(selectedIntervention.completed_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}

              {selectedIntervention.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                    {selectedIntervention.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={handleCloseDetail}>
                  Fermer
                </Button>
                {(selectedIntervention.status === 'in_progress' || selectedIntervention.status === 'scheduled') && (
                  <Button
                    onClick={() => {
                      handleCompleteIntervention(selectedIntervention.id);
                      handleCloseDetail();
                    }}
                    disabled={completingInterventions.has(selectedIntervention.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Terminer l'intervention
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}