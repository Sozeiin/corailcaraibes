import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/types';
import { WorkflowStatus } from '@/types/workflow';
type PurchaseWorkflowStatus = 'draft' | 'pending_approval' | 'approved' | 'supplier_search' | 'ordered' | 'received' | 'completed' | 'rejected' | 'cancelled';
import { CheckCircle, CheckCircle2, XCircle, Search, ShoppingCart, Ship, Settings } from 'lucide-react';
import { SupplierPriceForm } from './SupplierPriceForm';
import { ShippingTrackingForm } from './ShippingTrackingForm';
interface WorkflowActionsProps {
  order: Order;
  onOrderUpdate?: () => void;
}
export function WorkflowActions({
  order,
  onOrderUpdate
}: WorkflowActionsProps) {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showTrackingForm, setShowTrackingForm] = useState(false);
  const advanceWorkflowMutation = useMutation({
    mutationFn: async ({
      newStatus,
      notes: notesParam
    }: {
      newStatus: PurchaseWorkflowStatus;
      notes?: string;
    }) => {
      const { error } = await supabase
        .rpc('advance_workflow_step' as any, {
          order_id_param: order.id,
          new_status: newStatus,
          user_id_param: user?.id,
          notes_param: notesParam || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['orders']
      });
      queryClient.invalidateQueries({
        queryKey: ['workflow-steps', order.id]
      });
      toast({
        title: "Statut mis à jour",
        description: "Le workflow a été mis à jour avec succès."
      });
      onOrderUpdate?.();
      setNotes('');
      setRejectionReason('');
    },
    onError: error => {
      console.error('Error advancing workflow:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut.",
        variant: "destructive"
      });
    }
  });

  // Déterminer les actions disponibles selon le statut actuel et le rôle de l'utilisateur
  const getAvailableActions = () => {
    const actions = [];
    if (!user) return actions;

    // Skip workflow actions for legacy statuses that don't support new workflow
    const legacyStatuses = ['pending', 'confirmed', 'delivered'];
    if (legacyStatuses.includes(order.status)) {
      return actions;
    }

    // Actions pour commandes en brouillon
    if (order.status === 'draft') {
      // Pour tous les utilisateurs : ils peuvent choisir entre demande d'achat ou commande directe
      actions.push({
        key: 'submit_for_approval',
        label: 'Soumettre pour approbation',
        variant: 'default' as const,
        icon: CheckCircle,
        newStatus: 'pending_approval' as PurchaseWorkflowStatus,
        requiresNotes: false
      }, {
        key: 'start_supplier_search',
        label: 'Commande directe (recherche fournisseur)',
        variant: 'outline' as const,
        icon: Search,
        newStatus: 'supplier_search' as PurchaseWorkflowStatus,
        requiresNotes: false
      });
    }

    // Actions pour la direction
    if (user.role === 'direction') {
      if (order.status === 'pending_approval') {
        actions.push({
          key: 'approve',
          label: 'Approuver',
          variant: 'default' as const,
          icon: CheckCircle,
          newStatus: 'approved' as PurchaseWorkflowStatus,
          requiresNotes: false
        }, {
          key: 'reject',
          label: 'Rejeter',
          variant: 'destructive' as const,
          icon: XCircle,
          newStatus: 'rejected' as PurchaseWorkflowStatus,
          requiresNotes: true,
          useRejectionReason: true
        });
      }
      if (order.status === 'approved') {
        actions.push({
          key: 'start_supplier_search',
          label: 'Recherche fournisseurs',
          variant: 'default' as const,
          icon: Search,
          newStatus: 'supplier_search' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
      if (order.status === 'supplier_search') {
        actions.push({
          key: 'configure_supplier',
          label: 'Configurer fournisseur & prix',
          variant: 'default' as const,
          icon: Settings,
          newStatus: null as any,
          // Special action
          requiresNotes: false,
          isSpecial: true
        });
      }
      if (order.status === 'supplier_search') {
        actions.push({
          key: 'confirm_order',
          label: 'Confirmer la commande',
          variant: 'default' as const,
          icon: ShoppingCart,
          newStatus: 'ordered' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
      if (order.status === 'ordered') {
        actions.push({
          key: 'mark_received',
          label: 'Marquer comme reçu',
          variant: 'default' as const,
          icon: CheckCircle,
          newStatus: 'received' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
      if (order.status === 'received') {
        actions.push({
          key: 'complete_order',
          label: 'Terminer la commande',
          variant: 'default' as const,
          icon: CheckCircle2,
          newStatus: 'completed' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
    }

    // Actions pour chef de base (similaires à direction mais limitées à leur base)
    if (user.role === 'chef_base' && order.baseId === user.baseId) {
      if (order.status === 'approved') {
        actions.push({
          key: 'start_supplier_search',
          label: 'Recherche fournisseurs',
          variant: 'default' as const,
          icon: Search,
          newStatus: 'supplier_search' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
      if (order.status === 'supplier_search') {
        actions.push({
          key: 'confirm_order',
          label: 'Confirmer la commande',
          variant: 'default' as const,
          icon: ShoppingCart,
          newStatus: 'ordered' as PurchaseWorkflowStatus,
          requiresNotes: false
        });
      }
    }

    // Action d'annulation disponible pour direction et chef de base
    if ((user.role === 'direction' || user.role === 'chef_base' && order.baseId === user.baseId) && !['completed', 'rejected', 'cancelled'].includes(order.status)) {
      actions.push({
        key: 'cancel',
        label: 'Annuler',
        variant: 'outline' as const,
        icon: XCircle,
        newStatus: 'cancelled' as PurchaseWorkflowStatus,
        requiresNotes: true
      });
    }
    return actions;
  };
  const availableActions = getAvailableActions();
  if (availableActions.length === 0) {
    return null;
  }
  const ActionButton = ({
    action
  }: {
    action: any;
  }) => {
    const Icon = action.icon;

    // Special handling for supplier configuration
    if (action.isSpecial && action.key === 'configure_supplier') {
      return <Button variant={action.variant} className="flex items-center gap-2" onClick={() => setShowSupplierForm(true)}>
          <Icon className="w-4 h-4" />
          {action.label}
        </Button>;
    }

    return <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant={action.variant} className="flex items-center gap-2 text-xs">
            <Icon className="w-4 h-4" />
            {action.label}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmer l'action: {action.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Cette action va faire avancer le workflow de la commande {order.orderNumber}.
              {action.key === 'reject' && " Cette action ne peut pas être annulée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {action.requiresNotes && <div className="space-y-2">
              <Label htmlFor="notes">
                {action.useRejectionReason ? 'Raison du rejet *' : 'Notes (optionnel)'}
              </Label>
              <Textarea id="notes" value={action.useRejectionReason ? rejectionReason : notes} onChange={e => action.useRejectionReason ? setRejectionReason(e.target.value) : setNotes(e.target.value)} placeholder={action.useRejectionReason ? 'Expliquez pourquoi cette demande est rejetée...' : 'Ajoutez des notes...'} rows={3} />
            </div>}
          
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
            const notesToUse = action.useRejectionReason ? rejectionReason : notes;
            if (action.requiresNotes && action.useRejectionReason && !notesToUse.trim()) {
              toast({
                title: "Erreur",
                description: "La raison du rejet est obligatoire.",
                variant: "destructive"
              });
              return;
            }
            advanceWorkflowMutation.mutate({
              newStatus: action.newStatus,
              notes: notesToUse.trim() || undefined
            });
          }} disabled={advanceWorkflowMutation.isPending} className={action.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}>
              {advanceWorkflowMutation.isPending ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>;
  };
  return <div className="space-y-4">
      {/* Supplier Configuration Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuration fournisseur et prix</DialogTitle>
          </DialogHeader>
          <SupplierPriceForm order={order} onComplete={() => {
          setShowSupplierForm(false);
          onOrderUpdate?.();
        }} />
        </DialogContent>
      </Dialog>

      {/* Shipping Tracking Dialog */}
      <Dialog open={showTrackingForm} onOpenChange={setShowTrackingForm}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expédition vers les Antilles</DialogTitle>
          </DialogHeader>
          <ShippingTrackingForm order={order} onComplete={() => {
          setShowTrackingForm(false);
          onOrderUpdate?.();
        }} />
        </DialogContent>
      </Dialog>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        {availableActions.map(action => <ActionButton key={action.key} action={action} />)}
      </div>
    </div>;
}