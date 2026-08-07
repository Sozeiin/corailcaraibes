import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface SupplyRequestCommentAttachment {
  url: string;
  name: string;
  type: string;
  size?: number;
}

export interface SupplyRequestComment {
  id: string;
  supply_request_id: string;
  author_id: string | null;
  author_name: string;
  comment: string;
  status_at_comment: string | null;
  created_at: string;
  attachments?: SupplyRequestCommentAttachment[] | null;
}

const BUCKET = "purchase-requests";

export const uploadCommentAttachment = async (
  requestId: string,
  file: File
): Promise<SupplyRequestCommentAttachment> => {
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `supply-request-comments/${requestId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
  };
};

export const useSupplyRequestComments = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ["supply-request-comments", requestId],
    queryFn: async () => {
      if (!requestId) return [];
      
      const { data, error } = await supabase
        .from("supply_request_comments")
        .select("*")
        .eq("supply_request_id", requestId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []).map((c: any) => ({
        ...c,
        attachments: Array.isArray(c.attachments) ? c.attachments : [],
      })) as SupplyRequestComment[];
    },
    enabled: !!requestId,
  });
};

export const useAddSupplyRequestComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      requestId,
      comment,
      statusAtComment,
      attachments = [],
    }: {
      requestId: string;
      comment: string;
      statusAtComment?: string;
      attachments?: SupplyRequestCommentAttachment[];
    }) => {
      const { error } = await supabase.from("supply_request_comments").insert({
        supply_request_id: requestId,
        author_id: user?.id,
        author_name: user?.name || "Utilisateur",
        comment,
        status_at_comment: statusAtComment,
        attachments: attachments as any,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["supply-request-comments", variables.requestId],
      });
      toast.success("Commentaire ajouté");
    },
    onError: (error: any) => {
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire");
    },
  });
};

export const useDeleteSupplyRequestComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, requestId }: { commentId: string; requestId: string }) => {
      const { error } = await supabase
        .from("supply_request_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return requestId;
    },
    onSuccess: (requestId) => {
      queryClient.invalidateQueries({
        queryKey: ["supply-request-comments", requestId],
      });
      toast.success("Commentaire supprimé");
    },
    onError: (error: any) => {
      console.error("Error deleting comment:", error);
      toast.error("Erreur lors de la suppression du commentaire");
    },
  });
};
