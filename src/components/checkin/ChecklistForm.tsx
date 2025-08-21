import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, ChevronRight, Save, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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
import { supabase } from '@/integrations/supabase/client';
import { ChecklistSteps } from './ChecklistSteps';
import { ChecklistInspection } from './ChecklistInspection';
import { SignatureStep } from './SignatureStep';
import { EmailStep } from './EmailStep';
import { useCreateIntervention } from '@/hooks/useCreateIntervention';

interface ChecklistFormProps {
  boat: any;
  rentalData: any;
  type: 'checkin' | 'checkout';
  onComplete: (data: any) => void;
}

export function ChecklistForm({ boat, rentalData, type, onComplete }: ChecklistFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [overallStatus, setOverallStatus] = useState<'ok' | 'needs_attention' | 'major_issues'>('ok');
  const [currentStep, setCurrentStep] = useState<'checklist' | 'signatures' | 'email'>('checklist');
  const [technicianSignature, setTechnicianSignature] = useState<string>('');
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState(rentalData?.customerEmail || '');
  const [sendEmailReport, setSendEmailReport] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Queries and mutations
  const { data: fetchedItems, isLoading: itemsLoading, error: itemsError } = useChecklistItems();
  const createChecklistMutation = useCreateChecklist();
  const createRentalMutation = useCreateRental();
  const updateBoatStatusMutation = useUpdateBoatStatus();
  const updateRentalStatusMutation = useUpdateRentalStatus();
  const uploadSignatureMutation = useSignatureUpload();
  const createInterventionMutation = useCreateIntervention();

  // Initialize checklist items
  useEffect(() => {
    if (fetchedItems) {
      console.log('📋 [DEBUG] Items récupérés:', fetchedItems);
      setChecklistItems(
        fetchedItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          isRequired: item.is_required,
          status: 'not_checked' as const,
          notes: '',
        }))
      );
    }
  }, [fetchedItems]);

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

  // Event handlers
  const handleItemStatusChange = (itemId: string, status: 'ok' | 'needs_repair' | 'not_checked', notes?: string) => {
    console.log('🔄 [DEBUG] Changement statut item:', itemId, status, notes);
    setChecklistItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId 
          ? { ...item, status, notes: notes || item.notes }
          : item
      );
      console.log('🔄 [DEBUG] Items mis à jour:', updated.filter(item => item.id === itemId));
      return updated;
    });
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    console.log('📝 [DEBUG] Changement notes item:', itemId, notes);
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, notes } : item
    ));
  };

  // Navigation
  const isStepComplete = (step: string) => {
    switch (step) {
      case 'checklist':
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

  const handleNextStep = () => {
    if (!canProceedToNext()) {
      toast({
        title: 'Étape incomplète',
        description: 'Veuillez compléter toutes les vérifications requises.',
        variant: 'destructive',
      });
      return;
    }

    const steps = ['checklist', 'signatures', 'email'] as const;
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePreviousStep = () => {
    const steps = ['checklist', 'signatures', 'email'] as const;
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
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
          base_id: boat.base_id,
        });
        console.log('✅ [DEBUG] Location créée:', rental);
      }

      // Update boat status
      const newBoatStatus = type === 'checkin' ? 'rented' : 'available';
      await updateBoatStatusMutation.mutateAsync({
        boatId: boat.id,
        status: newBoatStatus,
      });

      // Update rental status if checkout
      if (type === 'checkout' && rental.id) {
        await updateRentalStatusMutation.mutateAsync({
          rentalId: rental.id,
          status: 'completed',
        });
      }

      // Create checklist
      const checklistData: ChecklistData = {
        boatId: boat.id,
        checklistDate: new Date().toISOString().split('T')[0],
        technicianId: user.id,
        items: checklistItems,
        overallStatus,
        generalNotes,
        technicianSignature: technicianSignatureUrl,
        customerSignature: customerSignatureUrl,
        sendEmailReport,
      };

      const checklist = await createChecklistMutation.mutateAsync(checklistData);

      // Check for problems and create intervention if needed
      const problemItems = checklistItems.filter(item => item.status === 'needs_repair');
      if (problemItems.length > 0) {
        try {
          console.log('🔧 [DEBUG] Problèmes détectés, création intervention automatique');
          const problemsDescription = problemItems
            .map(item => `- ${item.name}${item.category ? ` (${item.category})` : ''}: ${item.notes || 'Problème non spécifié'}`)
            .join('\n');

          const interventionTitle = `Problèmes détectés lors du ${type === 'checkin' ? 'check-in' : 'check-out'} - ${boat.name}`;
          const interventionDescription = `Problèmes identifiés lors du ${type === 'checkin' ? 'check-in' : 'check-out'} :\n\n${problemsDescription}\n\nChecklist ID: ${checklist.id}`;

          await createInterventionMutation.mutateAsync({
            title: interventionTitle,
            description: interventionDescription,
            boat_id: boat.id,
            status: 'scheduled' as const,
            scheduled_date: new Date().toISOString().split('T')[0],
            base_id: boat.base_id,
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

      console.log('✅ [DEBUG] Finalisation réussie');
      
      toast({
        title: 'Succès',
        description: `${type === 'checkin' ? 'Check-in' : 'Check-out'} finalisé avec succès`,
      });

      onComplete({ checklist, rental, boat });

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

  const isComplete = isStepComplete('checklist') && isStepComplete('signatures') && isStepComplete('email');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            {type === 'checkin' ? 'Check-in' : 'Check-out'} - {boat.name}
          </span>
          <div className="text-sm text-muted-foreground">
            {boat.model} • {boat.hin}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ChecklistSteps currentStep={currentStep} isComplete={isComplete} />

        {currentStep === 'checklist' && (
          <ChecklistInspection
            checklistItems={checklistItems}
            onItemStatusChange={handleItemStatusChange}
            onItemNotesChange={handleItemNotesChange}
            generalNotes={generalNotes}
            onGeneralNotesChange={setGeneralNotes}
            overallStatus={overallStatus}
            isComplete={isStepComplete('checklist')}
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
}