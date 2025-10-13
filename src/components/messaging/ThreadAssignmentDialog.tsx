import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentRole } from '@/types/messaging';
import { Users } from 'lucide-react';

// Groupes d'équipe prédéfinis
const TEAM_GROUPS = [
  {
    id: 'all_martinique',
    label: '🏝️ Toute l\'équipe Martinique',
    base_id: '550e8400-e29b-41d4-a716-446655440001',
    roles: ['technicien', 'chef_base', 'administratif'] as const
  },
  {
    id: 'all_guadeloupe',
    label: '🏝️ Toute l\'équipe Guadeloupe',
    base_id: '550e8400-e29b-41d4-a716-446655440002',
    roles: ['technicien', 'chef_base', 'administratif'] as const
  },
  {
    id: 'all_direction',
    label: '👔 Toute la Direction',
    roles: ['direction'] as const
  },
  {
    id: 'tech_martinique',
    label: '🔧 Techniciens Martinique',
    base_id: '550e8400-e29b-41d4-a716-446655440001',
    roles: ['technicien'] as const
  },
  {
    id: 'tech_guadeloupe',
    label: '🔧 Techniciens Guadeloupe',
    base_id: '550e8400-e29b-41d4-a716-446655440002',
    roles: ['technicien'] as const
  },
] as const;

interface ThreadAssignmentDialogProps {
  threadId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadAssignmentDialog({ threadId, isOpen, onClose }: ThreadAssignmentDialogProps) {
  const [userId, setUserId] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<typeof TEAM_GROUPS[number] | null>(null);
  const [role, setRole] = useState<AssignmentRole>('assignee');
  const [activeTab, setActiveTab] = useState<'groups' | 'individual'>('groups');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role, base_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Obtenir les utilisateurs d'un groupe
  const getUsersInGroup = (group: typeof TEAM_GROUPS[number]) => {
    return users.filter(u => {
      if ('base_id' in group && group.base_id && u.base_id !== group.base_id) return false;
      return (group.roles as readonly string[]).includes(u.role);
    });
  };

  // Calculer les groupes disponibles avec leur nombre de membres
  const availableGroups = useMemo(() => {
    return TEAM_GROUPS.map(group => ({
      ...group,
      count: getUsersInGroup(group).length
    })).filter(g => g.count > 0);
  }, [users]);

  const assignUser = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('thread_assignments')
        .upsert({
          topic_id: threadId,
          user_id: userId,
          assigned_by: user.id,
          role,
          is_active: true,
          assigned_at: new Date().toISOString(),
        }, {
          onConflict: 'topic_id,user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Utilisateur assigné',
        description: 'L\'utilisateur a été assigné avec succès',
      });
      onClose();
      setUserId('');
      setSelectedGroup(null);
      setActiveTab('groups');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'assigner l\'utilisateur',
        variant: 'destructive',
      });
    },
  });

  const assignGroup = useMutation({
    mutationFn: async () => {
      if (!selectedGroup) throw new Error('Aucun groupe sélectionné');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const groupUsers = getUsersInGroup(selectedGroup);
      
      if (groupUsers.length === 0) {
        throw new Error('Aucun utilisateur trouvé dans ce groupe');
      }

      const assignments = groupUsers.map(u => ({
        topic_id: threadId,
        user_id: u.id,
        assigned_by: user.id,
        role,
        is_active: true,
        assigned_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('thread_assignments')
        .upsert(assignments, {
          onConflict: 'topic_id,user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;
      
      return groupUsers.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Groupe assigné',
        description: `${count} personne${count > 1 ? 's ont' : ' a'} été assignée${count > 1 ? 's' : ''} avec succès`,
      });
      onClose();
      setSelectedGroup(null);
      setActiveTab('groups');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'assigner le groupe',
        variant: 'destructive',
      });
    },
  });

  const handleAssign = () => {
    if (activeTab === 'groups' && selectedGroup) {
      assignGroup.mutate();
    } else if (activeTab === 'individual' && userId) {
      assignUser.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assigner des utilisateurs au sujet</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'groups' | 'individual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="groups">Groupes d'équipe</TabsTrigger>
            <TabsTrigger value="individual">Individuel</TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="space-y-4">
            <div className="space-y-2">
              {availableGroups.map((group) => (
                <Button
                  key={group.id}
                  variant={selectedGroup?.id === group.id ? 'default' : 'outline'}
                  className="w-full justify-between h-auto py-3"
                  onClick={() => setSelectedGroup(group)}
                >
                  <span className="text-left">{group.label}</span>
                  <Badge variant={selectedGroup?.id === group.id ? 'secondary' : 'outline'}>
                    <Users className="h-3 w-3 mr-1" />
                    {group.count} personne{group.count > 1 ? 's' : ''}
                  </Badge>
                </Button>
              ))}
            </div>

            {selectedGroup && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Personnes qui seront assignées :</p>
                <div className="flex flex-wrap gap-1">
                  {getUsersInGroup(selectedGroup).map((user) => (
                    <Badge key={user.id} variant="secondary">
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="individual" className="space-y-4">
            <div className="space-y-2">
              <Label>Utilisateur</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label>Rôle d'assignation</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AssignmentRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assignee">Assigné principal</SelectItem>
              <SelectItem value="watcher">Observateur</SelectItem>
              <SelectItem value="approver">Approbateur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={
              (activeTab === 'groups' && !selectedGroup) ||
              (activeTab === 'individual' && !userId) ||
              assignUser.isPending ||
              assignGroup.isPending
            }
          >
            {assignUser.isPending || assignGroup.isPending ? 'Assignation...' : 
              activeTab === 'groups' && selectedGroup
                ? `Assigner ${getUsersInGroup(selectedGroup).length} personne${getUsersInGroup(selectedGroup).length > 1 ? 's' : ''}`
                : 'Assigner'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
