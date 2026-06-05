Objectif : permettre au profil direction et aux chefs de base de télécharger un PDF imprimable contenant tous les produits de la base sélectionnée, directement depuis le dialogue Inventaire de la page Stock.

Plan d’implémentation :

1. Revenir à une mécanique simple et fiable
- Supprimer le système intermédiaire “PDF prêt / ouvrir / imprimer” qui ajoute trop de points de blocage.
- Garder une seule action principale : “Télécharger PDF”.
- Le clic génère immédiatement le fichier et lance directement `jsPDF.save(...)`, comme les autres exports PDF déjà présents dans l’application.

2. Générer le PDF à partir des produits visibles pour la base sélectionnée
- Utiliser `baseItems`, qui correspond déjà exactement aux produits de la base choisie dans le dialogue Inventaire.
- Pour direction : la base vient du sélecteur dans le dialogue.
- Pour chef de base : la base reste verrouillée sur sa base.
- Ne pas modifier la validation d’inventaire ni les champs de comptage.

3. Corriger l’utilitaire PDF
- Créer une fonction dédiée et explicite du type `downloadInventoryPDFForBase(baseName, items)`.
- Elle génère un PDF paysage avec colonnes : catégorie, nom, référence, marque, quantité, seuil min, unité, emplacement.
- Elle appelle directement `doc.save(filename)` dans le même clic utilisateur.
- Garder le tri par catégorie puis nom.

4. Simplifier l’UI
- Remplacer les 3 boutons actuels par un seul bouton stable : “Télécharger PDF”.
- Le bouton sera désactivé uniquement si aucune base n’est sélectionnée ou si la base n’a aucun article.
- Le message toast indiquera clairement le nombre d’articles exportés.

5. Préserver les fonctionnalités existantes
- Ne pas toucher aux imports Excel, à l’ajout d’articles, aux filtres stock, ni à la validation d’inventaire.
- Ne pas changer les règles Supabase/RLS.
- Ne pas ajouter de nouvelle dépendance.

6. Vérification
- Vérifier le lint TypeScript sur les fichiers modifiés.
- Vérifier que l’ancienne logique cassée (`generatedPDF`, blob URL stockée, boutons ouvrir/imprimer) a bien disparu.
- Si la preview demande une connexion, te demander de te reconnecter avant un test navigateur réel.