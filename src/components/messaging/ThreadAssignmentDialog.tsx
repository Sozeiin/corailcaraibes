import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AssignmentRole } from '@/types/messaging';

interface ThreadAssignmentDialogProps {
  threadId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadAssignmentDialog({ threadId, isOpen, onClose }: ThreadAssignmentDialogProps) {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<AssignmentRole>('assignee');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, role')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const assignUser = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('thread_assignments')
        .insert({
          topic_id: threadId,
          user_id: userId,
          assigned_by: user.id,
          role,
          is_active: true,
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
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'assigner l\'utilisateur',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner un utilisateur</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="space-y-2">
            <Label>Rôle</Label>
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => assignUser.mutate()} disabled={!userId || assignUser.isPending}>
              {assignUser.isPending ? 'Assignment...' : 'Assigner'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
