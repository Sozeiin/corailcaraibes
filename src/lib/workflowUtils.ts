import { WorkflowStatus, WORKFLOW_STEPS, getNextPossibleActions } from '@/types/workflow';

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

export const getWorkflowStatusList = () => {
  return [
    { value: 'all', label: 'Tous les statuts' },
    ...Object.entries(WORKFLOW_STEPS).map(([value, { label }]) => ({ value, label }))
  ];
};


export { getNextPossibleActions };

export const canUserModifyStatus = (currentStatus: WorkflowStatus, userRole: string, baseId?: string, orderBaseId?: string): boolean => {
  if (userRole === 'direction') return true;

  if (userRole === 'chef_base' && baseId === orderBaseId) {
    return !['pending_approval', 'rejected', 'completed'].includes(currentStatus);
  }

  return false;
};
