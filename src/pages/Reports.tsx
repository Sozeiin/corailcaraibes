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
import { PreparationReports } from '@/components/reports/PreparationReports';
import { PreparationHistoryView } from '@/components/reports/PreparationHistoryView';
import { useReportsData } from '@/hooks/useReportsData';
import { usePreparationReportsData } from '@/hooks/usePreparationReportsData';
import { exportReportToPDF, exportReportToExcel } from '@/lib/reportExports';
import { 
  FileText, 
  Wrench, 
  CheckSquare, 
  AlertTriangle, 
  BarChart, 
  Download,
  RefreshCw,
  Calendar,
  FileSpreadsheet,
  Ship
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

  const { data: reportsData, isLoading, refetch } = useReportsData(dateRange);
  const { data: preparationReportsData, isLoading: isLoadingPreparations, refetch: refetchPreparations } = usePreparationReportsData(dateRange);

  const exportReport = (format: 'pdf' | 'excel') => {
    if (!reportsData) return;
    
    if (format === 'pdf') {
      exportReportToPDF(activeTab, reportsData, dateRange);
    } else {
      exportReportToExcel(activeTab, reportsData, dateRange);
    }
  };

  const isDirection = user?.role === 'direction';
  const isChefBase = user?.role === 'chef_base';

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2 text-lg">Chargement des données...</span>
        </div>
      </div>
    );
  }

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
          <Button 
            onClick={() => {
              refetch();
              refetchPreparations();
            }} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </Button>
          <Button 
            onClick={() => exportReport('pdf')} 
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            PDF
          </Button>
          <Button 
            onClick={() => exportReport('excel')} 
            className="flex items-center gap-2"
            variant="outline"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="maintenance" className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="checklists" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Check-in/out
          </TabsTrigger>
          <TabsTrigger value="preparations" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Préparations
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
            data={reportsData?.maintenance}
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="checklists" className="space-y-4">
          <ChecklistReports 
            data={reportsData?.checklists}
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="preparations" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div>
              <PreparationReports 
                data={preparationReportsData}
                dateRange={dateRange} 
                isDirection={isDirection}
                isChefBase={isChefBase}
              />
            </div>
            <div>
              <PreparationHistoryView />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-4">
          <IncidentReports 
            data={reportsData?.incidents}
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>

        <TabsContent value="operational" className="space-y-4">
          <OperationalReports 
            data={reportsData?.operational}
            dateRange={dateRange} 
            isDirection={isDirection}
            isChefBase={isChefBase}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}