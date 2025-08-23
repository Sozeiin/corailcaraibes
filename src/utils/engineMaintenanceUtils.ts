export interface BoatEngineData {
  id: string;
  current_engine_hours: number;
  last_oil_change_hours: number;
}

export interface EngineComponent {
  id: string;
  component_name: string;
  component_type: string;
  current_engine_hours: number;
  last_oil_change_hours: number;
}

export interface BoatEngineComponentsData {
  id: string;
  name: string;
  components: EngineComponent[];
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
  if (hoursSinceLastChange >= 250) return 'text-red-500'; // Red - overdue
  if (hoursSinceLastChange >= 200) return 'text-orange-500'; // Orange - due soon
  return 'text-green-500'; // Green - OK
};

/**
 * Get oil change status badge info for engine components
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
 * Get the worst oil change status across all engine components
 */
export const getWorstOilChangeStatus = (engines: EngineComponent[]) => {
  console.log(`🔧 [engineUtils] Analyzing ${engines?.length || 0} engines:`, engines);
  
  if (!engines || engines.length === 0) {
    console.log(`⚪ [engineUtils] No engines found, returning default status`);
    return {
      status: 'ok',
      color: 'text-green-500',
      hoursSinceLastChange: 0,
      isOverdue: false,
      isDueSoon: false,
      isOk: true
    };
  }

  let worstStatus = 'ok';
  let worstColor = 'text-green-500';
  let maxHours = 0;

  engines.forEach((engine, index) => {
    const currentHours = engine.current_engine_hours || 0;
    const lastOilChangeHours = engine.last_oil_change_hours || 0;
    const status = getOilChangeStatusBadge(currentHours, lastOilChangeHours);
    
    console.log(`🛢️ [engineUtils] Engine ${index + 1} (${engine.component_name}):`, {
      currentHours,
      lastOilChangeHours,
      hoursSinceChange: status.hoursSinceLastChange,
      status: status.status,
      isOverdue: status.isOverdue,
      isDueSoon: status.isDueSoon
    });
    
    maxHours = Math.max(maxHours, status.hoursSinceLastChange);
    
    if (status.isOverdue && worstStatus !== 'overdue') {
      worstStatus = 'overdue';
      worstColor = status.color;
    } else if (status.isDueSoon && worstStatus === 'ok') {
      worstStatus = 'due_soon';
      worstColor = status.color;
    }
  });

  const result = {
    status: worstStatus,
    color: worstColor,
    hoursSinceLastChange: maxHours,
    isOverdue: worstStatus === 'overdue',
    isDueSoon: worstStatus === 'due_soon',
    isOk: worstStatus === 'ok'
  };

  console.log(`🎯 [engineUtils] Worst oil status result:`, result);
  
  return result;
};

/**
 * Calculate progress percentage toward next oil change (0-100%)
 */
export const calculateOilChangeProgress = (currentHours: number, lastChangeHours: number): number => {
  const hoursSinceLastChange = currentHours - lastChangeHours;
  const progress = (hoursSinceLastChange / 250) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

/**
 * Calculate worst oil change progress across all engine components
 */
export const calculateWorstOilChangeProgress = (engines: EngineComponent[]): number => {
  if (!engines || engines.length === 0) return 0;
  
  let maxProgress = 0;
  engines.forEach(engine => {
    const progress = calculateOilChangeProgress(engine.current_engine_hours, engine.last_oil_change_hours);
    maxProgress = Math.max(maxProgress, progress);
  });
  
  return maxProgress;
};