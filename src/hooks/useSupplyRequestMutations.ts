import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDeleteSupplyRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("supply_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supply-requests"] });
      toast.success("Demande d'approvisionnement supprimée avec succès");
    },
    onError: (error: any) => {
      console.error("Error deleting supply request:", error);
      
      if (error.code === "42501") {
        toast.error("Vous n'avez pas la permission de supprimer cette demande");
      } else if (error.code === "23503") {
        toast.error("Impossible de supprimer: des données liées existent encore");
      } else {
        toast.error("Erreur lors de la suppression de la demande");
      }
    },
  });
};
