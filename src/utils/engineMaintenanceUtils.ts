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
  console.log('🔧 getOilChangeStatusBadge called with:', { currentHours, lastChangeHours });
  
  // Si les données sont manquantes ou incohérentes
  if (currentHours <= 0 && lastChangeHours <= 0) {
    return {
      status: 'no_data',
      color: 'text-gray-400',
      hoursSinceLastChange: 0,
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
      isOverdue: true,
      isDueSoon: false,
      isOk: false,
      needsAttention: true,
      message: 'Vidange jamais effectuée'
    };
  }
  
  const hoursSinceLastChange = currentHours - lastChangeHours;
  const status = calculateOilChangeStatus(currentHours, lastChangeHours);
  const color = getOilChangeStatusColor(hoursSinceLastChange);
  
  const result = {
    status,
    color,
    hoursSinceLastChange,
    isOverdue: hoursSinceLastChange >= 250,
    isDueSoon: hoursSinceLastChange >= 200 && hoursSinceLastChange < 250,
    isOk: hoursSinceLastChange < 200,
    needsAttention: hoursSinceLastChange >= 200,
    message: hoursSinceLastChange >= 250 ? 'En retard' : hoursSinceLastChange >= 200 ? 'Bientôt' : 'Correct'
  };
  
  console.log('🔧 getOilChangeStatusBadge result:', result);
  return result;
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
      isDueSoon: status.isDueSoon,
      needsAttention: status.needsAttention
    });
    
    maxHours = Math.max(maxHours, status.hoursSinceLastChange);
    
    // Mettre à jour si ce badge nécessite une attention
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

  const result = {
    status: worstStatus,
    color: worstColor,
    hoursSinceLastChange: maxHours,
    isOverdue: worstStatus === 'overdue',
    isDueSoon: worstStatus === 'due_soon',
    isOk: worstStatus === 'ok',
    needsAttention,
    message: worstMessage
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