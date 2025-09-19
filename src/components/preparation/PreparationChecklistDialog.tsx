import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertTriangle, Camera, Ship } from 'lucide-react';
import { toast } from 'sonner';
import { PreparationAnomalyDialog } from './PreparationAnomalyDialog';

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  mandatory: boolean;
  checked: boolean;
  anomaly: boolean;
  notes?: string;
}

interface PreparationChecklistDialogProps {
  preparationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreparationChecklistDialog({ 
  preparationId, 
  open, 
  onOpenChange 
}: PreparationChecklistDialogProps) {
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  const [anomalyDialogOpen, setAnomalyDialogOpen] = useState(false);

  // Fetch preparation details
  const { data: preparation, isLoading } = useQuery({
    queryKey: ['preparation-checklist', preparationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_preparation_checklists')
        .select(`
          *,
          boat:boats!inner(id, name, model),
          template:preparation_checklist_templates(id, name, items),
          planning_activity:planning_activities!inner(title, scheduled_start, scheduled_end)
        `)
        .eq('id', preparationId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!preparationId && open
  });

  // Initialize checklist items from template or default
  const getChecklistItems = (): ChecklistItem[] => {
    if (!preparation) return [];
    
    // If items already exist in preparation, use them
    if (preparation.items && Array.isArray(preparation.items) && preparation.items.length > 0) {
      return preparation.items as unknown as ChecklistItem[];
    }
    
    // Otherwise, use template items or default items
    const templateItems = (preparation.template?.items as any[]) || [];
    const defaultItems = [
      { name: 'Carburant', category: 'Moteur', description: 'Vérifier le niveau de carburant', mandatory: true },
      { name: 'Huile moteur', category: 'Moteur', description: 'Contrôler le niveau d\'huile', mandatory: true },
      { name: 'Eau douce', category: 'Réservoirs', description: 'Vérifier le niveau d\'eau douce', mandatory: true },
      { name: 'Gilets de sauvetage', category: 'Sécurité', description: 'Présence et état des gilets', mandatory: true },
      { name: 'Fusées de détresse', category: 'Sécurité', description: 'Vérifier les dates de validité', mandatory: true },
      { name: 'Radio VHF', category: 'Électronique', description: 'Test de fonctionnement', mandatory: true },
      { name: 'GPS', category: 'Électronique', description: 'Vérification du fonctionnement', mandatory: false },
      { name: 'Propreté générale', category: 'Confort', description: 'Nettoyage cabines et cockpit', mandatory: true },
      { name: 'Voiles', category: 'Gréement', description: 'État et rangement des voiles', mandatory: false },
      { name: 'Cordages', category: 'Gréement', description: 'Vérification de l\'état', mandatory: false }
    ];
    
    const items = templateItems.length > 0 ? templateItems : defaultItems;
    
    return items.map((item: any, index: number) => ({
      id: `item-${index}`,
      name: item.name,
      category: item.category || 'Général',
      description: item.description,
      mandatory: item.mandatory !== false,
      checked: false,
      anomaly: false,
      notes: ''
    }));
  };

  const [items, setItems] = useState<ChecklistItem[]>(() => getChecklistItems());

  // Update items when preparation data loads
  React.useEffect(() => {
    if (preparation) {
      setItems(getChecklistItems());
    }
  }, [preparation]);

  // Update checklist mutation
  const updateChecklistMutation = useMutation({
    mutationFn: async (updatedItems: ChecklistItem[]) => {
      const { error } = await supabase
        .from('boat_preparation_checklists')
        .update({ 
          items: updatedItems as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', preparationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparation-checklist', preparationId] });
      queryClient.invalidateQueries({ queryKey: ['boat-preparations'] });
    }
  });

  // Complete preparation mutation
  const completePreparationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('boat_preparation_checklists')
        .update({ 
          status: 'ready',
          completion_date: new Date().toISOString()
        })
        .eq('id', preparationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preparation-checklist', preparationId] });
      queryClient.invalidateQueries({ queryKey: ['boat-preparations'] });
      onOpenChange(false);
      toast.success('Préparation terminée - Bateau prêt à partir !');
    }
  });

