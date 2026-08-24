# 🤖 FHUB CORE BOT

Bot Discord officiel de **FHUB** pour gérer les tickets de support, les ventes de licences **Opsec PRO**, l'attribution automatique des rôles et le règlement.

---

## 🚀 Fonctionnalités Clés

1. **🎫 Système de Tickets Avancé** :
   * Création automatique de salon privé (`#opsec-pseudo` ou `#support-pseudo`).
   * Permissions isolées (seul le créateur et le staff peuvent voir).
   * Bouton de fermeture avec suppression automatique et logs.
2. **💳 Gestion des Licences Opsec PRO** :
   * Commandes `/opsec` (présentation, bouton PayPal 5€).
   * `/license list` (stock de clés Lifetime disponibles dans Firebase).
   * `/license give @membre` (envoie la clé en MP privé + rôle Client).
   * `/license check <cle>` et `/license reset <cle>`.
3. **📜 Règlement & Attribution de Rôles** :
   * Déploiement de l'embed de règlement avec bouton "✅ Accepter le règlement".
   * Attribution immédiate du rôle Membre.

---

## ⚙️ Configuration (.env)

Créez un fichier `.env` à la racine de `fhub-bot/` avec :

```env
DISCORD_TOKEN=votre_token_ici
CLIENT_ID=votre_client_id_ici
GUILD_ID=1341071221160378368
MEMBER_ROLE_ID=id_du_role_membre
CUSTOMER_ROLE_ID=id_du_role_client
STAFF_ROLE_ID=id_du_role_staff
TICKET_CATEGORY_ID=id_de_la_categorie_tickets
LOGS_CHANNEL_ID=id_du_salon_logs
```

---

## 📦 Déploiement sur Bot-Hosting.net

1. Allez sur **[https://bot-hosting.net/a](https://bot-hosting.net/a)**.
2. Créez un serveur Node.js (gratuit).
3. Dans **Files / Fichiers**, uploadez le dossier `fhub-bot` (ou compressez-le en `.zip` et décompressez-le sur le panel).
4. Remplissez vos variables d'environnement dans le fichier `.env`.
5. Cliquez sur **Start** dans la console !
