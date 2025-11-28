import { useEffect, useRef } from 'react';

/**
 * Hook spécialisé pour la persistance des signatures (données volumineuses base64)
 * Sauvegarde séparée pour éviter de surcharger le localStorage principal
 */
export function useSignaturePersistence(
  formKey: string,
  signatures: {
    technicianSignature?: string;
    customerSignature?: string;
  },
  isOpen: boolean
) {
  const storageKey = `signatures_${formKey}`;
  const hasLoadedRef = useRef(false);

  // Sauvegarder les signatures
  const saveSignatures = () => {
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
  };

  // Charger les signatures sauvegardées
  const loadSignatures = (): typeof signatures | null => {
    if (hasLoadedRef.current) return null;

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

      hasLoadedRef.current = true;
      console.log(`📂 [SignaturePersistence] Signatures restaurées: ${formKey}`);
      
      return {
        technicianSignature: parsed.technicianSignature,
        customerSignature: parsed.customerSignature,
      };
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur chargement:', error);
      return null;
    }
  };

  // Nettoyer les signatures
  const clearSignatures = () => {
    try {
      localStorage.removeItem(storageKey);
      hasLoadedRef.current = false;
      console.log(`🗑️ [SignaturePersistence] Signatures supprimées: ${formKey}`);
    } catch (error) {
      console.error('❌ [SignaturePersistence] Erreur suppression:', error);
    }
  };

  // Sauvegarder lors de la mise en veille
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('💤 [SignaturePersistence] Sauvegarde signatures avant veille');
        saveSignatures();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isOpen, signatures]);

  // Sauvegarder à chaque modification de signature
  useEffect(() => {
    if (isOpen && hasLoadedRef.current) {
      saveSignatures();
    }
  }, [signatures.technicianSignature, signatures.customerSignature, isOpen]);

  return {
    loadSignatures,
    clearSignatures,
  };
}
