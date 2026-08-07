import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupplyRequestStatusHistoryEntry {
  id: string;
  supply_request_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  comment: string | null;
  created_at: string;
}

export const useSupplyRequestStatusHistory = (requestId: string | undefined) => {
  return useQuery({
    queryKey: ["supply-request-status-history", requestId],
    queryFn: async () => {
      if (!requestId) return [];

      const { data, error } = await supabase
        .from("supply_request_status_history")
        .select("*")
        .eq("supply_request_id", requestId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SupplyRequestStatusHistoryEntry[];
    },
    enabled: !!requestId,
  });
};
