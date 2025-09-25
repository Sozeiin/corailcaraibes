import React from 'react';
import { Wrench } from 'lucide-react';
import { getWorstOilChangeStatus, type EngineComponent } from '@/utils/engineMaintenanceUtils';

interface OilChangeStatusBadgeProps {
  engines: EngineComponent[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

export const OilChangeStatusBadge: React.FC<OilChangeStatusBadgeProps> = ({ 
  engines,
  size = 'md', 
  className = '',
  showTooltip = true
}) => {
  const badgeInfo = getWorstOilChangeStatus(engines);
  
  // Size mapping
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  const tooltipText = showTooltip ? 
    `Vidange: ${badgeInfo.hoursSinceLastChange}h max depuis la dernière (${badgeInfo.status === 'overdue' ? 'EN RETARD' : badgeInfo.status === 'due_soon' ? 'BIENTÔT' : 'OK'})` : 
    undefined;

  return (
    <div title={tooltipText}>
      <Wrench 
        className={`${sizeClasses[size]} ${badgeInfo.color} ${className}`}
        strokeWidth={3}
      />
    </div>
  );
};