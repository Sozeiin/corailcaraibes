import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useBoatComponents } from './BoatComponentsContext';

const componentTypesOptions = [
  'Moteur bâbord',
  'Moteur tribord',
  'Générateur',
  'Système hydraulique',
  'Système électrique',
  'Système de navigation',
  'Pompe de cale',
  'Climatisation',
  'Système de carburant',
  'Gouvernail',
  'Propulseur d\'étrave',
  'Winch',
  'Gréement',
  'Autre'
];

const statusOptions = [
  { value: 'operational', label: 'Opérationnel' },
  { value: 'maintenance_needed', label: 'Maintenance requise' },
  { value: 'out_of_service', label: 'Hors service' },
  { value: 'scheduled_maintenance', label: 'Maintenance planifiée' }
];

interface ComponentFormProps {
  onCancel: () => void;
}

export function ComponentForm({ onCancel }: ComponentFormProps) {
  const { 
    editingComponent, 
    formData, 
    setFormData, 
    saveComponentMutation 
  } = useBoatComponents();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting form with data:', formData);
    
    if (!formData.componentName.trim() || !formData.componentType.trim()) {
      console.error('Missing required fields');
      return;
    }
    
    saveComponentMutation.mutate(formData);
  };

  const updateFormField = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="componentName">Nom du composant *</Label>
          <Input
            id="componentName"
            value={formData.componentName}
            onChange={(e) => updateFormField('componentName', e.target.value)}
            placeholder="ex: Moteur principal bâbord"
            required
          />
        </div>
        <div>
          <Label htmlFor="componentType">Type de composant *</Label>
          <Select 
            value={formData.componentType} 
            onValueChange={(value) => updateFormField('componentType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {componentTypesOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="manufacturer">Fabricant</Label>
          <Input
            id="manufacturer"
            value={formData.manufacturer}
            onChange={(e) => updateFormField('manufacturer', e.target.value)}
            placeholder="ex: Volvo Penta"
          />
        </div>
        <div>
          <Label htmlFor="model">Modèle</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => updateFormField('model', e.target.value)}
            placeholder="ex: D4-225"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="serialNumber">Numéro de série</Label>
          <Input
            id="serialNumber"
            value={formData.serialNumber}
            onChange={(e) => updateFormField('serialNumber', e.target.value)}
            placeholder="ex: VP123456789"
          />
        </div>
        <div>
          <Label htmlFor="installationDate">Date d'installation</Label>
          <Input
            id="installationDate"
            type="date"
            value={formData.installationDate}
            onChange={(e) => updateFormField('installationDate', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maintenanceInterval">Intervalle de maintenance (jours)</Label>
          <Input
            id="maintenanceInterval"
            type="number"
            min="1"
            value={formData.maintenanceIntervalDays}
            onChange={(e) => updateFormField('maintenanceIntervalDays', parseInt(e.target.value) || 365)}
          />
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select 
            value={formData.status} 
            onValueChange={(value) => updateFormField('status', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormField('notes', e.target.value)}
          placeholder="Notes additionnelles sur ce composant..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={saveComponentMutation.isPending}>
          {saveComponentMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </form>
  );
}