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
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status, notes: notes || item.notes }
        : item
    ));
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
      const { error } = await supabase
        .from('boat_rentals')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  });

  // Update boat status mutation
  const updateBoatStatusMutation = useMutation({
    mutationFn: async ({ boatId, status }: { boatId: string, status: 'available' | 'rented' | 'maintenance' | 'out_of_service' }) => {
      const { error } = await supabase
        .from('boats')
        .update({ status })
        .eq('id', boatId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boats-checkin-checkout'] });
      queryClient.invalidateQueries({ queryKey: ['active-rentals'] });
    }
  });

  // Update rental status mutation
  const updateRentalMutation = useMutation({
    mutationFn: async ({ rentalId, status }: { rentalId: string, status: string }) => {
      const { error } = await supabase
        .from('boat_rentals')
        .update({ status })
        .eq('id', rentalId);
      
      if (error) throw error;
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
      // Create the checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('boat_checklists')
        .insert([checklistData])
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create checklist items
      const itemsToInsert = checklistItems.map(item => ({
        checklist_id: checklist.id,
        item_id: item.id,
        status: item.status,
        notes: item.notes
      }));

      const { error: itemsError } = await supabase
        .from('boat_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

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
      let technicianSignatureUrl = '';
      let customerSignatureUrl = '';

      // Upload signatures
      if (technicianSignature) {
        const techSignatureData = await uploadSignatureMutation.mutateAsync({
          signature: technicianSignature,
          fileName: `technician-${Date.now()}.png`
        });
        technicianSignatureUrl = techSignatureData.path;
      }

      if (customerSignature) {
        const custSignatureData = await uploadSignatureMutation.mutateAsync({
          signature: customerSignature,
          fileName: `customer-${Date.now()}.png`
        });
        customerSignatureUrl = custSignatureData.path;
      }

      // Create checklist
      const checklistData = {
        boat_id: boat.id,
        technician_id: user?.id,
        checklist_date: new Date().toISOString().split('T')[0],
        overall_status: overallStatus,
        signature_url: technicianSignatureUrl,
        signature_date: technicianSignature ? new Date().toISOString() : null,
        customer_signature_url: customerSignatureUrl || null,
        customer_signature_date: customerSignature ? new Date().toISOString() : null
      };

      const checklist = await createChecklistMutation.mutateAsync(checklistData);

      if (type === 'checkin') {
        // Create rental first, then update boat status
        const rentalDataWithSignature = {
          ...rentalData,
          signature_url: customerSignatureUrl || null,
          signature_date: customerSignature ? new Date().toISOString() : null
        };
        await createRentalMutation.mutateAsync(rentalDataWithSignature);
        await updateBoatStatusMutation.mutateAsync({ 
          boatId: boat.id, 
          status: 'rented' 
        });
        
        toast({
          title: "Check-in terminé",
          description: `Check-in réalisé pour ${boat.name}. Le bateau est maintenant en location.`,
        });
      } else {
        // Update rental and boat status for checkout
        await updateRentalMutation.mutateAsync({ 
          rentalId: rentalData.id, 
          status: 'completed' 
        });
        await updateBoatStatusMutation.mutateAsync({ 
          boatId: boat.id, 
          status: (overallStatus === 'ok' ? 'available' : 'maintenance') as 'available' | 'rented' | 'maintenance' | 'out_of_service'
        });
        
        toast({
          title: "Check-out terminé",
          description: `Check-out réalisé pour ${boat.name}. ${overallStatus === 'ok' ? 'Le bateau est de nouveau disponible.' : 'Le bateau nécessite une maintenance.'}`,
        });
      }

      // Send email report if requested
      if (sendEmailReport && customerEmail) {
        try {
          console.log('Attempting to send email to:', customerEmail);
          await sendEmailMutation.mutateAsync({
            checklistId: checklist.id,
            email: customerEmail
          });
          console.log('Email sent successfully');
          toast({
            title: "Email envoyé",
            description: "Le rapport a été envoyé par email au client.",
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          toast({
            title: "Erreur d'envoi",
            description: "Le rapport n'a pas pu être envoyé par email, mais l'inspection est enregistrée.",
            variant: "destructive"
          });
        }
      }

      onComplete({
        checklist,
        rental: rentalData,
        boat,
        status: overallStatus,
        notes: generalNotes
      });

    } catch (error) {
      console.error('Error completing checklist:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement.",
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
              onClick={handleComplete}
              disabled={sendEmailReport && !customerEmail}
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