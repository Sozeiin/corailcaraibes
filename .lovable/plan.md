

## Objectif
Tous les utilisateurs travaillent avec les dates et heures du **fuseau horaire de leur base** (Martinique/Guadeloupe = UTC-4, Métropole = UTC+1/+2). Plus aucun décalage d'1 jour, plus aucune confusion d'horaire entre la direction (France) et les techniciens (Antilles).

## Stratégie globale

1. Ajouter un fuseau horaire (`timezone`) à chaque **base** (table `bases`).
2. Exposer ce fuseau dans `AuthContext.user` (`user.timezone`).
3. Centraliser **toutes** les conversions dans `src/lib/dateUtils.ts` en utilisant ce fuseau, plus aucun appel direct à `new Date(...).toISOString()` ou `toLocaleDateString()` sans passer par les helpers.
4. Distinguer clairement deux types de données :
   - **Dates pures** (date de check-in, date d'intervention, date de maintenance) → stockées en `DATE` PostgreSQL ou ISO `YYYY-MM-DD`, jamais converties par fuseau.
   - **Instants** (créations, signatures, début/fin réels) → stockés en `timestamptz` UTC, affichés dans le fuseau de la base.

## 1. Base de données

Migration :
- Ajouter `timezone TEXT NOT NULL DEFAULT 'America/Martinique'` sur `bases`.
- Initialiser :
  - Base Martinique → `America/Martinique`
  - Base Guadeloupe → `America/Guadeloupe`
  - Métropole → `Europe/Paris`
- Vérifier les colonnes critiques `administrative_checkin_forms.planned_start_date / planned_end_date` : actuellement `timestamptz`. On garde `timestamptz` mais on stocke à **midi du fuseau de la base** pour éviter tout décalage de jour.

## 2. AuthContext (`src/contexts/AuthContext.tsx`)
- Charger aussi `bases.timezone` lors du `fetchUserProfile`.
- Ajouter `timezone: string` dans le type `User`.
- Fallback : `'America/Martinique'` si null.

## 3. `src/lib/dateUtils.ts` — refonte centrée sur le fuseau

Nouvelles fonctions (basées sur `Intl.DateTimeFormat` + `date-fns-tz`) :

| Fonction | Rôle |
|---|---|
| `getBaseTimezone(user)` | Retourne le fuseau effectif (ou défaut). |
| `nowInTimezone(tz)` | Date locale "now" dans le fuseau de la base. |
| `getLocalDateString(tz)` | `YYYY-MM-DD` du jour dans le fuseau de la base (remplace l'actuelle qui dépendait du navigateur). |
| `parseDateInputToUTC(dateString, tz)` | Convertit un `YYYY-MM-DD` (saisi dans un input type=date côté admin) en `timestamptz` représentant **midi heure locale de la base** → stable, jamais de décalage. |
| `formatDateInTimezone(iso, tz, format)` | Formate un instant `timestamptz` dans le fuseau choisi. |
| `formatDateSafe(dateString, tz)` | Compatibilité, utilise `tz` au lieu du navigateur. |
| `formatDateForInput(iso, tz)` | Retourne `YYYY-MM-DD` correspondant à la date locale dans `tz` (corrige le bug actuel où `toISOString` peut renvoyer la veille). |
| `formatDateTimeInTimezone(iso, tz)` | Pour signatures / horodatages. |

Ajout dépendance : `date-fns-tz` (déjà compatible avec `date-fns` présent).

## 4. Propagation du fuseau dans le code

Tous les endroits qui aujourd'hui font :
- `parseLocalDateToUTC(startDate)` → remplacés par `parseDateInputToUTC(startDate, user.timezone)`.
- `getLocalDateString()` → `getLocalDateString(user.timezone)`.
- `formatDateSafe(date)` → `formatDateSafe(date, user.timezone)`.
- `formatDateForInput(date)` → `formatDateForInput(date, user.timezone)`.
- `new Date(...).toLocaleDateString()` directs → remplacés par `formatDateInTimezone`.

Fichiers principaux impactés (la liste exhaustive sera couverte) :
- `src/components/administrative/AdministrativeCheckinFormNew.tsx` (création fiche)
- `src/components/checkin/EditFormDialog.tsx`
- `src/components/checkin/ChecklistForm.tsx`
- `src/components/checkin/TechnicianCheckinInterface.tsx`
- `src/components/maintenance/InterventionTable.tsx`
- `src/components/maintenance/InterventionDialog.tsx` + `InterventionCompletionDialog.tsx`
- `src/components/maintenance/GanttMaintenanceSchedule.tsx` (déjà annoté `TIMEZONE FIX`, à harmoniser)
- `src/components/maintenance/planning/*` (toutes les vues)
- `src/components/dashboard/widgets/MaintenanceWidget.tsx`
- `src/hooks/useCreateIntervention.ts`
- `src/components/preparation/*` et `src/components/shipments/*` (dates planifiées)
- Tous les inputs `type="date"` qui réécrivent leur valeur initiale.

## 5. Affichage explicite de l'heure de la base

Quand un membre de la **direction** (France) consulte une fiche créée à la **Martinique**, on affiche par défaut l'heure de la base concernée (Martinique) avec un libellé clair :
- `21/04/2026 (heure Martinique)` pour les fiches d'une base Antillaise vues par la direction.
- Pour les listes mélangées (ex. dashboard direction multi-bases), on affiche l'heure de la base de la fiche, pas celle du navigateur.

Helper : `formatDateForBase(iso, baseTimezone)` utilisé partout où l'on connaît le fuseau de la fiche, indépendant du fuseau de l'utilisateur connecté.

## 6. Edge functions et triggers

- `supabase/functions/send-checklist-report/index.ts` et `generate-checklist-pdf/index.ts` : formater les dates dans le fuseau de la base de la checklist (pas le fuseau Deno UTC par défaut).
- Triggers DB : aucun changement nécessaire (PostgreSQL stocke déjà UTC en `timestamptz`).

## 7. Validation

Scénarios à valider après implémentation :
1. Admin Guadeloupe (UTC-4) crée une fiche pour le 25 avril à 09:00 → la direction France voit "25/04 09:00 (heure Guadeloupe)", pas "25/04 15:00" et pas "24/04".
2. Direction France ouvre la fiche, l'édite et change la date au 26 avril → enregistrée comme 26 avril heure Guadeloupe.
3. Technicien Martinique fait un check-in à 14:00 locale → l'historique affiche "14:00 (heure Martinique)" pour tous les profils.
4. Maintenance planifiée le 30 avril → reste le 30 avril dans toutes les vues, France comprise.
5. Dashboard "aujourd'hui" → utilise `getLocalDateString(user.timezone)`, pas le fuseau du navigateur.

## Détails techniques

```text
Cause racine actuelle :
- input type="date" renvoie YYYY-MM-DD basé sur le NAVIGATEUR
- parseLocalDateToUTC stocke à midi UTC (12:00Z)
- En Métropole été (UTC+2), midi UTC = 14h locale → OK même jour
- En Guadeloupe (UTC-4), midi UTC = 08h locale → OK même jour
  MAIS d'autres chemins de code utilisent encore `new Date(d).toISOString()`
  ou `new Date(d)` qui interprète à 00:00 locale du navigateur
  → Date stockée parfois à 00:00Z, qui en Guadeloupe = 20h la veille → -1 jour

Correctif :
- Tout passer par parseDateInputToUTC(value, baseTimezone)
  qui force le stockage à midi DU FUSEAU DE LA BASE
- Tout affichage passe par formatDateInTimezone(iso, baseTimezone)
- Plus aucun new Date() / toISOString() non encapsulé
```

## Fichiers à créer / modifier

- Migration SQL : ajout colonne `bases.timezone` + initialisation des 3 bases.
- `src/lib/dateUtils.ts` : refonte complète + nouvelles fonctions.
- `src/contexts/AuthContext.tsx` : exposer `timezone`.
- `package.json` : ajout `date-fns-tz`.
- ~25-30 fichiers UI listés plus haut : remplacement des appels.
- `src/components/settings/BaseSettings.tsx` : permettre à la direction d'éditer le fuseau d'une base.
- 2 edge functions (PDF + email checklist) : formatage dans le fuseau de la base.

Aucune donnée existante perdue : les `timestamptz` en base restent valides, seul l'affichage et la nouvelle écriture utiliseront le fuseau de la base.

