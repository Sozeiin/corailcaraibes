# Allonger les sessions et protéger les saisies

## Objectif
Éviter que l'application déconnecte trop tôt l'utilisateur et qu'elle rafraîchisse les données pendant une saisie, ce qui fait perdre le travail non enregistré.

## Changements prévus

### 1. Allonger le temps d'inactivité à 8 heures
Dans `src/contexts/AuthContext.tsx` (timer d'inactivité) :
- Faire passer le délai de déconnexion automatique de **2 heures à 8 heures**.
- Garder l'avertissement 5 minutes avant la déconnexion.

### 2. Protéger les saisies des refresh automatiques
Aujourd'hui l'app rafraîchit les données dans 3 situations : changement de page, retour sur l'onglet/fenêtre, et toutes les 60 secondes. Le refresh périodique respecte déjà les formulaires ouverts, mais le composant `NavigationRefresh` rafraîchit systématiquement.

- Dans `src/hooks/useAutoRefresh.ts` : conserver la logique existante (déjà protégée par `hasOpenForms`).
- Dans `src/components/NavigationRefresh.tsx` : suspendre le refresh complet quand un formulaire/dialogue est ouvert (utiliser `hasOpenForms` du `FormStateContext`), pour ne pas écraser une saisie en cours lors d'un changement d'écran involontaire.

### 3. Vérification
- Confirmer qu'aucune autre source ne force un rechargement complet de page pendant une saisie.
- Vérifier le bon fonctionnement : le timer reste en pause quand un formulaire est ouvert, et la déconnexion n'arrive qu'après 8h d'inactivité réelle.

## Détails techniques
- `AuthContext.tsx` : `timeout: 8 * 60 * 60 * 1000`.
- `NavigationRefresh.tsx` : early-return si `hasOpenForms` est vrai.
- Le mécanisme de pause existant via `FormStateProvider` (qui enveloppe `AuthProvider`) reste la garantie principale contre la perte de données.

## Hors périmètre
- Pas de modification du Service Worker ni de la configuration du token Supabase.
- Pas de changement de la déconnexion manuelle.
