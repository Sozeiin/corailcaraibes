import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

interface SupplyRequest {
  id: string;
  request_number: string;
  item_name: string;
  status: string;
  urgency: string;
}

interface SupplyRequestDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: SupplyRequest | null;
  onConfirm: () => void;
}

export function SupplyRequestDeleteDialog({
  open,
  onOpenChange,
  request,
  onConfirm,
}: SupplyRequestDeleteDialogProps) {
  if (!request) return null;

  const isProcessed = request.status !== "pending";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Êtes-vous sûr de vouloir supprimer la demande{" "}
              <strong>{request.request_number}</strong> ?
            </p>
            
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-sm font-medium">Article:</span>
                <span className="text-sm text-right">{request.item_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Statut:</span>
                <Badge variant="outline">{request.status}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Urgence:</span>
                <Badge variant="outline">{request.urgency}</Badge>
              </div>
            </div>

            {isProcessed && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ Attention: Cette demande a déjà été traitée. La suppression
                  pourrait affecter l'historique des données.
                </p>
              </div>
            )}

            <p className="text-sm">
              Cette action est irréversible.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
