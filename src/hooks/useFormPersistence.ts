import { useEffect, useRef, useState } from 'react';

/**
 * Hook amélioré pour persister automatiquement les données d'un formulaire dans localStorage
 * Gère la mise en veille de la tablette via l'événement visibilitychange
 */
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  formData: T,
  setFormData: (data: T) => void,
  isOpen: boolean,
  options?: {
    excludeFields?: string[];
    onRestore?: () => void;
  }
) {
  const storageKey = `form_draft_${formKey}`;
  const hasLoadedRef = useRef(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const lastSaveTimeRef = useRef<number>(0);

  // Fonction pour filtrer les champs exclus
  const filterData = (data: T): Partial<T> => {
    if (!options?.excludeFields) return data;
    
    const filtered = { ...data };
    options.excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  };

  // Sauvegarder les données (immédiatement, pas de debounce)
  const saveData = (data: T) => {
    try {
      const now = Date.now();
      // Éviter les sauvegardes trop fréquentes (max 1 par seconde)
      if (now - lastSaveTimeRef.current < 1000) return;
      
      const dataToSave = filterData(data);
      const serialized = JSON.stringify({
        data: dataToSave,
        timestamp: now,
        version: 1,
      });
      localStorage.setItem(storageKey, serialized);
      lastSaveTimeRef.current = now;
      setHasSavedDraft(true);
      
      console.log(`💾 [FormPersistence] Données sauvegardées: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur sauvegarde:', error);
      // Si erreur de quota, nettoyer les anciens brouillons
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        cleanupOldDrafts();
      }
    }
  };

  // Charger les données sauvegardées
  const loadSavedData = (): T | null => {
    if (hasLoadedRef.current) return null;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const savedData = parsed.data as T;
      
      // Vérifier que les données ne sont pas trop anciennes (7 jours max)
      const age = Date.now() - parsed.timestamp;
      if (age > 7 * 24 * 60 * 60 * 1000) {
        console.log('🗑️ [FormPersistence] Brouillon trop ancien, suppression');
        localStorage.removeItem(storageKey);
        return null;
      }

      hasLoadedRef.current = true;
      console.log(`📂 [FormPersistence] Données restaurées: ${formKey}`);
      return savedData;
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur chargement:', error);
      return null;
    }
  };

  // Nettoyer les données après soumission
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      hasLoadedRef.current = false;
      setHasSavedDraft(false);
      console.log(`🗑️ [FormPersistence] Brouillon supprimé: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur suppression:', error);
    }
  };

  // Nettoyer les anciens brouillons pour libérer de l'espace
  const cleanupOldDrafts = () => {
    try {
      const keys = Object.keys(localStorage);
      const draftKeys = keys.filter(key => key.startsWith('form_draft_'));
      
      draftKeys.forEach(key => {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            const age = Date.now() - parsed.timestamp;
            // Supprimer les brouillons de plus de 3 jours
            if (age > 3 * 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          // Si erreur de parsing, supprimer la clé
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur nettoyage:', error);
    }
  };

  // Restaurer automatiquement à l'ouverture
  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      const savedData = loadSavedData();
      if (savedData) {
        // Fusionner avec les données actuelles (privilégier les données sauvegardées)
        setFormData({ ...formData, ...savedData });
        setHasSavedDraft(true);
        options?.onRestore?.();
      }
    }
  }, [isOpen]);

  // Sauvegarder à chaque modification
  useEffect(() => {
    if (isOpen && hasLoadedRef.current && formData) {
      saveData(formData);
    }
  }, [formData, isOpen]);

  // Sauvegarder lors de la mise en veille de l'appareil
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden && formData) {
        console.log('💤 [FormPersistence] Appareil en veille, sauvegarde forcée');
        saveData(formData);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, formData]);

  // Sauvegarder avant fermeture de page
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = () => {
      if (formData) {
        saveData(formData);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, formData]);

  return { 
    loadSavedData, 
    clearSavedData, 
    hasSavedDraft,
    saveNow: () => saveData(formData),
  };
}
