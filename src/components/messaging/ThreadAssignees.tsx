import React from 'react';
import { Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ThreadAssignment } from '@/types/messaging';

interface ThreadAssigneesProps {
  assignments?: ThreadAssignment[];
}

export function ThreadAssignees({ assignments }: ThreadAssigneesProps) {
  if (!assignments || assignments.length === 0) {
    return null;
  }

  const activeAssignments = assignments.filter(a => a.is_active);

  if (activeAssignments.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="gap-1.5">
        <Users className="h-3 w-3" />
        <span>Assigné à :</span>
      </Badge>
      <TooltipProvider>
        <div className="flex -space-x-2">
          {activeAssignments.slice(0, 3).map((assignment) => (
            <Tooltip key={assignment.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={undefined} />
                  <AvatarFallback className="text-xs">
                    {assignment.user?.name
                      ?.split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <div className="font-semibold">{assignment.user?.name || 'Utilisateur inconnu'}</div>
                  <div className="text-muted-foreground capitalize">
                    {assignment.role === 'assignee' && 'Assigné'}
                    {assignment.role === 'watcher' && 'Observateur'}
                    {assignment.role === 'approver' && 'Approbateur'}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {activeAssignments.length > 3 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
              <span className="text-xs font-medium">+{activeAssignments.length - 3}</span>
            </div>
          )}
        </div>
      </TooltipProvider>
    </div>
  );
}
