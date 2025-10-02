import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, Tag, AlertCircle, UserPlus, Link2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ThreadStatusDialog } from './ThreadStatusDialog';
import { ThreadPriorityDialog } from './ThreadPriorityDialog';
import { ThreadAssignmentDialog } from './ThreadAssignmentDialog';
import { EntityLinkDialog } from './EntityLinkDialog';
import type { SmartThread } from '@/types/messaging';
import { useAuth } from '@/contexts/AuthContext';

interface ThreadActionsMenuProps {
  thread: SmartThread;
}

export function ThreadActionsMenu({ thread }: ThreadActionsMenuProps) {
  const { user } = useAuth();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);

  // Check permissions (direction and chef_base can manage)
  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  if (!canManage) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>
            <Tag className="h-4 w-4 mr-2" />
            Modifier le statut
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPriorityDialogOpen(true)}>
            <AlertCircle className="h-4 w-4 mr-2" />
            Modifier la priorité
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setAssignDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Assigner
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEntityDialogOpen(true)}>
            <Link2 className="h-4 w-4 mr-2" />
            Lier une entité
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ThreadStatusDialog
        threadId={thread.id}
        currentStatus={thread.workflow_state?.status}
        isOpen={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
      />

      <ThreadPriorityDialog
        threadId={thread.id}
        currentPriority={thread.workflow_state?.priority}
        isOpen={priorityDialogOpen}
        onClose={() => setPriorityDialogOpen(false)}
      />

      <ThreadAssignmentDialog
        threadId={thread.id}
        isOpen={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
      />

      <EntityLinkDialog
        threadId={thread.id}
        isOpen={entityDialogOpen}
        onClose={() => setEntityDialogOpen(false)}
      />
    </>
  );
}
