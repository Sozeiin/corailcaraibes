import { TopicStatusBadge } from "./TopicStatusBadge";
import { TopicPriorityBadge } from "./TopicPriorityBadge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface TopicDetailsProps {
  topic: any;
}

export function TopicDetails({ topic }: TopicDetailsProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">Statut</label>
          <div className="mt-1">
            <TopicStatusBadge status={topic.status} />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Priorité</label>
          <div className="mt-1">
            <TopicPriorityBadge priority={topic.priority} />
          </div>
        </div>

        {topic.assigned_to_profile && (
          <div>
            <label className="text-xs text-muted-foreground">Assigné à</label>
            <div className="mt-1 text-sm">{topic.assigned_to_profile.name}</div>
          </div>
        )}

        {topic.due_date && (
          <div>
            <label className="text-xs text-muted-foreground">Échéance</label>
            <div className="mt-1 text-sm">
              {format(new Date(topic.due_date), "d MMMM yyyy", { locale: fr })}
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {topic.boat && (
          <div>
            <label className="text-xs text-muted-foreground">Bateau</label>
            <div className="mt-1 text-sm font-medium">{topic.boat.name}</div>
          </div>
        )}

        {topic.base && (
          <div>
            <label className="text-xs text-muted-foreground">Base</label>
            <div className="mt-1 text-sm">{topic.base.name}</div>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">Créé par</label>
          <div className="mt-1 text-sm">{topic.created_by_profile?.name}</div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Date de création</label>
          <div className="mt-1 text-sm">
            {format(new Date(topic.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
          </div>
        </div>
      </div>

      {topic.description && (
        <>
          <Separator />
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <p className="mt-1 text-sm whitespace-pre-wrap">{topic.description}</p>
          </div>
        </>
      )}
    </div>
  );
}
