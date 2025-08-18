import { WorkflowStatus, WORKFLOW_STEPS } from '@/types/workflow';

// Utilitaires centralisés pour la gestion du workflow

export const getStatusColor = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  if (WORKFLOW_STEPS[workflowStatus]) {
    return WORKFLOW_STEPS[workflowStatus].color;
  }
  
  // Fallback pour les anciens statuts
  const legacyColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800'
  };
  
  return legacyColors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  if (WORKFLOW_STEPS[workflowStatus]) {
    return WORKFLOW_STEPS[workflowStatus].label;
  }
  
  // Fallback pour les anciens statuts
  const legacyLabels: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    delivered: 'Livrée',
    cancelled: 'Annulée'
  };
  
  return legacyLabels[status] || status;
};

export const getStatusIcon = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  if (WORKFLOW_STEPS[workflowStatus]) {
    return WORKFLOW_STEPS[workflowStatus].icon;
  }
  
  // Fallback pour les anciens statuts
  const legacyIcons: Record<string, string> = {
    pending: 'Clock',
    confirmed: 'CheckCircle',
    delivered: 'Package',
    cancelled: 'X'
  };
  
  return legacyIcons[status] || 'Circle';
};

export const isWorkflowStatus = (status: string): status is WorkflowStatus => {
  return status in WORKFLOW_STEPS;
};

export const getWorkflowStatusList = (): WorkflowStatus[] => {
  return Object.keys(WORKFLOW_STEPS) as WorkflowStatus[];
};

export const getNextPossibleActions = (currentStatus: WorkflowStatus, userRole: string): WorkflowStatus[] => {
  const actions: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ['pending_approval'],
    pending_approval: userRole === 'direction' ? ['approved', 'rejected'] : [],
    approved: ['supplier_search'],
    supplier_search: ['order_confirmed'],
    order_confirmed: ['shipping_antilles'],
    shipping_antilles: ['received_scanned'],
    received_scanned: ['completed'],
    completed: [],
    rejected: [],
    cancelled: []
  };
  
  return actions[currentStatus] || [];
};

export const canUserModifyStatus = (currentStatus: WorkflowStatus, userRole: string, baseId?: string, orderBaseId?: string): boolean => {
  if (userRole === 'direction') return true;
  
  if (userRole === 'chef_base' && baseId === orderBaseId) {
    return !['pending_approval', 'rejected', 'completed'].includes(currentStatus);
  }
  
  return false;
};