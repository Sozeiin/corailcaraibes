
Objectif validé: corriger définitivement le flux ONE WAY pour que le bateau change de base dès la fin du check-in (et ne bloque plus le check-out de l’équipe destination).

Constat confirmé (d’après le code + données):
- `TechnicianCheckinInterface.tsx` ne déplace le bateau vers `destination_base_id` qu’au check-out.
- En check-out, plusieurs updates critiques (formulaire + bateau) n’ont pas de gestion d’erreur stricte, donc elles peuvent échouer silencieusement.
- Résultat vu sur DORMELLE: formulaire ONE WAY en `used`, mais bateau resté `rented` sur base Martinique.

Plan de correction

1) Déplacer le transfert de base ONE WAY au moment du check-in (pas au check-out)
- Fichier: `src/components/checkin/TechnicianCheckinInterface.tsx`
- Dans `handleComplete`, branche `mode === 'checkin'`:
  - Après passage du formulaire en `used`, si `selectedForm.is_one_way === true` et `selectedForm.destination_base_id`:
    - `boats.base_id = destination_base_id`
    - `boats.status = 'rented'` (la location est en cours)
    - `updated_at = now`
  - Ajouter gestion d’erreur explicite (si update bateau échoue: toast + log + stop du flux de clôture silencieuse).

2) Rendre le check-out robuste même si le formulaire ONE WAY n’est pas retrouvé
- Fichier: `src/components/checkin/TechnicianCheckinInterface.tsx`
- Dans branche `mode === 'checkout'`:
  - Conserver la logique actuelle de fin de rental (`boat_rentals.status='completed'`).
  - Ne plus dépendre de `formData` pour remettre le bateau dispo:
    - Toujours appliquer un fallback final `boats.status='available'` (et base inchangée si non ONE WAY).
  - Si `formData` ONE WAY est trouvé, garder la mise à jour `base_id = destination_base_id` (idempotente).
  - Vérifier chaque requête Supabase (`error`) et remonter proprement.

3) Aligner aussi le flux alternatif `/checkin-process` pour comportement identique
- Fichiers:
  - `src/components/checkin/ReadyFormsSection.tsx`
  - `src/pages/CheckInProcess.tsx`
- Aujourd’hui, ce flux ne transporte pas les métadonnées ONE WAY nécessaires.
- Ajouter dans le `navigate(... state ...)`:
  - `formId`, `isOneWay`, `destinationBaseId`, `boatId`
- À la fin du check-in dans `CheckInProcess`:
  - marquer la fiche `used`
  - appliquer le même transfert ONE WAY du bateau vers base destination.
- Ainsi, quel que soit l’écran utilisé pour faire le check-in, le comportement est identique.

4) Corriger les données déjà bloquées (dont DORMELLE)
- Exécuter un correctif data (opération ciblée, sans changement de schéma):
  - Recaler `boats.base_id` sur la destination du dernier formulaire ONE WAY `used` quand le bateau est resté sur l’ancienne base.
  - Recaler le statut selon la réalité:
    - `rented` si rental `confirmed` existe
    - sinon `available`
- Appliquer immédiatement à DORMELLE.
- (Option recommandé) clôturer les partages ONE WAY expirés (`boat_sharing.status='ended'`) pour éviter les incohérences d’affichage.

5) Validation fonctionnelle (obligatoire)
- Test E2E ONE WAY complet:
  1. Créer fiche ONE WAY Martinique -> Guadeloupe.
  2. Faire check-in côté Martinique.
  3. Vérifier immédiatement: bateau visible en base Guadeloupe, statut `rented`.
  4. Côté Guadeloupe, vérifier qu’il est sélectionnable pour check-out.
  5. Faire check-out et vérifier: statut `available`, base Guadeloupe conservée.
- Vérifier aussi l’historique check-in/check-out et la liste bateaux (pas de duplication incohérente).

Section technique (résumé)
- Pas de migration de schéma nécessaire.
- Corrections principalement front + un correctif data ponctuel.
- Points clés de robustesse:
  - transfert ONE WAY déplacé au check-in
  - suppression des dépendances fragiles au formulaire dans le check-out
  - gestion d’erreur stricte sur toutes les updates critiques.
