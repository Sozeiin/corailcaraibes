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
        "w-full p-4 rounded-xl border transition-all text-left group hover:shadow-md",
        isSelected
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-card hover:bg-accent/30 border-border/50"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className={cn(
          "font-semibold text-sm flex-1 line-clamp-2 leading-snug",
          isSelected ? "text-primary" : "text-foreground group-hover:text-primary"
        )}>
          {topic.title}
        </h3>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <TopicStatusBadge status={topic.status} />
          <TopicPriorityBadge priority={topic.priority} />
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {topic.assigned_to_profile && (
            <span className="text-muted-foreground">{topic.assigned_to_profile.name}</span>
          )}
          {topic.boat && (
            <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
              {topic.boat.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
          <span className="hidden sm:inline">
            {formatDistanceToNow(new Date(topic.updated_at), {
              addSuffix: true,
              locale: fr
            })}
          </span>
          {topic.message_count > 0 && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full",
              isSelected ? "bg-primary/10 text-primary" : "bg-muted"
            )}>
              <MessageCircle className="h-3 w-3" />
              <span className="font-medium">{topic.message_count}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
