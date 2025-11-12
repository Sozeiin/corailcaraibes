import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDeleteShipmentPreparation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preparationId: string) => {
      // First delete related tracking events
      const { error: trackingError } = await supabase
        .from("shipment_tracking_events")
        .delete()
        .eq("preparation_id", preparationId);

      if (trackingError) throw trackingError;

      // Get all boxes for this preparation
      const { data: boxes, error: boxesError } = await supabase
        .from("shipment_boxes")
        .select("id")
        .eq("preparation_id", preparationId);

      if (boxesError) throw boxesError;

      // Delete items in all boxes
      if (boxes && boxes.length > 0) {
        const boxIds = boxes.map(b => b.id);
        const { error: itemsError } = await supabase
          .from("shipment_box_items")
          .delete()
          .in("box_id", boxIds);

        if (itemsError) throw itemsError;
      }

      // Delete all boxes
      const { error: boxesDeleteError } = await supabase
        .from("shipment_boxes")
        .delete()
        .eq("preparation_id", preparationId);

      if (boxesDeleteError) throw boxesDeleteError;

      // Finally delete the preparation
      const { error } = await supabase
        .from("shipment_preparations")
        .delete()
        .eq("id", preparationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipment_preparations"] });
      queryClient.invalidateQueries({ queryKey: ["shipment_boxes"] });
      queryClient.invalidateQueries({ queryKey: ["shipment_box_items"] });
      queryClient.invalidateQueries({ queryKey: ["shipment_tracking_events"] });
      toast.success("Préparation supprimée avec succès");
    },
    onError: (error: any) => {
      console.error("Error deleting shipment preparation:", error);
      
      if (error.code === "42501") {
        toast.error("Vous n'avez pas la permission de supprimer cette préparation");
      } else if (error.code === "23503") {
        toast.error("Impossible de supprimer: des données liées existent encore");
      } else {
        toast.error("Erreur lors de la suppression de la préparation");
      }
    },
  });
};
