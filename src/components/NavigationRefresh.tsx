import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateAllRelatedQueries } from '@/lib/queryInvalidation';
import { useFormState } from '@/contexts/FormStateContext';

/**
 * Composant qui écoute les changements de navigation
 * et force un refresh complet des données
 * (suspendu quand un formulaire/dialogue est ouvert pour ne pas écraser une saisie en cours)
 */
export function NavigationRefresh() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { hasOpenForms } = useFormState();

  useEffect(() => {
    if (hasOpenForms) {
      console.log('⏸️ Navigation refresh suspendu : formulaire ouvert');
      return;
    }
    // Force refresh complet à chaque changement de page
    console.log('🔄 Navigation refresh:', location.pathname);
    invalidateAllRelatedQueries(queryClient);
  }, [location.pathname, location.search, queryClient, hasOpenForms]);

  return null;
}
