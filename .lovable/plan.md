Constat après audit en lecture seule

- Il n’y a pas plusieurs bateaux TOPAZE dans la table `boats` : le bateau d’origine à conserver est `TOPAZE / FR-CATBG151J324`, id `66331047-1aa5-424d-8e12-ddf4f97d4c11`, actuellement en Base Guadeloupe.
- Les “doublons” visibles viennent surtout de `boat_sharing` : TOPAZE a 3 partages ONE WAY encore marqués `active`, dont certains anciens ou contradictoires.
- Le transfert ONE WAY actuel existe côté RPC (`handle_one_way_checkin_transfer`) mais il n’est pas assez idempotent : plusieurs finalisations/reprises peuvent créer plusieurs logs de transfert et laisser plusieurs partages actifs.
- La page Bateaux combine les bateaux de la base + les bateaux partagés sans dédupliquer correctement par `boat.id`, donc un même bateau peut apparaître plusieurs fois.

Plan de correction

1. Nettoyage sécurisé des données TOPAZE
   - Ne pas supprimer la ligne originale dans `boats`.
   - Passer en `ended` les anciens enregistrements `boat_sharing` actifs de TOPAZE qui ne correspondent plus à l’état courant.
   - Conserver l’historique `boat_base_transfers` pour audit, sauf si on décide explicitement de masquer/nettoyer les doublons historiques dans une étape séparée.
   - Vérifier après migration que TOPAZE n’apparaît plus qu’une seule fois dans la page Bateaux.

2. Corriger la cause long terme côté base de données
   - Remplacer/renforcer `handle_one_way_checkin_transfer` pour qu’elle soit idempotente :
     - vérifier que le bateau existe ;
     - refuser un transfert vers la même base ;
     - transférer `boats.base_id` vers la destination et garder `status = rented` ;
     - clôturer les anciens partages actifs du bateau ;
     - créer ou mettre à jour un seul partage actif pour le ONE WAY concerné ;
     - éviter d’insérer plusieurs lignes identiques dans `boat_base_transfers` si le transfert a déjà été enregistré récemment pour le même bateau/formulaire/contexte.
   - Ajouter un index unique partiel sur `boat_sharing` pour empêcher plusieurs partages `active` simultanés pour un même bateau.
   - Corriger/recréer le trigger `activate_one_way_sharing` si nécessaire pour qu’il ne recrée pas de partages multiples à la création/modification d’une fiche.

3. Corriger l’affichage Bateaux
   - Dédupliquer la liste finale par `boat.id` après combinaison `ownedBoats + sharedBoats`.
   - Prioriser la ligne “owned/current base” si le bateau est déjà dans la base de l’utilisateur, afin qu’il ne soit pas affiché comme doublon partagé.
   - Utiliser une clé React unique stable qui ne provoque plus de rendu multiple pour le même bateau.

4. Sécuriser le flux check-in / check-out ONE WAY
   - Centraliser l’appel au transfert ONE WAY pour éviter les doubles appels entre les anciens parcours (`TechnicianCheckinInterface`) et le parcours `/checkin-process`.
   - Après finalisation du check-in, invalider/rafraîchir les requêtes concernées pour que le technicien voie immédiatement le bateau dans la bonne base.
   - Au check-out, clôturer le partage ONE WAY actif lié à la fiche/rental, puis rendre le bateau disponible dans sa base actuelle.

5. Tests de non-régression
   - Tester en base de données :
     - TOPAZE n’a qu’une seule ligne dans `boats` ;
     - TOPAZE n’a plus qu’un partage actif maximum ;
     - un deuxième appel au RPC ONE WAY ne crée pas de nouveau doublon.
   - Tester côté interface :
     - la page Bateaux n’affiche TOPAZE qu’une seule fois ;
     - un check-in ONE WAY transfère bien le bateau vers la base destination ;
     - un check-out ONE WAY reste possible depuis la base destination ;
     - les check-in/check-out non ONE WAY restent inchangés.

Ce qui ne sera pas fait sans validation explicite

- Suppression physique du bateau TOPAZE d’origine.
- Suppression massive de l’historique de transferts ou de checklists, car cela casserait la traçabilité.