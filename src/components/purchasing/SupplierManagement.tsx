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

// Cette fonctionnalité a été consolidée dans src/pages/Suppliers.tsx
// Veuillez utiliser la page Fournisseurs principale pour toutes les fonctionnalités
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
    <div className="p-6">
      <div className="text-center py-12">
        <div className="mx-auto max-w-md">
          <div className="mx-auto h-12 w-12 text-muted-foreground">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-lg font-medium text-foreground">
            Fonctionnalité Déplacée
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cette fonctionnalité a été consolidée dans la page Fournisseurs principale. 
            Vous y trouverez toutes les fonctionnalités avancées de gestion des fournisseurs, 
            incluant les analytics, la performance et la gestion des relations.
          </p>
          <div className="mt-4">
            <Button 
              onClick={() => window.location.href = '/suppliers'} 
              className="inline-flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Aller à la page Fournisseurs
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}