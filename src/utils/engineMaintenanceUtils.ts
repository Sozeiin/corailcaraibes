export const DEFAULT_OIL_CHANGE_INTERVAL = 250;

/** Threshold (in hours before the interval) at which the "due soon" warning starts. */
const DUE_SOON_RATIO = 0.8; // 80% of the interval

export interface BoatEngineData {
  id: string;
  current_engine_hours: number;
  last_oil_change_hours: number;
  oil_change_interval_hours?: number;
}

export interface EngineComponent {
  id: string;
  component_name: string;
  component_type: string;
  current_engine_hours: number;
  last_oil_change_hours: number;
  oil_change_interval_hours?: number;
}

export interface BoatEngineComponentsData {
  id: string;
  name: string;
  components: EngineComponent[];
}

const resolveInterval = (interval?: number): number => {
  if (!interval || interval <= 0) return DEFAULT_OIL_CHANGE_INTERVAL;
  return interval;
};

/**
 * Calculate oil change status based on engine hours
 */
export const calculateOilChangeStatus = (
  currentHours: number,
  lastChangeHours: number,
  interval: number = DEFAULT_OIL_CHANGE_INTERVAL
): string => {
  const limit = resolveInterval(interval);
  const dueSoon = limit * DUE_SOON_RATIO;
  const hoursSinceLastChange = currentHours - lastChangeHours;

  if (hoursSinceLastChange >= limit) {
    return 'overdue';
  } else if (hoursSinceLastChange >= dueSoon) {
    return 'due_soon';
  } else {
    return 'ok';
  }
};

/**
 * Get oil change status color based on hours since last change
 */
export const getOilChangeStatusColor = (
  hoursSinceLastChange: number,
  interval: number = DEFAULT_OIL_CHANGE_INTERVAL
): string => {
  const limit = resolveInterval(interval);
  if (hoursSinceLastChange >= limit) return 'text-red-500'; // Red - overdue
  if (hoursSinceLastChange >= limit * DUE_SOON_RATIO) return 'text-orange-500'; // Orange - due soon
  return 'text-green-500'; // Green - OK
};

/**
 * Get oil change status badge info for engine components
 */
export const getOilChangeStatusBadge = (
  currentHours: number,
  lastChangeHours: number,
  interval: number = DEFAULT_OIL_CHANGE_INTERVAL
) => {
  const limit = resolveInterval(interval);
  const dueSoon = limit * DUE_SOON_RATIO;

  // Si les données sont manquantes ou incohérentes
  if (currentHours <= 0 && lastChangeHours <= 0) {
    return {
      status: 'no_data',
      color: 'text-gray-400',
      hoursSinceLastChange: 0,
      interval: limit,
      isOverdue: false,
      isDueSoon: false,
      isOk: false,
      needsAttention: false,
      message: 'Données manquantes'
    };
  }

  // Si on a des heures moteur mais pas d'heures de dernière vidange
  if (currentHours > 0 && lastChangeHours <= 0) {
    return {
      status: 'overdue',
      color: 'text-red-500',
      hoursSinceLastChange: currentHours,
      interval: limit,
      isOverdue: true,
      isDueSoon: false,
      isOk: false,
      needsAttention: true,
      message: 'Vidange jamais effectuée'
    };
  }

  const hoursSinceLastChange = currentHours - lastChangeHours;
  const status = calculateOilChangeStatus(currentHours, lastChangeHours, limit);
  const color = getOilChangeStatusColor(hoursSinceLastChange, limit);

  return {
    status,
    color,
    hoursSinceLastChange,
    interval: limit,
    isOverdue: hoursSinceLastChange >= limit,
    isDueSoon: hoursSinceLastChange >= dueSoon && hoursSinceLastChange < limit,
    isOk: hoursSinceLastChange < dueSoon,
    needsAttention: hoursSinceLastChange >= dueSoon,
    message: hoursSinceLastChange >= limit ? 'En retard' : hoursSinceLastChange >= dueSoon ? 'Bientôt' : 'Correct'
  };
};

/**
 * Get the worst oil change status across all engine components
 */
export const getWorstOilChangeStatus = (engines: EngineComponent[]) => {
  if (!engines || engines.length === 0) {
    return {
      status: 'ok',
      color: 'text-green-500',
      hoursSinceLastChange: 0,
      isOverdue: false,
      isDueSoon: false,
      isOk: true,
      needsAttention: false,
      message: 'Aucun moteur'
    };
  }

  let worstStatus = 'ok';
  let worstColor = 'text-green-500';
  let maxHours = 0;
  let needsAttention = false;
  let worstMessage = 'Correct';

  engines.forEach((engine) => {
    const currentHours = engine.current_engine_hours || 0;
    const lastOilChangeHours = engine.last_oil_change_hours || 0;
    const status = getOilChangeStatusBadge(currentHours, lastOilChangeHours, engine.oil_change_interval_hours);

    maxHours = Math.max(maxHours, status.hoursSinceLastChange);

    if (status.needsAttention) {
      needsAttention = true;
    }

    // Priorité: overdue > due_soon > no_data > ok
    if (status.isOverdue || (status.status === 'overdue' && worstStatus !== 'overdue')) {
      worstStatus = 'overdue';
      worstColor = status.color;
      worstMessage = status.message;
    } else if (status.isDueSoon && worstStatus !== 'overdue') {
      worstStatus = 'due_soon';
      worstColor = status.color;
      worstMessage = status.message;
    } else if (status.status === 'no_data' && worstStatus === 'ok') {
      worstStatus = 'no_data';
      worstColor = status.color;
      worstMessage = status.message;
    }
  });

  return {
    status: worstStatus,
    color: worstColor,
    hoursSinceLastChange: maxHours,
    isOverdue: worstStatus === 'overdue',
    isDueSoon: worstStatus === 'due_soon',
    isOk: worstStatus === 'ok',
    needsAttention,
    message: worstMessage
  };
};

/**
 * Calculate progress percentage toward next oil change (0-100%)
 */
export const calculateOilChangeProgress = (
  currentHours: number,
  lastChangeHours: number,
  interval: number = DEFAULT_OIL_CHANGE_INTERVAL
): number => {
  const limit = resolveInterval(interval);
  const hoursSinceLastChange = currentHours - lastChangeHours;
  const progress = (hoursSinceLastChange / limit) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

/**
 * Calculate worst oil change progress across all engine components
 */
export const calculateWorstOilChangeProgress = (engines: EngineComponent[]): number => {
  if (!engines || engines.length === 0) return 0;

  let maxProgress = 0;
  engines.forEach(engine => {
    const progress = calculateOilChangeProgress(
      engine.current_engine_hours,
      engine.last_oil_change_hours,
      engine.oil_change_interval_hours
    );
    maxProgress = Math.max(maxProgress, progress);
  });

  return maxProgress;
};
