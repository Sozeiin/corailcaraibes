import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook pour la persistance des signatures dans Supabase (via checkin_drafts.signature_data)
 */
export function useSignaturePersistence(
  formKey: string,
  signatures: {
    technicianSignature?: string;
    customerSignature?: string;
  },
  isOpen: boolean,
  onRestoreSignatures?: (signatures: { technicianSignature?: string; customerSignature?: string }) => void
) {
  const dbFormKey = formKey;
  const hasTriedRestoreRef = useRef(false);
  const isHydratedRef = useRef(false);
  const [isRestored, setIsRestored] = useState(false);
  const isSavingRef = useRef(false);
  const lastSaveTimeRef = useRef<number>(0);

  const saveSignatures = useCallback(async () => {
    if (isSavingRef.current) return;
    if (!isHydratedRef.current) {
      console.log('⏸️ [SignaturePersistence] Sauvegarde bloquée (hydratation en cours)');
      return;
    }
    if (!signatures.technicianSignature && !signatures.customerSignature) return;
    
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 2000) return;

    isSavingRef.current = true;
    try {
      const sigData = {
        technicianSignature: signatures.technicianSignature || '',
        customerSignature: signatures.customerSignature || '',
      };

      const { error } = await supabase
        .from('checkin_drafts')
        .update({ 
          signature_data: sigData as any,
          updated_at: new Date().toISOString(),
        })
        .eq('form_key', dbFormKey);

      if (error) {
        console.error('❌ [SignaturePersistence] Erreur sauvegarde:', error);
      } else {
        lastSaveTimeRef.current = now;
        console.log(`💾 [SignaturePersistence] Signatures sauvegardées: ${formKey}`);
      }
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur sauvegarde:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, [signatures.technicianSignature, signatures.customerSignature, dbFormKey, formKey]);

  const loadSignatures = useCallback(async (): Promise<{ technicianSignature?: string; customerSignature?: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('checkin_drafts')
        .select('signature_data')
        .eq('form_key', dbFormKey)
        .maybeSingle();

      if (error || !data?.signature_data) return null;

      const sigData = data.signature_data as any;
      return {
        technicianSignature: sigData.technicianSignature,
        customerSignature: sigData.customerSignature,
      };
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur chargement:', error);
      return null;
    }
  }, [dbFormKey]);

  const clearSignatures = useCallback(async () => {
    try {
      await supabase
        .from('checkin_drafts')
        .update({ signature_data: null, updated_at: new Date().toISOString() })
        .eq('form_key', dbFormKey);
      hasTriedRestoreRef.current = false;
      isHydratedRef.current = false;
      setIsRestored(false);
      console.log(`🗑️ [SignaturePersistence] Signatures supprimées: ${formKey}`);
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur suppression:', error);
    }
  }, [dbFormKey, formKey]);

  // Restaurer automatiquement à l'ouverture
  useEffect(() => {
    if (isOpen && !hasTriedRestoreRef.current) {
      hasTriedRestoreRef.current = true;
      
      loadSignatures().then(savedSignatures => {
        if (savedSignatures && (savedSignatures.technicianSignature || savedSignatures.customerSignature)) {
          console.log('📂 [SignaturePersistence] Restauration automatique des signatures');
          setIsRestored(true);
          onRestoreSignatures?.(savedSignatures);
        }
      }).finally(() => {
        setTimeout(() => {
          isHydratedRef.current = true;
          console.log('✅ [SignaturePersistence] Hydratation signatures terminée');
        }, 300);
      });
    }
  }, [isOpen, loadSignatures, onRestoreSignatures]);

  // Sauvegarder lors de la mise en veille
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isHydratedRef.current) {
        saveSignatures();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, saveSignatures]);

  // Sauvegarder à chaque modification de signature (après hydratation)
  useEffect(() => {
    if (isOpen && isHydratedRef.current) {
      saveSignatures();
    }
  }, [signatures.technicianSignature, signatures.customerSignature, isOpen, saveSignatures]);

  // Sauvegarder immédiatement (force, ignore l'hydratation)
  const saveNow = useCallback(async (overrideSignatures?: { technicianSignature?: string; customerSignature?: string }) => {
    const sigs = overrideSignatures || signatures;
    if (sigs.technicianSignature || sigs.customerSignature) {
      isSavingRef.current = false;
      lastSaveTimeRef.current = 0;
      isHydratedRef.current = true; // Force pour saveNow
      
      try {
        const sigData = {
          technicianSignature: sigs.technicianSignature || '',
          customerSignature: sigs.customerSignature || '',
        };
        
        await supabase
          .from('checkin_drafts')
          .update({ 
            signature_data: sigData as any,
            updated_at: new Date().toISOString(),
          })
          .eq('form_key', dbFormKey);
          
        console.log('💾 [SignaturePersistence] Signatures sauvegardées via saveNow');
      } catch (error) {
        console.error('❌ [SignaturePersistence] Erreur saveNow:', error);
      }
    }
  }, [signatures, dbFormKey]);

  return {
    loadSignatures,
    clearSignatures,
    saveNow,
    isRestored,
  };
}
