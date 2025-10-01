import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllRelatedQueries } from '@/lib/queryInvalidation';

/**
 * Composant qui écoute les changements de navigation
 * et force un refresh complet des données
 */
export function NavigationRefresh() {
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Force refresh complet à chaque changement de page
    console.log('🔄 Navigation refresh:', location.pathname);
    invalidateAllRelatedQueries(queryClient);
  }, [location.pathname, location.search, queryClient]);

  return null;
}
