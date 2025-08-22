export interface SafetyControlWithCategory {
  id: string;
  status: string;
  next_control_date?: string;
  safety_control_categories?: {
    name: string;
    color_code?: string;
  };
}

/**
 * Calculate the real status of a safety control based on expiration dates
 */
export const calculateControlStatus = (control: SafetyControlWithCategory): string => {
  // If no next control date is set, return the original status
  if (!control.next_control_date) {
    return control.status;
  }

  const today = new Date();
  const nextControlDate = new Date(control.next_control_date);
  
  // If the control is completed but the next control date has passed, it's expired
  if (control.status === 'completed' && nextControlDate < today) {
    return 'expired';
  }

  // Otherwise, return the original status
  return control.status;
};

/**
 * Count expired controls for a boat
 */
export const countExpiredControls = (controls: SafetyControlWithCategory[]): number => {
  return controls.filter(control => calculateControlStatus(control) === 'expired').length;
};

/**
 * Get safety status color based on expired count
 */
export const getSafetyStatusColor = (expiredCount: number): string => {
  if (expiredCount === 0) return 'text-emerald-500'; // Green - safe
  if (expiredCount === 1) return 'text-amber-500';   // Orange - warning
  return 'text-red-500';                             // Red - danger
};
