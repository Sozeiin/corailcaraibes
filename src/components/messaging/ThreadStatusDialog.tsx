import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ThreadStatus } from '@/types/messaging';

interface ThreadStatusDialogProps {
  threadId: string;
  currentStatus?: ThreadStatus;
  isOpen: boolean;
  onClose: () => void;
}

const statusLabels: Record<ThreadStatus, string> = {
  new: '🆕 Nouveau',
  in_progress: '🔄 En cours',
  waiting_response: '⏳ En attente de réponse',
  waiting_parts: '📦 En attente de pièces',
  blocked: '🚫 Bloqué',
  resolved: '✅ Résolu',
  closed: '🔒 Fermé',
  archived: '📁 Archivé',
};

export function ThreadStatusDialog({ threadId, currentStatus, isOpen, onClose }: ThreadStatusDialogProps) {
  const [status, setStatus] = useState<ThreadStatus>(currentStatus || 'new');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatus = useMutation({
    mutationFn: async () => {
      const { data: existingState } = await supabase
        .from('thread_workflow_states')
        .select('id')
        .eq('topic_id', threadId)
        .single();

      if (existingState) {
        const { error } = await supabase
          .from('thread_workflow_states')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('topic_id', threadId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('thread_workflow_states')
          .insert({
            topic_id: threadId,
            status,
            priority: 'medium',
          });
        if (error) throw error;
      }

      if (notes.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('messages').insert({
            topic_id: threadId,
            author_id: user.id,
            content: `📋 Statut changé: ${statusLabels[status]}\n${notes}`,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Statut mis à jour',
        description: `Le statut a été changé en "${statusLabels[status]}"`,
      });
      onClose();
      setNotes('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour le statut',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le statut</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nouveau statut</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ThreadStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter un commentaire sur ce changement..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => updateStatus.mutate()} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
