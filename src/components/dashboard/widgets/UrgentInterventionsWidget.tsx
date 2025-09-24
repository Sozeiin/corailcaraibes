import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetProps } from '@/types/widget';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMemo, useState } from 'react';
import { Zap, User, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { InterventionDialog } from '@/components/maintenance/InterventionDialog';

export const UrgentInterventionsWidget = ({ config }: WidgetProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dashboardData = useDashboardData();
  const [showInterventionDialog, setShowInterventionDialog] = useState(false);

  const urgentInterventions = useMemo(() => {
    if (dashboardData.loading) return [];

    const { interventions, boats } = dashboardData;
    
    return interventions
      .filter(intervention => 
        intervention.intervention_type === 'urgence' || 
        intervention.status === 'blocked' ||
        (intervention.status === 'in_progress' && intervention.priority === 'urgent')
      )
      .map(intervention => {
        const boat = boats.find(b => b.id === intervention.boat_id);
        const isOverdue = intervention.scheduled_date && 
          new Date(intervention.scheduled_date) < new Date();
        
        return {
          ...intervention,
          boatName: boat?.name || 'Bateau inconnu',
          isOverdue,
          timeInfo: intervention.scheduled_date 
            ? formatDistanceToNow(parseISO(intervention.scheduled_date), { 
                addSuffix: true, 
                locale: fr 
              })
            : null
        };
      })
      .sort((a, b) => {
        // Priorité: bloquées > en retard > en cours > urgentes
        if (a.status === 'blocked' && b.status !== 'blocked') return -1;
        if (b.status === 'blocked' && a.status !== 'blocked') return 1;
        if (a.isOverdue && !b.isOverdue) return -1;
        if (b.isOverdue && !a.isOverdue) return 1;
        if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
        if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
        return 0;
      })
      .slice(0, 4);
  }, [dashboardData]);

  const getStatusBadge = (status: string, isOverdue: boolean) => {
    if (status === 'blocked') return 'destructive';
    if (isOverdue) return 'destructive';
    if (status === 'in_progress') return 'default';
    if (status === 'urgent') return 'secondary';
    return 'outline';
  };

  const getStatusText = (status: string, isOverdue: boolean) => {
    if (status === 'blocked') return 'Bloquée';
    if (isOverdue) return 'En retard';
    if (status === 'in_progress') return 'En cours';
    if (status === 'urgent') return 'Urgente';
    return 'Planifiée';
  };

  const getStatusIcon = (status: string, isOverdue: boolean) => {
    if (status === 'blocked') return AlertCircle;
    if (isOverdue) return Clock;
    if (status === 'in_progress') return Zap;
    return ArrowRight;
  };

  const techniciansAvailable = useMemo(() => {
    // Simulate available technicians count
    const assignedTechnicians = urgentInterventions
      .filter(i => i.technician_id && i.status === 'in_progress')
      .map(i => i.technician_id);
    
    return Math.max(0, 3 - new Set(assignedTechnicians).size); // Assuming 3 total technicians
  }, [urgentInterventions]);

  if (dashboardData.loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {config.title}
          <Badge variant="outline" className="ml-auto">
            {urgentInterventions.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentInterventions.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            Aucune intervention urgente
          </div>
        ) : (
          urgentInterventions.map((intervention) => {
            const StatusIcon = getStatusIcon(intervention.status, intervention.isOverdue);
            
            return (
              <div key={intervention.id} className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <StatusIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{intervention.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {intervention.boatName}
                      {intervention.timeInfo && ` • ${intervention.timeInfo}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadge(intervention.status, intervention.isOverdue)}>
                    {getStatusText(intervention.status, intervention.isOverdue)}
                  </Badge>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={() => navigate(`/maintenance?intervention=${intervention.id}`)}
                  >
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
        
        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Techniciens disponibles
            </span>
            <Badge variant={techniciansAvailable > 0 ? "outline" : "secondary"}>
              {techniciansAvailable}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {urgentInterventions.some(i => !i.technician_id) && (
              <Button size="sm" className="flex-1" variant="outline">
                <User className="h-3 w-3 mr-1" />
                Réassigner
              </Button>
            )}
            <Button 
              size="sm" 
              className="flex-1" 
              variant="secondary"
              onClick={() => setShowInterventionDialog(true)}
            >
              <Zap className="h-3 w-3 mr-1" />
              Planifier urgente
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Intervention Dialog */}
      <InterventionDialog
        isOpen={showInterventionDialog}
        onClose={() => setShowInterventionDialog(false)}
      />
    </Card>
  );
};