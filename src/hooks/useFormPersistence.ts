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
  const lastSaveTimeRef = useRef<number>(0);
  const isRestoredRef = useRef(false);
  const hasTriedRestoreRef = useRef(false);
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

      // Upsert based on form_key
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

      // Vérifier que les données ne sont pas trop anciennes (7 jours max)
      const age = Date.now() - new Date(data.updated_at).getTime();
      if (age > 7 * 24 * 60 * 60 * 1000) {
        console.log('🗑️ [FormPersistence] Brouillon trop ancien, suppression');
        await supabase.from('checkin_drafts').delete().eq('form_key', formKey);
        return null;
      }

      const savedData = data.form_data as T;

      // VALIDATION: Vérifier que checklistItems est bien un tableau (si présent)
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
      setHasSavedDraft(false);
      setLastSaveTime(null);
      console.log(`🗑️ [FormPersistence] Brouillon supprimé: ${formKey}`);
    } catch (error) {
      console.error('❌ [FormPersistence] Erreur suppression:', error);
    }
  }, [formKey]);

  // Sauvegarder immédiatement
  const saveNow = useCallback((overrideData?: T) => {
    const dataToSave = overrideData ?? formData;
    if (dataToSave) {
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
        }
      });
    }
  }, [isOpen]); // Volontairement pas de dépendances sur formData/setFormData pour éviter les boucles

  // Sauvegarder à chaque modification (throttled)
  useEffect(() => {
    if (isOpen && formData && hasTriedRestoreRef.current) {
      saveData(formData);
    }
  }, [formData, isOpen, saveData]);

  // Sauvegarder lors de la mise en veille (CRITIQUE pour tablettes)
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden && formData) {
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
      if (formData) {
        // Use sendBeacon for reliable save on page close
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
