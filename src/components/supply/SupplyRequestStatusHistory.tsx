import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useSupplyRequestStatusHistory } from "@/hooks/useSupplyRequestStatusHistory";

interface SupplyRequestStatusHistoryProps {
  requestId: string;
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  ordered: "Commandé",
  shipped: "Expédié",
  received: "Reçu",
  completed: "Terminé",
  rejected: "Rejeté",
  cancelled: "Annulé",
};

const getStatusLabel = (status: string | null) => {
  if (!status) return "Création";
  return statusLabels[status] || status;
};

export function SupplyRequestStatusHistory({ requestId }: SupplyRequestStatusHistoryProps) {
  const { data: history = [], isLoading } = useSupplyRequestStatusHistory(requestId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique des statuts ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun changement de statut enregistré
          </p>
        ) : (
          <div className="space-y-3">
            {history.map((entry) => (
              <div key={entry.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {entry.old_status && (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {getStatusLabel(entry.old_status)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {getStatusLabel(entry.new_status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {entry.changed_by_name || "Utilisateur inconnu"}
                  </span>
                  <span>
                    {format(new Date(entry.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
                  </span>
                </div>
                {entry.comment && <p className="text-sm">{entry.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
