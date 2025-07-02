
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SupplierFilters } from '@/components/suppliers/SupplierFilters';
import { Supplier } from '@/types';

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: suppliers = [], isLoading, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          *,
          bases (
            name,
            location
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }

      return data as Supplier[];
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('suppliers')
        .select('category')
        .not('category', 'is', null);

      const uniqueCategories = [...new Set(data?.map(s => s.category).filter(Boolean))];
      return uniqueCategories as string[];
    }
  });

  const canManageSuppliers = user?.role === 'direction' || user?.role === 'chef_base';

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.phone?.includes(searchTerm);
    const matchesCategory = !selectedCategory || supplier.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!canManageSuppliers) {
      toast({
        title: "Accès refusé",
        description: "Vous n'avez pas les permissions pour supprimer un fournisseur.",
        variant: "destructive"
      });
      return;
    }

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

      refetch();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fournisseur.",
        variant: "destructive"
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des fournisseurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600 mt-1">
            Gestion des fournisseurs et partenaires commerciaux
          </p>
        </div>
        {canManageSuppliers && (
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-marine-600 hover:bg-marine-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Fournisseurs</CardTitle>
            <div className="h-8 w-8 bg-marine-100 rounded-lg flex items-center justify-center">
              <span className="text-marine-600 font-bold text-sm">{suppliers.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Fournisseurs enregistrés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-bold text-sm">{categories.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Catégories différentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
            <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 font-bold text-sm">{filteredSuppliers.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSuppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Après filtres appliqués
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom, email ou téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="min-w-fit"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>
          </div>
          
          {showFilters && (
            <SupplierFilters
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          )}
        </CardHeader>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <SupplierTable
          suppliers={filteredSuppliers}
          onEdit={handleEditSupplier}
          onDelete={handleDeleteSupplier}
          canManage={canManageSuppliers}
        />
      </Card>

      {/* Supplier Dialog */}
      <SupplierDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        supplier={editingSupplier}
      />
    </div>
  );
}
