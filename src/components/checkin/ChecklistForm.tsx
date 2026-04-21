import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Save, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFormState } from '@/contexts/FormStateContext';
import { useToast } from '@/hooks/use-toast';
import { 
  useChecklistItems, 
  useCreateChecklist, 
  useCreateRental, 
  useUpdateBoatStatus, 
  useUpdateRentalStatus,
  ChecklistItem,
  ChecklistData 
} from '@/hooks/useChecklistData';
import { useSignatureUpload } from '@/hooks/useSignatureUpload';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { useSignaturePersistence } from '@/hooks/useSignaturePersistence';
import { supabase } from '@/integrations/supabase/client';
import { ChecklistSteps } from './ChecklistSteps';
import { ChecklistInspection } from './ChecklistInspection';
import { ChecklistReviewStep } from './ChecklistReviewStep';
import { SignatureStep } from './SignatureStep';
import { EmailStep } from './EmailStep';
import { useCreateIntervention } from '@/hooks/useCreateIntervention';
import { useBoatEngines } from '@/hooks/useBoatEngines';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getLocalDateString } from '@/lib/dateUtils';

// Type pour les heures moteur
export type EngineHoursState = Record<string, number | undefined>;

interface ChecklistFormProps {
  boat: any;
  rentalData: any;
  type: 'checkin' | 'checkout';
  onComplete: (data: any) => void;
}

// Interface pour les méthodes exposées au parent
export interface ChecklistFormRef {
  saveFormNow: () => void;
}

