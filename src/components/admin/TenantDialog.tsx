import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface TenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant?: {
    id: string;
    company_name: string;
    slug: string;
    country: string;
    contact_email: string | null;
  } | null;
}

interface TenantFormData {
  company_name: string;
  slug: string;
  country: string;
  contact_email: string;
}

export function TenantDialog({ open, onOpenChange, tenant }: TenantDialogProps) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<TenantFormData>({
    defaultValues: tenant ? {
      company_name: tenant.company_name,
      slug: tenant.slug,
      country: tenant.country,
      contact_email: tenant.contact_email || '',
    } : {
      company_name: '',
      slug: '',
      country: 'Guadeloupe',
      contact_email: '',
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: TenantFormData) => {
      if (tenant) {
        const { error } = await supabase
          .from('tenants')
          .update(data)
          .eq('id', tenant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenants')
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success(tenant ? 'Société modifiée' : 'Société créée');
      reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erreur lors de la sauvegarde');
      console.error('Tenant save error:', error);
    }
  });

  const onSubmit = (data: TenantFormData) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {tenant ? 'Modifier la société' : 'Nouvelle société'}
          </DialogTitle>
          <DialogDescription>
            Configurez les informations de la société multi-tenant
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company_name">Nom de la société *</Label>
            <Input
              id="company_name"
              {...register('company_name', { required: 'Le nom est requis' })}
              placeholder="Ex: Corail Caraïbes"
            />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Identifiant unique (slug) *</Label>
            <Input
              id="slug"
              {...register('slug', { 
                required: 'Le slug est requis',
                pattern: {
                  value: /^[a-z0-9-]+$/,
                  message: 'Uniquement lettres minuscules, chiffres et tirets'
                }
              })}
              placeholder="Ex: corail-caraibes"
            />
            {errors.slug && (
              <p className="text-sm text-destructive">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Pays *</Label>
            <Input
              id="country"
              {...register('country', { required: 'Le pays est requis' })}
              placeholder="Ex: Guadeloupe"
            />
            {errors.country && (
              <p className="text-sm text-destructive">{errors.country.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_email">Email de contact</Label>
            <Input
              id="contact_email"
              type="email"
              {...register('contact_email')}
              placeholder="contact@exemple.com"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
