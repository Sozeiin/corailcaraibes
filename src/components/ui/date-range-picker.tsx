import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DateRange {
  from?: Date;
  to?: Date;
}

interface DatePickerWithRangeProps {
  date?: DateRange;
  onDateChange: (range: DateRange) => void;
  placeholder?: string;
}

export function DatePickerWithRange({ date, onDateChange, placeholder = "Sélectionner une période" }: DatePickerWithRangeProps) {
  const handlePresetClick = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateChange({ from, to });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            (!date?.from && !date?.to) && "text-muted-foreground"
          )}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "dd MMM yyyy", { locale: fr })} -{" "}
                {format(date.to, "dd MMM yyyy", { locale: fr })}
              </>
            ) : (
              format(date.from, "dd MMM yyyy", { locale: fr })
            )
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <div className="text-sm font-medium mb-2">Raccourcis</div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(7)}
            >
              7 derniers jours
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(30)}
            >
              30 derniers jours
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(90)}
            >
              3 derniers mois
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(365)}
            >
              1 an
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(365 * 2)}
            >
              2 ans
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePresetClick(365 * 5)}
            >
              5 ans
            </Button>
          </div>
        </div>
        {date?.from && date?.to && (
          <div className="p-3">
            <div className="text-sm text-gray-500">
              Période actuelle: {format(date.from, "dd/MM/yyyy", { locale: fr })} - {format(date.to, "dd/MM/yyyy", { locale: fr })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}