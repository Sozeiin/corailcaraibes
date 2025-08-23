import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch boat components with React Query.
 * Optionally filter by base identifier when provided.
 */
export const useBoatComponents = (baseId?: string) => {
  return useQuery({
    queryKey: ['boat_components', baseId],
    queryFn: async () => {
      let query = supabase.from('boat_components').select('*');
      if (baseId) {
        query = query.eq('base_id', baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    }
  });
};

