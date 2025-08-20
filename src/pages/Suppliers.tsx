
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Users, TrendingUp, BarChart3, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SupplierFilters } from '@/components/suppliers/SupplierFilters';
import { SupplierAnalytics } from '@/components/suppliers/SupplierAnalytics';
import { SupplierPerformance } from '@/components/suppliers/SupplierPerformance';
import { SupplierRelationship } from '@/components/suppliers/SupplierRelationship';
import { Supplier } from '@/types';
import { MobileTable, ResponsiveBadge } from '@/components/ui/mobile-table';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [timeRange, setTimeRange] = useState('90');
  const isMobile = useIsMobile();

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  // Utiliser React Query au lieu de useOfflineData pour plus de flexibilité
  const { data: rawSuppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers-consolidated', baseId],
    queryFn: async () => {
      let query = supabase
        .from('suppliers')
        .select(`
          *,
          bases(name, location)
        `)
        .order('created_at', { ascending: false });

      if (baseId) {
        query = query.eq('base_id', baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const suppliers: Supplier[] = rawSuppliers.map((supplier: any) => ({
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

  const handleDelete = async (supplierId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ?')) return;
    
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);
      
      if (error) throw error;
      
      toast({
        title: "Fournisseur supprimé",
        description: "Le fournisseur a été supprimé avec succès."
      });
      queryClient.invalidateQueries({ queryKey: ['suppliers-consolidated'] });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fournisseur.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedSupplier(null);
    queryClient.invalidateQueries({ queryKey: ['suppliers-consolidated'] });
  };

  // Filter suppliers based on search term and category
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.phone.includes(searchTerm);
    
    const matchesCategory = selectedCategory === 'all' || selectedCategory === '' || supplier.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(suppliers.map(s => s.category).filter(Boolean)));

  const mobileColumns = [
    { key: 'name', label: 'Nom' },
    {
      key: 'category',
      label: 'Catégorie',
      render: (value: string) =>
        value ? (
          <ResponsiveBadge variant="secondary">{value}</ResponsiveBadge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    { key: 'email', label: 'Email', render: (value: string) => value || '-' },
    { key: 'phone', label: 'Téléphone', render: (value: string) => value || '-' },
  ];

  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Erreur</CardTitle>
            <p className="text-gray-600">
              Impossible de charger les fournisseurs. Veuillez réessayer.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Fournisseurs</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos fournisseurs, leurs performances et vos relations commerciales
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      {/* Navigation par onglets */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Liste
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="relationships" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Relations
          </TabsTrigger>
        </TabsList>

        {/* Onglet Liste */}
        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Rechercher et filtrer
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher par nom, email ou téléphone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-80"
                    />
                  </div>
                </div>
              </div>
              
              <SupplierFilters
                categories={categories}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </CardHeader>

            <CardContent>
              {isMobile ? (
                <MobileTable
                  data={filteredSuppliers}
                  columns={mobileColumns}
                  onRowClick={canManage ? handleEdit : undefined}
                />
              ) : (
                <SupplierTable
                  suppliers={filteredSuppliers}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canManage={canManage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analytics */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Analytics des Fournisseurs</h2>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
                <SelectItem value="180">6 derniers mois</SelectItem>
                <SelectItem value="365">12 derniers mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SupplierAnalytics baseId={baseId} timeRange={timeRange} />
        </TabsContent>

        {/* Onglet Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Performance des Fournisseurs</h2>
          </div>
          <SupplierPerformance baseId={baseId} />
        </TabsContent>

        {/* Onglet Relations */}
        <TabsContent value="relationships" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Gestion des Relations</h2>
          </div>
          <SupplierRelationship baseId={baseId} />
        </TabsContent>
      </Tabs>

      {/* Dialog d'ajout/modification */}
      <SupplierDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        supplier={selectedSupplier}
      />
    </div>
  );
}
