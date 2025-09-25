import React from 'react';
import { Shield } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { countExpiredControls, getSafetyStatusColor } from '@/utils/safetyControlUtils';

interface SafetyStatusIconProps {
  boatId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const SafetyStatusIcon: React.FC<SafetyStatusIconProps> = ({ 
  boatId, 
  size = 'md', 
  className = '' 
}) => {
  const { data: safetyControls = [] } = useOfflineData<any>({
    table: 'boat_safety_controls',
    dependencies: [boatId]
  });

  // Filter controls for this specific boat
  const boatControls = safetyControls.filter((control: any) => control.boat_id === boatId);
  
  // Calculate expired controls using shared utility
  const expiredCount = countExpiredControls(boatControls);

  // Get status color using shared utility
  const getStatusColor = () => getSafetyStatusColor(expiredCount);

  // Size mapping
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  };

  return (
    <div title={`Contrôles expirés: ${expiredCount}`}>
      <Shield 
        className={`${sizeClasses[size]} ${getStatusColor()} ${className}`}
        strokeWidth={3}
      />
    </div>
  );
};