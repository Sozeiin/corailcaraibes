import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, FileText, Save } from 'lucide-react';
import { ChecklistCategory } from './ChecklistCategory';
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
      queryClient.invalidateQueries({ queryKey: ['boats-available'] });
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
      queryClient.invalidateQueries({ queryKey: ['boats-available'] });
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

  const handleComplete = async () => {
    try {
      // Validate required items for check-in
      if (type === 'checkin') {
        const requiredItems = checklistItems.filter(item => item.is_required);
        const uncheckedRequired = requiredItems.filter(item => item.status === 'not_checked');
        
        if (uncheckedRequired.length > 0) {
          toast({
            title: "Vérification incomplète",
            description: "Tous les éléments obligatoires doivent être vérifiés avant le check-in.",
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

      // Create checklist
      const checklistData = {
        boat_id: boat.id,
        technician_id: user?.id,
        checklist_date: new Date().toISOString().split('T')[0],
        overall_status: overallStatus
      };

      const checklist = await createChecklistMutation.mutateAsync(checklistData);

      if (type === 'checkin') {
        // Create rental and update boat status
        await createRentalMutation.mutateAsync(rentalData);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {type === 'checkin' ? 'Inspection pré-location' : 'Inspection post-location'}
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
        </CardContent>
      </Card>

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

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          onClick={handleComplete}
          disabled={!isComplete}
          className="bg-marine-500 hover:bg-marine-600"
        >
          <Save className="h-4 w-4 mr-2" />
          {type === 'checkin' ? 'Finaliser le check-in' : 'Finaliser le check-out'}
        </Button>
      </div>
    </div>
  );
}