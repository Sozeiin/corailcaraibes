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
