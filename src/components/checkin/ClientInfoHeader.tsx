import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Mail, Phone, User, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ClientInfoHeaderProps {
  rentalData: any;
  boat: any;
  type: 'checkin' | 'checkout';
}

export function ClientInfoHeader({ rentalData, boat, type }: ClientInfoHeaderProps) {
  const isManualCheckin = !rentalData?.id;

  return (
    <div className="bg-muted/30 rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">
            {rentalData?.customerName || rentalData?.name || 'Client'}
          </h3>
        </div>
        <Badge variant={isManualCheckin ? "secondary" : "default"}>
          {isManualCheckin ? 'Check-in manuel' : 'Fiche administrative'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {rentalData?.customerEmail && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>{rentalData.customerEmail}</span>
          </div>
        )}

        {rentalData?.customerPhone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>{rentalData.customerPhone}</span>
          </div>
        )}

        {rentalData?.startDate && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Du {format(new Date(rentalData.startDate), 'dd MMMM yyyy', { locale: fr })}
              {rentalData.endDate && ` au ${format(new Date(rentalData.endDate), 'dd MMMM yyyy', { locale: fr })}`}
            </span>
          </div>
        )}
      </div>

      {rentalData?.notes && (
        <div className="flex gap-2 pt-2 border-t">
          <AlertCircle className="h-4 w-4 text-accent-foreground flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-accent-foreground">Instructions spéciales :</p>
            <p className="text-muted-foreground mt-1">{rentalData.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
