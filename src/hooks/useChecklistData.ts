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
  photos?: Array<{ id?: string; url: string; displayOrder: number }>;
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
  // New fields for explicit type/customer storage
  checklistType?: 'checkin' | 'checkout' | 'maintenance';
  customerName?: string;
  rentalId?: string;
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

      // Create the main checklist with type, customer name, and rental reference
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
            // New fields for explicit storage
            checklist_type: checklistData.checklistType || null,
            customer_name: checklistData.customerName || null,
            rental_id: checklistData.rentalId || null,
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
          photo_url: null, // Garder NULL car on utilise la nouvelle table
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

      // APRÈS l'insertion des items, insérer les photos
      if (checklistData.items.some(item => item.photos && item.photos.length > 0)) {
        const photosToInsert = checklistData.items
          .filter(item => item.photos && item.photos.length > 0)
          .flatMap(item => 
            item.photos!.map(photo => ({
              checklist_id: checklist.id,
              item_id: item.id,
              photo_url: photo.url,
              display_order: photo.displayOrder
            }))
          );
        
        const { error: photosError } = await supabase
          .from('checklist_item_photos')
          .insert(photosToInsert);
        
        if (photosError) {
          console.error('❌ [DEBUG] Erreur création photos:', photosError);
          // Ne pas throw pour ne pas bloquer la création de la checklist
        } else {
          console.log('✅ [DEBUG] Photos créées avec succès');
        }
      }

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

      // Sécurisation des dates: garantir que start_date/end_date ne sont jamais nuls/invalides
      // (cas rares de check-in/check-out effectués hors des dates prévues ou brouillon incomplet)
      const isValidDate = (value: unknown): value is string =>
        typeof value === 'string' && value.trim() !== '' && !isNaN(new Date(value).getTime());

      const now = new Date().toISOString();
      const start = isValidDate(rentalData.start_date) ? rentalData.start_date : now;
      const end = isValidDate(rentalData.end_date) ? rentalData.end_date : start;

      if (!isValidDate(rentalData.start_date)) {
        console.warn('⚠️ [DEBUG] start_date manquante/invalide, repli sur la date du jour:', start);
      }
      if (!isValidDate(rentalData.end_date)) {
        console.warn('⚠️ [DEBUG] end_date manquante/invalide, repli sur start_date:', end);
      }

      const sanitizedRental = { ...rentalData, start_date: start, end_date: end };

      const { data, error } = await supabase
        .from('boat_rentals')
        .insert(sanitizedRental)
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
      console.log('🚀 [BOAT STATUS] Début mise à jour:', { boatId, status });

      // Tentative avec retry
      let lastError: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        console.log(`🔄 [BOAT STATUS] Tentative ${attempt}/3`);
        
        const { data, error } = await supabase
          .from('boats')
          .update({ status })
          .eq('id', boatId)
          .select();

        if (error) {
          console.error(`❌ [BOAT STATUS] Erreur tentative ${attempt}:`, error);
          lastError = error;
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw error;
        }

        // Vérification que le statut a bien été mis à jour
        console.log('✅ [BOAT STATUS] Update réussi, vérification...');
        const { data: verifyData, error: verifyError } = await supabase
          .from('boats')
          .select('status')
          .eq('id', boatId)
          .single();

        if (verifyError) {
          console.error('❌ [BOAT STATUS] Erreur vérification:', verifyError);
          throw verifyError;
        }

        if (verifyData.status === status) {
          console.log('✅ [BOAT STATUS] Statut vérifié et correct:', { 
            expected: status, 
            actual: verifyData.status,
            boatId 
          });
          return data;
        } else {
          console.error('⚠️ [BOAT STATUS] Statut incorrect après update:', { 
            expected: status, 
            actual: verifyData.status,
            boatId 
          });
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw new Error(`Le statut du bateau n'a pas été mis à jour correctement (attendu: ${status}, actuel: ${verifyData.status})`);
        }
      }

      throw lastError || new Error('Échec de la mise à jour du statut après 3 tentatives');
    },
    onSuccess: (data) => {
      console.log('✅ [BOAT STATUS] Mutation réussie, invalidation des queries');
      invalidateBoatQueries(queryClient, data?.[0]?.id);
      toast.success("Statut du bateau mis à jour avec succès");
    },
    onError: (error: any) => {
      console.error('❌ [BOAT STATUS] Erreur mutation:', error);
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