  const handleItemCheck = (itemId: string, checked: boolean) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, checked, anomaly: checked ? false : item.anomaly } : item
    );
    setItems(updatedItems);
    updateChecklistMutation.mutate(updatedItems);
  };

  const handleItemAnomaly = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setAnomalyDialogOpen(true);
    }
  };

  const handleAnomalyReported = () => {
    // Refresh the preparation data to get updated anomaly count
    queryClient.invalidateQueries({ queryKey: ['preparation-checklist', preparationId] });
    queryClient.invalidateQueries({ queryKey: ['boat-preparations'] });
    setAnomalyDialogOpen(false);
    setSelectedItem(null);
  };

  const handleItemNotes = (itemId: string, notes: string) => {
    const updatedItems = items.map(item => 
      item.id === itemId ? { ...item, notes } : item
    );
    setItems(updatedItems);
    updateChecklistMutation.mutate(updatedItems);
  };

  const canComplete = () => {
    const mandatoryItems = items.filter(item => item.mandatory);
    return mandatoryItems.every(item => item.checked);
  };

  const getProgress = () => {
    const checkedItems = items.filter(item => item.checked).length;
    return Math.round((checkedItems / items.length) * 100);
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  if (isLoading || !preparation) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5" />
                Préparation - {preparation.boat.name} ({preparation.boat.model})
              </DialogTitle>
            </DialogHeader>
            
            {/* Progress Bar - Full Width */}
            <div className="px-6 py-4 bg-muted/30 border-b">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold">{getProgress()}%</div>
                  <div className="text-sm text-muted-foreground">
                    {items.filter(i => i.checked).length}/{items.length} éléments
                  </div>
                </div>
                <Progress value={getProgress()} className="h-3" />
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-6 py-3 border-b bg-background">
              <div className="flex items-center gap-3">
                <Badge variant={preparation.status === 'ready' ? 'default' : 'secondary'}>
                  {preparation.status === 'ready' ? 'Prêt' : 'En cours'}
                </Badge>
                {preparation.anomalies_count > 0 && (
                  <Badge variant="destructive">
                    {preparation.anomalies_count} anomalie{preparation.anomalies_count > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {/* Main Content - Checklist */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-semibold text-lg text-foreground sticky top-0 bg-background py-2 border-b">
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <Card key={item.id} className={`${item.checked ? 'bg-green-50 border-green-200' : ''} p-0`}>
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={(checked) => handleItemCheck(item.id, !!checked)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{item.name}</span>
                                    {item.mandatory && (
                                      <Badge variant="outline" className="text-xs px-1 py-0">
                                        Obligatoire
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mb-2">{item.description}</p>
                                  )}
                                  <Textarea
                                    placeholder="Notes ou observations..."
                                    value={item.notes || ''}
                                    onChange={(e) => handleItemNotes(item.id, e.target.value)}
                                    className="text-xs"
                                    rows={2}
                                  />
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleItemAnomaly(item.id)}
                                  className="shrink-0 h-8 px-2"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  <span className="text-xs">Anomalie</span>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Footer with Complete Button */}
            {canComplete() && preparation.status !== 'ready' && (
              <div className="px-6 py-4 border-t bg-background">
                <Button 
                  onClick={() => completePreparationMutation.mutate()}
                  disabled={completePreparationMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Valider prêt à partir
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedItem && (
        <PreparationAnomalyDialog
          open={anomalyDialogOpen}
          onOpenChange={setAnomalyDialogOpen}
          preparationId={preparationId}
          item={selectedItem}
          onAnomalyReported={handleAnomalyReported}
        />
      )}
    </>
  );
}
