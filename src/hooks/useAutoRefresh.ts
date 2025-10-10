import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useFormState } from '@/contexts/FormStateContext';

/**
 * Hook qui force le refresh automatique des données
 * - Lors du changement de route (seulement si aucun formulaire ouvert)
 * - Périodiquement toutes les 60 secondes (refresh sélectif des listes uniquement)
 * - Au retour sur la fenêtre (seulement si aucun formulaire ouvert)
 */
export const useAutoRefresh = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const { hasOpenForms } = useFormState();

  // Fonction pour forcer un refresh complet (seulement si aucun formulaire ouvert)
  const forceRefresh = useCallback(() => {
    if (hasOpenForms) {
      console.log('⏸️ Refresh suspendu : formulaire ouvert');
      return;
    }
    console.log('🔄 Force refresh de toutes les données...');
    queryClient.invalidateQueries();
  }, [queryClient, hasOpenForms]);

  // Refresh lors du changement de route
  useEffect(() => {
    console.log('🔄 Navigation détectée, refresh des données...');
    forceRefresh();
  }, [location.pathname, forceRefresh]);

  // Refresh périodique toutes les 60 secondes (sélectif - listes uniquement)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasOpenForms) {
        console.log('⏸️ Refresh périodique suspendu : formulaire ouvert');
        return;
      }

      console.log('🔄 Refresh sélectif des listes...');
      
      // Refresh UNIQUEMENT les queries de listes, pas les détails/formulaires
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          // Liste des queries à refresh périodiquement
          const listQueries = [
            'boats', 
            'interventions', 
            'stock_items', 
            'notifications',
            'dashboard-data',
            'suppliers',
            'orders',
            'supply-requests'
          ];
          return listQueries.some(k => key?.includes(k));
        }
      });
    }, 60000); // 60 secondes au lieu de 30

    return () => clearInterval(interval);
  }, [queryClient, hasOpenForms]);

  // Refresh au focus de la fenêtre
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Fenêtre focus, refresh des données...');
      forceRefresh();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [forceRefresh]);

  return { forceRefresh };
};
