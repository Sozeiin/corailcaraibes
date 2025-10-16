import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Play, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { EditFormDialog } from "./EditFormDialog";
import { AdministrativeCheckinFormWithRelations } from "@/types/checkin";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ReadyFormsSection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editingForm, setEditingForm] = useState<AdministrativeCheckinFormWithRelations | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);

  const {
    data: readyForms,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["ready-checkin-forms", user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("administrative_checkin_forms")
        .select("*")
        .eq("status", "ready")
        .eq("base_id", user?.baseId)
        .order("planned_start_date", { ascending: true });

      if (error) throw error;

      // Fetch related data
      const formsWithRelations = await Promise.all(
        (data || []).map(async (form) => {
          const [customerData, boatData, suggestedBoatData] = await Promise.all([
            supabase.from("customers").select("*").eq("id", form.customer_id).single(),
            form.boat_id
              ? supabase.from("boats").select("*").eq("id", form.boat_id).single()
              : Promise.resolve({ data: null }),
            form.suggested_boat_id
              ? supabase.from("boats").select("*").eq("id", form.suggested_boat_id).single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...form,
            customer: customerData.data!,
            boat: boatData.data,
            suggested_boat: suggestedBoatData.data,
          };
        }),
      );

      return formsWithRelations as AdministrativeCheckinFormWithRelations[];
    },
    enabled: !!user?.baseId,
  });

  const handleStartCheckin = (form: AdministrativeCheckinFormWithRelations) => {
    navigate("/checkin-process", {
      state: {
        boat: form.boat,
        rentalData: {
          customerName: `${form.customer.first_name} ${form.customer.last_name}`,
          customerEmail: form.customer.email,
          customerPhone: form.customer.phone,
          startDate: form.planned_start_date,
          endDate: form.planned_end_date,
          notes: form.rental_notes,
        },
      },
    });
  };

  const handleDeleteForm = async (formId: string) => {
    try {
      const { error } = await supabase.from("administrative_checkin_forms").delete().eq("id", formId);

      if (error) throw error;

      toast.success("Fiche supprimée avec succès");
      refetch();
      setDeletingFormId(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression de la fiche");
    }
  };

  const canDelete = user?.role === "administratif" || user?.role === "chef_base";

  console.log("ReadyFormsSection - User role:", user?.role, "Can delete:", canDelete);

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!readyForms || readyForms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fiches prêtes pour check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucune fiche prête pour le moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Fiches prêtes pour check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {readyForms.map((form) => (
              <Card key={form.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {form.customer.first_name} {form.customer.last_name}
                        </h3>
                        {form.customer.vip_status && <Badge variant="secondary">VIP</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Email</p>
                          <p>{form.customer.email || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Téléphone</p>
                          <p>{form.customer.phone || "Non renseigné"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bateau</p>
                          <p className="font-medium">
                            {form.boat?.name} - {form.boat?.model}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Dates</p>
                          <p>
                            {format(new Date(form.planned_start_date), "dd MMM", { locale: fr })} →{" "}
                            {format(new Date(form.planned_end_date), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>

                      {form.rental_notes && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{form.rental_notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm" onClick={() => setEditingForm(form)}>
                        <Edit className="h-4 w-4 mr-1" />
                      </Button>
                      {canDelete && (
                        <Button variant="destructive" size="sm" onClick={() => setDeletingFormId(form.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleStartCheckin(form)}>
                        <Play className="h-4 w-4 mr-1" />
                        Check-in
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingFormId} onOpenChange={(open) => !open && setDeletingFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer cette fiche de check-in ? Cette action est irréversible.
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
          open={!!editingForm}
          onOpenChange={(open) => !open && setEditingForm(null)}
          onSuccess={() => {
            refetch();
            setEditingForm(null);
          }}
        />
      )}
    </>
  );
}
