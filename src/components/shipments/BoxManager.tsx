import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Lock, Scan } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ShipmentScanner } from './ShipmentScanner';

interface BoxManagerProps {
  preparationId: string;
  canAddBoxes: boolean;
  onUpdate: () => void;
}

export function BoxManager({ preparationId, canAddBoxes, onUpdate }: BoxManagerProps) {
  const { toast } = useToast();
  const [newBoxIdentifier, setNewBoxIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBox, setActiveBox] = useState<string | null>(null);

  // Récupérer les cartons
  const { data: boxes = [], refetch: refetchBoxes } = useOfflineData<any>({
    table: 'shipment_boxes',
    dependencies: [preparationId]
  });

  // Récupérer les articles dans les cartons
  const { data: boxItems = [], refetch: refetchBoxItems } = useOfflineData<any>({
    table: 'shipment_box_items',
    dependencies: [preparationId]
  });

  // Filtrer les cartons pour cette préparation
  const preparationBoxes = boxes.filter((box: any) => box.preparation_id === preparationId);

  const handleCreateBox = async () => {
    if (!newBoxIdentifier.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un identifiant pour le carton.',
        variant: 'destructive'
      });
      return;
    }

    // Vérifier si l'identifiant existe déjà
    const existingBox = preparationBoxes.find(
      (box: any) => box.box_identifier.toLowerCase() === newBoxIdentifier.trim().toLowerCase()
    );
    
    if (existingBox) {
      toast({
        title: 'Erreur',
        description: 'Un carton avec cet identifiant existe déjà.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shipment_boxes')
        .insert({
          preparation_id: preparationId,
          box_identifier: newBoxIdentifier.trim(),
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Carton créé avec succès.'
      });

      setNewBoxIdentifier('');
      refetchBoxes();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la création du carton:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le carton.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBox = async (boxId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shipment_boxes')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', boxId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Carton fermé avec succès.'
      });

      setActiveBox(null);
      refetchBoxes();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la fermeture du carton:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de fermer le carton.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemScanned = () => {
    refetchBoxItems();
    onUpdate();
  };

  const getBoxItems = (boxId: string) => {
    return boxItems.filter((item: any) => item.box_id === boxId);
  };

  return (
    <div className="space-y-4">
      {/* Créer un nouveau carton */}
      {canAddBoxes && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Ajouter un carton</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Identifiant du carton (ex: C001, Carton A...)"
              value={newBoxIdentifier}
              onChange={(e) => setNewBoxIdentifier(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBox()}
            />
            <Button 
              onClick={handleCreateBox} 
              disabled={loading || !newBoxIdentifier.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des cartons */}
      {preparationBoxes.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucun carton créé
          </h3>
          <p className="text-muted-foreground">
            Créez votre premier carton pour commencer à scanner des articles.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {preparationBoxes.map((box: any) => {
            const items = getBoxItems(box.id);
            const isActive = activeBox === box.id;
            
            return (
              <Card key={box.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">Carton {box.box_identifier}</h3>
                    <Badge variant={box.status === 'closed' ? 'default' : 'secondary'}>
                      {box.status === 'closed' ? 'Fermé' : 'Ouvert'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {items.length} article{items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {box.status === 'open' && canAddBoxes && (
                    <div className="flex gap-2">
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveBox(isActive ? null : box.id)}
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        {isActive ? 'Fermer scanner' : 'Scanner articles'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloseBox(box.id)}
                        disabled={loading}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Fermer carton
                      </Button>
                    </div>
                  )}
                </div>

                {/* Articles dans le carton */}
                {items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Articles scannés:</h4>
                    <div className="grid gap-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{item.item_name}</span>
                            {item.item_reference && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({item.item_reference})
                              </span>
                            )}
                          </div>
                          <span className="text-sm">Qté: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scanner pour ce carton */}
                {isActive && box.status === 'open' && (
                  <div className="border-t pt-4">
                    <ShipmentScanner
                      boxId={box.id}
                      onItemScanned={handleItemScanned}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}