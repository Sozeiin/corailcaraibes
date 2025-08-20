import React from 'react';
import { Badge } from '@/components/ui/badge';
import { WORKFLOW_STEPS, WorkflowStatus } from '@/types/workflow';
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

interface WorkflowStatusIndicatorProps {
  status: WorkflowStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showProgress?: boolean;
  className?: string;
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

const getWorkflowProgress = (status: WorkflowStatus): { current: number; total: number; percentage: number } => {
  const statusOrder: WorkflowStatus[] = [
    'draft',
    'pending_approval',
    'approved', 
    'supplier_search',
    'order_confirmed',
    'shipping_antilles',
    'received_scanned',
    'completed'
  ];
  
  // Statuts finaux
  if (['rejected', 'cancelled'].includes(status)) {
    return { current: 0, total: 8, percentage: 0 };
  }
  
  const currentIndex = statusOrder.indexOf(status);
  const current = currentIndex >= 0 ? currentIndex + 1 : 0;
  const percentage = Math.round((current / statusOrder.length) * 100);
  
  return { current, total: statusOrder.length, percentage };
};

export function WorkflowStatusIndicator({ 
  status, 
  size = 'md', 
  showIcon = true, 
  showProgress = false,
  className = ''
}: WorkflowStatusIndicatorProps) {
  const stepConfig = WORKFLOW_STEPS[status] || { 
    label: status || 'Statut inconnu', 
    color: 'bg-gray-100 text-gray-800', 
    icon: 'Clock' 
  };
  const Icon = showIcon ? getIcon(stepConfig.icon) : null;
  const progress = showProgress ? getWorkflowProgress(status) : null;
  
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };
  
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`${stepConfig.color} ${sizeClasses[size]} flex items-center gap-1`}>
        {Icon && <Icon className={iconSizes[size]} />}
        {stepConfig.label}
      </Badge>
      
      {showProgress && progress && (
        <div className="flex items-center gap-2">
          <div className="w-20 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                ['rejected', 'cancelled'].includes(status) 
                  ? 'bg-red-400' 
                  : status === 'completed' 
                    ? 'bg-green-400' 
                    : 'bg-blue-400'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {progress.current}/{progress.total}
          </span>
        </div>
      )}
    </div>
  );
}

// Composant pour afficher une liste d'étapes avec indicateurs
interface WorkflowStepsOverviewProps {
  currentStatus: WorkflowStatus;
  className?: string;
  onShippingClick?: () => void; // Nouvelle prop pour gérer le clic sur l'expédition
}

export function WorkflowStepsOverview({ currentStatus, className = '', onShippingClick }: WorkflowStepsOverviewProps) {
  const allSteps: { status: WorkflowStatus; required: boolean }[] = [
    { status: 'draft', required: true },
    { status: 'pending_approval', required: true },
    { status: 'approved', required: true },
    { status: 'supplier_search', required: true },
    { status: 'order_confirmed', required: true },
    { status: 'shipping_antilles', required: true },
    { status: 'received_scanned', required: true },
    { status: 'completed', required: true }
  ];
  
  const getCurrentStepIndex = () => {
    return allSteps.findIndex(step => step.status === currentStatus);
  };
  
  const currentIndex = getCurrentStepIndex();
  const isFinalStatus = ['rejected', 'cancelled', 'completed'].includes(currentStatus);
  
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
        <span>Progression du workflow</span>
        <span>
          {isFinalStatus 
            ? 'Terminé' 
            : `${currentIndex + 1}/${allSteps.length}`
          }
        </span>
      </div>
      
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
        {allSteps.map((step, index) => {
          const isPassed = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isBlocked = ['rejected', 'cancelled'].includes(currentStatus);
          const isShippingStep = step.status === 'shipping_antilles';
          const canClickShipping = isShippingStep && (isPassed || isCurrent) && onShippingClick;
          
          const stepConfig = WORKFLOW_STEPS[step.status] || { 
            label: step.status, 
            color: 'bg-gray-100 text-gray-800', 
            icon: 'Clock' 
          };
          const Icon = getIcon(stepConfig.icon);
          
          return (
            <div
              key={step.status}
              className={`
                flex flex-col items-center p-2 rounded-lg text-center transition-all
                ${isPassed 
                  ? 'bg-green-50 text-green-700' 
                  : isCurrent 
                    ? isBlocked 
                      ? 'bg-red-50 text-red-700 ring-2 ring-red-200' 
                      : 'bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                    : 'bg-gray-50 text-gray-400'
                }
                ${canClickShipping 
                  ? 'cursor-pointer hover:shadow-md hover:scale-105 hover:bg-blue-100' 
                  : ''
                }
              `}
              title={canClickShipping ? `Cliquez pour voir le suivi de livraison - ${stepConfig.label}` : stepConfig.label}
              onClick={canClickShipping ? onShippingClick : undefined}
            >
              <Icon className="w-4 h-4 mb-1" />
              <span className="text-xs font-medium truncate w-full">
                {stepConfig.label.split(' ')[0]}
              </span>
              {canClickShipping && (
                <div className="text-xs text-blue-600 mt-1">
                  📦 Cliquez
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {['rejected', 'cancelled'].includes(currentStatus) && (
        <div className="text-center">
          <Badge variant="destructive" className="text-xs">
            {currentStatus === 'rejected' ? 'Demande rejetée' : 'Demande annulée'}
          </Badge>
        </div>
      )}
    </div>
  );
}