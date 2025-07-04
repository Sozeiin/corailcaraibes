import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Ship, User, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BoatRentalSelectorProps {
  type: 'checkin' | 'checkout';
  onBoatSelect: (boat: any) => void;
  onRentalDataChange: (data: any) => void;
}

export function BoatRentalSelector({ type, onBoatSelect, onRentalDataChange }: BoatRentalSelectorProps) {
  const { user } = useAuth();
  const [selectedBoatId, setSelectedBoatId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRental, setSelectedRental] = useState<any>(null);

  // Get boats for checkin/checkout
  const { data: boats = [], refetch: refetchBoats } = useQuery({
    queryKey: ['boats-checkin-checkout', user?.baseId, type],
    queryFn: async () => {
      if (!user) return [];

      if (type === 'checkin') {
        // For check-in: get boats with status 'available'
        let query = supabase
          .from('boats')
          .select('*')
          .eq('status', 'available')
          .order('name');

        if (user.role !== 'direction') {
          query = query.eq('base_id', user.baseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      } else {
        // For check-out: get boats that have active rentals
        let query = supabase
          .from('boat_rentals')
          .select(`
            id,
            boat_id,
            boats!inner(id, name, model, serial_number, year, status, base_id)
          `)
          .eq('status', 'confirmed');

        if (user.role !== 'direction') {
          query = query.eq('boats.base_id', user.baseId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Extract unique boats from rentals  
        const uniqueBoats = data?.reduce((acc: any[], rental: any) => {
          const boat = rental.boats;
          if (!acc.find(b => b.id === boat.id)) {
            acc.push(boat);
          }
          return acc;
        }, []) || [];
        
        return uniqueBoats;
      }
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnMount: true
  });

  // Get active rentals for checkout
  const { data: activeRentals = [] } = useQuery({
    queryKey: ['active-rentals', user?.baseId, selectedBoatId],
    queryFn: async () => {
      if (!user || type !== 'checkout' || !selectedBoatId) return [];

      const { data, error } = await supabase
        .from('boat_rentals')
        .select('*')
        .eq('boat_id', selectedBoatId)
        .eq('status', 'confirmed')
        .order('start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && type === 'checkout' && !!selectedBoatId
  });

  const selectedBoat = boats.find(b => b.id === selectedBoatId);

  useEffect(() => {
    if (selectedBoat) {
      onBoatSelect(selectedBoat);
    }
  }, [selectedBoat, onBoatSelect]);

  useEffect(() => {
    console.log('BoatRentalSelector - building rental data', {
      type,
      selectedBoatId,
      customerName,
      startDate,
      endDate,
      selectedRental
    });

    const rentalData = type === 'checkin' ? {
      boat_id: selectedBoatId,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      start_date: startDate,
      end_date: endDate,
      notes: notes,
      base_id: user?.baseId
    } : selectedRental;

    console.log('Built rental data:', rentalData);

    // Pour le check-in, on vérifie juste qu'on a les données de base
    // Pour le check-out, on vérifie qu'on a une location sélectionnée
    const isValidForCheckin = type === 'checkin' && selectedBoatId && customerName.trim() && startDate && endDate;
    const isValidForCheckout = type === 'checkout' && selectedRental;

    if (isValidForCheckin || isValidForCheckout) {
      console.log('Calling onRentalDataChange with:', rentalData);
      onRentalDataChange(rentalData);
    } else {
      console.log('Rental data not complete yet - checkin valid:', isValidForCheckin, 'checkout valid:', isValidForCheckout);
    }
  }, [type, selectedBoatId, customerName, customerEmail, customerPhone, startDate, endDate, notes, selectedRental, user?.baseId, onRentalDataChange]);

  const handleRentalSelect = (rentalId: string) => {
    const rental = activeRentals.find(r => r.id === rentalId);
    setSelectedRental(rental);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            {type === 'checkin' ? 'Sélection du bateau' : 'Bateau en location'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="boat">Bateau</Label>
            <Select value={selectedBoatId} onValueChange={setSelectedBoatId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bateau" />
              </SelectTrigger>
              <SelectContent>
                {boats.map((boat) => (
                  <SelectItem key={boat.id} value={boat.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{boat.name} - {boat.model}</span>
                      <Badge variant={boat.status === 'available' ? 'default' : 'secondary'}>
                        {boat.status === 'available' ? 'Disponible' : 'En location'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBoat && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">{selectedBoat.name}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>Modèle: {selectedBoat.model}</div>
                <div>Année: {selectedBoat.year}</div>
                <div>N° Série: {selectedBoat.serial_number}</div>
                <div>Statut: <Badge variant={selectedBoat.status === 'available' ? 'default' : 'secondary'}>
                  {selectedBoat.status === 'available' ? 'Disponible' : 'En location'}
                </Badge></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {type === 'checkin' && selectedBoat && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations client
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Nom du client *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <Label htmlFor="customerPhone">Téléphone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="endDate">Date de fin *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes additionnelles..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {type === 'checkout' && selectedBoat && activeRentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Locations actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeRentals.map((rental) => (
                <div
                  key={rental.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedRental?.id === rental.id ? 'border-marine-500 bg-marine-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleRentalSelect(rental.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{rental.customer_name}</h4>
                      <p className="text-sm text-gray-600">{rental.customer_email}</p>
                      <p className="text-sm text-gray-600">
                        Du {format(new Date(rental.start_date), 'dd/MM/yyyy HH:mm', { locale: fr })} 
                        au {format(new Date(rental.end_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {rental.status === 'confirmed' ? 'En cours' : rental.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}