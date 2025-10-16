import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Star, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/customer';
import { CustomerDialog } from './CustomerDialog';

interface CustomerAutocompleteProps {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
  placeholder?: string;
  className?: string;
}

export function CustomerAutocomplete({
  value,
  onChange,
  placeholder = 'Rechercher un client...',
  className,
}: CustomerAutocompleteProps) {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setSearch(`${value.first_name} ${value.last_name}`);
    }
  }, [value]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('base_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.base_id) return;

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('base_id', profile.base_id)
        .order('last_rental_date', { ascending: false, nullsFirst: false });

      if (data) {
        setCustomers(data as Customer[]);
      }
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    if (!search) {
      setFilteredCustomers(customers.slice(0, 10));
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = customers.filter((customer) => {
      const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
      const email = customer.email?.toLowerCase() || '';
      const phone = customer.phone || '';
      
      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower)
      );
    });

    setFilteredCustomers(filtered.slice(0, 10));
  }, [search, customers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange(customer);
    setSearch(`${customer.first_name} ${customer.last_name}`);
    setIsOpen(false);
  };

  const handleCreateSuccess = () => {
    const fetchCustomers = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('base_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.base_id) return;

      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('base_id', profile.base_id)
        .order('created_at', { ascending: false });

      if (data) {
        setCustomers(data as Customer[]);
        if (data[0]) {
          handleSelect(data[0] as Customer);
        }
      }
    };

    fetchCustomers();
  };

  return (
    <>
      <div ref={containerRef} className={`relative ${className}`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </div>

        {isOpen && (
          <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto">
            {filteredCustomers.length > 0 ? (
              <div className="p-2">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelect(customer)}
                    className="w-full text-left p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {customer.first_name} {customer.last_name}
                          </span>
                          {customer.vip_status && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {customer.email && <span>{customer.email}</span>}
                          {customer.email && customer.phone && <span> • </span>}
                          {customer.phone && <span>{customer.phone}</span>}
                        </div>
                      </div>
                      {customer.total_rentals > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {customer.total_rentals} location{customer.total_rentals > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Aucun client trouvé
              </div>
            )}

            <div className="p-2 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowCreateDialog(true);
                  setIsOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Créer un nouveau client
              </Button>
            </div>
          </Card>
        )}
      </div>

      <CustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </>
  );
}
