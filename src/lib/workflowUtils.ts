import {
  WorkflowStatus,
  WORKFLOW_STEPS,
  PURCHASE_WORKFLOW_STATUSES,
  LEGACY_WORKFLOW_STATUSES,
} from '@/types/workflow';

// Utilitaires centralisés pour la gestion du workflow

export const getStatusColor = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  return WORKFLOW_STEPS[workflowStatus]?.color || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  return WORKFLOW_STEPS[workflowStatus]?.label || status;
};

export const getStatusIcon = (status: string): string => {
  const workflowStatus = status as WorkflowStatus;
  return WORKFLOW_STEPS[workflowStatus]?.icon || 'Circle';
};

export const isWorkflowStatus = (status: string): status is WorkflowStatus => {
  return status in WORKFLOW_STEPS;
};

export const getWorkflowStatusList = (includeLegacy = false) => {
  const statuses = includeLegacy
    ? [...PURCHASE_WORKFLOW_STATUSES, ...LEGACY_WORKFLOW_STATUSES]
    : PURCHASE_WORKFLOW_STATUSES;
  return [
    { value: 'all', label: 'Tous les statuts' },
    ...statuses.map((value) => ({ value, label: WORKFLOW_STEPS[value].label })),
  ];
};

export const getNextPossibleActions = (currentStatus: WorkflowStatus, userRole: string): WorkflowStatus[] => {
  const actions: Record<WorkflowStatus, WorkflowStatus[]> = {
    draft: ['pending_approval'],
    pending_approval: userRole === 'direction' ? ['approved', 'rejected'] : [],
    approved: ['supplier_search'],
    supplier_search: ['ordered'],
    ordered: ['received'],
    received: ['completed'],
    completed: [],
    rejected: [],
    cancelled: [],
    // Legacy statuses - limited actions
    pending: ['confirmed', 'cancelled'],
    confirmed: ['delivered', 'cancelled'],
    delivered: []
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
