import { WorkflowStatus, WORKFLOW_STEPS } from '@/types/workflow';

// Utilitaires centralisés pour la gestion du workflow

export const getStatusColor = (status: string): string => {
  // Correspondance directe pour les couleurs de statut
  const statusColors: Record<string, string> = {
    // Statuts simplifiés pour les commandes
    'pending': 'bg-yellow-100 text-yellow-800',
    'shipping': 'bg-blue-100 text-blue-800',
    'delivered': 'bg-green-100 text-green-800',
    // Statuts workflow pour les demandes d'achat
    'pending_approval': 'bg-yellow-100 text-yellow-800',
    'approved': 'bg-green-100 text-green-800',
    'supplier_search': 'bg-blue-100 text-blue-800',
    'order_confirmed': 'bg-purple-100 text-purple-800',
    'shipping_antilles': 'bg-orange-100 text-orange-800',
    'received_scanned': 'bg-teal-100 text-teal-800',
    'completed': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-800',
    // Legacy
    'confirmed': 'bg-blue-100 text-blue-800',
    'draft': 'bg-gray-100 text-gray-800'
  };
  
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};

export const getStatusLabel = (status: string): string => {
  // Correspondance directe pour les statuts utilisés
  const statusLabels: Record<string, string> = {
    // Statuts simplifiés pour les commandes
    'pending': 'En cours',
    'shipping': 'En cours de livraison', 
    'delivered': 'Livrée',
    // Statuts workflow pour les demandes d'achat
    'pending_approval': 'En attente d\'approbation',
    'approved': 'Approuvé',
    'supplier_search': 'Recherche fournisseurs',
    'order_confirmed': 'Commande confirmée',
    'shipping_antilles': 'Envoi Antilles',
    'received_scanned': 'Réception scannée',
    'completed': 'Terminé',
    'rejected': 'Rejeté',
    'cancelled': 'Annulé',
    // Legacy
    'confirmed': 'Confirmée',
    'draft': 'Brouillon'
  };
  
  return statusLabels[status] || status;
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

export const getWorkflowStatusList = () => {
  return [
    { value: 'all', label: 'Tous les statuts' },
    // Statuts simplifiés pour les commandes
    { value: 'pending', label: 'En cours' },
    { value: 'shipping', label: 'En cours de livraison' },
    { value: 'delivered', label: 'Livrée' },
    // Statuts workflow pour les demandes d'achat
    { value: 'pending_approval', label: 'En attente d\'approbation' },
    { value: 'approved', label: 'Approuvé' },
    { value: 'supplier_search', label: 'Recherche fournisseurs' },
    { value: 'order_confirmed', label: 'Commande confirmée' },
    { value: 'shipping_antilles', label: 'Envoi Antilles' },
    { value: 'received_scanned', label: 'Réception scannée' },
    { value: 'completed', label: 'Terminé' },
    { value: 'rejected', label: 'Rejeté' },
    { value: 'cancelled', label: 'Annulé' }
  ];
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