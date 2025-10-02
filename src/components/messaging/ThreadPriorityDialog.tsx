import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { ThreadPriority } from '@/types/messaging';

interface ThreadPriorityDialogProps {
  threadId: string;
  currentPriority?: ThreadPriority;
  isOpen: boolean;
  onClose: () => void;
}

const priorityLabels: Record<ThreadPriority, { label: string; className: string }> = {
  low: { label: '🟢 Basse', className: 'text-green-600' },
  medium: { label: '🟡 Moyenne', className: 'text-yellow-600' },
  high: { label: '🟠 Haute', className: 'text-orange-600' },
  urgent: { label: '🔴 Urgente', className: 'text-red-600' },
};

export function ThreadPriorityDialog({ threadId, currentPriority, isOpen, onClose }: ThreadPriorityDialogProps) {
  const [priority, setPriority] = useState<ThreadPriority>(currentPriority || 'medium');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePriority = useMutation({
    mutationFn: async () => {
      const { data: existingState } = await supabase
        .from('thread_workflow_states')
        .select('id')
        .eq('topic_id', threadId)
        .single();

      if (existingState) {
        const { error } = await supabase
          .from('thread_workflow_states')
          .update({ priority })
          .eq('topic_id', threadId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('thread_workflow_states')
          .insert({
            topic_id: threadId,
            status: 'new',
            priority,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Priorité mise à jour',
        description: `La priorité a été changée en "${priorityLabels[priority].label}"`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la priorité',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la priorité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nouvelle priorité</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as ThreadPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([value, { label, className }]) => (
                  <SelectItem key={value} value={value}>
                    <span className={className}>{label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => updatePriority.mutate()} disabled={updatePriority.isPending}>
              {updatePriority.isPending ? 'Mise à jour...' : 'Mettre à jour'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
