import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Channel } from '@/types/messaging';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChannelDeleteDialogProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChannelDeleteDialog({ channel, isOpen, onClose }: ChannelDeleteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteChannel = useMutation({
    mutationFn: async (channelId: string) => {
      console.log('Attempting to delete channel with ID:', channelId);
      
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
      
      console.log('Channel deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-channels'] });
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      toast({
        title: 'Canal supprimé',
        description: 'Le canal a été supprimé avec succès',
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Delete mutation error:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le canal',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = () => {
    if (!channel) {
      console.error('No channel to delete');
      return;
    }
    console.log('Deleting channel:', channel);
    deleteChannel.mutate(channel.id);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer le canal ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer le canal "<strong>{channel?.name}</strong>" ?
            <br />
            <span className="text-destructive font-medium">
              Tous les sujets et messages associés seront également supprimés.
            </span>
            <br />
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            {deleteChannel.isPending ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
