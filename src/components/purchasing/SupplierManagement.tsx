import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Package,
  TrendingUp,
  Star,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import type { Supplier } from '@/types';

export function SupplierManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers-advanced'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          bases(name, location)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        category: supplier.category || '',
        baseId: supplier.base_id || '',
        createdAt: supplier.created_at || new Date().toISOString(),
        base: supplier.bases
      }));
    }
  });

  const { data: supplierStats } = useQuery({
    queryKey: ['supplier-stats'],
    queryFn: async () => {
      // Get orders count per supplier
      const { data: ordersData } = await supabase
        .from('orders')
        .select('supplier_id, total_amount, status');

      const supplierOrderStats = suppliers.reduce((acc, supplier) => {
        const supplierOrders = ordersData?.filter(o => o.supplier_id === supplier.id) || [];
        acc[supplier.id] = {
          totalOrders: supplierOrders.length,
          totalAmount: supplierOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          pendingOrders: supplierOrders.filter(o => o.status === 'pending').length
        };
        return acc;
      }, {} as Record<string, any>);

      return supplierOrderStats;
    },
    enabled: suppliers.length > 0
  });

  const categories = Array.from(new Set(suppliers.map(s => s.category).filter(Boolean)));

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || supplier.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    
    try {
      await supabase.from('suppliers').delete().eq('id', supplierId);
      toast({
        title: 'Fournisseur supprimé',
        description: 'Le fournisseur a été supprimé avec succès.'
      });
      queryClient.invalidateQueries({ queryKey: ['suppliers-advanced'] });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le fournisseur.',
        variant: 'destructive'
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    queryClient.invalidateQueries({ queryKey: ['suppliers-advanced'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestion Avancée des Fournisseurs</h2>
          <p className="text-muted-foreground">
            Vue détaillée et analytique de vos fournisseurs
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Fournisseur
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Liste des Fournisseurs</TabsTrigger>
          <TabsTrigger value="analytics">Analyses</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtres</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher fournisseur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>

                <Button variant="outline">
                  <Star className="h-4 w-4 mr-2" />
                  Favoris
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Suppliers Grid */}
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredSuppliers.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucun fournisseur trouvé</h3>
                  <p className="text-muted-foreground">
                    Ajustez vos filtres ou créez un nouveau fournisseur
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredSuppliers.map((supplier) => {
                const stats = supplierStats?.[supplier.id] || { totalOrders: 0, totalAmount: 0, pendingOrders: 0 };
                
                return (
                  <Card key={supplier.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{supplier.name}</h3>
                            {supplier.category && (
                              <Badge variant="outline">{supplier.category}</Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                              {supplier.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <span>{supplier.email}</span>
                                </div>
                              )}
                              {supplier.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              {supplier.address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{supplier.address}</span>
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span>{stats.totalOrders} commandes</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span>{stats.totalAmount.toFixed(2)}€ total</span>
                              </div>
                              {stats.pendingOrders > 0 && (
                                <div className="flex items-center gap-2 text-sm text-orange-600">
                                  <Badge variant="secondary" className="text-xs">
                                    {stats.pendingOrders} en attente
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(supplier.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analyses des Fournisseurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Fonctionnalité d'analyse avancée en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance des Fournisseurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Évaluation de la performance des fournisseurs en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SupplierDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        supplier={editingSupplier}
      />
    </div>
  );
}