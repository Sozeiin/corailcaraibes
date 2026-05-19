
# Audit ONE WAY — État actuel

## Principe ONE WAY confirmé
Oui, c'est bien le comportement attendu et il est implémenté :
1. Préparation fiche check-in avec case "ONE WAY" + base de destination.
2. Le technicien fait le **check-in sur la base d'origine** → le bateau est immédiatement transféré (`base_id` → destination, `status = rented`) via `handle_one_way_checkin_transfer`.
3. Le bateau apparaît alors sur la **base de destination**, où un autre technicien réalise le **check-out** → `status = available`, et `handle_one_way_checkout_close` clôture tout partage actif résiduel. Le bateau reste sur la base de destination (c'est le principe du one-way).

## Audit : ce qui est correct
- **Aucun doublon de bateau actif** (vérifié) ; aucun doublon de partage actif (l'index unique partiel `uniq_boat_sharing_active_per_boat` empêche toute régression).
- **Trigger d'auto-création de partage retiré** sur `administrative_checkin_forms` (cause historique des doublons TOPAZE).
- **RPC `handle_one_way_checkin_transfer` idempotente** : no-op si le bateau est déjà à destination, clôture les anciens partages, anti-doublon de log < 5 min.
- **RPC `handle_one_way_checkout_close`** : clôture les partages actifs au check-out.
- **Frontend, 3 points d'entrée couverts** :
  - `TechnicianCheckinInterface` (check-in direct + check-out direct).
  - `TechnicianCheckinInterface.handleResumeDraft` (reprise de brouillon ONE WAY — propage `oneWayMeta`).
  - `CheckInProcess` (route `/checkin-process` : transfert au check-in, clôture au check-out).
- **Page Bateaux** déduplique par `boat.id` (filet de sécurité visuel).

## Dysfonctionnement résiduel détecté
Il reste **5 enregistrements `boat_sharing` « actifs »** créés avant le correctif (TOPAZE, MORGANITE, HARENG, RUBIS, TANZANITE), dont la `sharing_end_date` est dépassée. Les bateaux concernés sont eux-mêmes corrects (TOPAZE est bien `available` sur Base Martinique). Ces lignes ne génèrent plus de doublon visuel grâce à la déduplication, mais elles polluent les requêtes "partages actifs" et peuvent troubler les rapports.

## Action proposée
**Migration unique** (1 instruction SQL, aucun changement de code) :
```sql
UPDATE public.boat_sharing
   SET status = 'ended', updated_at = now()
 WHERE status = 'active'
   AND sharing_end_date < now();
```
- Marque tous les partages échus comme `ended`.
- N'affecte aucun bateau, aucun formulaire, aucune location.
- Zéro risque de régression : la fonctionnalité ONE WAY moderne ne crée plus de nouveaux `boat_sharing` ; ces lignes sont des résidus historiques.

## Conclusion
Le flux ONE WAY (check-in base A → check-out base B) est **fonctionnel et protégé** contre les doublons. Après le nettoyage ci-dessus, le système est complètement assaini.
