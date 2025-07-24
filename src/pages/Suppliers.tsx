
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SupplierDialog } from '@/components/suppliers/SupplierDialog';
import { SupplierTable } from '@/components/suppliers/SupplierTable';
import { SupplierFilters } from '@/components/suppliers/SupplierFilters';
import { Supplier } from '@/types';

export default function Suppliers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers', user?.id, user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      console.log('Fetching suppliers for user:', { role: user.role, baseId: user.baseId });
      
      let query = supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by base_id unless user is direction (can see all)
      if (user.role !== 'direction') {
        query = query.or(`base_id.eq.${user.baseId},base_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching suppliers:', error);
        throw error;
      }

      console.log('Suppliers fetched:', data?.length || 0);
      
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
    },
    enabled: !!user
  });

  const handleDelete = async (supplierId: string) => {
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

      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fournisseurs</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos fournisseurs et leurs informations de contact
          </p>
        </div>
        
        {canManage && (
          <Button 
            onClick={handleAdd}
            className="bg-marine-600 hover:bg-marine-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau fournisseur
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Rechercher et filtrer
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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

        <SupplierTable
          suppliers={filteredSuppliers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canManage={canManage}
        />
      </Card>

      <SupplierDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        supplier={selectedSupplier}
      />
    </div>
  );
}
