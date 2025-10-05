import React from 'react';
import { User, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { SmartThread } from '@/types/messaging';
import { ThreadActionsMenu } from './ThreadActionsMenu';

interface ThreadHeaderProps {
  thread: SmartThread;
}

export function ThreadHeader({ thread }: ThreadHeaderProps) {
  const status = thread.workflow_state?.status || 'new';
  const priority = thread.workflow_state?.priority || 'medium';
  const category = thread.workflow_state?.category;

  return (
    <div className="border-b p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-foreground mb-1">
            {thread.title}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>#{thread.channel?.name}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(thread.created_at), 'PPP', { locale: fr })}
            </div>
          </div>
        </div>
        <ThreadActionsMenu thread={thread} />
      </div>

      {/* Badges de statut */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="capitalize">
          {status.replace(/_/g, ' ')}
        </Badge>
        <Badge variant="secondary" className="capitalize">
          Priorité: {priority}
        </Badge>
        {category && (
          <Badge variant="outline" className="capitalize">
            {category}
          </Badge>
        )}
        {thread.workflow_state?.assignee && (
          <Badge variant="secondary">
            <User className="h-3 w-3 mr-1" />
            {thread.workflow_state.assignee.name}
          </Badge>
        )}
      </div>
    </div>
  );
}
