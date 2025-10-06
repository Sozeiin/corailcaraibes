import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useIsSuperAdmin() {
  const { user } = useAuth();

  const { data: isSuperAdmin = false, isLoading } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'super_admin'
      });
      
      return data || false;
    },
    enabled: !!user?.id
  });

  return { isSuperAdmin, isLoading };
}
