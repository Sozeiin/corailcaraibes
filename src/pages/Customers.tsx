import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Users, Plus, Search, Star, Eye, Edit, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { CustomerHistory } from '@/components/customers/CustomerHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Customer } from '@/types/customer';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Customers() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<string | null>(null);

  const { data: customers = [], refetch } = useQuery({
    queryKey: ['customers', user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('base_id', user.baseId)
        .order('last_rental_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!user?.baseId,
  });

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = search.toLowerCase();
    const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
    const email = customer.email?.toLowerCase() || '';
    const phone = customer.phone || '';

    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      phone.includes(searchLower) ||
      (customer.company_name && customer.company_name.toLowerCase().includes(searchLower))
    );
  });

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDialog(true);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setShowDialog(true);
  };

  const handleViewHistory = (customerId: string) => {
    setHistoryCustomer(customerId);
    setShowHistory(true);
  };

  const handleDialogClose = (open: boolean) => {
    setShowDialog(open);
    if (!open) {
      setSelectedCustomer(null);
    }
  };

  return (
    <PermissionGate page="dashboard">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              Fichier Clients
            </h1>
            <p className="text-muted-foreground mt-1">
              Base de données centralisée des clients
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau client
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par nom, email, téléphone..."
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {filteredCustomers.length} client{filteredCustomers.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Locations</TableHead>
                    <TableHead>Dernière location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {search ? 'Aucun client trouvé' : 'Aucun client enregistré'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {customer.first_name} {customer.last_name}
                            </span>
                            {customer.vip_status && (
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            )}
                          </div>
                          {customer.company_name && (
                            <div className="text-sm text-muted-foreground">
                              {customer.company_name}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {customer.email && <div>{customer.email}</div>}
                            {customer.phone && <div className="text-muted-foreground">{customer.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {customer.customer_type === 'individual' ? 'Particulier' : 'Entreprise'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={customer.total_rentals > 0 ? 'default' : 'secondary'}>
                            {customer.total_rentals}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {customer.last_rental_date ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(customer.last_rental_date), 'dd MMM yyyy', { locale: fr })}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Jamais</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewHistory(customer.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(customer)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <CustomerDialog
          open={showDialog}
          onOpenChange={handleDialogClose}
          customer={selectedCustomer}
          onSuccess={() => {
            refetch();
            setShowDialog(false);
          }}
        />

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Historique client</DialogTitle>
            </DialogHeader>
            {historyCustomer && <CustomerHistory customerId={historyCustomer} />}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGate>
  );
}
