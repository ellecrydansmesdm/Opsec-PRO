# 🛰️ OPSEC PRO — PROJECT CONTEXT & AGENT ONBOARDING GUIDE

> **Documentation de référence technique pour agents IA et développeurs.**  
> Ce document synthétise l'architecture complète, les choix de conception, les flux de données, les mécanismes de sécurité, l'historique des bugs critiques et les instructions opérationnelles du projet **Opsec PRO**.

---

## 1. 🎯 Objectif du Projet

**Opsec PRO** est une suite logicielle desktop avancée conçue pour Windows, fournissant des outils professionnels d'automatisation, de protection de compte, de gestion multi-identités et de surveillance pour Discord.

### Capacités Clés :
* **Multi-Accounts & Token Vault** : Gestionnaire multi-comptes avec chiffrement matériel DPAPI (`safeStorage`), rotation automatique (bio, statut, activité, RPC Rich Presence, clan tags, badges HypeSquad) et validation concurrente de tokens.
* **Moteur de Protection Active (Sentinel & Anti-Raid)** : Surveillance de groupes, auto-modération, détection de nukes, auto-report de floods d'insultes et verrouillage de sécurité.
* **Automatisation & Ferme de Messages/Voix** : Vocal Hopper 24/7 avec jitter, Message Farmer paramétrable, auto-responder contextuel (DM / AFK / règles regex), voteur de réactions et leaveur de masse propre.
* **In-Chat Command Dispatcher** : Moteur de commande Discord en discussion réelle sans traces (POSIX argument tokenizer, suppression instantanée, auto-évaluation de calculs `.calc`, macros).
* **Pomelo Sniper & Vanity URL Sniper** : Surveillance et réclamation à haute fréquence de pseudonymes uniques et URLs de serveurs personnalisées.
* **Server Backup & Cloner Suite** : Sauvegarde JSON complète de l'architecture d'un serveur (rôles, permissions, salons, catégories, emojis) et clonage automatisé vers un serveur cible avec gestion du rate-limit.
* **Voice Channel 24/7 Audio Streamer** : Streaming audio continu vers un salon vocal Discord avec reconnexion exponentielle résiliente.
* **Système de Licence Matérielle (HWID + Firebase RTDB)** : Protection contre le piratage par liaison d'empreinte matérielle unique.

---

## 2. 🏛️ Architecture Globale & Flux de Données

```
+-------------------------------------------------------------------------------+
|                             RENDERER PROCESS (React 19)                       |
|  [App.tsx] -> [Zustand Stores] -> [Pages / Tabs] -> [Audio / UI Components]  |
+---------------------------------------+---------------------------------------+
                                        | window.electronAPI (Typed IPC Bridge)
+---------------------------------------v---------------------------------------+
|                             PRELOAD SCRIPT (preload.ts)                       |
|  contextBridge.exposeInMainWorld('electronAPI', { ...ipcRenderer calls... })  |
+---------------------------------------+---------------------------------------+
                                        | ipcRenderer.invoke() / send()
+---------------------------------------v---------------------------------------+
|                               MAIN PROCESS (Electron)                         |
|  [main-loader.js] -> [main.jsc (V8 Bytecode)] -> [handlers.ts]                |
|                                                                               |
|  +---------------------+  +----------------------+  +----------------------+  |
|  |    BotService       |  |    AccountManager    |  |     PolicyEngine     |  |
|  | (discord.js-selfbot)|  |   (Safe DPAPI Vault) |  | (Rate-limit Sliding) |  |
|  +----------+----------+  +----------+-----------+  +----------+-----------+  |
|             |                        |                         |              |
|  +----------v----------+  +----------v-----------+  +----------v-----------+  |
|  |     AppEventBus     |  |   MacroService       |  |  InChatDispatcher    |  |
|  | (AuditLogger Ring)  |  |  (State Snapshots)   |  |   (POSIX Tokenizer)  |  |
|  +----------+----------+  +----------+-----------+  +----------+-----------+  |
|             |                        |                         |              |
|  +----------v----------+  +----------v-----------+  +----------v-----------+  |
|  |   KeyAuthClient     |  |   Settings Manager   |  |    UpdateChecker     |  |
|  | (Firebase RTDB HWID)|  | (Atomic Disk Queue)  |  | (SHA-256 + SemVer)   |  |
|  +---------------------+  +----------------------+  +----------------------+  |
+-------------------------------------------------------------------------------+
```

