import React from 'react';
import { Clock, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SmartThread } from '@/types/messaging';

interface ThreadCardProps {
  thread: SmartThread;
  isSelected: boolean;
  onClick: () => void;
}

const statusConfig = {
  new: { label: 'Nouveau', color: 'bg-blue-500', icon: AlertCircle },
  in_progress: { label: 'En cours', color: 'bg-yellow-500', icon: Clock },
  waiting_response: { label: 'En attente', color: 'bg-orange-500', icon: Clock },
  waiting_parts: { label: 'En attente pièces', color: 'bg-purple-500', icon: Clock },
  blocked: { label: 'Bloqué', color: 'bg-red-500', icon: AlertCircle },
  resolved: { label: 'Résolu', color: 'bg-green-500', icon: CheckCircle2 },
  closed: { label: 'Fermé', color: 'bg-gray-500', icon: CheckCircle2 },
  archived: { label: 'Archivé', color: 'bg-gray-400', icon: CheckCircle2 },
};

const priorityConfig = {
  low: { label: 'Basse', color: 'text-blue-600 bg-blue-50' },
  medium: { label: 'Moyenne', color: 'text-yellow-600 bg-yellow-50' },
  high: { label: 'Haute', color: 'text-orange-600 bg-orange-50' },
  urgent: { label: 'Urgente', color: 'text-red-600 bg-red-50' },
};

export function ThreadCard({ thread, isSelected, onClick }: ThreadCardProps) {
  const status = thread.workflow_state?.status || 'new';
  const priority = thread.workflow_state?.priority || 'medium';
  const StatusIcon = statusConfig[status]?.icon || AlertCircle;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-all mb-2",
        "hover:shadow-md hover:border-primary/50",
        isSelected 
          ? "bg-primary/5 border-primary shadow-sm" 
          : "bg-background border-border"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={cn(
          "font-semibold text-sm line-clamp-2",
          isSelected ? "text-primary" : "text-foreground"
        )}>
          {thread.title}
        </h3>
        <Badge 
          variant="secondary" 
          className={cn("shrink-0", priorityConfig[priority].color)}
        >
          {priorityConfig[priority].label}
        </Badge>
      </div>

      {/* Status & Channel */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-white text-xs font-medium",
          statusConfig[status]?.color
        )}>
          <StatusIcon className="h-3 w-3" />
          <span>{statusConfig[status]?.label}</span>
        </div>
        {thread.channel && (
          <span className="text-xs text-muted-foreground">
            #{thread.channel.name}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          <span>{thread.message_count || 0}</span>
        </div>
        <span>
          {formatDistanceToNow(new Date(thread.updated_at), { 
            addSuffix: true, 
            locale: fr 
          })}
        </span>
      </div>
    </button>
  );
}
