# Historique des statuts, pièces jointes et notifications sur les demandes d'approvisionnement

## Ce qui va être ajouté

Dans la fenêtre de détail d'une demande d'approvisionnement, l'affichage devient organisé en onglets :

1. **Détails** — le contenu actuel (article, quantité, urgence, prix, suivi colis, photo).
2. **Commentaires** — la discussion existante, enrichie des pièces jointes.
3. **Historique** (nouveau) — la liste chronologique des changements de statut, avec pour chaque ligne : ancien statut → nouveau statut, le nom de la personne qui a fait le changement, la date et l'heure, et le commentaire éventuel associé.

### Pièces jointes dans les commentaires

Chaque commentaire pourra recevoir un ou plusieurs fichiers : photo (prise directe depuis mobile ou depuis la galerie) ou document (PDF, Word, Excel). Les images s'affichent en miniature cliquable, les documents sous forme de lien à télécharger. Les fichiers sont stockés dans le bucket existant `purchase-requests`.

### Notification à chaque nouveau commentaire

Dès qu'un commentaire est ajouté sur une demande, une notification est créée pour les personnes concernées, sauf l'auteur du commentaire :
- la personne qui a créé la demande,
- le chef de base de la base concernée,
- les profils direction.

La notification apparaît dans la cloche de notifications et dans la page Notifications ; un clic ouvre la demande concernée. Les notifications push existantes sont réutilisées telles quelles (le déclencheur push actuel sur la table `notifications` s'applique automatiquement).

## Détails techniques

**Base de données (une migration)**
- Nouvelle table `public.supply_request_status_history` : `supply_request_id`, `old_status`, `new_status`, `changed_by`, `changed_by_name`, `comment`, `created_at`. GRANTs (`authenticated`, `service_role`), RLS activée, lecture autorisée aux utilisateurs pouvant déjà lire la demande liée, insertion via trigger.
- Trigger `AFTER UPDATE OF status ON supply_requests` : enregistre automatiquement chaque changement de statut, avec le nom récupéré depuis `profiles` via `auth.uid()`. Un trigger `AFTER INSERT` enregistre la création initiale.
- Colonne `attachments jsonb default '[]'` ajoutée à `supply_request_comments` (liste de `{url, name, type, size}`).
- Trigger `AFTER INSERT ON supply_request_comments` : crée les lignes dans `notifications` (type `supply_request_comment`, données `{supply_request_id, request_number}`) pour le demandeur, le chef de base de la base et les profils direction, en excluant l'auteur.
- Politiques RLS sur `storage.objects` pour le préfixe `supply-request-comments/` du bucket `purchase-requests` (lecture publique déjà en place, écriture pour utilisateurs authentifiés).

**Front-end**
- `src/components/supply/SupplyRequestDetailsDialog.tsx` : passage en `Tabs` (Détails / Commentaires / Historique).
- Nouveau `src/components/supply/SupplyRequestStatusHistory.tsx` + hook `useSupplyRequestStatusHistory` dans `src/hooks/useSupplyRequestComments.ts` (ou un nouveau hook dédié) pour lire l'historique.
- `src/hooks/useSupplyRequestComments.ts` : gestion de `attachments` à l'ajout de commentaire ; upload dans `purchase-requests/supply-request-comments/<requestId>/<uuid>-<nom>`.
- `src/components/supply/SupplyRequestCommentsSection.tsx` : bouton d'ajout de fichiers (réutilisation du composant `PhotoCapture` existant pour les photos + input fichier pour les documents), aperçu avant envoi, affichage des pièces jointes des commentaires existants.
- Le badge de notifications existant (`useNotifications`) prend en charge le nouveau type sans changement de logique ; ajout de l'icône/libellé du type et de la navigation vers `/supply-requests`.

Aucune fonctionnalité existante n'est retirée.
