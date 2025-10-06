import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant_id: string | null;
  } | null;
  isSuperAdmin?: boolean;
}

export function UserDialog({ open, onOpenChange, user, isSuperAdmin = false }: UserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "technicien" as "direction" | "chef_base" | "technicien" | "administratif",
    tenant_id: "" as string,
  });

  // Fetch tenants for super admin
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin && open,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: (user.role || "technicien") as "direction" | "chef_base" | "technicien" | "administratif",
        tenant_id: user.tenant_id || "",
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "technicien",
        tenant_id: "",
      });
    }
  }, [user, open]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (user) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            name: data.name,
            role: data.role,
            tenant_id: data.tenant_id || null,
          })
          .eq('id', user.id);

        if (profileError) throw profileError;
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: data.name,
              role: data.role,
              tenant_id: data.tenant_id || null,
            }
          }
        });

        if (authError) throw authError;

        // Update profile with tenant_id
        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({
              tenant_id: data.tenant_id || null,
            })
            .eq('id', authData.user.id);

          if (profileError) throw profileError;
        }
      }
    },
    onSuccess: () => {
      toast({
        title: user ? "Utilisateur mis à jour" : "Utilisateur créé",
        description: user 
          ? "Les informations ont été mises à jour avec succès."
          : "L'utilisateur a été créé. Un email de confirmation a été envoyé.",
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {user ? "Modifier l'utilisateur" : "Créer un utilisateur"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={!!user}
              required
            />
          </div>

          {!user && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
          )}

          {isSuperAdmin && (
            <div className="space-y-2">
              <Label htmlFor="tenant">Société</Label>
              <Select
                value={formData.tenant_id}
                onValueChange={(value) => setFormData({ ...formData, tenant_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une société" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucune (Super Admin)</SelectItem>
                  {tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as "direction" | "chef_base" | "technicien" | "administratif" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direction">Direction</SelectItem>
                <SelectItem value="chef_base">Chef de base</SelectItem>
                <SelectItem value="technicien">Technicien</SelectItem>
                <SelectItem value="administratif">Administratif</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Enregistrement..." : user ? "Mettre à jour" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
