import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useSignatureUpload() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ dataURL, fileName }: { dataURL: string; fileName: string }) => {
      console.log('🚀 [DEBUG] Upload signature:', fileName);

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Utilisateur non authentifié');
        }

        // Convert dataURL to blob
        const response = await fetch(dataURL);
        const blob = await response.blob();

        console.log('📦 [DEBUG] Blob créé:', blob.type, blob.size);

        // Create file path with user ID folder structure required by RLS policy
        const filePath = `${user.id}/${fileName}`;
        console.log('📁 [DEBUG] Chemin fichier:', filePath);

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('signatures')
          .upload(filePath, blob, {
            contentType: 'image/png',
            upsert: true,
          });

        if (error) {
          console.error('❌ [DEBUG] Erreur upload signature:', error);
          throw error;
        }

        console.log('✅ [DEBUG] Signature uploadée:', data);

        // Get public URL using the full file path
        const { data: urlData } = supabase.storage
          .from('signatures')
          .getPublicUrl(filePath);

        console.log('🔗 [DEBUG] URL publique:', urlData.publicUrl);

        return {
          path: data.path,
          publicUrl: urlData.publicUrl,
        };
      } catch (error) {
        console.error('❌ [DEBUG] Erreur traitement signature:', error);
        throw error;
      }
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Erreur mutation signature:', error);
      toast({
        title: 'Erreur upload signature',
        description: error.message || 'Erreur lors de l\'upload de la signature',
        variant: 'destructive',
      });
    },
  });
}