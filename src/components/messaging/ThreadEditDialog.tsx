import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SmartThread, Channel, ThreadCategory } from '@/types/messaging';

interface ThreadEditDialogProps {
  thread: SmartThread;
  channels: Channel[];
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { value: ThreadCategory; label: string }[] = [
  { value: 'general', label: 'Général' },
  { value: 'sav', label: 'SAV' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supply', label: 'Approvisionnement' },
  { value: 'administrative', label: 'Administratif' },
  { value: 'emergency', label: 'Urgence' },
];

export function ThreadEditDialog({ thread, channels, isOpen, onClose }: ThreadEditDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(thread.title);
  const [channelId, setChannelId] = useState(thread.channel_id);
  const [category, setCategory] = useState<ThreadCategory>(thread.workflow_state?.category || 'general');

  useEffect(() => {
    if (isOpen) {
      setTitle(thread.title);
      setChannelId(thread.channel_id);
      setCategory(thread.workflow_state?.category || 'general');
    }
  }, [isOpen, thread]);

  const updateThreadMutation = useMutation({
    mutationFn: async () => {
      // Update topic title and channel
      const { error: topicError } = await supabase
        .from('topics')
        .update({
          title,
          channel_id: channelId,
        })
        .eq('id', thread.id);

      if (topicError) throw topicError;

      // Update workflow state category
      const { error: workflowError } = await supabase
        .from('thread_workflow_states')
        .update({ category })
        .eq('topic_id', thread.id);

      if (workflowError) throw workflowError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', thread.id] });
      toast.success('Sujet modifié avec succès');
      onClose();
    },
    onError: (error) => {
      console.error('Error updating thread:', error);
      toast.error('Erreur lors de la modification du sujet');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Le titre est obligatoire');
      return;
    }
    if (!channelId) {
      toast.error('Le canal est obligatoire');
      return;
    }
    updateThreadMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier le sujet</DialogTitle>
          <DialogDescription>
            Modifiez le titre, le canal ou la catégorie de ce sujet
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du sujet</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Entrez le titre du sujet"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Canal</Label>
              <Select value={channelId} onValueChange={setChannelId}>
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Sélectionnez un canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      #{channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ThreadCategory)}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={updateThreadMutation.isPending}>
              {updateThreadMutation.isPending ? 'Modification...' : 'Modifier'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
