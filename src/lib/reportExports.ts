import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { ReportsData } from '@/hooks/useReportsData';
import { DateRange } from '@/components/ui/date-range-picker';

export function exportReportToPDF(reportType: string, data: ReportsData, dateRange: DateRange | undefined) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;

  // Header
  pdf.setFontSize(20);
  pdf.text('Rapport ' + getReportTitle(reportType), margin, yPosition);
  yPosition += 15;

  // Date range
  if (dateRange?.from && dateRange?.to) {
    pdf.setFontSize(12);
    pdf.text(
      `Période: ${dateRange.from.toLocaleDateString('fr-FR')} - ${dateRange.to.toLocaleDateString('fr-FR')}`,
      margin,
      yPosition
    );
    yPosition += 20;
  }

  // Report content based on type
  switch (reportType) {
    case 'maintenance':
      yPosition = addMaintenanceContent(pdf, data.maintenance, margin, yPosition, pageWidth);
      break;
    case 'checklists':
      yPosition = addChecklistContent(pdf, data.checklists, margin, yPosition, pageWidth);
      break;
    case 'incidents':
      yPosition = addIncidentContent(pdf, data.incidents, margin, yPosition, pageWidth);
      break;
    case 'operational':
      yPosition = addOperationalContent(pdf, data.operational, margin, yPosition, pageWidth);
      break;
  }

  // Save the PDF
  const fileName = `rapport_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}

export function exportReportToExcel(reportType: string, data: ReportsData, dateRange: DateRange | undefined) {
  const workbook = XLSX.utils.book_new();

  switch (reportType) {
    case 'maintenance':
      addMaintenanceSheets(workbook, data.maintenance);
      break;
    case 'checklists':
      addChecklistSheets(workbook, data.checklists);
      break;
    case 'incidents':
      addIncidentSheets(workbook, data.incidents);
      break;
    case 'operational':
      addOperationalSheets(workbook, data.operational);
      break;
  }

  // Add summary sheet
  const summaryData = [
    ['Type de rapport', getReportTitle(reportType)],
    ['Date de génération', new Date().toLocaleDateString('fr-FR')],
    ['Période', dateRange?.from && dateRange?.to ? 
      `${dateRange.from.toLocaleDateString('fr-FR')} - ${dateRange.to.toLocaleDateString('fr-FR')}` : 
      'Non spécifiée'
    ],
    [],
    ['Métriques principales'],
    ...getSummaryMetrics(reportType, data)
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Résumé');

  // Save the Excel file
  const fileName = `rapport_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

function getReportTitle(reportType: string): string {
  const titles = {
    maintenance: 'Maintenance',
    checklists: 'Check-in/Check-out',
    incidents: 'Incidents',
    operational: 'Opérationnel'
  };
  return titles[reportType as keyof typeof titles] || reportType;
}

