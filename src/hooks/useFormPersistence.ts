import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook amélioré pour persister automatiquement les données d'un formulaire dans localStorage
 * Gère la mise en veille de la tablette via l'événement visibilitychange
 * 
 * CORRECTION v2: 
 * - Sauvegarde dès le premier changement (pas besoin d'avoir restauré d'abord)
 * - Restauration automatique au montage
 * - Pas d'écrasement des données restaurées
 */
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  formData: T,
  setFormData: (data: T) => void,
  isOpen: boolean,
  options?: {
    excludeFields?: string[];
    onRestore?: (restoredData: T) => void;
  }
) {
  const storageKey = `form_draft_${formKey}`;
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const lastSaveTimeRef = useRef<number>(0);
  const isRestoredRef = useRef(false);
  const hasTriedRestoreRef = useRef(false);

  // Fonction pour filtrer les champs exclus
  const filterData = useCallback((data: T): Partial<T> => {
    if (!options?.excludeFields) return data;
    
    const filtered = { ...data };
    options.excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [options?.excludeFields]);

  // Sauvegarder les données (immédiatement, avec throttle de 1 seconde)
  const saveData = useCallback((data: T, force: boolean = false) => {
    try {
      const now = Date.now();
      // Éviter les sauvegardes trop fréquentes (max 1 par seconde) sauf si forcé
      if (!force && now - lastSaveTimeRef.current < 1000) return;
      
      const dataToSave = filterData(data);
      const serialized = JSON.stringify({
        data: dataToSave,
        timestamp: now,
        version: 2,
      });
      localStorage.setItem(storageKey, serialized);
      lastSaveTimeRef.current = now;
      setHasSavedDraft(true);
      setLastSaveTime(new Date(now));
      
      console.log(`💾 [FormPersistence] Données sauvegardées: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur sauvegarde:', error);
      // Si erreur de quota, nettoyer les anciens brouillons
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        cleanupOldDrafts();
      }
    }
  }, [formKey, storageKey, filterData]);

  // Charger les données sauvegardées
  const loadSavedData = useCallback((): T | null => {
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

      // VALIDATION: Vérifier que checklistItems est bien un tableau (si présent)
      if (savedData && 'checklistItems' in savedData) {
        const items = (savedData as any).checklistItems;
        if (items !== undefined && !Array.isArray(items)) {
          console.warn('⚠️ [FormPersistence] Brouillon corrompu (checklistItems invalide), suppression');
          localStorage.removeItem(storageKey);
          return null;
        }
      }

      console.log(`📂 [FormPersistence] Données chargées: ${formKey}`);
      return savedData;
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur chargement:', error);
      // En cas d'erreur de parsing, supprimer le brouillon corrompu
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
      return null;
    }
  }, [formKey, storageKey]);

  // Nettoyer les données après soumission
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      isRestoredRef.current = false;
      hasTriedRestoreRef.current = false;
      setHasSavedDraft(false);
      setLastSaveTime(null);
      console.log(`🗑️ [FormPersistence] Brouillon supprimé: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur suppression:', error);
    }
  }, [formKey, storageKey]);

  // Nettoyer les anciens brouillons pour libérer de l'espace
  const cleanupOldDrafts = useCallback(() => {
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
  }, []);

  // Sauvegarder immédiatement (utile pour forcer une sauvegarde)
  // Accepte un override pour éviter les problèmes de state périmé lors de fermetures rapides
  const saveNow = useCallback((overrideData?: T) => {
    const dataToSave = overrideData ?? formData;
    if (dataToSave) {
      console.log('💾 [FormPersistence] saveNow avec override:', !!overrideData);
      saveData(dataToSave, true);
    }
  }, [formData, saveData]);

  // Restaurer automatiquement à l'ouverture (une seule fois)
  useEffect(() => {
    if (isOpen && !hasTriedRestoreRef.current) {
      hasTriedRestoreRef.current = true;
      
      const savedData = loadSavedData();
      if (savedData) {
        console.log('📂 [FormPersistence] Restauration automatique des données');
        isRestoredRef.current = true;
        setHasSavedDraft(true);
        
        // CORRECTION: Si onRestore est fourni, l'utiliser exclusivement (plus robuste)
        // Sinon, fusionner via setFormData (fallback)
        if (options?.onRestore) {
          options.onRestore(savedData as T);
        } else {
          setFormData({ ...formData, ...savedData });
        }
      }
    }
  }, [isOpen]); // Volontairement pas de dépendances sur formData/setFormData pour éviter les boucles

  // Sauvegarder à chaque modification (SANS condition hasLoadedRef)
  useEffect(() => {
    if (isOpen && formData && hasTriedRestoreRef.current) {
      // Sauvegarder les données actuelles
      saveData(formData);
    }
  }, [formData, isOpen, saveData]);

  // Sauvegarder lors de la mise en veille de l'appareil (CRITIQUE pour tablettes)
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden && formData) {
        console.log('💤 [FormPersistence] Appareil en veille, sauvegarde forcée');
        saveData(formData, true); // Forcer la sauvegarde immédiate
      } else if (!document.hidden && !isRestoredRef.current) {
        // Au retour de veille, vérifier s'il faut restaurer
        console.log('☀️ [FormPersistence] Retour de veille, vérification restauration');
        const savedData = loadSavedData();
        if (savedData) {
          console.log('📂 [FormPersistence] Restauration après veille');
          isRestoredRef.current = true;
          setFormData({ ...formData, ...savedData });
          options?.onRestore?.(savedData as T);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, formData, saveData, loadSavedData, setFormData, options]);

  // Sauvegarder avant fermeture de page
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = () => {
      if (formData) {
        saveData(formData, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, formData, saveData]);

  return { 
    loadSavedData, 
    clearSavedData, 
    hasSavedDraft,
    lastSaveTime,
    saveNow,
    isRestored: isRestoredRef.current,
  };
}
