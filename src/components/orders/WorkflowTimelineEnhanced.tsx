import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  CheckCircle, 
  Search, 
  ShoppingCart, 
  Ship, 
  Scan, 
  CheckCircle2, 
  XCircle, 
  X, 
  FileText,
  Zap,
  Users
} from 'lucide-react';
import { WorkflowStep, WORKFLOW_STEPS, WorkflowStatus } from '@/types/workflow';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkflowTimelineEnhancedProps {
  orderId: string;
}

const getIcon = (iconName: string) => {
  const icons = {
    Clock,
    CheckCircle,
    Search,
    ShoppingCart,
    Ship,
    Scan,
    CheckCircle2,
    XCircle,
    X,
    FileText
  };
  return icons[iconName as keyof typeof icons] || Clock;
};

export function WorkflowTimelineEnhanced({ orderId }: WorkflowTimelineEnhancedProps) {
  const { data: steps = [], isLoading, refetch } = useQuery({
    queryKey: ['workflow-steps', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_workflow_steps')
        .select('*')
        .eq('order_id', orderId)
        .order('step_number', { ascending: true });

      if (error) throw error;
      
      return data.map(step => ({
        id: step.id,
        orderId: step.order_id,
        stepStatus: step.step_status as WorkflowStatus,
        stepNumber: step.step_number,
        stepName: step.step_name,
        stepDescription: step.step_description,
        userId: step.user_id,
        userName: step.user_name,
        startedAt: step.started_at,
        completedAt: step.completed_at,
        durationMinutes: step.duration_minutes,
        notes: step.notes,
        autoCompleted: step.auto_completed,
        createdAt: step.created_at
      })) as WorkflowStep[];
    },
    enabled: !!orderId,
    refetchInterval: 30000 // Rafraîchissement automatique toutes les 30 secondes
  });

  // Écouter les changements en temps réel
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel('workflow-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_workflow_steps',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, refetch]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStep = steps.find(step => !step.completedAt);
  const completedSteps = steps.filter(step => step.completedAt);
  const hasRejectedOrCancelled = steps.some(step => ['rejected', 'cancelled'].includes(step.stepStatus));

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Suivi du workflow
          </h3>
          
          {/* Indicateur de mise à jour en temps réel */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Mise à jour en temps réel</span>
          </div>
        </div>
        
        {/* Progression globale */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Progression globale</span>
            <span className="text-sm font-semibold text-blue-900">
              {Math.round((completedSteps.length / Math.max(steps.length, 1)) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                hasRejectedOrCancelled 
                  ? 'bg-red-400' 
                  : completedSteps.length === steps.length 
                    ? 'bg-green-400' 
                    : 'bg-blue-400'
              }`}
              style={{ 
                width: `${Math.round((completedSteps.length / Math.max(steps.length, 1)) * 100)}%` 
              }}
            />
          </div>
        </div>
        
        <div className="space-y-6">
          {steps.map((step, index) => {
            const stepConfig = WORKFLOW_STEPS[step.stepStatus];
            const Icon = getIcon(stepConfig.icon);
            const isCompleted = !!step.completedAt;
            const isCurrent = !isCompleted && currentStep?.id === step.id;
            const isUpcoming = !isCompleted && !isCurrent;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex items-start space-x-4">
                  {/* Icône et ligne de connexion améliorées */}
                  <div className="relative">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm
                      ${isCompleted 
                        ? 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 ring-2 ring-green-300' 
                        : isCurrent 
                          ? hasRejectedOrCancelled
                            ? 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 ring-2 ring-red-300 animate-pulse'
                            : 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 ring-2 ring-blue-300 animate-pulse'
                          : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500'
                      }
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    {/* Ligne de connexion avec dégradé */}
                    {index < steps.length - 1 && (
                      <div className={`
                        absolute left-6 top-12 w-0.5 h-10 transition-all duration-300
                        ${isCompleted 
                          ? 'bg-gradient-to-b from-green-300 to-green-200' 
                          : 'bg-gradient-to-b from-gray-200 to-gray-100'
                        }
                      `} />
                    )}
                  </div>

                  {/* Contenu de l'étape avec animations */}
                  <div className="flex-1 min-w-0">
                    <div className={`
                      p-4 rounded-lg border transition-all duration-300
                      ${isCompleted 
                        ? 'bg-green-50 border-green-200' 
                        : isCurrent 
                          ? hasRejectedOrCancelled
                            ? 'bg-red-50 border-red-200'
                            : 'bg-blue-50 border-blue-200 shadow-md'
                          : 'bg-gray-50 border-gray-200'
                      }
                    `}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            {step.stepName}
                            {step.autoCompleted && (
                              <Zap className="w-4 h-4 text-yellow-500" />
                            )}
                          </h4>
                          {step.stepDescription && (
                            <p className="text-sm text-gray-600 mt-1">
                              {step.stepDescription}
                            </p>
                          )}
                        </div>
                        
                        <Badge className={`${stepConfig.color} shadow-sm`}>
                          {stepConfig.label}
                        </Badge>
                      </div>

                      {/* Détails avec icônes */}
                      <div className="space-y-2">
                        {step.userName && (
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Users className="w-4 h-4" />
                            <span>Par: {step.userName}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>
                            Démarrée: {formatDistanceToNow(new Date(step.startedAt), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                        </div>
                        
                        {step.completedAt && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span>
                              Terminée: {formatDistanceToNow(new Date(step.completedAt), { 
                                addSuffix: true, 
                                locale: fr 
                              })}
                              {step.durationMinutes && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {Math.round(step.durationMinutes)} min
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {step.notes && (
                          <div className="mt-3 p-3 bg-white/70 rounded border border-gray-200">
                            <p className="text-sm text-gray-800">
                              {step.notes}
                            </p>
                          </div>
                        )}
                        
                        {step.autoCompleted && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            <Zap className="w-3 h-3 mr-1" />
                            Traitement automatique
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Résumé amélioré avec statistiques */}
        <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Statistiques du workflow</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {completedSteps.length}
              </div>
              <div className="text-xs text-gray-600">Étapes terminées</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {currentStep ? 1 : 0}
              </div>
              <div className="text-xs text-gray-600">Étape en cours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {steps.length}
              </div>
              <div className="text-xs text-gray-600">Total étapes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {steps.filter(s => s.autoCompleted).length}
              </div>
              <div className="text-xs text-gray-600">Automatiques</div>
            </div>
          </div>
          
          {/* Durée totale estimée */}
          {completedSteps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 text-center">
                Durée moyenne par étape: {' '}
                <span className="font-semibold">
                  {Math.round(
                    completedSteps
                      .filter(s => s.durationMinutes)
                      .reduce((acc, s) => acc + (s.durationMinutes || 0), 0) / 
                    Math.max(completedSteps.filter(s => s.durationMinutes).length, 1)
                  )} minutes
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}