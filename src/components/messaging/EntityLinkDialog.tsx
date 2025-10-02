import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EntityType } from '@/types/messaging';
interface EntityLinkDialogProps {
  threadId: string;
  isOpen: boolean;
  onClose: () => void;
}

const entityConfig = {
  boat: { label: '🚤 Bateau', table: 'boats', searchField: 'name' },
  order: { label: '📦 Commande', table: 'orders', searchField: 'order_number' },
  intervention: { label: '🔧 Intervention', table: 'interventions', searchField: 'title' },
  stock_item: { label: '📊 Stock', table: 'stock_items', searchField: 'name' },
  supply_request: { label: '🛒 Approvisionnement', table: 'supply_requests', searchField: 'item_name' },
  checklist: { label: '📋 Checklist', table: 'boat_checklists', searchField: 'id' },
};

export function EntityLinkDialog({ threadId, isOpen, onClose }: EntityLinkDialogProps) {
  const [entityType, setEntityType] = useState<EntityType>('boat');
  const [search, setSearch] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const config = entityConfig[entityType];

  const { data: entities = [] } = useQuery({
    queryKey: ['entities', entityType, search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(config.table as any)
        .select(`id, ${config.searchField}`)
        .ilike(config.searchField, search ? `%${search}%` : '%')
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const linkEntity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('smart_thread_entities')
        .insert({
          topic_id: threadId,
          entity_type: entityType,
          entity_id: selectedEntityId,
          linked_by: user.id,
          notes: notes.trim() || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Entité liée',
        description: `${config.label} a été lié au sujet`,
      });
      onClose();
      setSelectedEntityId('');
      setNotes('');
      setSearch('');
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de lier l\'entité',
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Lier une entité</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type d'entité</Label>
            <Select value={entityType} onValueChange={(v) => {
              setEntityType(v as EntityType);
              setSelectedEntityId('');
              setSearch('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(entityConfig).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rechercher</Label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher un ${config.label.toLowerCase()}...`}
            />
          </div>

          <div className="space-y-2">
            <Label>Sélectionner</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une entité" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity: any) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity[config.searchField]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter une note..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={() => linkEntity.mutate()} disabled={!selectedEntityId || linkEntity.isPending}>
              {linkEntity.isPending ? 'Liaison...' : 'Lier'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
