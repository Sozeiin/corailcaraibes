import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, User, AlertCircle, Anchor, MoreVertical, Edit, Trash2, Check, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditFormDialog } from '@/components/checkin/EditFormDialog';

export function ClientFormsPool() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingAssign, setLoadingAssign] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const canManage = user?.role === 'administratif' || user?.role === 'chef_base' || user?.role === 'direction';

  const { data: poolForms = [], refetch } = useQuery({
    queryKey: ['client-forms-pool', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];

      const { data, error } = await supabase
        .from('administrative_checkin_forms')
        .select(`
          *,
          customer:customers!fk_administrative_checkin_customer(first_name, last_name, email, phone, vip_status),
          suggested_boat:boats!suggested_boat_id(id, name, model, status)
        `)
        .eq('base_id', user.baseId)
        .or('is_boat_assigned.eq.false,and(is_boat_assigned.eq.true,status.eq.draft)')
        .order('planned_start_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.baseId,
  });

  const handleAssignBoat = async (formId: string, boatId: string) => {
    setLoadingAssign(formId);
    try {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .update({
          boat_id: boatId,
          is_boat_assigned: true,
          status: 'ready',
        })
        .eq('id', formId);

      if (error) throw error;

      toast.success('Fiche assignée au bateau');
      refetch();
    } catch (error: any) {
      console.error('Error assigning boat:', error);
      toast.error(error.message || 'Impossible d\'assigner le bateau');
    } finally {
      setLoadingAssign(null);
    }
  };

  const handleEditForm = (form: any) => {
    setEditingForm(form);
    setShowEditDialog(true);
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      const { error } = await supabase
        .from('administrative_checkin_forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;

      toast.success('Fiche supprimée avec succès');
      refetch();
    } catch (error: any) {
      console.error('Error deleting form:', error);
      toast.error(error.message || 'Impossible de supprimer la fiche');
    } finally {
      setDeletingFormId(null);
    }
  };

  const getDateBadge = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    
    if (isPast(date) && !isToday(date)) {
      return <Badge variant="destructive">En retard</Badge>;
    }
    if (isToday(date)) {
      return <Badge className="bg-orange-500">Aujourd'hui</Badge>;
    }
    if (isTomorrow(date)) {
      return <Badge className="bg-blue-500">Demain</Badge>;
    }
    return null;
  };

  const filteredForms = poolForms.filter((form: any) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const customer = form.customer;
    const fullName = customer 
      ? `${customer.first_name} ${customer.last_name}`.toLowerCase()
      : form.customer_name?.toLowerCase() || '';
    
    return (
      fullName.includes(query) ||
      customer?.email?.toLowerCase().includes(query) ||
      customer?.phone?.toLowerCase().includes(query) ||
      form.suggested_boat?.name?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Pool de fiches clients ({filteredForms.length}/{poolForms.length})
        </CardTitle>
      </CardHeader>

      <div className="relative px-6">
        <Search className="absolute left-9 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher par nom, email, téléphone ou bateau..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredForms.length === 0 ? (
        <Card className="mx-6">
          <CardContent className="p-6 text-center text-muted-foreground">
            {poolForms.length === 0 
              ? "Aucune fiche client en attente d'assignation"
              : "Aucune fiche ne correspond à votre recherche"}
          </CardContent>
        </Card>
      ) : (
        filteredForms.map((form: any) => {
        const customer = form.customer;
        const suggestedBoat = form.suggested_boat;

        return (
          <Card key={form.id} className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {customer ? `${customer.first_name} ${customer.last_name}` : form.customer_name}
                    </span>
                    {customer?.vip_status && (
                      <Badge variant="default" className="bg-yellow-500">
                        VIP
                      </Badge>
                    )}
                  </div>

                  {customer && (
                    <div className="text-sm text-muted-foreground space-y-1">
                      {customer.email && <div>📧 {customer.email}</div>}
                      {customer.phone && <div>📞 {customer.phone}</div>}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {form.planned_start_date &&
                          format(new Date(form.planned_start_date), 'dd MMM', { locale: fr })}
                        {' → '}
                        {form.planned_end_date &&
                          format(new Date(form.planned_end_date), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    {getDateBadge(form.planned_start_date)}
                  </div>

                  {suggestedBoat && (
                    <div className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                      <Anchor className="h-4 w-4 text-primary" />
                      <span className="font-medium">Bateau suggéré:</span>
                      <span>
                        {suggestedBoat.name} - {suggestedBoat.model}
                      </span>
                      <Badge variant={suggestedBoat.status === 'available' ? 'default' : 'secondary'}>
                        {suggestedBoat.status}
                      </Badge>
                    </div>
                  )}

                  {form.rental_notes && (
                    <div className="text-sm text-muted-foreground">
                      💬 {form.rental_notes}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  {canManage ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditForm(form)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifier
                        </DropdownMenuItem>
                        
                        {suggestedBoat?.status === 'available' && (
                          <DropdownMenuItem 
                            onClick={() => handleAssignBoat(form.id, suggestedBoat.id)}
                            disabled={loadingAssign === form.id}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            {loadingAssign === form.id ? 'Assignation...' : 'Assigner le bateau'}
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuSeparator />
                        
                        <DropdownMenuItem 
                          onClick={() => setDeletingFormId(form.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <>
                      {suggestedBoat && suggestedBoat.status === 'available' && (
                        <Button
                          size="sm"
                          onClick={() => handleAssignBoat(form.id, suggestedBoat.id)}
                          disabled={loadingAssign === form.id}
                        >
                          {loadingAssign === form.id ? 'Assignation...' : 'Assigner maintenant'}
                        </Button>
                      )}
                      {suggestedBoat && suggestedBoat.status !== 'available' && (
                        <div className="flex items-center gap-1 text-sm text-amber-600">
                          <AlertCircle className="h-4 w-4" />
                          <span>Bateau non disponible</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }))}

      <AlertDialog open={!!deletingFormId} onOpenChange={(open) => !open && setDeletingFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette fiche client ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFormId && handleDeleteForm(deletingFormId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editingForm && (
        <EditFormDialog
          form={editingForm}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSuccess={() => {
            setShowEditDialog(false);
            setEditingForm(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
