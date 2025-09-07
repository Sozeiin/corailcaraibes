import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileSignature, Mail, Eye } from 'lucide-react';

interface ChecklistStepsProps {
  currentStep: 'checklist' | 'review' | 'signatures' | 'email';
  isComplete: boolean;
}

export function ChecklistSteps({ currentStep, isComplete }: ChecklistStepsProps) {
  const steps = [
    {
      id: 'checklist',
      title: 'Inspection',
      description: 'Vérification des éléments',
      icon: CheckCircle,
    },
    {
      id: 'review',
      title: 'Revérification',
      description: 'Validation finale',
      icon: Eye,
    },
    {
      id: 'signatures',
      title: 'Signatures',
      description: 'Validation technicien/client',
      icon: FileSignature,
    },
    {
      id: 'email',
      title: 'Rapport',
      description: 'Envoi du rapport par email',
      icon: Mail,
    },
  ];

  const getStepStatus = (stepId: string) => {
    const stepIndex = steps.findIndex(s => s.id === stepId);
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    
    // L'étape de revérification est conditionnelle
    if (stepId === 'review') {
      if (currentStep === 'checklist') {
        return 'pending';
      } else if (currentStep === 'review') {
        return 'current';
      } else {
        return 'completed';
      }
    }
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'current':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center justify-between mb-6 overflow-x-auto">
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const Icon = step.icon;
        
        // Masque l'étape review si on ne l'a pas atteinte ou passée
        if (step.id === 'review' && currentStep === 'checklist') {
          return null;
        }
        
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center min-w-0">
              <div className={`rounded-full p-2 ${getStepColor(status)}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-center mt-2">
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs text-muted-foreground">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 w-16 mx-4 mt-[-24px] ${
                status === 'completed' ? 'bg-green-500' : 'bg-muted'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}