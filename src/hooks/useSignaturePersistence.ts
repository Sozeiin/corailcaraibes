import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook spécialisé pour la persistance des signatures (données volumineuses base64)
 * Sauvegarde séparée pour éviter de surcharger le localStorage principal
 * 
 * CORRECTION v2:
 * - Restauration automatique au montage
 * - Sauvegarde sans condition hasLoadedRef
 * - Callback pour restaurer les signatures dans le composant parent
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
  const storageKey = `signatures_${formKey}`;
  const hasTriedRestoreRef = useRef(false);
  const [isRestored, setIsRestored] = useState(false);

  // Sauvegarder les signatures
  const saveSignatures = useCallback(() => {
    try {
      // Ne sauvegarder que si au moins une signature existe
      if (!signatures.technicianSignature && !signatures.customerSignature) {
        return;
      }

      const dataToSave = {
        technicianSignature: signatures.technicianSignature || '',
        customerSignature: signatures.customerSignature || '',
        timestamp: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      console.log(`💾 [SignaturePersistence] Signatures sauvegardées: ${formKey}`);
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur sauvegarde:', error);
      // Si quota dépassé, ne rien faire (les signatures sont optionnelles dans le brouillon)
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ [SignaturePersistence] Quota dépassé, signatures non sauvegardées');
      }
    }
  }, [signatures.technicianSignature, signatures.customerSignature, storageKey, formKey]);

  // Charger les signatures sauvegardées
  const loadSignatures = useCallback((): { technicianSignature?: string; customerSignature?: string } | null => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      
      // Vérifier que les données ne sont pas trop anciennes (1 jour max pour les signatures)
      const age = Date.now() - parsed.timestamp;
      if (age > 24 * 60 * 60 * 1000) {
        console.log('🗑️ [SignaturePersistence] Signatures trop anciennes, suppression');
        localStorage.removeItem(storageKey);
        return null;
      }

      console.log(`📂 [SignaturePersistence] Signatures chargées: ${formKey}`);
      
      return {
        technicianSignature: parsed.technicianSignature,
        customerSignature: parsed.customerSignature,
      };
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur chargement:', error);
      return null;
    }
  }, [storageKey, formKey]);

  // Nettoyer les signatures
  const clearSignatures = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      hasTriedRestoreRef.current = false;
      setIsRestored(false);
      console.log(`🗑️ [SignaturePersistence] Signatures supprimées: ${formKey}`);
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur suppression:', error);
    }
  }, [storageKey, formKey]);

  // Restaurer automatiquement à l'ouverture (une seule fois)
  useEffect(() => {
    if (isOpen && !hasTriedRestoreRef.current) {
      hasTriedRestoreRef.current = true;
      
      const savedSignatures = loadSignatures();
      if (savedSignatures && (savedSignatures.technicianSignature || savedSignatures.customerSignature)) {
        console.log('📂 [SignaturePersistence] Restauration automatique des signatures');
        setIsRestored(true);
        onRestoreSignatures?.(savedSignatures);
      }
    }
  }, [isOpen, loadSignatures, onRestoreSignatures]);

  // Sauvegarder lors de la mise en veille (CRITIQUE pour tablettes)
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('💤 [SignaturePersistence] Sauvegarde signatures avant veille');
        saveSignatures();
      } else if (!document.hidden && !isRestored) {
        // Au retour de veille, vérifier s'il faut restaurer
        const savedSignatures = loadSignatures();
        if (savedSignatures && (savedSignatures.technicianSignature || savedSignatures.customerSignature)) {
          console.log('📂 [SignaturePersistence] Restauration signatures après veille');
          setIsRestored(true);
          onRestoreSignatures?.(savedSignatures);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, saveSignatures, loadSignatures, onRestoreSignatures, isRestored]);

  // Sauvegarder à chaque modification de signature (SANS condition hasLoadedRef)
  useEffect(() => {
    if (isOpen && hasTriedRestoreRef.current) {
      saveSignatures();
    }
  }, [signatures.technicianSignature, signatures.customerSignature, isOpen, saveSignatures]);

  // Fonction pour sauvegarder immédiatement (exposée au parent)
  // Accepte un override pour éviter les problèmes de state périmé lors de fermetures rapides
  const saveNow = useCallback((overrideSignatures?: { technicianSignature?: string; customerSignature?: string }) => {
    if (overrideSignatures) {
      console.log('💾 [SignaturePersistence] saveNow avec override');
      const sigs = {
        technicianSignature: overrideSignatures.technicianSignature || '',
        customerSignature: overrideSignatures.customerSignature || '',
      };
      if (sigs.technicianSignature || sigs.customerSignature) {
        try {
          const serialized = JSON.stringify({
            signatures: sigs,
            timestamp: Date.now(),
          });
          localStorage.setItem(`signature_draft_${formKey}`, serialized);
          console.log('💾 [SignaturePersistence] Signatures sauvegardées via override');
        } catch (error) {
          console.error('❌ [SignaturePersistence] Erreur sauvegarde override:', error);
        }
      }
    } else {
      saveSignatures();
    }
  }, [formKey, saveSignatures]);

  return {
    loadSignatures,
    clearSignatures,
    saveNow,
    isRestored,
  };
}
