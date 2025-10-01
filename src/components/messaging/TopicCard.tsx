import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopicStatusBadge } from "./TopicStatusBadge";
import { TopicPriorityBadge } from "./TopicPriorityBadge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface TopicCardProps {
  topic: any;
  isSelected: boolean;
  onClick: () => void;
}

export function TopicCard({ topic, isSelected, onClick }: TopicCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 rounded-lg border transition-colors text-left",
        isSelected
          ? "bg-accent border-accent-foreground/20"
          : "bg-card hover:bg-accent/50 border-border"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium text-sm flex-1 line-clamp-1">
          {topic.title}
        </h3>
        <div className="flex items-center gap-1 flex-shrink-0">
          <TopicStatusBadge status={topic.status} />
          <TopicPriorityBadge priority={topic.priority} />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {topic.assigned_to_profile && (
            <span>{topic.assigned_to_profile.name}</span>
          )}
          {topic.boat && (
            <span className="text-primary">{topic.boat.name}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span>
            {formatDistanceToNow(new Date(topic.updated_at), {
              addSuffix: true,
              locale: fr
            })}
          </span>
          {topic.message_count > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              <span>{topic.message_count}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
