import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, AlertTriangle, FileText, Save, Mail } from 'lucide-react';
import { ChecklistCategory } from './ChecklistCategory';
import { SignaturePad } from './SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface ChecklistFormProps {
  boat: any;
  rentalData: any;
  type: 'checkin' | 'checkout';
  onComplete: (data: any) => void;
}

export function ChecklistForm({ boat, rentalData, type, onComplete }: ChecklistFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [overallStatus, setOverallStatus] = useState<'ok' | 'needs_attention' | 'major_issues'>('ok');
  const [currentStep, setCurrentStep] = useState<'checklist' | 'signatures' | 'email'>('checklist');
  const [technicianSignature, setTechnicianSignature] = useState<string>('');
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>(rentalData?.customer_email || '');
  const [sendEmailReport, setSendEmailReport] = useState<boolean>(!!customerEmail);

  

  // Get checklist items
  const { data: availableItems = [] } = useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Initialize checklist items
  useEffect(() => {
    if (availableItems.length > 0) {
      const initialItems = availableItems.map(item => ({
        ...item,
        status: 'not_checked' as const,
        notes: ''
      }));
      setChecklistItems(initialItems);
    }
  }, [availableItems]);

  // Calculate overall status based on item statuses
  useEffect(() => {
    const needsRepairItems = checklistItems.filter(item => item.status === 'needs_repair');
    const requiredNeedsRepair = needsRepairItems.filter(item => item.is_required);
    
    if (requiredNeedsRepair.length > 0) {
      setOverallStatus('major_issues');
    } else if (needsRepairItems.length > 0) {
      setOverallStatus('needs_attention');
    } else {
      setOverallStatus('ok');
    }
  }, [checklistItems]);

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
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, notes }
        : item
    ));
  };

  // Create rental mutation
  const createRentalMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('🏗️ [DEBUG] Création rental avec données:', data);
      
      // Validation des données requises
      if (!data.boat_id || !data.customer_name) {
        throw new Error('Données obligatoires manquantes pour la location');
      }

      const { data: rental, error } = await supabase
        .from('boat_rentals')
        .insert([{
          boat_id: data.boat_id,
          customer_name: data.customer_name,
          customer_email: data.customer_email || null,
          customer_phone: data.customer_phone || null,
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          end_date: data.end_date || null,
          total_amount: data.total_amount || 0,
          status: data.status || 'active',
          notes: data.notes || null,
          base_id: boat.base_id,
          signature_url: data.signature_url || null,
          signature_date: data.signature_date || null
        }])
        .select()
        .single();
      
      if (error) {
        console.error('❌ [DEBUG] Erreur création rental:', error);
        throw error;
      }
      console.log('✅ [DEBUG] Rental créé:', rental);
      return rental;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  });

  // Update boat status mutation
  const updateBoatStatusMutation = useMutation({
    mutationFn: async ({ boatId, status }: { boatId: string, status: 'available' | 'rented' | 'maintenance' | 'out_of_service' }) => {
      console.log('🚢 [DEBUG] Mise à jour statut bateau:', boatId, status);
      
      const { error } = await supabase
        .from('boats')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', boatId);
      
      if (error) {
        console.error('❌ [DEBUG] Erreur mise à jour bateau:', error);
        throw error;
      }
      console.log('✅ [DEBUG] Statut bateau mis à jour');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  });

  // Update rental status mutation
  const updateRentalMutation = useMutation({
    mutationFn: async ({ rentalId, status }: { rentalId: string, status: string }) => {
      console.log('📋 [DEBUG] Mise à jour statut rental:', rentalId, status);
      
      if (!rentalId) {
        throw new Error('ID de location manquant');
      }

      const { data, error } = await supabase
        .from('boat_rentals')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId)
        .select()
        .single();
      
      if (error) {
        console.error('❌ [DEBUG] Erreur mise à jour rental:', error);
        throw error;
      }
      console.log('✅ [DEBUG] Rental mis à jour:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  });

  // Upload signature mutation
  const uploadSignatureMutation = useMutation({
    mutationFn: async ({ signature, fileName }: { signature: string, fileName: string }) => {
      // Convert base64 to blob
      const response = await fetch(signature);
      const blob = await response.blob();
      
      const { data, error } = await supabase.storage
        .from('signatures')
        .upload(`${user?.id}/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: true
        });

      if (error) throw error;
      return data;
    }
  });

  // Create checklist mutation
  const createChecklistMutation = useMutation({
    mutationFn: async (checklistData: any) => {
      console.log('📋 [DEBUG] Début création checklist mutation:', checklistData);
      
      // Validation des données obligatoires
      if (!checklistData.boat_id || !checklistData.technician_id) {
        throw new Error('Données manquantes: boat_id ou technician_id');
      }

      // Create the checklist
      console.log('📋 [DEBUG] Insertion checklist...');
      const { data: checklist, error: checklistError } = await supabase
        .from('boat_checklists')
        .insert([checklistData])
        .select()
        .single();

      if (checklistError) {
        console.error('❌ [DEBUG] Erreur création checklist:', checklistError);
        throw checklistError;
      }

      console.log('✅ [DEBUG] Checklist créée:', checklist);

      // Validation des items avant insertion
      if (!checklistItems || checklistItems.length === 0) {
        console.log('⚠️ [DEBUG] Aucun item de checklist à insérer');
        return checklist;
      }

      // Create checklist items - INCLURE TOUS LES ITEMS AVEC UN STATUT VALIDE
      const validStatuses = ['ok', 'needs_repair', 'not_checked'];
      const itemsToInsert = checklistItems
        .filter(item => {
          const isValid = item.id && validStatuses.includes(item.status);
          if (!isValid) {
            console.warn('⚠️ [DEBUG] Item invalide filtré:', item);
          }
          return isValid;
        })
        .map(item => ({
          checklist_id: checklist.id,
          item_id: item.id,
          status: item.status,
          notes: item.notes || ''
        }));

      console.log('📋 [DEBUG] Items à insérer:', itemsToInsert.length, itemsToInsert);

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('boat_checklist_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('❌ [DEBUG] Erreur insertion items checklist:', itemsError);
          throw itemsError;
        }
        console.log('✅ [DEBUG] Items checklist insérés');
      }

      return checklist;
    }
  });

  // Send email report mutation
  const sendEmailMutation = useMutation({
    mutationFn: async ({ checklistId, email }: { checklistId: string, email: string }) => {
      const { data, error } = await supabase.functions.invoke('send-checklist-report', {
        body: {
          checklistId,
          recipientEmail: email,
          customerName: rentalData?.customer_name || 'N/A',
          boatName: boat.name,
          type
        }
      });

      if (error) throw error;
      return data;
    }
  });

  const handleNextStep = () => {
    if (currentStep === 'checklist') {
      // Validate required items for check-in
      if (type === 'checkin') {
        const requiredItems = checklistItems.filter(item => item.is_required);
        const uncheckedRequired = requiredItems.filter(item => item.status === 'not_checked');
        
        if (uncheckedRequired.length > 0) {
          toast({
            title: "Vérification incomplète",
            description: "Tous les éléments obligatoires doivent être vérifiés avant de continuer.",
            variant: "destructive"
          });
          return;
        }

        const failedRequired = requiredItems.filter(item => item.status === 'needs_repair');
        if (failedRequired.length > 0) {
          toast({
            title: "Éléments de sécurité défaillants",
            description: "Des éléments obligatoires sont défaillants. La location ne peut pas avoir lieu.",
            variant: "destructive"
          });
          return;
        }
      }
      setCurrentStep('signatures');
    } else if (currentStep === 'signatures') {
      if (!technicianSignature) {
        toast({
          title: "Signature manquante",
          description: "La signature du technicien est obligatoire.",
          variant: "destructive"
        });
        return;
      }
      setCurrentStep('email');
    }
  };

  const handleComplete = async () => {
    try {
      console.log('🚀 [DEBUG] Début de la finalisation du check-in/check-out');
      console.log('🚀 [DEBUG] Données du bateau:', boat);
      console.log('🚀 [DEBUG] Données de location:', rentalData);
      console.log('🚀 [DEBUG] Type:', type);
      console.log('🚀 [DEBUG] User:', user);
      console.log('🚀 [DEBUG] Items checklist:', checklistItems);
      console.log('🚀 [DEBUG] Status général:', overallStatus);
      
      let technicianSignatureUrl = '';
      let customerSignatureUrl = '';

      // Upload signatures - technicien obligatoire, client optionnel
      console.log('📸 [DEBUG] Upload des signatures...');
      
      // Signature technicien (obligatoire)
      if (technicianSignature) {
        console.log('📸 [DEBUG] Upload signature technicien...');
        try {
          const techSignatureData = await uploadSignatureMutation.mutateAsync({
            signature: technicianSignature,
            fileName: `technician-${Date.now()}.png`
          });
          technicianSignatureUrl = techSignatureData.path;
          console.log('✅ [DEBUG] Signature technicien uploadée:', technicianSignatureUrl);
        } catch (sigError) {
          console.error('❌ [DEBUG] Erreur upload signature technicien:', sigError);
          toast({
            title: "Erreur upload signature",
            description: `Impossible d'uploader la signature du technicien: ${sigError instanceof Error ? sigError.message : 'Erreur inconnue'}`,
            variant: "destructive"
          });
          throw sigError;
        }
      }

      // Signature client (optionnelle)
      if (customerSignature) {
        console.log('📸 [DEBUG] Upload signature client...');
        try {
          const custSignatureData = await uploadSignatureMutation.mutateAsync({
            signature: customerSignature,
            fileName: `customer-${Date.now()}.png`
          });
          customerSignatureUrl = custSignatureData.path;
          console.log('✅ [DEBUG] Signature client uploadée:', customerSignatureUrl);
        } catch (sigError) {
          console.error('❌ [DEBUG] Erreur upload signature client:', sigError);
          // Pour la signature client, on continue même si ça échoue
          console.log('⚠️ [DEBUG] Continuation sans signature client');
          toast({
            title: "Avertissement",
            description: "La signature du client n'a pas pu être sauvegardée, mais l'enregistrement continue.",
            variant: "destructive"
          });
          customerSignatureUrl = '';
        }
      }

      // Create checklist
      console.log('📋 [DEBUG] Création de la checklist...');
      const checklistData = {
        boat_id: boat.id,
        technician_id: user?.id,
        checklist_date: new Date().toISOString().split('T')[0],
        overall_status: overallStatus,
        signature_url: technicianSignatureUrl || null,
        signature_date: technicianSignature ? new Date().toISOString() : null,
        customer_signature_url: customerSignatureUrl || null,
        customer_signature_date: customerSignature && customerSignatureUrl ? new Date().toISOString() : null
      };
      console.log('📋 [DEBUG] Données checklist:', checklistData);

      let checklist;
      try {
        checklist = await createChecklistMutation.mutateAsync(checklistData);
        console.log('✅ [DEBUG] Checklist créée:', checklist);
      } catch (checklistError) {
        console.error('❌ [DEBUG] Erreur création checklist:', checklistError);
        console.error('❌ [DEBUG] Détails erreur checklist:', JSON.stringify(checklistError, null, 2));
        throw checklistError;
      }

      // Créer une alerte pour notifier la création de la checklist
      console.log('🔔 [DEBUG] Création d\'alerte...');
      try {
        const { error: alertError } = await supabase
          .from('alerts')
          .insert([{
            type: 'maintenance',
            severity: 'info',
            title: `Checklist ${type === 'checkin' ? 'check-in' : 'check-out'} créée`,
            message: `La checklist ${type === 'checkin' ? 'check-in' : 'check-out'} pour le bateau ${boat.name} a été finalisée avec succès.`,
            base_id: boat.base_id
          }]);
        
        if (alertError) {
          console.error('❌ [DEBUG] Erreur création alerte:', alertError);
        } else {
          console.log('✅ [DEBUG] Alerte créée avec succès');
        }
      } catch (alertErr) {
        console.error('❌ [DEBUG] Exception création alerte:', alertErr);
      }

      if (type === 'checkin') {
        console.log('🚢 [DEBUG] Création de la location...');
        try {
          // Create rental first, then update boat status
          const rentalDataWithSignature = {
            ...rentalData,
            // Convertir les dates datetime-local en format date
            start_date: rentalData.start_date ? new Date(rentalData.start_date).toISOString().split('T')[0] : null,
            end_date: rentalData.end_date ? new Date(rentalData.end_date).toISOString().split('T')[0] : null,
            signature_url: customerSignatureUrl || null,
            signature_date: customerSignature && customerSignatureUrl ? new Date().toISOString() : null,
            status: 'confirmed'
          };
          console.log('🚢 [DEBUG] Données location:', rentalDataWithSignature);
          await createRentalMutation.mutateAsync(rentalDataWithSignature);
          console.log('✅ [DEBUG] Location créée');
        } catch (rentalError) {
          console.error('❌ [DEBUG] Erreur création location:', rentalError);
          console.error('❌ [DEBUG] Détails erreur location:', JSON.stringify(rentalError, null, 2));
          throw rentalError;
        }
        
        console.log('🚢 [DEBUG] Mise à jour statut bateau...');
        try {
          await updateBoatStatusMutation.mutateAsync({ 
            boatId: boat.id, 
            status: 'rented' 
          });
          console.log('✅ [DEBUG] Statut bateau mis à jour');
        } catch (boatError) {
          console.error('❌ [DEBUG] Erreur mise à jour bateau:', boatError);
          console.error('❌ [DEBUG] Détails erreur bateau:', JSON.stringify(boatError, null, 2));
          throw boatError;
        }
        
        toast({
          title: "Check-in terminé",
          description: `Check-in réalisé pour ${boat.name}. Le bateau est maintenant en location.`,
        });
      } else {
        console.log('🚢 [DEBUG] Finalisation de la location...');
        console.log('🚢 [DEBUG] RentalData:', rentalData);
        
        // Vérifier que rentalData.id existe pour le checkout
        if (!rentalData || !rentalData.id) {
          console.error('❌ [DEBUG] Pas de rental ID pour le checkout');
          toast({
            title: "Erreur",
            description: "Impossible de finaliser : aucune location active trouvée.",
            variant: "destructive"
          });
          throw new Error('Aucune location active trouvée pour ce bateau');
        }
        
        try {
          // Update rental status for checkout
          await updateRentalMutation.mutateAsync({ 
            rentalId: rentalData.id, 
            status: 'completed' 
          });
          console.log('✅ [DEBUG] Location finalisée');
        } catch (rentalError) {
          console.error('❌ [DEBUG] Erreur finalisation location:', rentalError);
          console.error('❌ [DEBUG] Détails erreur location:', JSON.stringify(rentalError, null, 2));
          throw rentalError;
        }
        
        console.log('🚢 [DEBUG] Mise à jour statut bateau...');
        try {
          await updateBoatStatusMutation.mutateAsync({ 
            boatId: boat.id, 
            status: (overallStatus === 'ok' ? 'available' : 'maintenance') as 'available' | 'rented' | 'maintenance' | 'out_of_service'
          });
          console.log('✅ [DEBUG] Statut bateau mis à jour');
        } catch (boatError) {
          console.error('❌ [DEBUG] Erreur mise à jour bateau:', boatError);
          console.error('❌ [DEBUG] Détails erreur bateau:', JSON.stringify(boatError, null, 2));
          throw boatError;
        }
        
        toast({
          title: "Check-out terminé",
          description: `Check-out réalisé pour ${boat.name}. ${overallStatus === 'ok' ? 'Le bateau est de nouveau disponible.' : 'Le bateau nécessite une maintenance.'}`,
        });
      }

      // Envoi email (optionnel, ne doit pas bloquer)
      if (sendEmailReport && customerEmail && checklist?.id) {
        console.log('📧 [DEBUG] Envoi email rapport...');
        try {
          await sendEmailMutation.mutateAsync({
            checklistId: checklist.id,
            email: customerEmail
          });
          console.log('✅ [DEBUG] Email envoyé avec succès');
        } catch (emailError) {
          console.error('❌ [DEBUG] Erreur envoi email (non bloquant):', emailError);
          toast({
            title: "Avertissement",
            description: "Le rapport n'a pas pu être envoyé par email, mais l'enregistrement est terminé.",
            variant: "destructive"
          });
        }
      }

      console.log('🎉 Finalisation réussie !');
      onComplete({
        checklist,
        rental: rentalData,
        boat,
        status: overallStatus,
        notes: generalNotes
      });

    } catch (error) {
      console.error('❌ Erreur lors de la finalisation:', error);
      console.error('❌ Détails de l\'erreur:', JSON.stringify(error, null, 2));
      toast({
        title: "Erreur",
        description: `Une erreur est survenue lors de l'enregistrement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        variant: "destructive"
      });
    }
  };

  // Group items by category
  const categorizedItems = availableItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const getStatusBadge = () => {
    switch (overallStatus) {
      case 'ok':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />OK</Badge>;
      case 'needs_attention':
        return <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" />Attention requise</Badge>;
      case 'major_issues':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Problèmes majeurs</Badge>;
    }
  };

  const isComplete = checklistItems.length > 0 && checklistItems.every(item => item.status !== 'not_checked');

  const renderStepContent = () => {
    switch (currentStep) {
      case 'checklist':
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {Object.entries(categorizedItems).map(([category, items]) => (
                <ChecklistCategory
                  key={category}
                  category={category}
                  items={items.map(item => ({
                    ...item,
                    status: checklistItems.find(ci => ci.id === item.id)?.status || 'not_checked',
                    notes: checklistItems.find(ci => ci.id === item.id)?.notes || ''
                  }))}
                  onItemStatusChange={handleItemStatusChange}
                  onItemNotesChange={handleItemNotesChange}
                />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Notes générales</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Notes générales sur l'état du bateau..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>
        );

      case 'signatures':
        return (
          <div className="space-y-4">
            <SignaturePad
              title="Signature du technicien"
              description="Signature obligatoire pour valider l'inspection"
              onSignature={setTechnicianSignature}
              required={true}
            />
            
            <SignaturePad
              title="Signature du client"
              description="Signature du client pour accepter l'état du bateau"
              onSignature={setCustomerSignature}
              required={false}
            />
          </div>
        );

      case 'email':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Envoi du rapport par email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmailReport}
                  onChange={(e) => setSendEmailReport(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sendEmail">
                  Envoyer le rapport par email au client
                </Label>
              </div>
              
              {sendEmailReport && (
                <div>
                  <Label htmlFor="customerEmail">Email du client</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p>Le rapport comprendra :</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Détail de l'inspection avec tous les éléments vérifiés</li>
                  <li>État général du bateau</li>
                  <li>Notes et observations</li>
                  <li>Signatures électroniques</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'checklist':
        return type === 'checkin' ? 'Inspection pré-location' : 'Inspection post-location';
      case 'signatures':
        return 'Signatures électroniques';
      case 'email':
        return 'Rapport final';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {getStepTitle()}
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <strong>Bateau:</strong> {boat.name} - {boat.model}
            </div>
            <div>
              <strong>Client:</strong> {rentalData?.customer_name || 'N/A'}
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center space-x-4 mt-6 mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                currentStep === 'checklist' ? 'bg-marine-500 text-white border-marine-500' : 
                currentStep === 'signatures' || currentStep === 'email' ? 'bg-green-500 text-white border-green-500' : 
                'bg-white text-gray-400 border-gray-300'
              }`}>
                1
              </div>
              <span className={`text-sm font-medium ${
                currentStep === 'checklist' ? 'text-marine-600' : 
                currentStep === 'signatures' || currentStep === 'email' ? 'text-green-600' : 
                'text-gray-400'
              }`}>
                Inspection
              </span>
            </div>
            
            <div className={`h-1 w-8 rounded transition-all ${
              currentStep === 'signatures' || currentStep === 'email' ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                currentStep === 'signatures' ? 'bg-marine-500 text-white border-marine-500' : 
                currentStep === 'email' ? 'bg-green-500 text-white border-green-500' : 
                'bg-white text-gray-400 border-gray-300'
              }`}>
                2
              </div>
              <span className={`text-sm font-medium ${
                currentStep === 'signatures' ? 'text-marine-600' : 
                currentStep === 'email' ? 'text-green-600' : 
                'text-gray-400'
              }`}>
                Signatures
              </span>
            </div>
            
            <div className={`h-1 w-8 rounded transition-all ${
              currentStep === 'email' ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            
            <div className="flex items-center space-x-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                currentStep === 'email' ? 'bg-marine-500 text-white border-marine-500' : 
                'bg-white text-gray-400 border-gray-300'
              }`}>
                3
              </div>
              <span className={`text-sm font-medium ${
                currentStep === 'email' ? 'text-marine-600' : 'text-gray-400'
              }`}>
                Finalisation
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderStepContent()}

      <div className="flex justify-between pt-4 border-t">
        {currentStep !== 'checklist' && (
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep === 'signatures') setCurrentStep('checklist');
              if (currentStep === 'email') setCurrentStep('signatures');
            }}
          >
            Précédent
          </Button>
        )}
        
        <div className="ml-auto">
          {currentStep === 'email' ? (
            <Button
              onClick={() => {
                console.log('🔥 [DEBUG] Bouton Finaliser cliqué!');
                console.log('🔥 [DEBUG] sendEmailReport:', sendEmailReport);
                console.log('🔥 [DEBUG] customerEmail:', customerEmail);
                handleComplete();
              }}
              disabled={false}
              className="bg-marine-500 hover:bg-marine-600"
            >
              <Save className="h-4 w-4 mr-2" />
              {type === 'checkin' ? 'Finaliser le check-in' : 'Finaliser le check-out'}
            </Button>
          ) : (
            <Button
              onClick={handleNextStep}
              disabled={currentStep === 'checklist' && !isComplete}
              className="bg-marine-500 hover:bg-marine-600"
            >
              Suivant
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}