
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { SupplierFilters } from '@/components/suppliers/SupplierFilters';
import { Supplier } from '@/types';

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useQuery({
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
        .order('name');

      if (error) throw error;
      
      // Transform database fields to match Supplier interface
      return data.map(supplier => ({
        id: supplier.id,
        name: supplier.name,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        category: supplier.category || '',
        baseId: supplier.base_id || '',
        createdAt: supplier.created_at || new Date().toISOString()
      })) as Supplier[];
    }
  });

  const canManage = user?.role === 'direction' || user?.role === 'chef_base';

  // Extract unique categories from suppliers
  const categories = Array.from(
    new Set(
      suppliers
        .map(supplier => supplier.category)
        .filter(Boolean)
    )
  );

  // Filter suppliers based on search and category
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         supplier.phone?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === '' || supplier.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDelete = async (supplierId: string) => {
    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplierId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      toast({
        title: "Fournisseur supprimé",
        description: "Le fournisseur a été supprimé avec succès."
      });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le fournisseur.",
        variant: "destructive"
      });
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Fournisseurs</h1>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">Chargement des fournisseurs...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Fournisseurs</h1>
        {canManage && (
          <Button 
            onClick={() => setIsDialogOpen(true)}
            className="bg-marine-600 hover:bg-marine-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher un fournisseur
          </CardTitle>
          <div className="flex gap-4">
            <Input
              placeholder="Rechercher par nom, email ou téléphone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>

        <SupplierFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />

        <SupplierTable
          suppliers={filteredSuppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canManage={canManage}
        />
      </Card>

      <SupplierDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        supplier={editingSupplier}
      />
    </div>
  );
}
