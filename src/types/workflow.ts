export type WorkflowStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'supplier_search'
  | 'ordered'
  | 'received'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  // Legacy statuses for backward compatibility
  | 'pending'
  | 'confirmed'
  | 'delivered';

export const PURCHASE_WORKFLOW_STATUSES: WorkflowStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'supplier_search',
  'ordered',
  'received',
  'completed',
  'rejected',
  'cancelled'
];

export const LEGACY_WORKFLOW_STATUSES: WorkflowStatus[] = [
  'pending',
  'confirmed',
  'delivered'
];

export interface WorkflowStep {
  id: string;
  orderId: string;
  stepStatus: WorkflowStatus;
  stepNumber: number;
  stepName: string;
  stepDescription?: string;
  userId?: string;
  userName?: string;
  startedAt: string;
  completedAt?: string;
  durationMinutes?: number;
  notes?: string;
  autoCompleted: boolean;
  createdAt: string;
}

export interface WorkflowNotification {
  id: string;
  orderId: string;
  recipientUserId: string;
  notificationType: string;
  title: string;
  message: string;
  isSent: boolean;
  sentAt?: string;
  createdAt: string;
}

export const WORKFLOW_STEPS: Record<WorkflowStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800', icon: 'FileText' },
  pending_approval: { label: 'En attente d\'approbation', color: 'bg-yellow-100 text-yellow-800', icon: 'Clock' },
  approved: { label: 'Approuvé', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' },
  supplier_search: { label: 'Recherche fournisseurs', color: 'bg-blue-100 text-blue-800', icon: 'Search' },
  ordered: { label: 'Commande passée', color: 'bg-purple-100 text-purple-800', icon: 'ShoppingCart' },
  received: { label: 'Réception confirmée', color: 'bg-teal-100 text-teal-800', icon: 'CheckCircle' },
  completed: { label: 'Terminé', color: 'bg-green-100 text-green-800', icon: 'CheckCircle2' },
  rejected: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: 'XCircle' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-800', icon: 'X' },
  // Legacy statuses
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: 'Clock' },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: 'CheckCircle' },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: 'CheckCircle2' }
};

export interface WorkflowAction {
  key: string;
  label: string;
  variant: 'default' | 'outline' | 'destructive';
  icon: string;
  newStatus: WorkflowStatus | null;
  requiresNotes?: boolean;
  useRejectionReason?: boolean;
  isSpecial?: boolean;
  roles: ('all' | 'direction' | 'chef_base')[];
}

export const WORKFLOW_ACTIONS: Record<WorkflowStatus, WorkflowAction[]> = {
  draft: [
    {
      key: 'submit_for_approval',
      label: 'Soumettre pour approbation',
      variant: 'default',
      icon: 'CheckCircle',
      newStatus: 'pending_approval',
      roles: ['all']
    },
    {
      key: 'start_supplier_search',
      label: 'Commande directe (recherche fournisseur)',
      variant: 'outline',
      icon: 'Search',
      newStatus: 'supplier_search',
      roles: ['all']
    }
  ],
  pending_approval: [
    {
      key: 'approve',
      label: 'Approuver',
      variant: 'default',
      icon: 'CheckCircle',
      newStatus: 'approved',
      roles: ['direction']
    },
    {
      key: 'reject',
      label: 'Rejeter',
      variant: 'destructive',
      icon: 'XCircle',
      newStatus: 'rejected',
      requiresNotes: true,
      useRejectionReason: true,
      roles: ['direction']
    }
  ],
  approved: [
    {
      key: 'start_supplier_search',
      label: 'Recherche fournisseurs',
      variant: 'default',
      icon: 'Search',
      newStatus: 'supplier_search',
      roles: ['direction', 'chef_base']
    }
  ],
  supplier_search: [
    {
      key: 'configure_supplier',
      label: 'Configurer fournisseur & prix',
      variant: 'default',
      icon: 'Settings',
      newStatus: null,
      isSpecial: true,
      roles: ['direction']
    },
    {
      key: 'confirm_order',
      label: 'Confirmer la commande',
      variant: 'default',
      icon: 'ShoppingCart',
      newStatus: 'ordered',
      roles: ['direction', 'chef_base']
    }
  ],
  ordered: [
    {
      key: 'mark_received',
      label: 'Marquer comme reçu',
      variant: 'default',
      icon: 'CheckCircle',
      newStatus: 'received',
      roles: ['direction']
    }
  ],
  received: [
    {
      key: 'complete_order',
      label: 'Terminer la commande',
      variant: 'default',
      icon: 'CheckCircle2',
      newStatus: 'completed',
      roles: ['direction']
    }
  ],
  completed: [],
  rejected: [],
  cancelled: [],
  // Legacy statuses
  pending: [],
  confirmed: [],
  delivered: []
};

export const CANCEL_ACTION: WorkflowAction = {
  key: 'cancel',
  label: 'Annuler',
  variant: 'outline',
  icon: 'XCircle',
  newStatus: 'cancelled',
  requiresNotes: true,
  roles: ['direction', 'chef_base']
};

export const NON_CANCELLABLE_STATUSES: WorkflowStatus[] = [
  'completed',
  'rejected',
  'cancelled'
];

export const getNextPossibleActions = (
  currentStatus: WorkflowStatus,
  userRole: string
): WorkflowStatus[] => {
  const actions = WORKFLOW_ACTIONS[currentStatus] || [];
  const next = actions
    .filter(action =>
      action.newStatus &&
      (action.roles.includes('all') || action.roles.includes(userRole as any))
    )
    .map(action => action.newStatus as WorkflowStatus);

  if (
    !NON_CANCELLABLE_STATUSES.includes(currentStatus) &&
    ['direction', 'chef_base'].includes(userRole)
  ) {
    next.push('cancelled');
  }

  return next;
};
