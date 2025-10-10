import { useEffect, useRef } from 'react';

/**
 * Hook pour persister automatiquement les données d'un formulaire dans localStorage
 * et les restaurer à la réouverture du formulaire
 */
export function useFormPersistence<T>(
  formKey: string,
  formData: T,
  isOpen: boolean
) {
  const storageKey = `form_draft_${formKey}`;
  const hasLoadedRef = useRef(false);

  // Sauvegarder les données du formulaire périodiquement
  useEffect(() => {
    if (isOpen && formData) {
      try {
        const dataToSave = JSON.stringify(formData);
        localStorage.setItem(storageKey, dataToSave);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du brouillon:', error);
      }
    }
  }, [formData, isOpen, storageKey]);

  // Charger les données sauvegardées
  const loadSavedData = (): T | null => {
    if (!hasLoadedRef.current) {
      try {
        const saved = localStorage.getItem(storageKey);
        hasLoadedRef.current = true;
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.error('Erreur lors du chargement du brouillon:', error);
        return null;
      }
    }
    return null;
  };

  // Nettoyer les données après soumission
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      hasLoadedRef.current = false;
    } catch (error) {
      console.error('Erreur lors de la suppression du brouillon:', error);
    }
  };

  return { loadSavedData, clearSavedData };
}