export const ChecklistForm = forwardRef<ChecklistFormRef, ChecklistFormProps>(
  function ChecklistFormInner({ boat, rentalData, type, onComplete }, ref) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { registerForm, unregisterForm } = useFormState();

  // State management
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [overallStatus, setOverallStatus] = useState<'ok' | 'needs_attention' | 'major_issues'>('ok');
  const [currentStep, setCurrentStep] = useState<'checklist' | 'review' | 'signatures' | 'email'>('checklist');
  const [technicianSignature, setTechnicianSignature] = useState<string>('');
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState(rentalData?.customerEmail || '');
  const [sendEmailReport, setSendEmailReport] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [tempChecklistId] = useState(`temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  
  // State pour les heures moteur
  const [engineHours, setEngineHours] = useState<EngineHoursState>({});
  
  // Flag pour éviter l'écrasement des données restaurées
  const [isItemsInitialized, setIsItemsInitialized] = useState(false);
  const hasRestoredDataRef = useRef(false);
  // Stocke les items restaurés tant que les fetchedItems ne sont pas dispo (pour fusion)
  const pendingRestoredItemsRef = useRef<ChecklistItem[] | null>(null);

  // ===== REFS POUR CAPTURER L'ÉTAT IMMÉDIATEMENT (évite les closures périmées) =====
  const checklistItemsRef = useRef<ChecklistItem[]>([]);
  const generalNotesRef = useRef('');
  const currentStepRef = useRef<'checklist' | 'review' | 'signatures' | 'email'>('checklist');
  const customerEmailRef = useRef('');
  const sendEmailReportRef = useRef(false);
  const technicianSignatureRef = useRef('');
  const customerSignatureRef = useRef('');
  const engineHoursRef = useRef<EngineHoursState>({});

  // Synchroniser les refs avec les states (pour que les refs soient toujours à jour)
  useEffect(() => { checklistItemsRef.current = checklistItems; }, [checklistItems]);
  useEffect(() => { generalNotesRef.current = generalNotes; }, [generalNotes]);
  useEffect(() => { currentStepRef.current = currentStep; }, [currentStep]);
  useEffect(() => { customerEmailRef.current = customerEmail; }, [customerEmail]);
  useEffect(() => { sendEmailReportRef.current = sendEmailReport; }, [sendEmailReport]);
  useEffect(() => { technicianSignatureRef.current = technicianSignature; }, [technicianSignature]);
  useEffect(() => { customerSignatureRef.current = customerSignature; }, [customerSignature]);
  useEffect(() => { engineHoursRef.current = engineHours; }, [engineHours]);

  // Queries and mutations
  const { data: fetchedItems, isLoading: itemsLoading, error: itemsError } = useChecklistItems();
  const createChecklistMutation = useCreateChecklist();
  const createRentalMutation = useCreateRental();
  const updateBoatStatusMutation = useUpdateBoatStatus();
  const updateRentalStatusMutation = useUpdateRentalStatus();
  const uploadSignatureMutation = useSignatureUpload();
  const createInterventionMutation = useCreateIntervention();
  const { data: engines } = useBoatEngines(boat?.id);

  // Enregistrer le formulaire comme actif (pour désactiver le timer d'inactivité)
  useEffect(() => {
    registerForm();
    console.log('📝 [ChecklistForm] Formulaire enregistré comme actif');
    
    return () => {
      unregisterForm();
      console.log('📝 [ChecklistForm] Formulaire désenregistré');
    };
  }, [registerForm, unregisterForm]);

  // Callback pour la restauration des données du formulaire
  // IMPORTANT: Met à jour les refs ET les states pour que les deux soient synchronisés
  // CORRECTION: Valide que checklistItems est bien un tableau avant restauration
  const handleFormRestore = useCallback((restoredData: any) => {
    console.log('📂 [ChecklistForm] Restauration des données du formulaire', restoredData);
    
    // VALIDATION: Vérifier que checklistItems est bien un tableau
    if (restoredData.checklistItems && !Array.isArray(restoredData.checklistItems)) {
      console.warn('⚠️ [ChecklistForm] Brouillon corrompu (checklistItems n\'est pas un tableau), ignoré');
      toast({
        title: "Brouillon invalide",
        description: "Le brouillon précédent était corrompu et a été supprimé.",
        variant: "destructive",
      });
      return; // Ne pas restaurer les données corrompues
    }
    
    hasRestoredDataRef.current = true;
    
    if (restoredData.checklistItems && restoredData.checklistItems.length > 0) {
      // Si les items de référence sont déjà dispo, fusionner immédiatement
      // Sinon, stocker pour fusion ultérieure dans l'effet d'init
      if (fetchedItems && fetchedItems.length > 0) {
        const merged = fetchedItems.map((freshItem: any) => {
          const savedItem = restoredData.checklistItems.find((s: any) => s.id === freshItem.id);
          return {
            id: freshItem.id,
            name: freshItem.name,
            category: freshItem.category,
            isRequired: freshItem.is_required,
            status: savedItem?.status ?? 'not_checked',
            notes: savedItem?.notes ?? '',
            photos: savedItem?.photos ?? [],
          };
        });
        checklistItemsRef.current = merged;
        setChecklistItems(merged);
        setIsItemsInitialized(true);
        console.log(`📂 [ChecklistForm] Items fusionnés (${merged.length}), ${merged.filter(i => i.status !== 'not_checked').length} déjà cochés`);
      } else {
        pendingRestoredItemsRef.current = restoredData.checklistItems;
        console.log('⏳ [ChecklistForm] Items restaurés en attente de fetchedItems');
      }
    }
    if (restoredData.generalNotes) {
      generalNotesRef.current = restoredData.generalNotes;
      setGeneralNotes(restoredData.generalNotes);
    }
    if (restoredData.currentStep) {
      currentStepRef.current = restoredData.currentStep;
      setCurrentStep(restoredData.currentStep);
    }
    if (restoredData.customerEmail) {
      customerEmailRef.current = restoredData.customerEmail;
      setCustomerEmail(restoredData.customerEmail);
    }
    if (restoredData.sendEmailReport !== undefined) {
      sendEmailReportRef.current = restoredData.sendEmailReport;
      setSendEmailReport(restoredData.sendEmailReport);
    }
    if (restoredData.engineHours) {
      engineHoursRef.current = restoredData.engineHours;
      setEngineHours(restoredData.engineHours);
    }
    
    toast({
      title: "Brouillon restauré",
      description: "Vos données ont été restaurées.",
    });
  }, [toast]);

  // Persistance des données du formulaire dans Supabase
  const { clearSavedData: clearFormDraft, hasSavedDraft, lastSaveTime, saveNow } = useFormPersistence(
    `checklist_${boat.id}_${type}`,
    {
      checklistItems,
      generalNotes,
      currentStep,
      customerEmail,
      sendEmailReport,
      engineHours,
    },
    setChecklistItems as any, // Pas utilisé directement, on utilise onRestore
    true, // isOpen = true car le composant est monté
    { 
      excludeFields: [],
      onRestore: handleFormRestore,
      boatId: boat.id,
      boatName: boat.name,
      checklistType: type,
      customerName: rentalData?.customerName || '',
    }
  );

  // Callback pour la restauration des signatures
  // IMPORTANT: Met à jour les refs ET les states pour que les deux soient synchronisés
  const handleSignatureRestore = useCallback((restoredSignatures: { technicianSignature?: string; customerSignature?: string }) => {
    console.log('📂 [ChecklistForm] Restauration des signatures');
    if (restoredSignatures.technicianSignature) {
      technicianSignatureRef.current = restoredSignatures.technicianSignature;
      setTechnicianSignature(restoredSignatures.technicianSignature);
    }
    if (restoredSignatures.customerSignature) {
      customerSignatureRef.current = restoredSignatures.customerSignature;
      setCustomerSignature(restoredSignatures.customerSignature);
    }
  }, []);

  // Persistance séparée pour les signatures (volumineuses)
  const { clearSignatures, saveNow: saveSignaturesNow } = useSignaturePersistence(
    `checklist_${boat.id}_${type}`,
    { technicianSignature, customerSignature },
    true,
    handleSignatureRestore
  );

  // Exposer la fonction de sauvegarde au parent via ref
  // UTILISE LES REFS pour capturer l'état le plus récent (évite les closures périmées)
  useImperativeHandle(ref, () => ({
    saveFormNow: () => {
      console.log('💾 [ChecklistForm] Sauvegarde forcée via ref avec état actuel des refs');
      
      // Récupérer les données les plus récentes depuis les refs
      const currentFormData = {
        checklistItems: checklistItemsRef.current,
        generalNotes: generalNotesRef.current,
        currentStep: currentStepRef.current,
        customerEmail: customerEmailRef.current,
        sendEmailReport: sendEmailReportRef.current,
        engineHours: engineHoursRef.current,
      };
      
      const currentSignatures = {
        technicianSignature: technicianSignatureRef.current,
        customerSignature: customerSignatureRef.current,
      };
      
      console.log('💾 [ChecklistForm] Données à sauvegarder:', {
        itemsCount: currentFormData.checklistItems.length,
        hasNotes: !!currentFormData.generalNotes,
        step: currentFormData.currentStep,
        hasTechSig: !!currentSignatures.technicianSignature,
        hasCustSig: !!currentSignatures.customerSignature,
        engineHoursCount: Object.keys(currentFormData.engineHours).length,
      });
      
      // Sauvegarder avec les données des refs (override)
      saveNow(currentFormData as any);
      saveSignaturesNow(currentSignatures);
    }
  }), [saveNow, saveSignaturesNow]);

  // Handler pour les heures moteur
  const handleEngineHoursChange = useCallback((componentId: string, hours: number | undefined) => {
    setEngineHours(prev => {
      const updated = { ...prev, [componentId]: hours };
      engineHoursRef.current = updated;
      return updated;
    });
  }, []);

  // Initialize checklist items - NE PAS ÉCRASER SI DES DONNÉES ONT ÉTÉ RESTAURÉES
  useEffect(() => {
    if (fetchedItems && !isItemsInitialized) {
      console.log('📋 [DEBUG] Items récupérés:', fetchedItems.length, 'items');
      
      // Cas 1: restauration en attente -> fusionner maintenant
      if (pendingRestoredItemsRef.current) {
        const saved = pendingRestoredItemsRef.current;
        const merged = fetchedItems.map((freshItem: any) => {
          const savedItem = saved.find((s: any) => s.id === freshItem.id);
          return {
            id: freshItem.id,
            name: freshItem.name,
            category: freshItem.category,
            isRequired: freshItem.is_required,
            status: savedItem?.status ?? 'not_checked',
            notes: savedItem?.notes ?? '',
            photos: savedItem?.photos ?? [],
          };
        });
        checklistItemsRef.current = merged;
        setChecklistItems(merged);
        setIsItemsInitialized(true);
        pendingRestoredItemsRef.current = null;
        console.log(`📋 [ChecklistForm] Fusion différée: ${merged.filter(i => i.status !== 'not_checked').length} items cochés restaurés`);
        return;
      }
      
      // Cas 2: données déjà restaurées
      if (hasRestoredDataRef.current && checklistItems.length > 0) {
        console.log('📋 [DEBUG] Données restaurées détectées, pas de réinitialisation');
        setIsItemsInitialized(true);
        return;
      }
      
      // Cas 3: initialisation fraîche
      const initialItems = fetchedItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        isRequired: item.is_required,
        status: 'not_checked' as const,
        notes: '',
        photos: [],
      }));
      
      checklistItemsRef.current = initialItems;
      setChecklistItems(initialItems);
      setIsItemsInitialized(true);
    }
  }, [fetchedItems, isItemsInitialized, checklistItems.length]);

  // Calculate overall status based on item statuses
  useEffect(() => {
    if (checklistItems.length > 0) {
      const needsRepair = checklistItems.filter(item => item.status === 'needs_repair');
      const requiresAttention = checklistItems.filter(item => 
        item.isRequired && item.status === 'not_checked'
      );

      if (needsRepair.length > 3) {
        setOverallStatus('major_issues');
      } else if (needsRepair.length > 0 || requiresAttention.length > 0) {
        setOverallStatus('needs_attention');
      } else {
        setOverallStatus('ok');
      }
    }
  }, [checklistItems]);

  // Event handlers - MISE À JOUR DES REFS AVANT setState pour capturer l'état immédiatement
  const handleItemStatusChange = (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => {
    console.log('🔄 [DEBUG] Changement statut item:', itemId, status, notes);
    // Calculer la nouvelle valeur AVANT setState
    const updated = checklistItemsRef.current.map(item => 
      item.id === itemId 
        ? { ...item, status, notes: notes || item.notes }
        : item
    );
    // Mettre à jour la ref IMMÉDIATEMENT (synchrone)
    checklistItemsRef.current = updated;
    console.log('🔄 [DEBUG] Ref mise à jour immédiatement:', updated.filter(item => item.id === itemId));
    // Puis mettre à jour le state (asynchrone)
    setChecklistItems(updated);
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    console.log('📝 [DEBUG] Changement notes item:', itemId, notes);
    const updated = checklistItemsRef.current.map(item => 
      item.id === itemId ? { ...item, notes } : item
    );
    checklistItemsRef.current = updated;
    setChecklistItems(updated);
  };

  const handleItemPhotoChange = (itemId: string, photos: Array<{ id?: string; url: string; displayOrder: number }>) => {
    console.log('📷 [DEBUG] Changement photos item:', itemId, photos);
    const updated = checklistItemsRef.current.map(item => 
      item.id === itemId ? { ...item, photos } : item
    );
    checklistItemsRef.current = updated;
    setChecklistItems(updated);
  };

  // Navigation
  const isStepComplete = (step: string) => {
    switch (step) {
      case 'checklist':
        // Vérifie que tous les éléments obligatoires sont OK ou needs_repair
        const mandatoryItems = checklistItems.filter(item => item.isRequired);
        const mandatoryCompleted = mandatoryItems.every(item => 
          item.status === 'ok' || item.status === 'needs_repair'
        );
        return mandatoryCompleted;
      case 'review':
        // Tous les éléments doivent être vérifiés (pas de 'not_checked')
        return checklistItems.every(item => item.status !== 'not_checked');
      case 'signatures':
        return technicianSignature && customerSignature;
      case 'email':
        return !sendEmailReport || (customerEmail && customerEmail.includes('@'));
      default:
        return false;
    }
  };

  const canProceedToNext = () => {
    return isStepComplete(currentStep);
  };

  const shouldShowReviewStep = () => {
    // Affiche l'étape de revérification s'il y a des éléments non vérifiés
    return checklistItems.some(item => item.status === 'not_checked');
  };

  const getNextStep = () => {
    const hasUnverified = shouldShowReviewStep();
    
    switch (currentStep) {
      case 'checklist':
        return hasUnverified ? 'review' : 'signatures';
      case 'review':
        return 'signatures';
      case 'signatures':
        return 'email';
      default:
        return 'email';
    }
  };

  const handleNextStep = () => {
    if (!canProceedToNext()) {
      const mandatoryIncomplete = checklistItems.filter(item => 
        item.isRequired && item.status === 'not_checked'
      );
      
      if (mandatoryIncomplete.length > 0) {
        toast({
          title: 'Éléments obligatoires manquants',
          description: `${mandatoryIncomplete.length} élément(s) obligatoire(s) doivent être vérifiés avant de continuer.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Étape incomplète',
          description: 'Veuillez compléter toutes les vérifications requises.',
          variant: 'destructive',
        });
      }
      return;
    }

    const nextStep = getNextStep();
    setCurrentStep(nextStep);
  };

  const handlePreviousStep = () => {
    const hasUnverified = shouldShowReviewStep();
    
    switch (currentStep) {
      case 'review':
        setCurrentStep('checklist');
        break;
      case 'signatures':
        setCurrentStep(hasUnverified ? 'review' : 'checklist');
        break;
      case 'email':
        setCurrentStep('signatures');
        break;
      default:
        break;
    }
  };

  // Main completion handler
  const handleComplete = async () => {
    if (!user?.id) {
      toast({
        title: 'Erreur',
        description: 'Utilisateur non authentifié',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🚀 [DEBUG] Début de la finalisation');
      console.log('🚀 [DEBUG] Paramètres email:', { sendEmailReport, customerEmail });
      console.log('🚀 [DEBUG] Données utilisateur:', user);
      console.log('🚀 [DEBUG] Données bateau:', boat);
      console.log('🚀 [DEBUG] Données rental:', rentalData);

      // Upload signatures
      let technicianSignatureUrl = '';
      let customerSignatureUrl = '';

      console.log('📷 [DEBUG] Upload signatures - début');
      if (technicianSignature) {
        console.log('📷 [DEBUG] Upload signature technicien...');
        const techResult = await uploadSignatureMutation.mutateAsync({
          dataURL: technicianSignature,
          fileName: `signature-tech-${Date.now()}.png`,
        });
        technicianSignatureUrl = techResult.publicUrl;
        console.log('✅ [DEBUG] Signature technicien uploadée:', technicianSignatureUrl);
      }

      if (customerSignature) {
        console.log('📷 [DEBUG] Upload signature client...');
        const custResult = await uploadSignatureMutation.mutateAsync({
          dataURL: customerSignature,
          fileName: `signature-client-${Date.now()}.png`,
        });
        customerSignatureUrl = custResult.publicUrl;
        console.log('✅ [DEBUG] Signature client uploadée:', customerSignatureUrl);
      }

      // Create or update rental
      console.log('🏠 [DEBUG] Création/mise à jour rental - début');
      console.log('🏠 [DEBUG] boat object:', boat);
      console.log('🏠 [DEBUG] boat.base_id:', boat.base_id);
      console.log('🏠 [DEBUG] user.baseId fallback:', user.baseId);
      
      let rental = rentalData;
      if (type === 'checkin' && !rentalData.id) {
        console.log('🏠 [DEBUG] Création nouvelle location...');
        rental = await createRentalMutation.mutateAsync({
          boat_id: rentalData.boatId || boat.id,
          customer_name: rentalData.customerName,
          customer_email: rentalData.customerEmail,
          customer_phone: rentalData.customerPhone,
          start_date: rentalData.startDate,
          end_date: rentalData.endDate,
          total_amount: rentalData.totalAmount || 0,
          status: 'confirmed',
          notes: rentalData.notes,
          base_id: boat.base_id || user.baseId,
        });
        console.log('✅ [DEBUG] Location créée:', rental);
      }

      // Update rental status if checkout FIRST
      if (type === 'checkout' && rental.id) {
        console.log('📝 [CHECKLIST] Mise à jour statut rental:', rental.id);
        await updateRentalStatusMutation.mutateAsync({
          rentalId: rental.id,
          status: 'completed',
        });
        console.log('✅ [CHECKLIST] Statut rental mis à jour');
      }

      // Create checklist with explicit type and customer information
      const checklistData: ChecklistData = {
        boatId: boat.id,
        checklistDate: getLocalDateString(),
        technicianId: user.id,
        items: checklistItems,
        overallStatus,
        generalNotes,
        technicianSignature: technicianSignatureUrl,
        customerSignature: customerSignatureUrl,
        sendEmailReport,
        // Store explicit type and customer info to avoid inference issues
        checklistType: type,
        customerName: rentalData?.customerName || rental?.customer_name || null,
        rentalId: rental?.id || rentalData?.id || null,
      };

      const checklist = await createChecklistMutation.mutateAsync(checklistData);
      console.log('✅ [CHECKLIST] Checklist créée:', checklist.id);

      // Update engine hours in boat_components
      const engineHoursEntries = Object.entries(engineHours).filter(([_, hours]) => hours !== undefined && hours > 0);
      if (engineHoursEntries.length > 0) {
        console.log('⚙️ [CHECKLIST] Mise à jour heures moteur:', engineHoursEntries);
        for (const [componentId, hours] of engineHoursEntries) {
          try {
            await supabase
              .from('boat_components')
              .update({ 
                current_engine_hours: hours, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', componentId);
            console.log(`✅ [CHECKLIST] Heures moteur mises à jour pour ${componentId}: ${hours}h`);
          } catch (engineError) {
            console.error(`❌ [CHECKLIST] Erreur mise à jour heures moteur ${componentId}:`, engineError);
          }
        }

        // Save engine hours snapshot to the checklist
        const snapshot = engineHoursEntries.map(([componentId, hours]) => {
          const engine = engines?.find(e => e.id === componentId);
          return {
            component_id: componentId,
            component_name: engine?.component_name || 'Moteur',
            component_type: engine?.component_type || '',
            hours: hours,
          };
        });
        try {
          await supabase
            .from('boat_checklists')
            .update({ engine_hours_snapshot: snapshot } as any)
            .eq('id', checklist.id);
          console.log('✅ [CHECKLIST] Engine hours snapshot saved:', snapshot);
        } catch (snapshotError) {
          console.error('❌ [CHECKLIST] Error saving engine hours snapshot:', snapshotError);
        }

        toast({
          title: 'Heures moteur mises à jour',
          description: `${engineHoursEntries.length} moteur(s) mis à jour automatiquement.`,
        });
      }

      // NOW update boat status AFTER checklist is created successfully
      const newBoatStatus = type === 'checkin' ? 'rented' : 'available';
      console.log('🚤 [CHECKLIST] Mise à jour statut bateau:', {
        boatId: boat.id,
        boatName: boat.name,
        oldStatus: boat.status,
        newStatus: newBoatStatus,
        type,
        checklistId: checklist.id
      });
      
      try {
        await updateBoatStatusMutation.mutateAsync({
          boatId: boat.id,
          status: newBoatStatus,
        });
        console.log('✅ [CHECKLIST] Statut bateau mis à jour avec succès vers:', newBoatStatus);
      } catch (boatUpdateError: any) {
        console.error('❌ [CHECKLIST] ERREUR CRITIQUE - Échec mise à jour bateau:', boatUpdateError);
        toast({
          title: 'Attention',
          description: `Le checklist est créé mais le statut du bateau n'a pas pu être mis à jour: ${boatUpdateError.message}`,
          variant: 'destructive',
          duration: 10000,
        });
        // Ne pas throw pour ne pas bloquer le reste
      }

      // Check for problems and create intervention if needed
      const problemItems = checklistItems.filter(item => item.status === 'needs_repair');
      if (problemItems.length > 0) {
        try {
          console.log('🔧 [DEBUG] Problèmes détectés, création intervention automatique');
          const problemsDescription = problemItems
            .map(item => {
              const firstWord = item.name.split(' ')[0];
              const problemNote = item.notes || 'Problème non spécifié';
              return `- ${firstWord}: ${problemNote}`;
            })
            .join('\n');

          const interventionTitle = `Problèmes détectés lors du ${type === 'checkin' ? 'check-in' : 'check-out'} - ${boat.name}`;
          const interventionDescription = `Problèmes identifiés lors du ${type === 'checkin' ? 'check-in' : 'check-out'} :\n\n${problemsDescription}\n\nChecklist ID: ${checklist.id}`;

          await createInterventionMutation.mutateAsync({
            title: interventionTitle,
            description: interventionDescription,
            boat_id: boat.id,
            status: 'scheduled' as const,
            scheduled_date: getLocalDateString(),
            base_id: boat.base_id || user.baseId,
            intervention_type: 'corrective'
          });

          console.log('✅ [DEBUG] Intervention créée automatiquement');
          toast({
            title: "Intervention créée automatiquement",
            description: `${problemItems.length} problème(s) détecté(s). Une intervention de maintenance a été programmée.`,
          });
        } catch (interventionError: any) {
          console.error('❌ [DEBUG] Erreur création intervention:', interventionError);
          toast({
            title: "Attention",
            description: "Des problèmes ont été détectés mais l'intervention n'a pas pu être créée automatiquement. Veuillez créer manuellement une intervention.",
            variant: "destructive"
          });
        }
      }

      // Send email if requested
      if (sendEmailReport && customerEmail) {
        console.log('📧 [DEBUG] Tentative envoi email avec:', {
          checklistId: checklist.id,
          recipientEmail: customerEmail,
          customerName: rentalData?.customerName || rentalData?.name || 'Client',
          boatName: boat?.name || 'Bateau non spécifié',
          type,
          rentalData,
          boat
        });
        
        try {
          console.log('📧 [DEBUG] Appel de l\'edge function...');
          console.log('📧 [DEBUG] Données envoyées:', {
            checklistId: checklist.id,
            recipientEmail: customerEmail,
            customerName: rentalData?.customerName || rentalData?.name || 'Client',
            boatName: boat?.name || 'Bateau non spécifié',
            type,
          });
          
          // Ajouter un timeout de 30 secondes
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout après 30 secondes')), 30000);
          });
          
          const functionCall = supabase.functions.invoke('send-checklist-report', {
            body: {
              checklistId: checklist.id,
              recipientEmail: customerEmail,
              customerName: rentalData?.customerName || rentalData?.name || 'Client',
              boatName: boat?.name || 'Bateau non spécifié',
              type,
            },
          });

          const response = await Promise.race([functionCall, timeoutPromise]) as any;

          console.log('📧 [DEBUG] Réponse fonction email complète:', response);
          console.log('📧 [DEBUG] Type de réponse:', typeof response);
          console.log('📧 [DEBUG] Keys de réponse:', Object.keys(response || {}));

          if (response && typeof response === 'object') {
            console.log('📧 [DEBUG] Data:', (response as any).data);
            console.log('📧 [DEBUG] Error:', (response as any).error);
            console.log('📧 [DEBUG] Status:', (response as any).status);
          }

          if ((response as any)?.error) {
            console.error('❌ [DEBUG] Erreur envoi email:', (response as any).error);
            toast({
              title: 'Email non envoyé',
              description: `Erreur: ${(response as any).error.message}`,
              variant: 'destructive',
            });
          } else if ((response as any)?.data?.success) {
            console.log('✅ [DEBUG] Email envoyé avec succès:', (response as any).data);
            toast({
              title: 'Email envoyé',
              description: 'Le rapport a été envoyé par email avec succès.',
            });
          } else {
            console.warn('⚠️ [DEBUG] Réponse inattendue:', response);
            toast({
              title: 'Statut email incertain',
              description: 'L\'edge function ne répond pas correctement.',
              variant: 'destructive',
            });
          }
        } catch (emailError: any) {
          console.error('❌ [DEBUG] Exception envoi email:', emailError);
          console.error('❌ [DEBUG] Exception details:', {
            message: emailError?.message,
            stack: emailError?.stack,
            name: emailError?.name,
            toString: emailError?.toString?.()
          });
          toast({
            title: 'Erreur email',
            description: `Exception: ${emailError?.message || 'Erreur inconnue'}`,
            variant: 'destructive',
          });
        }
      } else {
        console.log('⚠️ [DEBUG] Email non envoyé car:', { sendEmailReport, customerEmail });
      }

      // Nettoyer les données SEULEMENT après que la checklist a été créée avec succès en DB
      // (on est ici uniquement si createChecklistMutation.mutateAsync a réussi plus haut)
      try {
        await clearFormDraft();
        await clearSignatures();
        console.log('🗑️ [CHECKLIST] Brouillon supprimé après finalisation réussie');
      } catch (clearError) {
        console.error('⚠️ [CHECKLIST] Erreur suppression brouillon (non bloquant):', clearError);
      }

      toast({
        title: 'Checklist complète',
        description: `Le ${type === 'checkin' ? 'check-in' : 'check-out'} a été enregistré avec succès.`,
      });

      onComplete(checklist);

    } catch (error: any) {
      console.error('❌ [DEBUG] Erreur lors de la finalisation:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Erreur lors de la finalisation',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading and error states
  if (itemsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (itemsError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Erreur lors du chargement des éléments de checklist. Veuillez réessayer.
        </AlertDescription>
      </Alert>
    );
  }

  const isComplete = isStepComplete('checklist') && isStepComplete('review') && isStepComplete('signatures') && isStepComplete('email');

  const handleCancel = () => {
    if (checklistItems.some(item => item.status !== 'not_checked') || generalNotes || technicianSignature || customerSignature) {
      setShowCancelConfirm(true);
    } else {
      onComplete(null);
    }
  };

  const confirmCancel = () => {
    console.log('🔙 [CHECKLIST] Annulation du processus');
    toast({
      title: 'Processus annulé',
      description: 'Le check-in/check-out a été annulé',
    });
    onComplete(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Annuler
            </Button>
            <span>
              {type === 'checkin' ? 'Check-in' : 'Check-out'} - {boat.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hasSavedDraft && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <Save className="h-3 w-3" />
                Brouillon sauvegardé
                {lastSaveTime && (
                  <span className="flex items-center gap-1 ml-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(lastSaveTime, 'HH:mm', { locale: fr })}
                  </span>
                )}
              </Badge>
            )}
            <div className="text-sm text-muted-foreground">
              {boat.model} • {boat.hin}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {showCancelConfirm && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Voulez-vous vraiment annuler ? Les données saisies seront perdues.</span>
              <div className="flex gap-2 ml-4">
                <Button size="sm" variant="outline" onClick={() => setShowCancelConfirm(false)}>
                  Non
                </Button>
                <Button size="sm" variant="destructive" onClick={confirmCancel}>
                  Oui, annuler
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <ChecklistSteps currentStep={currentStep} isComplete={isComplete} />

        {currentStep === 'checklist' && (
          <ChecklistInspection
            checklistItems={checklistItems}
            onItemStatusChange={handleItemStatusChange}
            onItemNotesChange={handleItemNotesChange}
            onItemPhotoChange={handleItemPhotoChange}
            generalNotes={generalNotes}
            onGeneralNotesChange={setGeneralNotes}
            overallStatus={overallStatus}
            isComplete={isStepComplete('checklist')}
            checklistId={tempChecklistId}
            boatId={boat.id}
            engineHours={engineHours}
            onEngineHoursChange={handleEngineHoursChange}
          />
        )}

        {currentStep === 'review' && (
          <ChecklistReviewStep
            checklistItems={checklistItems}
            onItemStatusChange={handleItemStatusChange}
            onItemNotesChange={handleItemNotesChange}
            onItemPhotoChange={handleItemPhotoChange}
            checklistId={tempChecklistId}
          />
        )}

        {currentStep === 'signatures' && (
          <SignatureStep
            type={type}
            technicianSignature={technicianSignature}
            customerSignature={customerSignature}
            onTechnicianSignature={setTechnicianSignature}
            onCustomerSignature={setCustomerSignature}
            isLoading={isProcessing}
          />
        )}

        {currentStep === 'email' && (
          <EmailStep
            customerEmail={customerEmail}
            onCustomerEmailChange={setCustomerEmail}
            sendEmailReport={sendEmailReport}
            onSendEmailReportChange={setSendEmailReport}
            type={type}
            isLoading={isProcessing}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePreviousStep}
            disabled={currentStep === 'checklist' || isProcessing}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>

          {currentStep !== 'email' ? (
            <Button
              onClick={handleNextStep}
              disabled={!canProceedToNext() || isProcessing}
            >
              Suivant
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!isComplete || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finalisation...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Finaliser
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
