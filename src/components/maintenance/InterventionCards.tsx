import React from 'react';
import { Edit, Eye, Clock, User, Calendar, Wrench, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Intervention } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface InterventionCardsProps {
  interventions: Intervention[];
  isLoading: boolean;
  onEdit: (intervention: Intervention) => void;
  canManage: boolean;
  showHistory?: boolean;
  onDelete?: (intervention: Intervention) => void;
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
};

const statusLabels = {
  scheduled: 'Programmée',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée'
};

const statusIcons = {
  scheduled: Clock,
  in_progress: Wrench,
  completed: Clock,
  cancelled: Clock
};

export function InterventionCards({
  interventions,
  isLoading,
  onEdit,
  canManage,
  showHistory = false,
  onDelete
}: InterventionCardsProps) {
  // Fetch technician names
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('role', 'technicien');
      if (error) throw error;
      return data;
    }
  });
  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (interventions.length === 0) {
    return (
      <div className="p-8 text-center">
        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {showHistory ? 'Aucun historique' : 'Aucune intervention'}
        </h3>
        <p className="text-muted-foreground">
          {showHistory 
            ? 'Aucune intervention terminée pour la période sélectionnée.'
            : 'Commencez par créer votre première intervention.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
      {interventions.map((intervention) => {
        const StatusIcon = statusIcons[intervention.status as keyof typeof statusIcons];
        
        return (
          <Card 
            key={intervention.id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer group"
            onClick={() => onEdit(intervention)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {intervention.title}
                </CardTitle>
                <Badge className={statusColors[intervention.status as keyof typeof statusColors]}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusLabels[intervention.status as keyof typeof statusLabels]}
                </Badge>
              </div>
              {intervention.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {intervention.description}
                </p>
              )}
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench className="h-4 w-4" />
                <span>{intervention.boat?.name || `Bateau #${intervention.boatId.slice(0, 8)}`}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>
                  {(() => {
                    const technician = technicians.find(t => t.id === intervention.technicianId);
                    return technician ? technician.name : (intervention.technicianId ? 'Technicien assigné' : 'Non assigné');
                  })()}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {intervention.scheduledDate 
                    ? new Date(intervention.scheduledDate).toLocaleDateString('fr-FR')
                    : 'Date non définie'
                  }
                </span>
              </div>

              {showHistory && intervention.completedDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Terminée le {new Date(intervention.completedDate).toLocaleDateString('fr-FR')}</span>
                </div>
              )}

              {intervention.scheduledDate && intervention.completedDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Durée: {Math.ceil(
                      (new Date(intervention.completedDate).getTime() - 
                       new Date(intervention.scheduledDate).getTime()) / 
                      (1000 * 60 * 60 * 24)
                    )} jour(s)
                  </span>
                </div>
              )}
            </CardContent>

            {canManage && !showHistory && (
              <CardFooter className="pt-3 border-t bg-muted/30">
                <div className="flex justify-end space-x-1 w-full">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(intervention);
                    }}
                    className="hover:bg-background h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(intervention);
                    }}
                    className="hover:bg-background h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette intervention ?')) {
                          onDelete(intervention);
                        }
                      }}
                      className="hover:bg-background text-red-600 hover:text-red-700 h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>
        );
      })}
    </div>
  );
}