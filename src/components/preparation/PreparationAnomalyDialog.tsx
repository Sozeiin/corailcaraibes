import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  mandatory: boolean;
}

interface PreparationAnomalyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preparationId: string;
  item: ChecklistItem;
  onAnomalyReported: () => void;
}

interface AnomalyData {
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  photo_url?: string;
  auto_maintenance_created: boolean;
}

export function PreparationAnomalyDialog({
  open,
  onOpenChange,
  preparationId,
  item,
  onAnomalyReported
}: PreparationAnomalyDialogProps) {
  const [anomalyData, setAnomalyData] = useState<AnomalyData>({
    description: '',
    severity: 'medium',
    auto_maintenance_created: false
  });

  // Create anomaly mutation
  const createAnomalyMutation = useMutation({
    mutationFn: async (data: AnomalyData) => {
      // Create the anomaly record
      const { data: anomaly, error: anomalyError } = await supabase
        .from('preparation_anomalies')
        .insert({
          preparation_id: preparationId,
          item_name: item.name,
          description: data.description,
          severity: data.severity,
          photo_url: data.photo_url,
          auto_maintenance_created: data.auto_maintenance_created
        })
        .select()
        .single();

      if (anomalyError) throw anomalyError;

      // If auto maintenance is requested, create an intervention
      if (data.auto_maintenance_created) {
        const { data: boat } = await supabase
          .from('boat_preparation_checklists')
          .select('boat_id, boat:boats!inner(name)')
          .eq('id', preparationId)
          .single();

        if (boat) {
          const { error: interventionError } = await supabase
            .from('interventions')
            .insert({
              title: `Anomalie préparation - ${item.name}`,
              description: `Anomalie détectée lors de la préparation du bateau ${boat.boat.name}: ${data.description}`,
              boat_id: boat.boat_id,
              priority: data.severity === 'critical' ? 'high' : data.severity === 'high' ? 'medium' : 'low',
              status: 'scheduled',
              base_id: (await supabase.auth.getUser()).data.user?.user_metadata?.baseId
            });

          if (interventionError) {
            console.error('Error creating intervention:', interventionError);
          }
        }
      }

      return anomaly;
    },
    onSuccess: () => {
      toast.success('Anomalie signalée avec succès');
      onAnomalyReported();
      setAnomalyData({
        description: '',
        severity: 'medium',
        auto_maintenance_created: false
      });
    },
    onError: (error) => {
      console.error('Error creating anomaly:', error);
      toast.error('Erreur lors du signalement de l\'anomalie');
    }
  });

  const handleSubmit = () => {
    if (!anomalyData.description.trim()) {
      toast.error('Veuillez décrire l\'anomalie');
      return;
    }
    createAnomalyMutation.mutate(anomalyData);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-600';
      case 'medium': return 'text-orange-600';
      case 'high': return 'text-red-600';
      case 'critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'low': return 'Mineur';
      case 'medium': return 'Moyen';
      case 'high': return 'Important';
      case 'critical': return 'Critique';
      default: return severity;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Signaler une anomalie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{item.name}</p>
            <p className="text-sm text-gray-600">{item.category}</p>
          </div>

          <div>
            <Label htmlFor="description">Description de l'anomalie *</Label>
            <Textarea
              id="description"
              placeholder="Décrivez précisément le problème constaté..."
              value={anomalyData.description}
              onChange={(e) => setAnomalyData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="severity">Gravité</Label>
            <Select 
              value={anomalyData.severity} 
              onValueChange={(value: any) => setAnomalyData(prev => ({ ...prev, severity: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <span className={getSeverityColor('low')}>🟡 {getSeverityLabel('low')}</span>
                </SelectItem>
                <SelectItem value="medium">
                  <span className={getSeverityColor('medium')}>🟠 {getSeverityLabel('medium')}</span>
                </SelectItem>
                <SelectItem value="high">
                  <span className={getSeverityColor('high')}>🔴 {getSeverityLabel('high')}</span>
                </SelectItem>
                <SelectItem value="critical">
                  <span className={getSeverityColor('critical')}>🔴 {getSeverityLabel('critical')}</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto_maintenance"
              checked={anomalyData.auto_maintenance_created}
              onCheckedChange={(checked) => 
                setAnomalyData(prev => ({ ...prev, auto_maintenance_created: !!checked }))
              }
            />
            <Label htmlFor="auto_maintenance" className="text-sm">
              Créer automatiquement un ticket de maintenance
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createAnomalyMutation.isPending}
              variant="destructive"
            >
              {createAnomalyMutation.isPending ? 'Signalement...' : 'Signaler l\'anomalie'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}