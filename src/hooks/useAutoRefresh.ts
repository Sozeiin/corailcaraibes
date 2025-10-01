import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';

/**
 * Hook qui force le refresh automatique de toutes les queries
 * - Lors du changement de route
 * - Périodiquement toutes les 30 secondes
 */
export const useAutoRefresh = () => {
  const queryClient = useQueryClient();
  const location = useLocation();

  // Fonction pour forcer un refresh complet
  const forceRefresh = useCallback(() => {
    console.log('🔄 Force refresh de toutes les données...');
    queryClient.invalidateQueries();
  }, [queryClient]);

  // Refresh lors du changement de route
  useEffect(() => {
    console.log('🔄 Navigation détectée, refresh des données...');
    forceRefresh();
  }, [location.pathname, forceRefresh]);

  // Refresh périodique toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Refresh périodique automatique...');
      queryClient.invalidateQueries();
    }, 30000); // 30 secondes

    return () => clearInterval(interval);
  }, [queryClient]);

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
