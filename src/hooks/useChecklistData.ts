import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/sonner';
import { invalidateBoatQueries, invalidateChecklistQueries } from '@/lib/queryInvalidation';

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  isRequired: boolean;
  status: 'ok' | 'needs_repair' | 'not_checked';
  notes?: string;
  photoUrl?: string;
}

export interface BoatRental {
  id?: string;
  boat_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  base_id?: string;
}

export interface ChecklistData {
  id?: string;
  boatId: string;
  checklistDate: string;
  technicianId: string;
  items: ChecklistItem[];
  overallStatus: 'ok' | 'needs_attention' | 'major_issues';
  generalNotes?: string;
  technicianSignature?: string;
  customerSignature?: string;
  sendEmailReport: boolean;
}

export function useChecklistItems() {
  return useQuery({
    queryKey: ['checklist-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function useCreateChecklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checklistData: ChecklistData) => {
      console.log('🚀 [DEBUG] Création checklist:', checklistData);

      // Validate required fields
      if (!checklistData.boatId || !checklistData.technicianId) {
        throw new Error('Données bateau et technicien requises');
      }

      if (!checklistData.items || checklistData.items.length === 0) {
        throw new Error('Au moins un élément de checklist requis');
      }

      // Create the main checklist
      const { data: checklist, error: checklistError } = await supabase
        .from('boat_checklists')
        .insert([
          {
            boat_id: checklistData.boatId,
            checklist_date: checklistData.checklistDate,
            technician_id: checklistData.technicianId,
            overall_status: checklistData.overallStatus,
            general_notes: checklistData.generalNotes,
            technician_signature: checklistData.technicianSignature,
            customer_signature: checklistData.customerSignature,
          },
        ])
        .select()
        .single();

      if (checklistError) {
        console.error('❌ [DEBUG] Erreur création checklist:', checklistError);
        throw checklistError;
      }

      console.log('✅ [DEBUG] Checklist créée:', checklist);

      // Create checklist items with validation
      const validStatuses = ['ok', 'needs_repair', 'not_checked'];
      const itemsToInsert = checklistData.items
        .filter((item) => {
          const isValid = item.id && validStatuses.includes(item.status);
          if (!isValid) {
            console.warn('⚠️ [DEBUG] Item invalide filtré:', item);
          }
          return isValid;
        })
        .map((item) => ({
          checklist_id: checklist.id,
          item_id: item.id,
          status: item.status,
          notes: item.notes || null,
          photo_url: item.photoUrl || null,
        }));

      if (itemsToInsert.length === 0) {
        throw new Error('Aucun élément valide dans la checklist');
      }

      console.log('📝 [DEBUG] Items à insérer:', itemsToInsert);

      const { error: itemsError } = await supabase
        .from('boat_checklist_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('❌ [DEBUG] Erreur création items:', itemsError);
        throw itemsError;
      }

      console.log('✅ [DEBUG] Items créés avec succès');
      return checklist;
    },
    onSuccess: () => {
      invalidateChecklistQueries(queryClient);
      toast.success("Checklist créée avec succès");
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Erreur mutation checklist:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la création de la checklist'}`);
    },
  });
}

export function useCreateRental() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rentalData: BoatRental) => {
      console.log('🚀 [DEBUG] Création location:', rentalData);

      const { data, error } = await supabase
        .from('boat_rentals')
        .insert(rentalData)
        .select()
        .single();

      if (error) {
        console.error('❌ [DEBUG] Erreur création location:', error);
        throw error;
      }

      console.log('✅ [DEBUG] Location créée:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      toast.success("Location créée avec succès");
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Erreur mutation location:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la création de la location'}`);
    },
  });
}

export function useUpdateBoatStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boatId, status }: { boatId: string; status: 'maintenance' | 'available' | 'rented' | 'out_of_service' }) => {
      console.log('🚀 [DEBUG] Mise à jour statut bateau:', boatId, status);

      const { data, error } = await supabase
        .from('boats')
        .update({ status })
        .eq('id', boatId)
        .select();

      if (error) {
        console.error('❌ [DEBUG] Erreur mise à jour bateau:', error);
        throw error;
      }

      console.log('✅ [DEBUG] Statut bateau mis à jour:', data);
      return data;
    },
    onSuccess: (data) => {
      invalidateBoatQueries(queryClient, data?.[0]?.id);
      toast.success("Statut du bateau mis à jour");
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Erreur mutation statut bateau:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la mise à jour du statut'}`);
    },
  });
}

export function useUpdateRentalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rentalId, status }: { rentalId: string; status: string }) => {
      console.log('🚀 [DEBUG] Mise à jour statut location:', rentalId, status);

      const { data, error } = await supabase
        .from('boat_rentals')
        .update({ status })
        .eq('id', rentalId)
        .select()
        .single();

      if (error) {
        console.error('❌ [DEBUG] Erreur mise à jour location:', error);
        throw error;
      }

      console.log('✅ [DEBUG] Statut location mis à jour:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
      toast.success("Statut de la location mis à jour");
    },
    onError: (error: any) => {
      console.error('❌ [DEBUG] Erreur mutation statut location:', error);
      toast.error(`Erreur: ${error.message || 'Erreur lors de la mise à jour du statut'}`);
    },
  });
}