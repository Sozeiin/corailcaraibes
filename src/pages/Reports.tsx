import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { MaintenanceReports } from '@/components/reports/MaintenanceReports';
import { ChecklistReports } from '@/components/reports/ChecklistReports';
import { IncidentReports } from '@/components/reports/IncidentReports';
import { OperationalReports } from '@/components/reports/OperationalReports';
import { 
  FileText, 
  Wrench, 
  CheckSquare, 
  AlertTriangle, 
  BarChart, 
  Download,
  Filter,
  Calendar
} from 'lucide-react';
import { DateRange } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';

export default function Reports() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('maintenance');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const exportReport = (type: string) => {
    // Implementation for exporting reports
    console.log(`Exporting ${type} report for period:`, dateRange);
  };

  const isDirection = user?.role === 'direction';
  const isChefBase = user?.role === 'chef_base';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rapports</h1>
          <p className="text-muted-foreground">
            Vue d'ensemble des activités et performances
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={(range) => setDateRange(range)}
            placeholder="Sélectionner une période"
          />
          <Button onClick={() => exportReport(activeTab)} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exporter
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="checklists" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Check-in/out
          </TabsTrigger>
          <TabsTrigger value="incidents" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Incidents
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Opérationnel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceReports 
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <ChecklistReports 
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <IncidentReports 
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <OperationalReports 
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}