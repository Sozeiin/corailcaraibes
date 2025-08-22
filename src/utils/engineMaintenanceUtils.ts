export interface BoatEngineData {
  id: string;
  current_engine_hours: number;
  last_oil_change_hours: number;
}

/**
 * Calculate oil change status based on engine hours
 */
export const calculateOilChangeStatus = (currentHours: number, lastChangeHours: number): string => {
  const hoursSinceLastChange = currentHours - lastChangeHours;
  
  if (hoursSinceLastChange >= 250) {
    return 'overdue';
  } else if (hoursSinceLastChange >= 200) {
    return 'due_soon';
  } else {
    return 'ok';
  }
};

/**
 * Get oil change status color based on hours since last change
 */
export const getOilChangeStatusColor = (hoursSinceLastChange: number): string => {
  if (hoursSinceLastChange >= 250) return 'text-destructive'; // Red - overdue
  if (hoursSinceLastChange >= 200) return 'text-accent-foreground'; // Orange - due soon
  return 'text-secondary-foreground'; // Green - OK
};

/**
 * Get oil change status badge info
 */
export const getOilChangeStatusBadge = (currentHours: number, lastChangeHours: number) => {
  const hoursSinceLastChange = currentHours - lastChangeHours;
  const status = calculateOilChangeStatus(currentHours, lastChangeHours);
  const color = getOilChangeStatusColor(hoursSinceLastChange);
  
  return {
    status,
    color,
    hoursSinceLastChange,
    isOverdue: hoursSinceLastChange >= 250,
    isDueSoon: hoursSinceLastChange >= 200 && hoursSinceLastChange < 250,
    isOk: hoursSinceLastChange < 200
  };
};

/**
 * Calculate progress percentage toward next oil change (0-100%)
 */
export const calculateOilChangeProgress = (currentHours: number, lastChangeHours: number): number => {
  const hoursSinceLastChange = currentHours - lastChangeHours;
  const progress = (hoursSinceLastChange / 250) * 100;
  return Math.min(Math.max(progress, 0), 100);
};