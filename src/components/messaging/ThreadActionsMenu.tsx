import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, Tag, AlertCircle, UserPlus, Link2, Trash2, Edit } from 'lucide-react';
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
import { ThreadDeleteDialog } from './ThreadDeleteDialog';
import { ThreadEditDialog } from './ThreadEditDialog';
import type { SmartThread, Channel } from '@/types/messaging';
import { useAuth } from '@/contexts/AuthContext';

interface ThreadActionsMenuProps {
  thread: SmartThread;
  channels?: Channel[];
}

export function ThreadActionsMenu({ thread, channels = [] }: ThreadActionsMenuProps) {
  const { user } = useAuth();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [entityDialogOpen, setEntityDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Check permissions (direction and chef_base can manage)
  const canManage = user?.role === 'direction' || user?.role === 'chef_base';
  const canDelete = user?.role === 'direction';

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
          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Modifier le sujet
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer le sujet
              </DropdownMenuItem>
            </>
          )}
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

      <ThreadDeleteDialog
        thread={thread}
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />

      <ThreadEditDialog
        thread={thread}
        channels={channels}
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
      />
    </>
  );
}
