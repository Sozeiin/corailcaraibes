import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PlanningActivityCard } from './PlanningActivityCard';

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

interface PlanningActivity {
  id: string;
  activity_type: 'checkin' | 'checkout' | 'travel' | 'break' | 'emergency';
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  estimated_duration: number;
  color_code: string;
  priority: string;
  checklist_completed: boolean;
  delay_minutes: number;
  technician?: {
    id: string;
    name: string;
  } | null;
  boat?: {
    id: string;
    name: string;
  } | null;
}

interface Technician {
  id: string;
  name: string;
  role: string;
}

interface TimeGridProps {
  weekDays: Date[];
  timeSlots: TimeSlot[];
  technicians: Technician[];
  activities: PlanningActivity[];
  onActivityClick: (activity: any) => void;
  getActivitiesForTechnicianAndDay: (technicianId: string, date: Date) => PlanningActivity[];
}

interface DroppableTimeSlotProps {
  technicianId: string;
  date: Date;
  timeSlot: TimeSlot;
  activities: PlanningActivity[];
  onActivityClick: (activity: any) => void;
}

function DroppableTimeSlot({ technicianId, date, timeSlot, activities, onActivityClick }: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${technicianId}-${date.toISOString()}-${timeSlot.hour}-${timeSlot.minute}`,
    data: {
      technicianId,
      date,
      timeSlot
    }
  });

  const slotActivities = activities.filter(activity => {
    const activityStart = new Date(activity.scheduled_start);
    return activityStart.getHours() === timeSlot.hour && activityStart.getMinutes() === timeSlot.minute;
  });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[60px] max-h-[60px] h-[60px] w-[200px] min-w-[200px] max-w-[200px] border-r border-b border-border p-1 transition-colors overflow-hidden
        ${isOver ? 'bg-primary/10' : 'bg-background hover:bg-muted/50'}
      `}
    >
      <div className="space-y-0.5 h-full overflow-hidden">
        {slotActivities.map(activity => (
          <PlanningActivityCard
            key={activity.id}
            activity={activity}
            onClick={() => onActivityClick(activity)}
          />
        ))}
      </div>
    </div>
  );
}

export function TimeGrid({ 
  weekDays, 
  timeSlots, 
  technicians, 
  activities, 
  onActivityClick, 
  getActivitiesForTechnicianAndDay 
}: TimeGridProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="min-w-max">
        {/* Days header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="flex">
            {/* Technician names column header */}
            <div className="w-48 border-r border-border p-4 font-medium bg-muted">
              Techniciens
            </div>
            {/* Days */}
            {weekDays.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className={`
                  min-w-[200px] max-w-[200px] w-[200px] p-2 text-center border-r border-border font-medium
                  ${isToday(day) ? 'bg-primary/10' : 'bg-muted'}
                `}
              >
                <div className="text-sm">{format(day, 'EEEE', { locale: fr })}</div>
                <div className="text-lg">{format(day, 'dd MMM', { locale: fr })}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Time slots grid */}
        <div className="flex">
          {/* Time labels column */}
          <div className="w-48 border-r border-border">
            {timeSlots.map((timeSlot, index) => (
              <div 
                key={index}
                className="min-h-[60px] max-h-[60px] h-[60px] border-b border-border p-1 text-xs text-muted-foreground bg-muted/50 flex items-center"
              >
                {timeSlot.label}
              </div>
            ))}
          </div>

          {/* Technician columns */}
          {technicians.map((technician) => (
            <div key={technician.id} className="flex flex-col">
              {/* Technician header */}
              <div className="sticky top-12 z-10 bg-background border-b p-2 text-center font-medium">
                {technician.name}
              </div>

              {/* Days for this technician */}
              <div className="flex">
                {weekDays.map((day, dayIndex) => (
                  <div key={dayIndex} className="min-w-[200px]">
                    {timeSlots.map((timeSlot, slotIndex) => (
                      <DroppableTimeSlot
                        key={slotIndex}
                        technicianId={technician.id}
                        date={day}
                        timeSlot={timeSlot}
                        activities={getActivitiesForTechnicianAndDay(technician.id, day)}
                        onActivityClick={onActivityClick}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}