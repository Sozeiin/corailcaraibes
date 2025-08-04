import React from 'react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, Users, Clock, BarChart3 } from 'lucide-react';

export type ViewMode = 'gantt' | 'resource' | 'chronological' | 'monthly';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeSelector({ viewMode, onViewModeChange }: ViewModeSelectorProps) {
  return (
    <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && onViewModeChange(value as ViewMode)}>
      <ToggleGroupItem value="gantt" aria-label="Vue Gantt" className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4" />
        Gantt
      </ToggleGroupItem>
      <ToggleGroupItem value="resource" aria-label="Vue Ressources" className="flex items-center gap-2">
        <Users className="w-4 h-4" />
        Ressources
      </ToggleGroupItem>
      <ToggleGroupItem value="chronological" aria-label="Vue Chronologique" className="flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Chronologique
      </ToggleGroupItem>
      <ToggleGroupItem value="monthly" aria-label="Vue Mensuelle" className="flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Mensuelle
      </ToggleGroupItem>
    </ToggleGroup>
  );
}