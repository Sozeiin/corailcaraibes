import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
import type { SmartThread } from '@/types/messaging';

interface ThreadDeleteDialogProps {
  thread: SmartThread;
  isOpen: boolean;
  onClose: () => void;
}

export function ThreadDeleteDialog({ thread, isOpen, onClose }: ThreadDeleteDialogProps) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', thread.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-threads'] });
      toast.success('Sujet supprimé avec succès');
      onClose();
    },
    onError: (error) => {
      console.error('Error deleting thread:', error);
      toast.error('Erreur lors de la suppression du sujet');
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce sujet ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Le sujet "{thread.title}" et tous ses messages associés seront définitivement supprimés.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
