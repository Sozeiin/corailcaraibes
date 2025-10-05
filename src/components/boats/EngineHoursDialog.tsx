import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import { getOilChangeStatusBadge, calculateOilChangeProgress } from '@/utils/engineMaintenanceUtils';

const engineHoursSchema = z.object({
  currentEngineHours: z.coerce.number()
    .min(0, "Les heures moteur ne peuvent pas être négatives")
    .int("Les heures moteur doivent être un nombre entier"),
  lastOilChangeHours: z.coerce.number()
    .min(0, "Les heures de vidange ne peuvent pas être négatives")
    .int("Les heures de vidange doivent être un nombre entier"),
}).refine((data) => data.lastOilChangeHours <= data.currentEngineHours, {
  message: "Les heures de dernière vidange ne peuvent pas être supérieures aux heures actuelles",
  path: ["lastOilChangeHours"],
});

type EngineHoursFormData = z.infer<typeof engineHoursSchema>;

interface EngineHoursDialogProps {
  isOpen: boolean;
  onClose: () => void;
  engine: {
    id: string;
    component_name: string;
    current_engine_hours: number;
    last_oil_change_hours: number;
  };
  onSave: (engineId: string, data: { current_engine_hours: number; last_oil_change_hours: number }) => Promise<void>;
}

export const EngineHoursDialog: React.FC<EngineHoursDialogProps> = ({
  isOpen,
  onClose,
  engine,
  onSave,
}) => {
  const form = useForm<EngineHoursFormData>({
    resolver: zodResolver(engineHoursSchema),
    defaultValues: {
      currentEngineHours: engine.current_engine_hours,
      lastOilChangeHours: engine.last_oil_change_hours,
    },
  });

  // Reset form when engine changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        currentEngineHours: engine.current_engine_hours,
        lastOilChangeHours: engine.last_oil_change_hours,
      });
    }
  }, [isOpen, engine, form]);

  const watchedValues = form.watch();
  
  // Calculate preview status
  const previewOilStatus = getOilChangeStatusBadge(
    watchedValues.currentEngineHours || 0,
    watchedValues.lastOilChangeHours || 0
  );
  const previewProgress = calculateOilChangeProgress(
    watchedValues.currentEngineHours || 0,
    watchedValues.lastOilChangeHours || 0
  );

  const getOilStatusVariant = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'due_soon':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getOilStatusLabel = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'Vidange en retard';
      case 'due_soon':
        return 'Vidange bientôt';
      case 'no_data':
        return 'Données manquantes';
      default:
        return 'Vidange OK';
    }
  };

  const onSubmit = async (data: EngineHoursFormData) => {
    try {
      await onSave(engine.id, {
        current_engine_hours: data.currentEngineHours,
        last_oil_change_hours: data.lastOilChangeHours,
      });
      onClose();
    } catch (error) {
      console.error('Error saving engine hours:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Modifier les heures moteur</DialogTitle>
          <DialogDescription>
            {engine.component_name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="currentEngineHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures moteur actuelles</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastOilChangeHours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Heures dernière vidange</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Preview du nouveau statut */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aperçu du statut :</span>
                <Badge variant={getOilStatusVariant(previewOilStatus.status)}>
                  {getOilStatusLabel(previewOilStatus.status)}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Heures depuis vidange</span>
                  <span className="font-medium">{previewOilStatus.hoursSinceLastChange}h</span>
                </div>
                <Progress value={Math.min(previewProgress, 100)} className="h-2" />
                
                {previewProgress > 100 && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    <span>En retard de {previewOilStatus.hoursSinceLastChange - 250}h</span>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={form.formState.isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
