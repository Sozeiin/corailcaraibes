import React from 'react';
import { GanttMaintenanceSchedule } from '@/components/maintenance/GanttMaintenanceSchedule';
export default function MaintenanceGanttPage() {
  return <div className="space-y-3 sm:space-y-5 ">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Planning</h1>
          
        </div>
      </div>

      <GanttMaintenanceSchedule />
    </div>;
}