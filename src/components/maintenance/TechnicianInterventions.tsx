import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Clock, Settings, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { InterventionDialog } from './InterventionDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { InterventionCompletionDialog } from './InterventionCompletionDialog';

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
    current_engine_hours: number;
    current_engine_hours_starboard?: number;
    current_engine_hours_port?: number;
  } | null;
}

export function TechnicianInterventions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ID de la base Martinique
  const MARTINIQUE_BASE_ID = '550e8400-e29b-41d4-a716-446655440001';
  const isMartiniqueTechnician =
    user?.role === 'technicien' && user?.baseId === MARTINIQUE_BASE_ID;
  
  const [completingInterventions, setCompletingInterventions] = useState<Set<string>>(new Set());
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionWithBoats | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [completionIntervention, setCompletionIntervention] = useState<InterventionWithBoats | null>(null);
  const [isCompletionDialogOpen, setIsCompletionDialogOpen] = useState(false);
  const [isInterventionDialogOpen, setIsInterventionDialogOpen] = useState(false);

  // Récupération de toutes les interventions pertinentes pour le technicien
  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['technician-interventions', user?.id, user?.baseId],
    queryFn: async () => {
      if (!user || user.role !== 'technicien') return [];

      const baseQuery = supabase
        .from('interventions')
        .select(`
          *,
          boats(name, model, current_engine_hours, current_engine_hours_starboard, current_engine_hours_port)
        `)
        .order('scheduled_date', { ascending: true });

      // Lorsque la base du technicien est connue, on récupère toutes les interventions de cette base
      // pour s'assurer que la section "Interventions disponibles" contient l'intégralité des tâches
      // non assignées de la base.
      const query = user.baseId ? baseQuery.eq('base_id', user.baseId) : baseQuery.eq('technician_id', user.id);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching technician interventions:', error);
        throw error;
      }

      if (!user.baseId) {
        // Si la base n'est pas définie (cas exceptionnel), on complète avec les interventions assignées au technicien
        const { data: assignedData, error: assignedError } = await supabase
          .from('interventions')
          .select(`
            *,
            boats(name, model, current_engine_hours, current_engine_hours_starboard, current_engine_hours_port)
          `)
          .eq('technician_id', user.id)
          .order('scheduled_date', { ascending: true });

        if (assignedError) {
          console.error('Error fetching technician interventions:', assignedError);
          throw assignedError;
        }

        const combined = [...(data || []), ...(assignedData || [])];
        const uniqueById = Array.from(new Map(combined.map((item) => [item.id, item])).values());
        return uniqueById;
      }

      return data || [];
    },
    enabled: !!user && user.role === 'technicien'
  });

  // Mes interventions assignées
  const myInterventions = interventions.filter(i => 
    i.technician_id === user?.id && 
    i.status !== 'completed' && 
    i.status !== 'cancelled'
  );
  
  // Interventions disponibles (non assignées dans ma base)
  const availableInterventions = interventions.filter(i => {
    // Interventions disponibles = toutes les interventions actives de la base
    // SAUF celles déjà assignées au technicien actuel
    const isNotMine = i.technician_id !== user?.id;
    const isActive = i.status !== 'completed' && i.status !== 'cancelled';
    
    return isNotMine && 
      i.base_id === user?.baseId && 
      isActive;
  });


  const handleCompleteIntervention = (intervention: InterventionWithBoats) => {
    setCompletionIntervention(intervention);
    setIsCompletionDialogOpen(true);
  };

  const handleCloseCompletion = () => {
    setIsCompletionDialogOpen(false);
    setCompletionIntervention(null);
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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Interventions</h2>
          <p className="text-gray-600 mt-1">
            Gérez vos interventions de maintenance au quotidien
          </p>
        </div>
        {isMartiniqueTechnician && (
          <Button
            onClick={() => setIsInterventionDialogOpen(true)}
            className="bg-marine-600 hover:bg-marine-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Créer une intervention
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
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
            <div className="space-y-3">
              {/* Version mobile : cartes au lieu de tableau */}
              <div className="block sm:hidden">
                {myInterventions.map((intervention) => (
                  <div 
                    key={intervention.id}
                    className="p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleRowClick(intervention)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{intervention.title}</h4>
                        <p className="text-xs text-gray-600 truncate">
                          {intervention.boats?.name} - {intervention.boats?.model}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(intervention.status)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {intervention.scheduled_date ? 
                          new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : 
                          'Non planifiée'
                        }
                      </span>
                      
                      <div onClick={(e) => e.stopPropagation()}>
                        {intervention.status === 'in_progress' || intervention.status === 'scheduled' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCompleteIntervention(intervention)}
                            className="h-6 px-2 text-xs"
                          >
                            Terminer
                          </Button>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {intervention.status === 'completed' ? 'Terminée' : '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Version desktop : tableau */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Intervention</TableHead>
                      <TableHead className="text-xs">Bateau</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteIntervention(intervention)}
                              className="h-7 px-3 text-xs"
                            >
                              Terminer
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-500">
                              {intervention.status === 'completed' ? 'Terminée' : '-'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
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
            <div className="space-y-3">
              {/* Version mobile : cartes au lieu de tableau */}
              <div className="block sm:hidden">
                {availableInterventions.map((intervention) => (
                  <div 
                    key={intervention.id}
                    className="p-4 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleRowClick(intervention)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{intervention.title}</h4>
                        <p className="text-xs text-gray-600 truncate">
                          {intervention.boats?.name} - {intervention.boats?.model}
                        </p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {getStatusBadge(intervention.status)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {intervention.scheduled_date ? 
                          new Date(intervention.scheduled_date).toLocaleDateString('fr-FR') : 
                          'Non planifiée'
                        }
                      </span>
                      <span className="text-xs text-blue-600 font-medium">Disponible</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Version desktop : tableau */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Intervention</TableHead>
                      <TableHead className="text-xs">Bateau</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableInterventions.map((intervention) => (
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Dialog de détails */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto mx-auto">{/* Dialog mobile-friendly */}
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
                      handleCompleteIntervention(selectedIntervention);
                      handleCloseDetail();
                    }}
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

      {/* Dialog de finalisation d'intervention */}
      {completionIntervention && (
        <InterventionCompletionDialog
          isOpen={isCompletionDialogOpen}
          onClose={handleCloseCompletion}
          intervention={completionIntervention}
        />
      )}

      {/* Dialog de création d'intervention (Martinique uniquement) */}
      {isMartiniqueTechnician && (
        <InterventionDialog
          isOpen={isInterventionDialogOpen}
          onClose={() => {
            setIsInterventionDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['technician-interventions'] });
          }}
          intervention={null}
        />
      )}
    </div>
  );
}