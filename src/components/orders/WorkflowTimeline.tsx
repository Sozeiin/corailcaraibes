import React from 'react';
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
  FileText 
} from 'lucide-react';
import { WorkflowStep, WORKFLOW_STEPS, WorkflowStatus } from '@/types/workflow';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkflowTimelineProps {
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

export function WorkflowTimeline({ orderId }: WorkflowTimelineProps) {
  const { data: steps = [], isLoading } = useQuery({
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
    enabled: !!orderId
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentStep = steps.find(step => !step.completedAt);
  const completedSteps = steps.filter(step => step.completedAt);

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Suivi du workflow</h3>
        
        <div className="space-y-4">
          {steps.map((step, index) => {
            const stepConfig = WORKFLOW_STEPS[step.stepStatus];
            const Icon = getIcon(stepConfig.icon);
            const isCompleted = !!step.completedAt;
            const isCurrent = !isCompleted && currentStep?.id === step.id;
            
            return (
              <div key={step.id} className="relative">
                <div className="flex items-start space-x-4">
                  {/* Icône et ligne de connexion */}
                  <div className="relative">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      ${isCompleted 
                        ? 'bg-green-100 text-green-600' 
                        : isCurrent 
                          ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-300' 
                          : 'bg-gray-100 text-gray-400'
                      }
                    `}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    {/* Ligne de connexion vers le prochain élément */}
                    {index < steps.length - 1 && (
                      <div className={`
                        absolute left-5 top-10 w-0.5 h-8
                        ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}
                      `} />
                    )}
                  </div>

                  {/* Contenu de l'étape */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {step.stepName}
                        </h4>
                        {step.stepDescription && (
                          <p className="text-xs text-gray-500 mt-1">
                            {step.stepDescription}
                          </p>
                        )}
                      </div>
                      
                      <Badge className={stepConfig.color}>
                        {stepConfig.label}
                      </Badge>
                    </div>

                    {/* Détails de l'étape */}
                    <div className="mt-2 space-y-1">
                      {step.userName && (
                        <p className="text-xs text-gray-600">
                          Par: {step.userName}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500">
                        Démarrée: {formatDistanceToNow(new Date(step.startedAt), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </p>
                      
                      {step.completedAt && (
                        <p className="text-xs text-gray-500">
                          Terminée: {formatDistanceToNow(new Date(step.completedAt), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                          {step.durationMinutes && (
                            <span className="ml-2">
                              (Durée: {Math.round(step.durationMinutes)} min)
                            </span>
                          )}
                        </p>
                      )}
                      
                      {step.notes && (
                        <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded mt-2">
                          {step.notes}
                        </p>
                      )}
                      
                      {step.autoCompleted && (
                        <Badge variant="outline" className="text-xs">
                          Automatique
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <Separator className="my-4 ml-14" />
                )}
              </div>
            );
          })}
        </div>

        {/* Résumé */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {completedSteps.length}
              </div>
              <div className="text-xs text-gray-600">Étapes terminées</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {currentStep ? 1 : 0}
              </div>
              <div className="text-xs text-gray-600">Étape en cours</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-600">
                {steps.length}
              </div>
              <div className="text-xs text-gray-600">Total étapes</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}