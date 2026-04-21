import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook pour persister les données d'un formulaire dans Supabase (table checkin_drafts)
 * Remplace le localStorage pour permettre à toute l'équipe de reprendre un brouillon
 */
export function useFormPersistence<T extends Record<string, any>>(
  formKey: string,
  formData: T,
  setFormData: (data: T) => void,
  isOpen: boolean,
  options?: {
    excludeFields?: string[];
    onRestore?: (restoredData: T) => void;
    boatId?: string;
    boatName?: string;
    checklistType?: string;
    customerName?: string;
  }
) {
  const { user } = useAuth();
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastSaveTimeRef = useRef<number>(0);
  const isRestoredRef = useRef(false);
  const hasTriedRestoreRef = useRef(false);
  const isHydratedRef = useRef(false);
  const isSavingRef = useRef(false);

  // Filtrer les champs exclus
  const filterData = useCallback((data: T): Partial<T> => {
    if (!options?.excludeFields) return data;
    const filtered = { ...data };
    options.excludeFields.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  }, [options?.excludeFields]);

  // Sauvegarder dans Supabase (avec throttle de 2 secondes)
  const saveData = useCallback(async (data: T, force: boolean = false) => {
    if (isSavingRef.current) return;
    // GARDE CRITIQUE: ne jamais sauvegarder avant la fin de l'hydratation
    if (!isHydratedRef.current) {
      console.log('⏸️ [FormPersistence] Sauvegarde bloquée (hydratation en cours)');
      return;
    }
    
    const now = Date.now();
    if (!force && now - lastSaveTimeRef.current < 2000) return;
    
    isSavingRef.current = true;
    try {
      const dataToSave = filterData(data);
      
      const record = {
        form_key: formKey,
        boat_id: options?.boatId || null,
        boat_name: options?.boatName || null,
        checklist_type: options?.checklistType || null,
        customer_name: options?.customerName || null,
        form_data: dataToSave as any,
        updated_by: user?.id || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('checkin_drafts')
        .upsert(
          { ...record, created_by: user?.id || null },
          { onConflict: 'form_key' }
        );

      if (error) {
        console.error('❌ [FormPersistence] Erreur sauvegarde Supabase:', error);
      } else {
        lastSaveTimeRef.current = now;
        setHasSavedDraft(true);
        setLastSaveTime(new Date(now));
        console.log(`💾 [FormPersistence] Brouillon sauvegardé en base: ${formKey}`);
      }
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur sauvegarde:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [formKey, filterData, options?.boatId, options?.boatName, options?.checklistType, options?.customerName, user?.id]);

  // Charger les données sauvegardées depuis Supabase
  const loadSavedData = useCallback(async (): Promise<T | null> => {
    try {
      const { data, error } = await supabase
        .from('checkin_drafts')
        .select('form_data, updated_at')
        .eq('form_key', formKey)
        .maybeSingle();

      if (error) {
        console.error('❌ [FormPersistence] Erreur chargement:', error);
        return null;
      }
      if (!data) return null;

      const age = Date.now() - new Date(data.updated_at).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) {
        console.log('🗑️ [FormPersistence] Brouillon trop ancien, suppression');
        await supabase.from('checkin_drafts').delete().eq('form_key', formKey);
        return null;
      }

      const savedData = data.form_data as T;

      if (savedData && 'checklistItems' in savedData) {
        const items = (savedData as any).checklistItems;
        if (items !== undefined && !Array.isArray(items)) {
          console.warn('⚠️ [FormPersistence] Brouillon corrompu (checklistItems invalide), suppression');
          await supabase.from('checkin_drafts').delete().eq('form_key', formKey);
          return null;
        }
      }

      console.log(`📂 [FormPersistence] Données chargées depuis Supabase: ${formKey}`);
      return savedData;
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur chargement:', error);
      return null;
    }
  }, [formKey]);

  // Nettoyer les données après soumission
  const clearSavedData = useCallback(async () => {
    try {
      await supabase.from('checkin_drafts').delete().eq('form_key', formKey);
      isRestoredRef.current = false;
      hasTriedRestoreRef.current = false;
      isHydratedRef.current = false;
      setIsHydrated(false);
      setHasSavedDraft(false);
      setLastSaveTime(null);
      console.log(`🗑️ [FormPersistence] Brouillon supprimé: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur suppression:', error);
    }
  }, [formKey]);

  // Sauvegarder immédiatement (force, ignore l'hydratation si overrideData fourni)
  const saveNow = useCallback((overrideData?: T) => {
    const dataToSave = overrideData ?? formData;
    if (dataToSave) {
      // Si overrideData fourni, on force même sans hydratation (cas finalisation)
      if (overrideData && !isHydratedRef.current) {
        isHydratedRef.current = true;
      }
      saveData(dataToSave, true);
    }
  }, [formData, saveData]);

  // Restaurer automatiquement à l'ouverture (une seule fois)
  useEffect(() => {
    if (isOpen && !hasTriedRestoreRef.current) {
      hasTriedRestoreRef.current = true;
      
      loadSavedData().then(savedData => {
        if (savedData) {
          console.log('📂 [FormPersistence] Restauration automatique des données');
          isRestoredRef.current = true;
          setHasSavedDraft(true);
          
          if (options?.onRestore) {
            options.onRestore(savedData as T);
          } else {
            setFormData({ ...formData, ...savedData });
          }
        } else {
          console.log('📭 [FormPersistence] Aucun brouillon existant');
        }
      }).finally(() => {
        // Hydratation finie quoi qu'il arrive — autoriser les sauvegardes
        // Délai court pour laisser React appliquer les setState de la restauration
        setTimeout(() => {
          isHydratedRef.current = true;
          setIsHydrated(true);
          console.log('✅ [FormPersistence] Hydratation terminée, sauvegardes autorisées');
        }, 300);
      });
    }
  }, [isOpen]);

  // Sauvegarder à chaque modification (throttled) — bloqué tant que non hydraté
  useEffect(() => {
    if (isOpen && formData && isHydrated) {
      saveData(formData);
    }
  }, [formData, isOpen, saveData, isHydrated]);

  // Sauvegarder lors de la mise en veille
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden && formData && isHydratedRef.current) {
        console.log('💤 [FormPersistence] Appareil en veille, sauvegarde forcée');
        saveData(formData, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, formData, saveData]);

  // Sauvegarder avant fermeture de page
  useEffect(() => {
    if (!isOpen) return;

    const handleBeforeUnload = () => {
      if (formData && isHydratedRef.current) {
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
    isHydrated,
  };
}
