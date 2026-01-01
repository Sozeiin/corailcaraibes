import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench, Package, Calendar, User, Building, TrendingUp, Euro } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PartUsageRecord {
  id: string;
  date: string;
  partName: string;
  reference: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  unit: string;
  usageType: 'intervention' | 'stock_movement';
  context: string;
  technician: string;
  notes?: string;
  supplier?: string;
}

interface BoatPartsHistoryProps {
  boatId: string;
}

const parseSupplierFromNotes = (notes: string | null): string | null => {
  if (!notes) return null;
  const match = notes.match(/fournisseur:([a-f0-9-]{36})/i);
  return match ? match[1] : null;
};

export const BoatPartsHistory = ({ boatId }: BoatPartsHistoryProps) => {
  const [filterType, setFilterType] = useState<'all' | 'intervention' | 'stock_movement'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Query 1: Pièces d'interventions
  const { data: interventionParts, isLoading: loadingInterventions } = useQuery({
    queryKey: ['boat-intervention-parts', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_parts')
        .select(`
          id,
          quantity,
          unit_cost,
          total_cost,
          notes,
          used_at,
          stock_items:stock_item_id (
            name,
            reference,
            unit
          ),
          interventions:intervention_id (
            title,
            scheduled_date,
            boat_id,
            technician_id
          )
        `)
        .eq('interventions.boat_id', boatId)
        .order('used_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch technician names separately
      if (data && data.length > 0) {
        const technicianIds = data
          .map((part: any) => part.interventions?.technician_id)
          .filter(Boolean);
        
        if (technicianIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', technicianIds);
          
          const profileMap = Object.fromEntries(
            (profiles || []).map((p: any) => [p.id, p.name])
          );
          
          return data.map((part: any) => ({
            ...part,
            interventions: {
              ...part.interventions,
              profiles: {
                name: profileMap[part.interventions?.technician_id] || null
              }
            }
          }));
        }
      }
      
      return data || [];
    }
  });

  // Query 2: Mouvements de stock vers le bateau
  const { data: stockMovements, isLoading: loadingMovements } = useQuery({
    queryKey: ['boat-stock-movements', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          id,
          qty,
          ts,
          notes,
          actor,
          sku
        `)
        .eq('movement_type', 'outbound_distribution')
        .ilike('notes', `%bateau:${boatId}%`)
        .order('ts', { ascending: false });
      
      if (error) throw error;
      
      // Récupérer les informations des stock_items et profiles séparément
      if (!data || data.length === 0) return [];
      
      const skuIds = [...new Set(data.map(m => m.sku))];
      const actorIds = [...new Set(data.map(m => m.actor).filter(Boolean))];
      
      const [stockItemsData, profilesData] = await Promise.all([
        supabase.from('stock_items').select('id, name, reference, unit').in('id', skuIds),
        actorIds.length > 0 
          ? supabase.from('profiles').select('id, name').in('id', actorIds)
          : Promise.resolve({ data: [] })
      ]);
      
      return data.map(movement => ({
        ...movement,
        stock_items: stockItemsData.data?.find(si => si.id === movement.sku),
        profiles: profilesData.data?.find(p => p.id === movement.actor)
      }));
    }
  });

  // Récupérer les noms des fournisseurs
  const supplierIds = useMemo(() => 
    stockMovements?.map(m => parseSupplierFromNotes(m.notes)).filter(Boolean) || [],
    [stockMovements]
  );
  
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers-for-boat-parts', supplierIds],
    queryFn: async () => {
      if (supplierIds.length === 0) return [];
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .in('id', supplierIds);
      if (error) throw error;
      return data || [];
    },
    enabled: supplierIds.length > 0
  });

  // Fusionner et formater les données
  const allParts: PartUsageRecord[] = useMemo(() => {
    const interventionRecords = (interventionParts || [])
      .filter(part => part.interventions && part.stock_items)
      .map(part => ({
        id: part.id,
        date: part.used_at || part.interventions.scheduled_date,
        partName: part.stock_items.name,
        reference: part.stock_items.reference || 'N/A',
        quantity: part.quantity,
        unitCost: part.unit_cost,
        totalCost: part.total_cost,
        unit: part.stock_items.unit || 'pièce',
        usageType: 'intervention' as const,
        context: part.interventions.title,
        technician: part.interventions.profiles?.name || 'N/A',
        notes: part.notes
      }));

    const stockRecords = (stockMovements || [])
      .filter(movement => movement.stock_items)
      .map(movement => {
        const supplierId = parseSupplierFromNotes(movement.notes);
        const supplier = suppliers?.find(s => s.id === supplierId);
        
        return {
          id: movement.id,
          date: movement.ts,
          partName: movement.stock_items.name,
          reference: movement.stock_items.reference || 'N/A',
          quantity: Math.abs(movement.qty),
          unit: movement.stock_items.unit || 'pièce',
          usageType: 'stock_movement' as const,
          context: 'Sortie de stock directe',
          technician: movement.profiles?.name || 'N/A',
          notes: movement.notes,
          supplier: supplier?.name
        };
      });

    return [...interventionRecords, ...stockRecords]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [interventionParts, stockMovements, suppliers]);

  // Filtres
  const filteredParts = useMemo(() => 
    allParts.filter(part => {
      if (filterType !== 'all' && part.usageType !== filterType) return false;
      if (searchTerm && !part.partName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    }),
    [allParts, filterType, searchTerm]
  );

  // Statistiques
  const stats = useMemo(() => {
    const totalParts = filteredParts.reduce((sum, p) => sum + p.quantity, 0);
    const interventionCount = filteredParts.filter(p => p.usageType === 'intervention').length;
    const stockMovementCount = filteredParts.filter(p => p.usageType === 'stock_movement').length;
    const totalCost = filteredParts.reduce((sum, p) => sum + (p.totalCost || 0), 0);

    return { totalParts, interventionCount, stockMovementCount, totalCost };
  }, [filteredParts]);

  const isLoading = loadingInterventions || loadingMovements;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total pièces</p>
                <p className="text-2xl font-bold">{stats.totalParts}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interventions</p>
                <p className="text-2xl font-bold">{stats.interventionCount}</p>
              </div>
              <Wrench className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorties directes</p>
                <p className="text-2xl font-bold">{stats.stockMovementCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coût total</p>
                <p className="text-2xl font-bold">{stats.totalCost.toFixed(2)}€</p>
              </div>
              <Euro className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les sources</SelectItem>
                <SelectItem value="intervention">Interventions</SelectItem>
                <SelectItem value="stock_movement">Sorties directes</SelectItem>
              </SelectContent>
            </Select>
            
            <Input 
              placeholder="Rechercher une pièce..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des pièces */}
      <div className="space-y-3">
        {filteredParts.map(part => (
          <Card key={part.id}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                {part.usageType === 'intervention' ? (
                  <Wrench className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
                ) : (
                  <Package className="h-5 w-5 text-orange-500 mt-1 shrink-0" />
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{part.partName}</h4>
                      <p className="text-sm text-muted-foreground">{part.reference}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline">
                        {part.quantity} {part.unit}
                      </Badge>
                      {part.totalCost && (
                        <p className="text-sm font-medium mt-1">{part.totalCost.toFixed(2)}€</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{format(new Date(part.date), 'dd MMM yyyy', { locale: fr })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>{part.technician}</span>
                    </div>
                    {part.supplier && (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span>via {part.supplier}</span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-2">
                    {part.context}
                  </p>
                  
                  {part.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      {part.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredParts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucune pièce utilisée</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || filterType !== 'all' 
                ? 'Aucune pièce ne correspond à vos critères de recherche.'
                : "Aucune pièce n'a encore été utilisée sur ce bateau."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
