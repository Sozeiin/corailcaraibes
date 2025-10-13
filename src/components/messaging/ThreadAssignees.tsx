import React, { useMemo } from 'react';
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

// Groupes prédéfinis (doit correspondre à ThreadAssignmentDialog)
const TEAM_GROUPS = [
  {
    id: 'all_martinique',
    label: '🏝️ Équipe Martinique',
    base_id: '550e8400-e29b-41d4-a716-446655440001',
    roles: ['technicien', 'chef_base', 'administratif']
  },
  {
    id: 'all_guadeloupe',
    label: '🏝️ Équipe Guadeloupe',
    base_id: '550e8400-e29b-41d4-a716-446655440002',
    roles: ['technicien', 'chef_base', 'administratif']
  },
  {
    id: 'all_direction',
    label: '👔 Direction',
    roles: ['direction']
  },
  {
    id: 'tech_martinique',
    label: '🔧 Tech. MTQ',
    base_id: '550e8400-e29b-41d4-a716-446655440001',
    roles: ['technicien']
  },
  {
    id: 'tech_guadeloupe',
    label: '🔧 Tech. GP',
    base_id: '550e8400-e29b-41d4-a716-446655440002',
    roles: ['technicien']
  },
];

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

  // Détecter si un groupe complet est assigné
  const detectedGroup = useMemo(() => {
    if (!assignments || activeAssignments.length === 0) return null;

    // Pour chaque groupe, vérifier si tous les rôles/bases correspondent
    for (const group of TEAM_GROUPS) {
      const assignedUsers = activeAssignments.map(a => ({
        role: a.user?.role,
        base_id: (a.user as any)?.base_id
      }));

      // Compter combien d'utilisateurs correspondent au pattern du groupe
      const matchingCount = assignedUsers.filter(u => {
        if ('base_id' in group && group.base_id && u.base_id !== group.base_id) return false;
        return group.roles.includes(u.role as any);
      }).length;

      // Si au moins 3 utilisateurs correspondent au pattern, considérer comme un groupe
      if (matchingCount >= 3 && matchingCount === activeAssignments.length) {
        return { ...group, count: matchingCount };
      }
    }

    return null;
  }, [activeAssignments]);

  // Si un groupe complet est détecté, afficher uniquement le badge du groupe
  if (detectedGroup) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5">
          <Users className="h-3 w-3" />
          <span>Assigné à :</span>
        </Badge>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1.5">
                <span>{detectedGroup.label}</span>
                <span className="text-muted-foreground">({detectedGroup.count})</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm space-y-1">
                <div className="font-semibold">{detectedGroup.label}</div>
                {activeAssignments.slice(0, 10).map(a => (
                  <div key={a.id} className="text-muted-foreground">
                    • {a.user?.name}
                  </div>
                ))}
                {activeAssignments.length > 10 && (
                  <div className="text-muted-foreground">
                    ... et {activeAssignments.length - 10} autre{activeAssignments.length - 10 > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  // Affichage standard avec avatars individuels
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
