import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Clock,
  User,
  Ship,
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Cloud,
  Edit,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeatherEvaluation {
  suitable: boolean;
  violated_rules?: string[];
  recommendations?: string[];
}

interface Intervention {
  id: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  intervention_type?: string;
  technician_id?: string;
  boat_id?: string;
  created_at?: string;
  boats?: { id: string; name: string; model: string };
  profiles?: { first_name: string; last_name: string };
}

interface InterventionDetailsModalProps {
  intervention: Intervention | null;
  weatherEvaluation?: WeatherEvaluation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (intervention: Intervention) => void;
}

export function InterventionDetailsModal({
  intervention,
  weatherEvaluation,
  open,
  onOpenChange,
  onEdit,
}: InterventionDetailsModalProps) {
  if (!intervention) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return { icon: Clock, label: 'Programmé', variant: 'default' as const };
      case 'in_progress':
        return { icon: AlertCircle, label: 'En cours', variant: 'outline' as const };
      case 'completed':
        return { icon: CheckCircle, label: 'Terminé', variant: 'secondary' as const };
      case 'cancelled':
        return { icon: XCircle, label: 'Annulé', variant: 'destructive' as const };
      default:
        return { icon: Clock, label: 'Inconnu', variant: 'secondary' as const };
    }
  };

  const statusConfig = getStatusConfig(intervention.status);
  const StatusIcon = statusConfig.icon;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE d MMMM yyyy', { locale: fr });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timeString?: string) => {
    if (!timeString) return 'Non défini';
    return timeString.slice(0, 5);
  };

  const getWeatherSeverity = () => {
    if (!weatherEvaluation) return null;
    if (!weatherEvaluation.suitable) return 'blocked';
    if (weatherEvaluation.violated_rules && weatherEvaluation.violated_rules.length > 0) return 'warning';
    return 'suitable';
  };

  const getWeatherBadgeVariant = (severity: string | null) => {
    switch (severity) {
      case 'blocked': return 'destructive' as const;
      case 'warning': return 'outline' as const;
      case 'suitable': return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  const weatherSeverity = getWeatherSeverity();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            {intervention.title}
          </DialogTitle>
          <DialogDescription>
            Détails de l'intervention #{intervention.id.slice(0, 8)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Actions */}
          <div className="flex items-center justify-between">
            <Badge variant={statusConfig.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusConfig.label}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onEdit(intervention)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </Button>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Date programmée
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(intervention.scheduled_date)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Heure
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(intervention.scheduled_time)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Technicien assigné
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {intervention.profiles 
                      ? `${intervention.profiles.first_name} ${intervention.profiles.last_name}`
                      : 'Non assigné'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Ship className="h-4 w-4 text-muted-foreground" />
                    Bateau
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {intervention.boats 
                      ? `${intervention.boats.name} (${intervention.boats.model})`
                      : 'Non spécifié'
                    }
                  </p>
                </div>
              </div>

              {intervention.intervention_type && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Type d'intervention
                    </div>
                    <Badge variant="outline">{intervention.intervention_type}</Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {intervention.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {intervention.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Weather Evaluation */}
          {weatherEvaluation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Évaluation météorologique
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Statut:</span>
                  <Badge variant={getWeatherBadgeVariant(weatherSeverity)}>
                    {weatherSeverity === 'suitable' && 'Conditions favorables'}
                    {weatherSeverity === 'warning' && 'Conditions à surveiller'}
                    {weatherSeverity === 'blocked' && 'Conditions défavorables'}
                  </Badge>
                </div>

                {weatherEvaluation.violated_rules && weatherEvaluation.violated_rules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-orange-600">Règles violées:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {weatherEvaluation.violated_rules.map((rule, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertCircle className="h-3 w-3 text-orange-500 mt-0.5 flex-shrink-0" />
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {weatherEvaluation.recommendations && weatherEvaluation.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-600">Recommandations:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {weatherEvaluation.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Eye className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          {intervention.created_at && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Métadonnées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>
                    Créé le {format(new Date(intervention.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}