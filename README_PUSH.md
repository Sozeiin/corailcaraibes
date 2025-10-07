# Web Push Notifications - Fleet Manager

Ce document explique le système de notifications Web Push intégré dans Fleet Manager.

## 🎯 Fonctionnalités

- **Notifications temps réel** : Recevez des alertes même quand l'app est fermée
- **Multi-plateforme** : Support Android, Windows, macOS, iOS/iPadOS (≥16.4)
- **PWA compatible** : Fonctionne en mode standalone et navigateur
- **Sécurisé** : Chiffrement VAPID, tokens d'administration
- **Garbage collection** : Nettoyage automatique des abonnements invalides

## 📋 Prérequis

### Variables d'environnement

Créez les secrets suivants dans Supabase (Dashboard → Settings → Edge Functions → Secrets):

```bash
VAPID_PUBLIC_KEY=votre_clé_publique_vapid
VAPID_PRIVATE_KEY=votre_clé_privée_vapid
VAPID_MAILTO=mailto:votre-email@domaine.com
PUSH_ADMIN_TOKEN=un_token_secret_fort
```

### Générer les clés VAPID

```bash
node scripts/generate-vapid.js
```

Copiez les clés générées dans les secrets Supabase.

## 🚀 Installation

### 1. Déploiement backend

Les edge functions Supabase sont automatiquement déployées :
- `subscribe-push` : Enregistrer un abonnement
- `unsubscribe-push` : Désactiver un abonnement
- `send-web-push` : Envoyer des notifications ciblées
- `test-push` : Envoyer une notification de test

### 2. Configuration client

La clé publique VAPID est dans `src/services/webPush.ts` :

```typescript
const VAPID_PUBLIC_KEY = 'votre_clé_publique_base64url';
```

### 3. Service Worker

Le fichier `public/sw.js` gère les notifications push. Il est automatiquement enregistré au chargement de l'app.

## 📱 Utilisation

### Côté utilisateur

1. **Activer les notifications** :
   - Aller dans Paramètres → Profil
   - Cliquer sur "Activer les notifications"
   - Autoriser dans le navigateur

2. **iOS/iPadOS** :
   - Ajouter l'app à l'écran d'accueil (bouton Partager → "Sur l'écran d'accueil")
   - Ouvrir l'app depuis l'écran d'accueil (mode standalone)
   - Activer les notifications dans Paramètres

3. **Désactiver** :
   - Paramètres → Profil → "Désactiver les notifications"

### Administration

Accès : `/admin` → onglet "Push Notifications"

Authentification : Saisir le `PUSH_ADMIN_TOKEN`

**Actions disponibles :**

1. **Test notification** :
   - Saisir un User ID
   - Envoyer une notification de test

2. **Notification groupée** :
   - Titre (requis)
   - Message (optionnel)
   - URL de destination (optionnel)
   - Cibles : Liste de User IDs (CSV) OU Base ID

3. **Liste des abonnements** :
   - Voir tous les abonnements actifs
   - Utilisateur, base, plateforme, endpoint, statut

## 🔧 API Backend

### Subscribe to Push

```typescript
POST /functions/v1/subscribe-push
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "subscription": {
    "endpoint": "https://...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "platform": "web",
  "userAgent": "Mozilla/5.0..."
}
```

### Unsubscribe

```typescript
POST /functions/v1/unsubscribe-push
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "endpoint": "https://..."
}
```

### Send Web Push (Admin)

```typescript
POST /functions/v1/send-web-push
x-admin-token: <PUSH_ADMIN_TOKEN>
Content-Type: application/json

{
  "userIds": ["uuid1", "uuid2"],  // OU baseId
  "baseId": "uuid-base",           // OU userIds
  "title": "Nouvelle intervention",
  "body": "Une intervention urgente vous a été assignée",
  "url": "/interventions/123"
}
```

### Test Push (Admin)

```typescript
POST /functions/v1/test-push
x-admin-token: <PUSH_ADMIN_TOKEN>
Content-Type: application/json

{
  "userId": "uuid"
}
```

## 📊 Base de données

### Table `push_subscriptions`

```sql
- id: uuid (PK)
- user_id: uuid (FK auth.users)
- tenant_id: uuid (FK tenants)
- base_id: uuid (FK bases)
- endpoint: text (unique)
- p256dh: text
- auth: text
- platform: text
- user_agent: text
- created_at: timestamp
- last_used_at: timestamp
- active: boolean
```

**RLS Policies :**
- Les utilisateurs gèrent leurs propres abonnements
- Direction peut voir tous les abonnements

## 🧪 Tests manuels

### Android (Chrome/Edge)

1. Ouvrir l'app web
2. Activer les notifications
3. Fermer le navigateur
4. Envoyer un test depuis l'admin
5. ✅ Notification apparaît dans le tiroir système
6. Cliquer → ouvre l'app sur la bonne page

### Windows/macOS (Chrome/Edge/Firefox)

1. Ouvrir l'app web
2. Activer les notifications
3. Fermer le navigateur
4. Envoyer un test
5. ✅ Bannière système apparaît
6. Cliquer → ouvre/focus l'onglet

### iOS/iPadOS (Safari ≥16.4)

1. Ajouter l'app à l'écran d'accueil
2. Ouvrir depuis l'écran d'accueil
3. Activer les notifications
4. Fermer l'app
5. Envoyer un test
6. ✅ Notification apparaît
7. Cliquer → ouvre l'app

## 🔒 Sécurité

- ✅ CORS limité au domaine de l'app
- ✅ Token d'administration requis pour l'envoi
- ✅ Validation des inputs (userIds, baseId)
- ✅ RLS sur la table push_subscriptions
- ✅ Chiffrement VAPID
- ✅ Garbage collection des abonnements expirés

## 🐛 Dépannage

### Notifications non reçues

1. Vérifier que l'abonnement est actif dans l'admin
2. Vérifier les logs de la edge function (`send-web-push`)
3. Vérifier les permissions du navigateur
4. Pour iOS : vérifier que l'app est en mode standalone

### iOS - Pas d'option "Activer"

➡️ L'app doit être ajoutée à l'écran d'accueil ET ouverte depuis l'écran d'accueil (mode standalone)

### Abonnement inactif automatiquement

➡️ Normal si :
- L'utilisateur a désinstallé l'app
- Le navigateur a révoqué l'abonnement
- L'endpoint a expiré (410 Gone)

Le système nettoie automatiquement ces abonnements.

### Erreur 401 (Unauthorized) dans l'admin

➡️ Vérifier que le `PUSH_ADMIN_TOKEN` est correct et configuré dans les secrets Supabase

## 📚 Ressources

- [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID](https://datatracker.ietf.org/doc/html/rfc8292)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)

## 🆘 Support

Pour toute question ou problème :
1. Consulter ce README
2. Vérifier les logs Supabase (Edge Functions)
3. Vérifier la console navigateur
4. Vérifier l'onglet "Push" dans l'admin

---

**Fleet Manager** - Notifications Web Push v1.0