### 2.1. Electron Main Process (`electron/`)
* **`electron/main.ts`** : Point d'entrée de l'application. Initialise les single instance locks, sandbox de sécurité, protocoles personnalisés (`local-resource://`, `opsec://`), interdiction stricte de l'inspection/DevTools (`Ctrl+Shift+I/J/C`, `F12`), et lance la validation de tokens au démarrage via `validateTokensOnStartup()`.
* **`electron/ipc/handlers.ts`** : Hub centralisant tous les canaux `ipcMain.handle` et `ipcMain.on`. Gère le garde de sécurité de licence (`checkLicenseGuard`), les opérations de connexion, les requêtes de configuration et l'orchestration des modules.
* **`electron/utils/settings.ts`** : Gestionnaire atomique de `opsec_config.json` situé dans `%APPDATA%\opsec-pro`. Implémente une file d'attente d'écriture sérialisée (`pendingSettingsQueue`), un cache mémoire instantané (`cachedSettings`) et le chiffrement transparent des tokens Discord via DPAPI Windows (`safeStorage`).
* **`electron/utils/keyauth.ts`** & **`electron/utils/hwid.ts`** : Vérification de la licence logicielle auprès de la base Firebase Realtime Database. Lie la clé à l'empreinte matérielle du PC (MachineGuid Registry / CIM UUID).

### 2.2. Preload & Sécurité Contextuelle (`electron/preload.ts`)
* **Zero Node Integration** : `nodeIntegration: false`, `contextIsolation: true`.
* **Exposition Typée** : L'objet `window.electronAPI` expose uniquement les méthodes IPC explicitement déclarées et validées, empêchant l'accès direct aux primitives Node.js depuis le renderer.

### 2.3. Renderer UI (`src/`)
* **React 19 + TypeScript + Vite 8** : Interface utilisateur cybernétique ultra-réactive.
* **Zustand State Stores** :
  * `src/store/useSettingsStore.ts` : Paramètres globaux, configurations des modules et persistance miroir vers Electron.
  * `src/store/useUserStore.ts` : Profil Discord actif, état d'authentification et basculement de compte.
  * `src/store/useLogsStore.ts` : Journalisation d'audit en direct filtrable (Info, Audit, Critique).
* **Design System Cyberpunk & Ergonomie** :
  * Thème sombre avec glassmorphism (`backdrop-filter`), jauges d'activité, halos lumineux ("neon glow"), typographie moderne.
  * **Architecture des Hubs & Onglets (5 Catégories Spécialisées)** :
    * 📊 **Overview** : Dashboard de profil, télémétrie, statistiques temps réel, toggles rapides.
    * ⚔️ **Raid & Combat Hub** : `Last Word (Cardio Duel)`, `Spam System (Spam Pro)`, `Mass DM (Broadcast)`, `Mass Purge & Nuker`, `Server Cloner 1:1`.
    * ⚡ **Engine Hub** : `Guardian & Sentinel`, `Auto-Responder`, `In-Chat Dispatcher`, `Macros & Scénarios`, `Auto-Farming`, `Voice Streamer`.
    * 🧰 **Tools Hub** : `Pomelo Sniper (2L/3L/4L)`, `Vanity URL Claimer Pro (0ms Gateway & Multi-Targets)`, `Account Sanitizer`, `Badges & HypeSquad (Stealth Profile)`, `Spotify Sync Pro`, `Groups & Network`.
    * 🌐 **Network Hub** : `Configuration & Diagnostics JA4`, `Solveurs Captcha (Capsolver, CapMonster...)`, `Proxy Pool`, `Auto-Joiner Multi-Tokens`.
    * 💻 **Logs** & ⚙️ **Settings** : Console d'audit en direct et personnalisation de thème.
  * **Interdiction stricte des emojis kitsch / slop IA** : Utilisation exclusive des icônes vectorielles `lucide-react` stylisées avec glow CSS.
  * Effets audio cybernétiques synchronisés via `AudioService` (Web Audio API synthétisée).
  * Système de visite guidée au premier lancement (`OnboardingModal.tsx`) et palette de commandes rapides (`CommandPalette.tsx` via `Ctrl+K`).

---

## 3. 🧩 Modules & Services Détaillés

