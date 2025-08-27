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
import {
  WorkflowStatus,
  WORKFLOW_ACTIONS,
  LEGACY_WORKFLOW_STATUSES,
  CANCEL_ACTION,
  NON_CANCELLABLE_STATUSES,
  WorkflowAction
} from '@/types/workflow';
import { CheckCircle, CheckCircle2, XCircle, Search, ShoppingCart, Settings } from 'lucide-react';
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
      newStatus: WorkflowStatus;
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

  const iconMap = {
    CheckCircle,
    CheckCircle2,
    XCircle,
    Search,
    ShoppingCart,
    Settings
  } as const;

  const getAvailableActions = (): WorkflowAction[] => {
    if (!user) return [];

    if (LEGACY_WORKFLOW_STATUSES.includes(order.status as WorkflowStatus)) {
      return [];
    }

    const actionsForStatus = WORKFLOW_ACTIONS[order.status as WorkflowStatus] || [];
    const filtered = actionsForStatus.filter(action => {
      if (action.roles.includes('all')) return true;
      if (action.roles.includes(user.role)) {
        if (user.role === 'chef_base' && order.baseId !== user.baseId) {
          return false;
        }
        return true;
      }
      return false;
    });

    if (
      (user.role === 'direction' || (user.role === 'chef_base' && order.baseId === user.baseId)) &&
      !NON_CANCELLABLE_STATUSES.includes(order.status as WorkflowStatus)
    ) {
      filtered.push(CANCEL_ACTION);
    }

    return filtered;
  };

  const availableActions = getAvailableActions();
  if (availableActions.length === 0) {
    return null;
  }
  const ActionButton = ({
    action
  }: {
    action: WorkflowAction;
  }) => {
    const Icon = iconMap[action.icon as keyof typeof iconMap];

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
