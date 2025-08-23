import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StockItemAutocomplete } from '@/components/stock/StockItemAutocomplete';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface InterventionPart {
  id?: string;
  stockItemId?: string;
  componentId?: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  availableQuantity?: number;
  notes?: string;
}

interface InterventionPartsManagerProps {
  parts: InterventionPart[];
  onPartsChange: (parts: InterventionPart[]) => void;
  disabled?: boolean;
  boatId?: string;
}

export function InterventionPartsManager({ parts, onPartsChange, disabled = false, boatId }: InterventionPartsManagerProps) {
  const { user } = useAuth();
  const [stockSearchValue, setStockSearchValue] = useState('');

  // Fetch available stock items
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-for-intervention'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('base_id', user?.baseId)
        .gt('quantity', 0)
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  // Fetch boat components if boatId is provided
  const { data: boatComponents = [] } = useQuery({
    queryKey: ['boat-components', boatId],
    queryFn: async () => {
      if (!boatId) return [];
      
      const { data, error } = await supabase
        .from('boat_components')
        .select('*')
        .eq('boat_id', boatId)
        .order('component_name');

      if (error) throw error;
      return data;
    },
    enabled: !!boatId
  });

  const addCustomPart = () => {
    const newPart: InterventionPart = {
      partName: '',
      quantity: 1,
      unitCost: 0,
      totalCost: 0,
      notes: ''
    };

    onPartsChange([...parts, newPart]);
  };

  const updatePart = (index: number, field: keyof InterventionPart, value: any) => {
    const updatedParts = [...parts];
    updatedParts[index] = { ...updatedParts[index], [field]: value };
    
    // Recalculate total cost
    if (field === 'quantity' || field === 'unitCost') {
      updatedParts[index].totalCost = updatedParts[index].quantity * updatedParts[index].unitCost;
    }

    onPartsChange(updatedParts);
  };

  const removePart = (index: number) => {
    const updatedParts = parts.filter((_, i) => i !== index);
    onPartsChange(updatedParts);
  };

  const totalCost = parts.reduce((sum, part) => sum + part.totalCost, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pièces utilisées
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!disabled && (
          <div className="flex gap-2">
            <div className="flex-1">
              <StockItemAutocomplete
                stockItems={stockItems.filter(item => !parts.some(part => part.stockItemId === item.id))}
                value={stockSearchValue}
                onChange={setStockSearchValue}
                onSelect={(item) => {
                  const newPart: InterventionPart = {
                    stockItemId: item.id,
                    partName: item.name,
                    quantity: 1,
                    unitCost: (item as any).unit_price || 0,
                    totalCost: (item as any).unit_price || 0,
                    availableQuantity: item.quantity,
                    notes: ''
                  };

                  onPartsChange([...parts, newPart]);
                  setStockSearchValue(''); // Clear search after selection
                }}
                placeholder="Rechercher une pièce dans le stock..."
              />
            </div>
            <Button variant="outline" onClick={addCustomPart}>
              Pièce personnalisée
            </Button>
          </div>
        )}

        {parts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune pièce ajoutée
          </div>
        ) : (
          <div className="space-y-4">
            {parts.map((part, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{part.partName || 'Nouvelle pièce'}</h4>
                      {part.stockItemId && (
                        <Badge variant="secondary">
                          Stock: {part.availableQuantity}
                        </Badge>
                      )}
                    </div>
                    {!disabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                     {!part.stockItemId && (
                       <div>
                         <Label>Nom de la pièce</Label>
                         <Input
                           value={part.partName}
                           onChange={(e) => updatePart(index, 'partName', e.target.value)}
                           placeholder="Nom de la pièce"
                           disabled={disabled}
                         />
                       </div>
                     )}
                     
                     {boatId && boatComponents.length > 0 && (
                       <div>
                         <Label>Composant</Label>
                         <Select 
                           value={part.componentId || ''} 
                           onValueChange={(value) => updatePart(index, 'componentId', value || undefined)}
                           disabled={disabled}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Sélectionner un composant" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="">Aucun composant</SelectItem>
                             {boatComponents.map((component) => (
                               <SelectItem key={component.id} value={component.id}>
                                 {component.component_name} ({component.component_type})
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                     )}
                     
                     <div>
                       <Label>Quantité</Label>
                       <Input
                         type="number"
                         min="1"
                         max={part.availableQuantity || undefined}
                         value={part.quantity}
                         onChange={(e) => updatePart(index, 'quantity', parseInt(e.target.value) || 1)}
                         disabled={disabled}
                       />
                     </div>

                     <div>
                       <Label>Prix unitaire (€)</Label>
                       <Input
                         type="number"
                         min="0"
                         step="0.01"
                         value={part.unitCost}
                         onChange={(e) => updatePart(index, 'unitCost', parseFloat(e.target.value) || 0)}
                         disabled={disabled}
                       />
                     </div>

                     <div>
                       <Label>Coût total (€)</Label>
                       <Input
                         value={part.totalCost.toFixed(2)}
                         disabled
                       />
                     </div>
                   </div>

                   <div>
                     <Label>Notes</Label>
                     <Input
                       value={part.notes || ''}
                       onChange={(e) => updatePart(index, 'notes', e.target.value)}
                       placeholder="Notes sur cette pièce..."
                       disabled={disabled}
                     />
                   </div>

                  {part.stockItemId && part.quantity > (part.availableQuantity || 0) && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Attention: Quantité demandée ({part.quantity}) supérieure au stock disponible ({part.availableQuantity})
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium">Total des pièces:</span>
                <span className="text-xl font-bold text-blue-600">{totalCost.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}