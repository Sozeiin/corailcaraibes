import { describe, it, expect } from 'vitest';
import { getWorstOilChangeStatus, type EngineComponent } from '@/utils/engineMaintenanceUtils';

describe('Fleet KPI matches red oil change badges', () => {
  it('counts overdue engines consistently', () => {
    const boats: { id: string; engines: EngineComponent[] }[] = [
      {
        id: '1',
        engines: [
          {
            id: 'e1',
            component_name: 'Engine 1',
            component_type: 'moteur',
            current_engine_hours: 300,
            last_oil_change_hours: 0
          }
        ]
      },
      {
        id: '2',
        engines: [
          {
            id: 'e2',
            component_name: 'Engine 2',
            component_type: 'moteur',
            current_engine_hours: 100,
            last_oil_change_hours: 0
          }
        ]
      },
      {
        id: '3',
        engines: [
          {
            id: 'e3',
            component_name: 'Engine 3',
            component_type: 'moteur',
            current_engine_hours: 260,
            last_oil_change_hours: 20
          }
        ]
      }
    ];

    const kpiValue = boats.filter(
      (boat) => getWorstOilChangeStatus(boat.engines).isOverdue
    ).length;

    const redBadges = boats
      .map((boat) => getWorstOilChangeStatus(boat.engines))
      .filter((status) => status.isOverdue).length;

    expect(kpiValue).toBe(2);
    expect(redBadges).toBe(2);
    expect(kpiValue).toBe(redBadges);
  });
});