| Chemin du Fichier | Service / Contrôleur | Rôle & Responsabilité |
| :--- | :--- | :--- |
| [`electron/bot/bot-service.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/bot/bot-service.ts) | `BotService` | Cœur Discord via `discord.js-selfbot-v13`. Gère le client, les événements Gateway, les ratelimits et délègue aux sous-services. |
| [`electron/bot/account-manager.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/bot/account-manager.ts) | `AccountManager` | Gestionnaire multi-comptes : déduplication par User ID Snowflake, sélection atomique et persistance chiffrée. |
| [`electron/bot/inchat-dispatcher.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/bot/inchat-dispatcher.ts) | `InChatDispatcher` | Analyseur de commandes in-chat avec tokeniseur POSIX (gestion des guillemets), exécution furtive et évaluateur mathématique `.calc`. |
| [`electron/bot/guild-cloner.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/bot/guild-cloner.ts) | `GuildCloner` | Backup complet d'un serveur Discord en JSON et reconstruction automatisée des rôles, permissions et canaux. |
| [`electron/bot/voice-streamer.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/bot/voice-streamer.ts) | `VoiceStreamer` | Reconnexion vocale continue 24/7 avec calcul de backoff exponentiel mathématiquement borné. |
| [`electron/services/event-bus.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/event-bus.ts) | `AppEventBus` & `AuditLogger` | Bus d'événements découplé et journal d'audit à 3 niveaux (Info, Audit, Critique) avec ring-buffer capé à 500 entrées. |
| [`electron/services/policy-engine.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/policy-engine.ts) | `PolicyEngine` | Moteur de rate-limit adaptatif à fenêtre glissante avec budgets d'actions et isolation stricte multi-comptes. |
| [`electron/services/macro-service.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/macro-service.ts) | `MacroService` | Enregistrement, exécution et restauration automatique d'instantanés de profils Discord (statuts, activités, bios). |
| [`electron/services/task-scheduler.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/task-scheduler.ts) | `TaskScheduler` | Planificateur de tâches périodiques (cron) pour exécuter des scénarios et messages programmés. |
| [`electron/services/stealth-service.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/stealth-service.ts) | `StealthService` | Extraction dynamique du build number Discord, rotation de User-Agents et masquage d'empreinte proxy. |
| [`electron/services/update-checker.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/services/update-checker.ts) | `UpdateChecker` | Comparateur SemVer natif zéro-dépendance et vérification cryptographique d'intégrité SHA-256 des assets distants. |
| [`electron/utils/token-vault-parser.ts`](file:///c:/Users/dell/Desktop/Opsec%20PRO/electron/utils/token-vault-parser.ts) | `TokenVaultParser` | Analyseur universel de tokens : extraction Snowflake base64, formats composites (`email:pass:token:proxy`) et suppression `Bearer`. |

---

## 4. 🔒 Système de Sécurité & Protection du Code

Le projet intègre une chaîne de compilation défensive à plusieurs couches pour empêcher toute rétro-ingénierie et protéger la propriété intellectuelle :

1. **Compilation Bytecode V8 (`bytenode`)** :
   * Le code source du Main Process (`dist-electron/main.js`) est compilé en binaire machine V8 (`main.jsc`).
   * Les fichiers `.js` d'origine sont **systématiquement supprimés** de l'archive distribuée (`dist-electron/main.js` est purgé, seul `main-loader.js` qui charge le bytecode est inclus).
2. **Obfuscation du Renderer (`javascript-obfuscator`)** :
   * Le bundle React/Vite généré dans `dist/assets/*.js` est obfusqué avec mélange de chaînes de caractères, encodage Unicode, mangling de variables et aplatissement du flux de contrôle.
3. **Verrouillage de l'Environnement Runtime** :
   * Désactivation complète des DevTools dans les fenêtres Electron.
   * Interception matérielle des raccourcis de débogage (`Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`, `F12`).
4. **Dépôt Git Déployé Isolé (`release/git-deploy`)** :
   * Les releases publiques sont hébergées sur un dépôt dédié géré avec Git LFS sans jamais exposer l'historique du code source complet.

---

## 5. 🛠️ Commandes Opérationnelles (Build, Test, Release)

Toutes les commandes sont orchestrées depuis la racine du projet sous Windows PowerShell :

### 5.1. Développement Local
```powershell
# Lancer l'interface Vite seule (HMR)
npm run dev

# Compiler et lancer l'application Electron complète en mode développement
npm run dev:app
```

### 5.2. Harnais de Vérification & Tests Runtime
```powershell
# Exécuter les 41 tests automatisés (AuditLogger, PolicyEngine, Macros, Tokenizer, Updater, TokenVault)
npm test
```

### 5.3. Build & Packaging de Production
```powershell
# Chaîne complète : Build TypeScript -> Build Vite -> Obfuscation -> Bytecode V8 -> NSIS Installer
npm run dist
```
L'exécutable final est généré dans `release/Opsec PRO Setup RELEASE.exe` (~111 Mo).

### 5.4. Déploiement Automatique vers GitHub Releases
Le script `scripts/publish-github-release.js` permet d'uploader directement l'exécutable et `latest.yml` sur les releases GitHub :
```powershell
node scripts/publish-github-release.js
```

### 5.5. Gestionnaire de Clés de Licence (PayPal 5€ Lifetime)
Le script `scripts/manage-keys.js` permet de gérer directement les clés dans la base de données Firebase :
```powershell
# Lister les clés Lifetime disponibles prêtes à la vente
node scripts/manage-keys.js list

# Générer de nouvelles clés Lifetime dans Firebase
node scripts/manage-keys.js generate 10

# Réinitialiser le HWID d'une clé client (changement de PC)
node scripts/manage-keys.js reset OPSEC-XXXX-XXXX-XXXX
```

---

## 6. 📜 Historique des Bugs Critiques & Causes Racines

| Bug Identifié | Symptôme | Cause Racine | Correctif Appliqué |
| :--- | :--- | :--- | :--- |
| **Crash Module `semver`** | `Cannot find module 'semver'` au lancement de l'ASAR | L'importation de `semver` externe échouait lors de la lecture dans `app.asar`. | Implémentation d'une fonction `compareSemver()` 100% native dans `update-checker.ts` sans aucune dépendance externe. |
| **Blocage Licence au Login** | « *Accès refusé : Licence Opsec PRO requise* » après activation réussie | Dans `electron/preload.ts`, `checkAuth: () => ipcRenderer.invoke('check-auth')` n'acceptait aucun paramètre et ne transmettait pas `{ licenseKey }` au backend. | Correction de la signature dans `preload.ts` : `checkAuth: (data) => ipcRenderer.invoke('check-auth', data)`. |
| **Perte de Clé sur Partial Settings** | Clé de licence invalidée lors de la modification d'un toggle d'UI | `saveSettings` fusionnait les objets partiels et pouvait écraser `licenseValidated: true` avec `false`. | Verrouillage strict dans `settings.ts` et création de `sessionLicenseValidated` en mémoire vive. |
| **Verrouillage Fichier sur Re-pack** | Crash EBUSY / EPERM lors du repackage de l'ASAR | Le script hook `afterPack.js` tentait d'ouvrir des descripteurs de fichiers non fermés par Windows. | Suppression du hook `afterPack` inutile dans `package.json`. |
| **HWID Invalide sur Win11 24H2** | Échec d'activation de licence sur certaines builds Windows récentes | Dépendance obsolète à `wmic` qui a été déprécié par Microsoft. | Utilisation prioritaire de `reg query MachineGuid` via la clé de registre Windows officielle (`HKLM\SOFTWARE\Microsoft\Cryptography`). |

---

## 7. 🚨 Règles & Conventions Strictes pour Agents IA

1. **Aucun Secret en Clair** : Ne jamais écrire de jetons Discord, de mots de passe, de cookies ou de clés API privées dans le code source ou dans les commits Git.
2. **Pas d'Emojis Kitsch / Slop IA dans l'Interface** :
   * Utiliser impérativement les icônes de la librairie `lucide-react`.
   * Appliquer les classes et styles cybernétiques (`glowing`, `neon`, `nighty-toggle`, `card-glow`).
3. **Intégrité de `settings.ts` & du Vault** :
   * Ne jamais appeler `fs.writeFileSync` directement sur `opsec_config.json`.
   * Toujours passer par `saveSettings()` et `getSettings()` pour garantir l'atomicité, le chiffrement DPAPI et la protection de la licence.
4. **Stabilité IPC & Preload** :
   * Toute modification de signature dans `electron/ipc/handlers.ts` **doit être synchronisée à l'identique** dans `electron/preload.ts` et `src/types/electron.d.ts`.
5. **Vérification Obligatoire avant Release** :
   * Exécuter systématiquement `node scripts/run-runtime-verification.js` avant tout build de production pour s'assurer que les 41 tests passent avec un taux de réussite de 100%.

---

## 8. 🗺️ État Actuel & Feuille de Route

* **Version Actuelle** : `v2.0.2` (Binaire officiel standalone testé et déployé sur GitHub Releases).
* **Stabilité** : 41/41 tests unitaires et d'injection de pannes au vert.
* **Prochaines Évolutions Prévues** :
  * Support de proxys dynamiques rotatifs par compte Discord individuel.
  * Extension du Vanity Sniper avec détection temps réel de salons textuels d'annonces.
  * Module de transcription vocale automatique pour les salons surveillés par le Sentinel.
