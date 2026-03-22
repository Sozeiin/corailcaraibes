
Objectif corrigé (comme vous l’avez demandé) :

- Après un **check-in ONE WAY** : le bateau doit être **transféré sur la base de destination** mais rester **en location (`rented`)**.
- Il ne doit passer en **disponible (`available`) qu’après le check-out** réalisé par l’équipe qui reçoit le bateau.

Constat sur le code actuel :

1. Une migration manuelle a mis DORMELLE en `available` (c’est contraire à votre règle).
2. Le transfert ONE WAY est fait côté client avec `update boats`, mais pour un technicien il peut échouer selon les règles RLS (changement de `base_id` inter-base), donc transfert non fiable.
3. Le check-out met bien `available`, mais on doit garantir que ce soit le **seul** moment où ça arrive.

Plan de correction

1) Corriger immédiatement l’état de DORMELLE (data fix ciblé)
- Nouvelle migration SQL ciblée :
  - DORMELLE -> `base_id = Guadeloupe`
  - DORMELLE -> `status = 'rented'`
- Aucun autre bateau modifié.

2) Fiabiliser le transfert ONE WAY au check-in via fonction SQL sécurisée (SECURITY DEFINER)
- Ajouter une fonction SQL (migration) qui exécute côté DB :
  - validation du formulaire ONE WAY
  - transfert `boats.base_id = destination_base_id`
  - `boats.status = 'rented'`
  - insertion `boat_base_transfers`
- Cette fonction contourne proprement les blocages RLS côté client et rend le transfert fiable pour les techniciens.

3) Mettre à jour le front pour utiliser cette fonction (au lieu des updates directs)
- `src/components/checkin/TechnicianCheckinInterface.tsx`
  - dans `handleComplete` (branche check-in), remplacer `update boats + insert boat_base_transfers` par appel RPC de la fonction SQL.
  - en cas d’erreur RPC : toast bloquant + ne pas fermer silencieusement.
- `src/pages/CheckInProcess.tsx`
  - même changement pour garder le comportement identique sur ce flux.

4) Verrouiller la règle métier “disponible uniquement au check-out”
- Conserver la mise à `available` uniquement dans la branche check-out.
- Vérifier qu’aucune branche check-in ONE WAY ne remet `available`.

5) Validation E2E obligatoire
Scénario cible :
1. Créer fiche ONE WAY Martinique -> Guadeloupe  
2. Faire check-in en Martinique  
   - attendu : bateau visible en Guadeloupe, statut `rented`  
3. Équipe Guadeloupe fait check-out  
   - attendu : le bateau passe ensuite en `available` (et reste en base Guadeloupe)

Fichiers / couches concernées
- `supabase/migrations/*` (data fix DORMELLE + fonction SQL SECURITY DEFINER)
- `src/components/checkin/TechnicianCheckinInterface.tsx`
- `src/pages/CheckInProcess.tsx`
