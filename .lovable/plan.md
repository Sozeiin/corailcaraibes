

## Objectif
Finaliser le chantier fuseau horaire en 3 lots pour éliminer tout risque de décalage de date entre la France (UTC+1/+2) et les Antilles (UTC-4).

## Lot 1 — Maintenance & Planning

Remplacer tous les `new Date(...).toISOString()`, `formatDateSafe(date)`, `parseLocalDateToUTC()` sans fuseau par les helpers `parseDateInputToUTC(value, user.timezone)` et `formatDateInTimezone(iso, baseTimezone)`.

Fichiers :
- `src/components/maintenance/InterventionTable.tsx`
- `src/components/maintenance/InterventionDialog.tsx`
- `src/components/maintenance/InterventionCompletionDialog.tsx`
- `src/components/maintenance/InterventionDetailsDialog.tsx`
- `src/components/maintenance/GanttMaintenanceSchedule.tsx` (harmoniser les TIMEZONE FIX existants)
- `src/components/maintenance/MaintenanceSchedule.tsx`
- `src/components/maintenance/ScheduledMaintenanceTable.tsx`
- `src/components/maintenance/MaintenanceHistory.tsx`
- `src/hooks/useCreateIntervention.ts`
- `src/components/maintenance/planning/ChronologicalView.tsx`
- `src/components/maintenance/planning/MonthlyView.tsx`
- `src/components/maintenance/planning/ResourceView.tsx`
- `src/components/maintenance/planning/GanttPlanningView.tsx`
- `src/components/maintenance/planning/ActivityDialog.tsx`
- `src/components/maintenance/planning/PlanningActivityCard.tsx`
- `src/components/maintenance/planning/TimeGrid.tsx`

Règle : toute date stockée passe par midi du fuseau de la base, tout affichage utilise le fuseau de la base de l'entité (pas du navigateur).

## Lot 2 — Dashboard, Préparations & Expéditions

Fichiers :
- `src/components/dashboard/widgets/MaintenanceWidget.tsx`
- `src/components/dashboard/widgets/MaintenanceAlertsWidget.tsx`
- `src/components/dashboard/widgets/UrgentInterventionsWidget.tsx`
- `src/components/dashboard/widgets/AlertsWidget.tsx`
- `src/components/dashboard/widgets/BoatFlowWidget.tsx`
- `src/components/dashboard/TechnicianDashboard.tsx`
- `src/components/dashboard/TechnicianPlanningView.tsx`
- `src/components/preparation/BoatPreparationManager.tsx`
- `src/components/preparation/PreparationOrdersTable.tsx`
- `src/components/preparation/TechnicianPreparations.tsx`
- `src/components/shipments/PreparationDialog.tsx`
- `src/components/shipments/PreparationDetailsDialog.tsx`
- `src/components/shipments/ShipmentReceptionDialog.tsx`
- `src/components/checkin/TechnicianCheckinInterface.tsx`
- `src/components/checkin/ChecklistReviewStep.tsx`
- `src/components/boats/BoatChecklistHistory.tsx`
- `src/components/boats/BoatInterventionHistory.tsx`
- `src/components/boats/BoatPreparationHistory.tsx`

Helper utilisé : `formatDateInTimezone(iso, baseTimezoneOfRecord)`. Les widgets « aujourd'hui » utilisent `getLocalDateString(user.timezone)`.

## Lot 3 — Edge functions (PDF & Email)

Modifier :
- `supabase/functions/generate-checklist-pdf/index.ts`
- `supabase/functions/send-checklist-report/index.ts`

Changements :
- Récupérer `bases.timezone` depuis l'enregistrement lié à la checklist.
- Formater toutes les dates via `Intl.DateTimeFormat('fr-FR', { timeZone: baseTimezone, ... })` au lieu du défaut UTC de Deno.
- Ajouter le libellé « heure Martinique / Guadeloupe / Paris » sous les dates dans le PDF et le corps de l'email.

## Vérifications transverses

Audit final via grep sur :
- `new Date(` dans les composants ciblés → encapsulé ou justifié
- `.toISOString()` → uniquement après passage par `parseDateInputToUTC`
- `toLocaleDateString` / `toLocaleString` → remplacés par `formatDateInTimezone`
- Tous les `<input type="date">` réécrivent leur valeur via `formatDateForInput(iso, user.timezone)`

## Détails techniques

```text
Pattern de remplacement systématique :

AVANT:
  start_date: new Date(formData.startDate).toISOString()
  affichage: format(new Date(iso), 'dd/MM/yyyy')

APRÈS:
  start_date: parseDateInputToUTC(formData.startDate, user.timezone)
  affichage: formatDateInTimezone(iso, recordBaseTimezone, 'dd/MM/yyyy')

Pour les listes multi-bases (vue direction) :
  formatDateInTimezone(iso, item.boat.base.timezone || user.timezone)
```

## Validation finale

Scénarios exécutés après chaque lot :
1. Admin Guadeloupe crée une maintenance le 25/04 → direction France voit 25/04 (pas 24/04).
2. Direction France planifie une intervention pour la Martinique le 30/04 → technicien Martinique voit 30/04.
3. Dashboard « aujourd'hui » à 23h locale Antilles → liste correcte (pas de glissement au lendemain).
4. PDF de check-in généré pour une location Martinique → horodatages affichent l'heure Martinique avec libellé.
5. Email de rapport reçu par la direction → dates affichées dans le fuseau de la base, pas en UTC.

## Fichiers à modifier

- ~17 fichiers (Lot 1)
- ~18 fichiers (Lot 2)
- 2 edge functions (Lot 3)

Aucun changement DB nécessaire (la colonne `bases.timezone` existe déjà).

