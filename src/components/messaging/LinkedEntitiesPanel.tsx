import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SmartThreadEntity } from '@/types/messaging';

interface LinkedEntitiesPanelProps {
  entities: SmartThreadEntity[];
  threadId: string;
}

const entityLabels = {
  boat: '🚤 Bateau',
  order: '📦 Commande',
  intervention: '🔧 Intervention',
  stock_item: '📊 Stock',
  supply_request: '🛒 Appro.',
  checklist: '📋 Checklist',
};

export function LinkedEntitiesPanel({ entities, threadId }: LinkedEntitiesPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const unlinkEntity = useMutation({
    mutationFn: async (entityId: string) => {
      const { error } = await supabase
        .from('smart_thread_entities')
        .delete()
        .eq('id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messaging-thread', threadId] });
      toast({
        title: 'Entité déliée',
        description: 'L\'entité a été retirée du sujet',
      });
    },
  });

  if (!entities || entities.length === 0) {
    return null;
  }

  return (
    <Card className="border-t">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link className="h-4 w-4" />
          Entités liées ({entities.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entities.map((entity) => (
          <div key={entity.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <div className="flex-1">
              <Badge variant="outline" className="mb-1">
                {entityLabels[entity.entity_type]}
              </Badge>
              {entity.notes && (
                <p className="text-sm text-muted-foreground mt-1">{entity.notes}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => unlinkEntity.mutate(entity.id)}
              disabled={unlinkEntity.isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