function addMaintenanceContent(pdf: jsPDF, data: any, margin: number, yPosition: number, pageWidth: number): number {
  pdf.setFontSize(16);
  pdf.text('Résumé Maintenance', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  const metrics = [
    `Total interventions: ${data.totalInterventions}`,
    `Interventions terminées: ${data.completedInterventions}`,
    `Interventions en cours: ${data.inProgressInterventions}`,
    `Taux de completion: ${data.completionRate.toFixed(1)}%`
  ];

  metrics.forEach(metric => {
    pdf.text(metric, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Technician performance
  if (data.technicianPerformance.length > 0) {
    pdf.setFontSize(14);
    pdf.text('Performance des techniciens', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    data.technicianPerformance.forEach((tech: any) => {
      pdf.text(
        `${tech.name}: ${tech.completedInterventions}/${tech.totalInterventions} (${tech.completionRate.toFixed(1)}%)`,
        margin,
        yPosition
      );
      yPosition += 6;
    });
  }

  return yPosition;
}

function addChecklistContent(pdf: jsPDF, data: any, margin: number, yPosition: number, pageWidth: number): number {
  pdf.setFontSize(16);
  pdf.text('Résumé Check-in/Check-out', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  const metrics = [
    `Total checklists: ${data.totalChecklists}`,
    `Check-ins: ${data.checkInCount}`,
    `Check-outs: ${data.checkOutCount}`,
    `Taux de completion: ${data.completionRate.toFixed(1)}%`,
    `Temps moyen: ${data.averageTime} minutes`
  ];

  metrics.forEach(metric => {
    pdf.text(metric, margin, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Boat utilization
  if (data.boatUtilization.length > 0) {
    pdf.setFontSize(14);
    pdf.text('Utilisation des bateaux', margin, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    data.boatUtilization.forEach((boat: any) => {
      pdf.text(
        `${boat.boatName}: ${boat.checkIns} entrées, ${boat.checkOuts} sorties (${boat.hours}h)`,
        margin,
        yPosition
      );
      yPosition += 6;
    });
  }

  return yPosition;
}

function addIncidentContent(pdf: jsPDF, data: any, margin: number, yPosition: number, pageWidth: number): number {
  pdf.setFontSize(16);
  pdf.text('Résumé Incidents', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  const metrics = [
    `Total incidents: ${data.totalIncidents}`,
    `Incidents résolus: ${data.resolvedIncidents}`,
    `Incidents en attente: ${data.pendingIncidents}`,
    `Total bateaux: ${data.totalBoats}`,
    `Bateaux disponibles: ${data.availableBoats}`,
    `Bateaux en maintenance: ${data.maintenanceBoats}`
  ];

  metrics.forEach(metric => {
    pdf.text(metric, margin, yPosition);
    yPosition += 8;
  });

  return yPosition;
}

function addOperationalContent(pdf: jsPDF, data: any, margin: number, yPosition: number, pageWidth: number): number {
  pdf.setFontSize(16);
  pdf.text('Résumé Opérationnel', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(12);
  const metrics = [
    `Valeur totale stock: ${data.totalStockValue.toFixed(2)}€`,
    `Articles en rupture: ${data.lowStockItems}`,
    `Total commandes: ${data.totalOrders}`,
    `Valeur commandes: ${data.orderValue.toFixed(2)}€`
  ];

  metrics.forEach(metric => {
    pdf.text(metric, margin, yPosition);
    yPosition += 8;
  });

  return yPosition;
}

function addMaintenanceSheets(workbook: XLSX.WorkBook, data: any) {
  // Main metrics sheet
  const metricsData = [
    ['Métrique', 'Valeur'],
    ['Total interventions', data.totalInterventions],
    ['Interventions terminées', data.completedInterventions],
    ['Interventions en cours', data.inProgressInterventions],
    ['Interventions en attente', data.pendingInterventions],
    ['Taux de completion (%)', data.completionRate.toFixed(1)]
  ];
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métriques');

  // Technician performance sheet
  if (data.technicianPerformance.length > 0) {
    const techData = [
      ['Technicien', 'Total interventions', 'Terminées', 'Durée moyenne (min)', 'Taux completion (%)'],
      ...data.technicianPerformance.map((tech: any) => [
        tech.name,
        tech.totalInterventions,
        tech.completedInterventions,
        tech.averageDuration,
        tech.completionRate.toFixed(1)
      ])
    ];
    const techSheet = XLSX.utils.aoa_to_sheet(techData);
    XLSX.utils.book_append_sheet(workbook, techSheet, 'Performance Techniciens');
  }

  // Monthly trend sheet
  if (data.monthlyTrend.length > 0) {
    const trendData = [
      ['Mois', 'Interventions'],
      ...data.monthlyTrend.map((item: any) => [item.month, item.interventions])
    ];
    const trendSheet = XLSX.utils.aoa_to_sheet(trendData);
    XLSX.utils.book_append_sheet(workbook, trendSheet, 'Évolution Mensuelle');
  }
}

function addChecklistSheets(workbook: XLSX.WorkBook, data: any) {
  // Main metrics sheet
  const metricsData = [
    ['Métrique', 'Valeur'],
    ['Total checklists', data.totalChecklists],
    ['Check-ins', data.checkInCount],
    ['Check-outs', data.checkOutCount],
    ['Taux de completion (%)', data.completionRate.toFixed(1)],
    ['Temps moyen (min)', data.averageTime]
  ];
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métriques');

  // Boat utilization sheet
  if (data.boatUtilization.length > 0) {
    const boatData = [
      ['Bateau', 'Check-ins', 'Check-outs', 'Heures', 'Équilibre'],
      ...data.boatUtilization.map((boat: any) => [
        boat.boatName,
        boat.checkIns,
        boat.checkOuts,
        boat.hours,
        boat.balance === 'equilibre' ? 'Équilibré' : 'Déséquilibré'
      ])
    ];
    const boatSheet = XLSX.utils.aoa_to_sheet(boatData);
    XLSX.utils.book_append_sheet(workbook, boatSheet, 'Utilisation Bateaux');
  }
}

function addIncidentSheets(workbook: XLSX.WorkBook, data: any) {
  // Main metrics sheet
  const metricsData = [
    ['Métrique', 'Valeur'],
    ['Total incidents', data.totalIncidents],
    ['Incidents résolus', data.resolvedIncidents],
    ['Incidents en attente', data.pendingIncidents],
    ['Total bateaux', data.totalBoats],
    ['Bateaux disponibles', data.availableBoats],
    ['Bateaux en maintenance', data.maintenanceBoats]
  ];
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métriques');

  // Recent incidents sheet
  if (data.recentIncidents.length > 0) {
    const incidentData = [
      ['Titre', 'Bateau', 'Date', 'Statut', 'Priorité'],
      ...data.recentIncidents.map((incident: any) => [
        incident.title,
        incident.boat,
        incident.date,
        incident.status,
        incident.priority
      ])
    ];
    const incidentSheet = XLSX.utils.aoa_to_sheet(incidentData);
    XLSX.utils.book_append_sheet(workbook, incidentSheet, 'Incidents Récents');
  }
}

function addOperationalSheets(workbook: XLSX.WorkBook, data: any) {
  // Main metrics sheet
  const metricsData = [
    ['Métrique', 'Valeur'],
    ['Valeur totale stock (€)', data.totalStockValue.toFixed(2)],
    ['Articles en rupture', data.lowStockItems],
    ['Total commandes', data.totalOrders],
    ['Valeur commandes (€)', data.orderValue.toFixed(2)]
  ];
  const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Métriques');

  // Stock by category sheet
  if (data.stockByCategory.length > 0) {
    const stockData = [
      ['Catégorie', 'Valeur (€)', 'Quantité'],
      ...data.stockByCategory.map((category: any) => [
        category.category,
        category.value.toFixed(2),
        category.count
      ])
    ];
    const stockSheet = XLSX.utils.aoa_to_sheet(stockData);
    XLSX.utils.book_append_sheet(workbook, stockSheet, 'Stock par Catégorie');
  }

  // Low stock items sheet
  if (data.lowStockList.length > 0) {
    const lowStockData = [
      ['Article', 'Stock actuel', 'Stock minimum', 'Catégorie'],
      ...data.lowStockList.map((item: any) => [
        item.name,
        item.current,
        item.minimum,
        item.category
      ])
    ];
    const lowStockSheet = XLSX.utils.aoa_to_sheet(lowStockData);
    XLSX.utils.book_append_sheet(workbook, lowStockSheet, 'Stock Faible');
  }
}

function getSummaryMetrics(reportType: string, data: ReportsData): string[][] {
  switch (reportType) {
    case 'maintenance':
      return [
        ['Total interventions', data.maintenance.totalInterventions.toString()],
        ['Taux de completion', `${data.maintenance.completionRate.toFixed(1)}%`]
      ];
    case 'checklists':
      return [
        ['Total checklists', data.checklists.totalChecklists.toString()],
        ['Check-ins', data.checklists.checkInCount.toString()],
        ['Check-outs', data.checklists.checkOutCount.toString()]
      ];
    case 'incidents':
      return [
        ['Total incidents', data.incidents.totalIncidents.toString()],
        ['Incidents résolus', data.incidents.resolvedIncidents.toString()]
      ];
    case 'operational':
      return [
        ['Valeur stock total', `${data.operational.totalStockValue.toFixed(2)}€`],
        ['Articles en rupture', data.operational.lowStockItems.toString()]
      ];
    default:
      return [];
  }
}