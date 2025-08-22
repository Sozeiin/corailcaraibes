import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Wrench, Calendar, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface MaintenanceAlert {
  id: string;
  type: 'oil_change' | 'safety_control' | 'intervention';
  boatId: string;
  boatName: string;
  message: string;
  urgency: 'critical' | 'warning' | 'info';
  dueDate?: string;
  hoursSinceLastChange?: number;
}

interface MaintenanceAlertsPanelProps {
  alerts: MaintenanceAlert[];
  className?: string;
}

export const MaintenanceAlertsPanel: React.FC<MaintenanceAlertsPanelProps> = ({ 
  alerts,
  className = ""
}) => {
  const navigate = useNavigate();

  // Sort alerts by urgency (critical first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, info: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  const getAlertIcon = (type: MaintenanceAlert['type']) => {
    switch (type) {
      case 'oil_change': return Wrench;
      case 'safety_control': return AlertTriangle;
      case 'intervention': return Calendar;
      default: return AlertTriangle;
    }
  };

  const getUrgencyVariant = (urgency: MaintenanceAlert['urgency']) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      case 'info': return 'secondary';
      default: return 'secondary';
    }
  };

  const getUrgencyLabel = (urgency: MaintenanceAlert['urgency']) => {
    switch (urgency) {
      case 'critical': return 'Critique';
      case 'warning': return 'Attention';
      case 'info': return 'Info';
      default: return urgency;
    }
  };

  const handleAlertClick = (alert: MaintenanceAlert) => {
    switch (alert.type) {
      case 'oil_change':
      case 'intervention':
        navigate(`/boats/${alert.boatId}`);
        break;
      case 'safety_control':
        navigate(`/boats/${alert.boatId}/safety-controls`);
        break;
      default:
        navigate(`/boats/${alert.boatId}`);
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertes de Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune alerte active</p>
            <p className="text-sm">Toutes les maintenances sont à jour</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Alertes de Maintenance
          <Badge variant="destructive" className="ml-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sortedAlerts.map((alert) => {
            const AlertIcon = getAlertIcon(alert.type);
            
            return (
              <div 
                key={alert.id}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors cursor-pointer"
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex-shrink-0 pt-0.5">
                  <AlertIcon className={`h-4 w-4 ${
                    alert.urgency === 'critical' ? 'text-destructive' :
                    alert.urgency === 'warning' ? 'text-accent-foreground' :
                    'text-muted-foreground'
                  }`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{alert.boatName}</p>
                    <Badge variant={getUrgencyVariant(alert.urgency)} className="text-xs">
                      {getUrgencyLabel(alert.urgency)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alert.message}
                  </p>
                  
                  {alert.hoursSinceLastChange && (
                    <p className="text-xs text-muted-foreground">
                      {alert.hoursSinceLastChange}h depuis la dernière vidange
                    </p>
                  )}
                  
                  {alert.dueDate && (
                    <p className="text-xs text-muted-foreground">
                      Échéance: {new Date(alert.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAlertClick(alert);
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};