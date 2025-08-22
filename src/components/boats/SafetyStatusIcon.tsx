import React from 'react';
import { Shield } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';

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
  
  // Calculate expired controls
  const today = new Date();
  const expiredControls = boatControls.filter((control: any) => {
    if (!control.next_control_date) return false;
    const nextControlDate = new Date(control.next_control_date);
    return nextControlDate < today;
  });

  const expiredCount = expiredControls.length;

  // Determine color based on expired count
  const getStatusColor = () => {
    if (expiredCount === 0) return 'text-emerald-500'; // Green - safe
    if (expiredCount === 1) return 'text-amber-500';   // Orange - warning
    return 'text-red-500';                             // Red - danger
  };

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
      />
    </div>
  );
};