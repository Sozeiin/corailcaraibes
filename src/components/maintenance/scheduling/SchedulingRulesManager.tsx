import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Settings, Calendar } from 'lucide-react';

interface SchedulingRulesManagerProps {
  isEnabled: boolean;
}

interface SchedulingRule {
  id: string;
  name: string;
  boatModel: string;
  taskType: string;
  intervalValue: number;
  intervalUnit: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  conditions: string[];
  description: string;
  createdAt: string;
}

export function SchedulingRulesManager({ isEnabled }: SchedulingRulesManagerProps) {
  const [rules, setRules] = useState<SchedulingRule[]>([
    {
      id: '1',
      name: 'Révision moteur Yamaha 250HP',
      boatModel: 'Yamaha 250HP',
      taskType: 'Révision moteur',
      intervalValue: 100,
      intervalUnit: 'heures',
      priority: 'high',
      isActive: true,
      conditions: ['Usage > 80 heures', 'Dernier entretien > 3 mois'],
      description: 'Révision complète du moteur tous les 100 heures d\'utilisation',
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Inspection coque saisonnière',
      boatModel: 'Tous modèles',
      taskType: 'Inspection coque',
      intervalValue: 6,
      intervalUnit: 'mois',
      priority: 'medium',
      isActive: true,
      conditions: ['Début de saison', 'Après tempête'],
      description: 'Inspection visuelle et technique de la coque',
      createdAt: '2024-01-10'
    }
  ]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SchedulingRule | null>(null);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge variant="destructive">Critique</Badge>;
      case 'high':
        return <Badge variant="destructive">Élevée</Badge>;
      case 'medium':
        return <Badge variant="secondary">Moyenne</Badge>;
      default:
        return <Badge variant="outline">Faible</Badge>;
    }
  };

  const toggleRuleActive = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const deleteRule = (ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const RuleForm = ({ rule, onSave, onCancel }: { 
    rule?: SchedulingRule, 
    onSave: (rule: SchedulingRule) => void,
    onCancel: () => void 
  }) => {
    const [formData, setFormData] = useState<Partial<SchedulingRule>>(
      rule || {
        name: '',
        boatModel: '',
        taskType: '',
        intervalValue: 1,
        intervalUnit: 'mois',
        priority: 'medium',
        isActive: true,
        conditions: [],
        description: ''
      }
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({
        ...formData,
        id: rule?.id || Date.now().toString(),
        createdAt: rule?.createdAt || new Date().toISOString().split('T')[0]
      } as SchedulingRule);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom de la règle</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="boatModel">Modèle de bateau</Label>
            <Input
              id="boatModel"
              value={formData.boatModel}
              onChange={(e) => setFormData({ ...formData, boatModel: e.target.value })}
              placeholder="ex: Yamaha 250HP ou Tous modèles"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="taskType">Type de tâche</Label>
            <Select
              value={formData.taskType}
              onValueChange={(value) => setFormData({ ...formData, taskType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Révision moteur">Révision moteur</SelectItem>
                <SelectItem value="Inspection coque">Inspection coque</SelectItem>
                <SelectItem value="Maintenance électrique">Maintenance électrique</SelectItem>
                <SelectItem value="Vérification sécurité">Vérification sécurité</SelectItem>
                <SelectItem value="Entretien général">Entretien général</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Faible</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="high">Élevée</SelectItem>
                <SelectItem value="critical">Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="intervalValue">Intervalle</Label>
            <Input
              id="intervalValue"
              type="number"
              min="1"
              value={formData.intervalValue}
              onChange={(e) => setFormData({ ...formData, intervalValue: parseInt(e.target.value) })}
              required
            />
          </div>
          <div>
            <Label htmlFor="intervalUnit">Unité</Label>
            <Select
              value={formData.intervalUnit}
              onValueChange={(value) => setFormData({ ...formData, intervalUnit: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heures">Heures</SelectItem>
                <SelectItem value="jours">Jours</SelectItem>
                <SelectItem value="semaines">Semaines</SelectItem>
                <SelectItem value="mois">Mois</SelectItem>
                <SelectItem value="années">Années</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Description de la règle de planification..."
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="submit" disabled={!isEnabled}>
            {rule ? 'Modifier' : 'Ajouter'}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-md font-semibold">Règles de Planification</h4>
          <p className="text-sm text-muted-foreground">
            Définissez les règles pour la planification automatique des maintenances
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isEnabled}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Règle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle Règle de Planification</DialogTitle>
              <DialogDescription>
                Créez une nouvelle règle pour la planification automatique des maintenances
              </DialogDescription>
            </DialogHeader>
            <RuleForm
              onSave={(newRule) => {
                setRules(prev => [...prev, newRule]);
                setIsAddDialogOpen(false);
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Règle</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Intervalle</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.boatModel}</Badge>
                  </TableCell>
                  <TableCell>{rule.taskType}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {rule.intervalValue} {rule.intervalUnit}
                    </div>
                  </TableCell>
                  <TableCell>{getPriorityBadge(rule.priority)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={() => toggleRuleActive(rule.id)}
                      disabled={!isEnabled}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            disabled={!isEnabled}
                            onClick={() => setEditingRule(rule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Modifier la Règle</DialogTitle>
                            <DialogDescription>
                              Modifiez les paramètres de la règle de planification
                            </DialogDescription>
                          </DialogHeader>
                          <RuleForm
                            rule={editingRule || undefined}
                            onSave={(updatedRule) => {
                              setRules(prev => prev.map(r => 
                                r.id === updatedRule.id ? updatedRule : r
                              ));
                              setEditingRule(null);
                            }}
                            onCancel={() => setEditingRule(null)}
                          />
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!isEnabled}
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}