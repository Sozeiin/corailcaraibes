## Objectif

Permettre au profil **direction** de modifier l'intervalle d'heures avant vidange (alerte) de chaque moteur et génératrice individuellement, avec des valeurs distinctes par composant, depuis **Paramètres > Maintenance**.

Aujourd'hui cet intervalle est codé en dur à 250h (alerte « bientôt » à 200h) dans `engineMaintenanceUtils.ts` et s'applique uniformément à tous les composants.

## Changements prévus

### 1. Base de données
- Ajouter une colonne `oil_change_interval_hours` (entier, défaut **250**) à la table `boat_components`.
- Les composants existants héritent donc de la valeur 250 actuelle (aucune régression).

### 2. Logique de calcul (`src/utils/engineMaintenanceUtils.ts`)
- Faire accepter un paramètre `interval` (heures) aux fonctions de statut/progression au lieu du `250` codé en dur :
  - `calculateOilChangeStatus`, `getOilChangeStatusColor`, `getOilChangeStatusBadge`, `calculateOilChangeProgress`, `getWorstOilChangeStatus`, `calculateWorstOilChangeProgress`.
- Le seuil « bientôt » (aujourd'hui 200h) devient proportionnel (ex. 80 % de l'intervalle) pour rester cohérent avec un intervalle personnalisé.
- Valeur par défaut 250 si l'intervalle n'est pas fourni → comportement inchangé partout où l'appel n'est pas encore mis à jour.

### 3. Composants existants utilisant ces fonctions
- Mettre à jour les appels pour transmettre `oil_change_interval_hours` de chaque composant :
  `BoatFleetCard.tsx`, `EngineStatusCard.tsx`, `OilChangeStatusBadge.tsx`, `BoatsDashboard.tsx`, `EngineHoursDialog.tsx`.
- Ajouter le champ dans la requête `useBoatEngines` (`src/hooks/useBoatEngines.ts`) et l'interface `BoatEngine`.

### 4. Nouvelle UI dans Paramètres > Maintenance
- Dans `MaintenanceSettings.tsx`, ajouter une carte « Intervalles de vidange (heures moteur) » réservée au profil direction.
- Lister les bateaux et, pour chacun, ses composants de type moteur/génératrice avec un champ numérique éditable pour l'intervalle (heures), un bouton Enregistrer par composant ou global.
- Nouveau hook de mutation pour mettre à jour `oil_change_interval_hours` sur `boat_components` + invalidation des queries (`boat-engines`, `boat-components`, `boats`, `boat-dashboard`).

## Détails techniques
- L'accès direction est déjà géré : l'onglet Maintenance n'apparaît que pour `direction`/`chef_base` (voir `Settings.tsx`). On limitera la nouvelle carte au rôle `direction`.
- Pas de nouvelle table : un simple ajout de colonne suffit puisque le réglage est par composant.
- RLS : `boat_components` a déjà des policies; l'update passe par les policies existantes (aucune nouvelle policy nécessaire si l'update est déjà autorisé pour direction; sinon ajout d'une policy d'update ciblée).
