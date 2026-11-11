# Cassandre — handoff

Dernière mise à jour : 10 novembre 2026
Projet : `Repwise-restauration`
Branche locale : `feature/cassandre-whatsapp-agents`

## État en bref

Le travail Cassandre est local. Les deux migrations restent non appliquées. Le projet Supabase de test `ahcdiqmxlblitbbbqxzo` est maintenant disponible, actif mais vierge; aucune configuration Meta de test n'a été utilisée, et rien n'a été déployé ni publié. La branche locale ne contient pas encore de commit : le code restauré apparaît non suivi par Git, tandis que `main` distant ne contient que le README.

## Travail déjà présent

- Orchestration locale des six agents existants, missions, réservation de tâches, reprises, contrôle qualité et synthèse.
- Interface Cassandre ajoutée au tableau de bord coach.
- Fonctions Netlify pour le tableau de bord, les workers, les rapports, la passerelle WhatsApp et les notifications.
- Migrations locales `20261104202211_ai_generation_quota_and_webhook_idempotency_and_coach_premium_cleanup.sql` et `20261109091437_cassandre_orchestration_whatsapp.sql`, dans cet ordre chronologique. Elles dépendent d'un schéma Repwise/Cassandre préexistant absent du dépôt GitHub.
- Cette intervention ajoute le suivi `last_inbound_at`, bloque les messages texte libres après la fenêtre WhatsApp de 24 heures et n'autorise alors qu'un modèle préapprouvé explicitement configuré en mode test.

## Vérifications exécutées

- Syntaxe `app.js`, `sw.js` et des fonctions `.mts` : réussie.
- Tests : 13 au total, 11 réussis, 2 tests Supabase ignorés faute d'instance locale.
- Tests WhatsApp unitaires : limites de 24 heures, dates invalides/futures et structure du message modèle.
- Supabase en consultation : aucune branche de développement; les deux versions de migration ne figurent pas dans l'historique de migrations de production.
- Les tables de `cassandre_private` inspectées ont RLS activé et des droits accordés à `service_role`, sans droits `anon`/`authenticated`. L'absence de politiques pour ces tables est cohérente avec ce modèle de droits; elle doit être revérifiée après migration de test.
- L'Advisor signale six tables privées avec RLS sans politique, une table `public.stripe_webhook_events` dans la même situation et onze fonctions `SECURITY DEFINER` accessibles à `authenticated`. Ces fonctions existantes doivent être auditées individuellement; aucune modification n'a été faite en production.

## Blocage de sécurité à traiter

La fonction Supabase de production `cassandre-brain` est active en version 2 et vérifie bien le JWT, mais son code n'exige que le rôle `coach`, pas l'identifiant du fondateur. Elle lit des volumes globaux de Repwise et n'applique pas de plafond d'appels IA. Son rapport date également avec UTC. La fonction n'a pas été modifiée. Préparer une copie corrigée et la tester sur une base isolée avant toute publication.

Le contrôle agrégé effectué en consultation n'a trouvé aucun coach avec un accès offert ou une période Premium future sans abonnement. La migration qui restreint `a_acces_premium()` aux comptes clients n'a pas été appliquée.

## WhatsApp

- Aucune requête Meta n'a été envoyée. Il manque les identifiants d'environnement de test et les noms/langues de modèles approuvés.
- `WHATSAPP_AUTH_TEMPLATE_NAME` et `WHATSAPP_AUTH_TEMPLATE_LANGUAGE` doivent désigner un modèle d'authentification approuvé avec un paramètre de code compatible.
- `WHATSAPP_NOTIFICATION_TEMPLATE_NAME` et `WHATSAPP_NOTIFICATION_TEMPLATE_LANGUAGE` doivent désigner un modèle de notification approuvé avec un paramètre de corps.
- Vérifier réception, signature, numéro fondateur, déduplication, réponse, tâche et notification uniquement dans Meta Test. Les tests unitaires ne prouvent pas que les modèles existent ou sont approuvés.

## Build et navigateur

`node_modules`, `netlify.toml` et `supabase/config.toml` sont absents. Le `package.json` ne définit pas de script de build. Aucun navigateur automatisable n'est disponible. Les réglages de build Netlify n'ont pas pu être lus : le connecteur Netlify ne les expose pas et le CLI échoue sur une permission de ses préférences globales. Aucun réglage global n'a été modifié.

## Vérification ciblée du 10 novembre 2026

- Branche confirmée : `feature/cassandre-whatsapp-agents`. Le dernier commit est `fdb5c71` (`Initial commit`); 19 chemins du projet sont non suivis. Le code Cassandre n'est donc pas encore sauvegardé dans l'historique Git.
- `package.json` contient les dépendances runtime `@anthropic-ai/sdk` et `stripe`, ainsi que `@netlify/functions`; il n'a aucun script de build/test. Les seules migrations du dépôt sont celles datées du 4 et du 9 novembre 2026, dans cet ordre. Elles supposent le schéma Repwise déjà existant, absent du dépôt.
- Lecture Netlify en consultation : le projet `repwise-coaching` est lié et dispose d'un déploiement courant prêt. L'API de projet et le connecteur ne donnent pas les paramètres de build. La tentative CLI `getSite` a échoué (`EPERM` sur le fichier de préférences Netlify); aucune préférence n'a été modifiée.
- La liste des variables propres au site Netlify a été consultée sans lire ni afficher leurs valeurs. Elle contient `STRIPE_SECRET_KEY` et `SUPABASE_SERVICE_ROLE_KEY`. Les autres variables requises par le code (dont URL/clé publique Supabase, configuration propriétaire et worker Cassandre, fournisseur IA, Stripe webhook/prix et WhatsApp de test) ne figurent pas dans cette liste du site; d'éventuelles variables partagées d'équipe n'ont pas été vérifiées. Ne pas démarrer d'appel Meta avant qu'un environnement et des modèles de test aient été fournis.
- Inspection ciblée du worker : les six agents ont des instructions et faits autorisés distincts; le worker collecte des faits agrégés, appelle le modèle, valide le résultat, sauvegarde son état et relance une tâche en cas d'échec. C'est une vérification statique du chemin d'exécution, pas une preuve d'exécution réelle; aucun environnement isolé ni compte coach de test n'est disponible.
- Aucun fichier applicatif n'a été modifié et aucun test n'a été relancé, car il n'y a pas eu de correction de code. Le dernier résultat de tests connu reste 11 réussis, 2 ignorés, 0 échec; les vérifications de syntaxe connues avaient réussi.

## Sécurisation finale ciblée — 10 novembre 2026

- `requireFounder` compare l'identifiant Supabase authentifié au `CASSANDRE_OWNER_USER_ID` serveur et contrôle le rôle coach côté serveur. Les refus pour identité/profil sont maintenant journalisés sans contenu de commande.
- Le webhook Meta vérifie HMAC avant traitement et n'accepte que le numéro lié au propriétaire après vérification. Les autres expéditeurs valides Meta sont refusés et journalisés sans enregistrer leur numéro.
- Les agents restent limités à l'analyse agrégée en lecture seule; les actions financières, suppressions et contacts client n'ont pas de voie d'exécution dans leur worker. Toute nouvelle action sensible devra être bloquée derrière une confirmation renforcée du fondateur dans Repwise.
- Ajout de `netlify/lib/founder-policy.mjs` et `tests/founder-policy.test.mjs` pour tester la règle d'identité exacte.
- Campagne exécutée après correction : tous les tests Node disponibles donnent 12 réussis, 2 ignorés (les tests d'intégration quota nécessitent Supabase), 0 échec. La syntaxe de `cassandre.mts` et `whatsapp-webhook.mts` passe. Aucun build, navigateur, appel Meta ou test Supabase n'a été exécuté.
- Scan ciblé des fichiers frontend : aucune signature courante de clé secrète Stripe, webhook ou clé secrète Supabase détectée. Les valeurs d'environnement n'ont pas été affichées.

## État final et prochaine action

Publication bloquée. Un projet Supabase de test existe mais il est vierge; il manque la configuration Meta de test, le script/réglage de build confirmé et la source locale/versionnée de l'Edge Function `cassandre-brain` actuellement signalée comme insuffisamment restreinte au fondateur. Le compte Netlify expose un déploiement existant prêt, mais cela ne valide pas ce code. Le CLI n'a pas pu lire les paramètres (EPERM sur ses préférences). Les fichiers applicatifs restent non suivis par Git; aucun commit, push, migration, changement de production ou déploiement n'a été effectué.

Prochaine action unique : préparer un schéma fondation Repwise/Cassandre schema-only, avec uniquement des comptes fictifs, pour ce projet Supabase de test vierge. Ne pas appliquer les deux migrations existantes avant d'avoir créé et vérifié leurs prérequis.

## Vérification Supabase de test et Netlify — 10 novembre 2026

- Le projet `ahcdiqmxlblitbbbqxzo` répond avec l'état `ACTIVE_HEALTHY`, PostgreSQL 17.11. L'inventaire en consultation confirme zéro table, zéro migration enregistrée et zéro Edge Function.
- Ordre de migrations : `20261104202211...` puis `20261109091437...`. La première dépend déjà de `public.profils`, `public.programmes`, `public.stripe_webhook_events`, `auth.users` et de l'API Auth. La seconde dépend du schéma privé `cassandre_private` et des tables fondatrices `agents`, `tasks`, `decisions`, `daily_reports`, `audit_log`. Elles échoueront sur le projet vierge. Aucun fichier de schéma fondation Repwise ni code Supabase Edge Function n'est présent dans `supabase/`; `cassandre-brain` est absent.
- Les fichiers définissent le quota atomique, les RPC Stripe idempotentes, le verrouillage des tâches (`FOR UPDATE SKIP LOCKED`), reprises, déduplication par identifiants uniques et révocation des droits navigateur. Constats statiques seulement : RLS, RPC et concurrence ne sont pas validés en base.
- L'audit antérieur indique que l'Edge Function `cassandre-brain` en production vérifie le rôle coach, mais pas l'UID du fondateur; sa source n'est pas versionnée. Ne pas déployer cette fonction avant récupération et correction de sa source, puis test fondateur/coach dans l'environnement isolé.
- Blocage critique de prévisualisation : `app.js` et `netlify/lib/billing.mts` contiennent un fallback vers le projet Supabase de production. Le frontend n'a pas de paramètre de contexte; un Deploy Preview risquerait d'utiliser les données réelles. Retirer ce fallback et fournir explicitement une configuration de test côté navigateur et fonctions avant tout preview. Les clés n'ont pas été reproduites ici.
- `npm run build` échoue avec `Missing script: "build"`. Aucun `netlify.toml` ne fixe la commande ou le dossier publié. Aucune dépendance n'a été installée. Les paramètres de build de production restent illisibles avec les outils disponibles.
- Les tests déjà connus restent 12 réussis, 2 ignorés. Les tests quota d'intégration n'acceptent que `localhost:54321`, pas le projet hébergé. Aucun test n'a été relancé cette intervention.
- Variables à configurer ultérieurement, sans valeurs dans le dépôt : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (valeurs du projet de test); `CASSANDRE_OWNER_USER_ID`, `CASSANDRE_INTERNAL_TOKEN`, `CASSANDRE_WORKER_ENABLED`; limites `CASSANDRE_DAILY_AI_CALL_LIMIT` et `CASSANDRE_DAILY_AI_TOKEN_LIMIT`; une paire fournisseur/modèle IA; variables Meta sandbox listées dans `docs/CASSANDRE_ARCHITECTURE.md`. Les clés service, tokens et clés fournisseurs sont des secrets. Aucune consommation IA/Meta ne doit être lancée sans plafond et autorisation de coût.
- Aucun rollback SQL n'est fourni. La migration du 4 novembre efface des droits Premium offerts à des profils coachs; elle doit être testée uniquement sur des profils fictifs, avec snapshot préalable. Aucun rollback inverse n'est déclaré prêt.

### Validations restantes avant production

1. Préparer et vérifier une migration fondatrice schema-only Repwise/Cassandre et les comptes fictifs du projet test.
2. Supprimer les fallbacks production du frontend et des fonctions; configurer les variables Deploy Preview vers Supabase test.
3. Appliquer le schéma fondation, puis 20261104 et 20261109 uniquement au test; vérifier contraintes, RLS, permissions et RPC.
4. Obtenir la source `cassandre-brain`, limiter l'accès à l'UID fondateur et tester avec un compte fondateur et un autre coach fictif.
5. Activer les tests d'intégration sur l'URL allowlistée du projet test; vérifier quota, workers, reprise, idempotence, audit, six agents et parcours WhatsApp Meta sandbox.
6. Obtenir les réglages Netlify, réussir build et Deploy Preview sans accès à la production, puis réexaminer coûts, secrets et risques avant publication.

## Phase 1 — isolation et fondation Supabase — 10 novembre 2026

### Changements locaux

- Suppression des valeurs Supabase de repli du frontend et de la facturation. `app.js` reçoit maintenant uniquement la configuration publique d'un endpoint Netlify, et affiche un état d'erreur visible si elle manque.
- Ajout d'une règle de cible par contexte Netlify : `production` demande toujours une configuration explicite; `deploy-preview`, `branch-deploy`, `dev` et les contextes absents ne peuvent cibler que le projet de test configuré ou un Supabase local. Le contrôle se fonde sur `CONTEXT`, pas `URL` (qui décrit le déploiement courant, y compris une preview).
- Les fonctions de facturation vérifient la cible avant les appels Supabase. Stripe exige une clé de test hors contexte production. Le webhook, les rapports et les tâches Cassandre vérifient également la cible avant les opérations de données.
- Ajout de la fonction locale `supabase/functions/cassandre-brain/index.ts`, récupérée en consultation depuis la version existante, puis durcie : JWT vérifié par Supabase Auth, UID comparé à `CASSANDRE_OWNER_USER_ID`, rôle coach exigé, refus journalisés sans jeton ni contenu client, identité du corps ignorée et date de rapport Europe/Paris. Les erreurs retournées au client ne contiennent pas les détails internes du fournisseur ou de la base.
- Ajout de la migration `20261103000000_repwise_cassandre_foundation.sql`, à appliquer avant les migrations du 4 et du 9 novembre. Elle prépare un sous-ensemble fondation attesté par le schéma observé : profils, programmes, questionnaires/exercices, bilans, séances, objectifs, nutrition/hydratation, alertes, Stripe et tables Cassandre, avec accès navigateur révoqué et accès serveur limité à `service_role`. Elle ne copie aucune donnée réelle; seuls les six rôles d'agents, déjà définis dans le code, sont insérés.
- Ajout de `supabase/ROLLBACK_TEST_FOUNDATION.md`, qui recommande un snapshot/reset du projet de test plutôt qu'un `DROP` général.
- Mise à jour de `_headers` pour autoriser Supabase de test dans la CSP; la référence de production conservée dans cette politique CSP est une autorisation réseau, pas un fallback de configuration. Le contrôle serveur refuse la cible de production dans les previews.
- Le script de configuration du frontend est externalisé dans `runtime-config.js` pour respecter `script-src 'self'`; le service worker a été versionné et inclut ce fichier.

### Vérifications faites

- Tests Node : 22 au total, 20 réussis, 0 échec, 2 ignorés. Les deux tests ignorés sont des intégrations de quota qui exigent une instance Supabase locale et des comptes fictifs.
- Syntaxe : `app.js`, `sw.js`, tous les fichiers `.mts` de Netlify et l'Edge Function TypeScript passent `node --experimental-strip-types --check` sous Node v26.13.0.
- Les nouveaux tests couvrent configuration absente/invalide, refus d'une cible production en preview, refus de clé service-role côté navigateur, UID fondateur, absence d'identité de fondateur dans le corps, ordre des migrations et grants de la fondation.
- Inventaire des usages Supabase dans les sources : aucune URL/clé de production utilisée comme valeur par défaut; le navigateur ne contient ni clé `service_role`, ni clé `sb_secret_`. Une recherche retrouve uniquement les noms des variables serveur et les deux hôtes de CSP.
- La migration a été comparée statiquement à la structure observée de production et aux références des deux migrations suivantes. Les tables/colonnes visées comprennent les références de programme utilisées par la migration de quota et les tables fondatrices Cassandre.

### Limites et état des environnements

- Le projet Supabase de test reste vierge. Aucune migration n'a été appliquée, aucun compte fictif n'a été créé, aucune Edge Function n'a été déployée. La production n'a fait l'objet que de lectures de schéma et de source; aucune ligne de données n'a été copiée.
- Le test de migration est statique uniquement : Supabase CLI, `psql` et Deno ne sont pas installés dans cet environnement. La syntaxe SQL, les contraintes, RLS, RPC et migrations doivent encore être validées par PostgreSQL/Supabase local ou sur une branche test après snapshot.
- `package.json` ne définit aucun script `build`; aucun build n'a donc été revendiqué ou exécuté. `netlify.toml` et les réglages de build restent manquants/inconnus.
- La fondation est un schéma backend isolé pour dépendances Cassandre et parcours principaux repérés, pas une copie complète du schéma Repwise. Les autres tables/publications/RLS du produit et leurs fonctions de sécurité doivent être ajoutées depuis des définitions vérifiées avant de prétendre que toute l'application tourne sur le projet vierge.
- La fonction `cassandre-brain` collecte actuellement quelques agrégats globaux destinés au propriétaire; elle n'est pas encore déployée ni appelée dans le projet test. L'authentification du fondateur est vérifiée statiquement et par test unitaire de source, pas par un appel Edge réel. Une limite de coût/quota pour ses appels IA reste à intégrer/tester.
- Aucune variable serveur ni aucun secret n'a été créé/modifié. Pour un test ultérieur, il faudra configurer les valeurs du projet test pour `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, l'UID fondateur `CASSANDRE_OWNER_USER_ID`, ainsi que les secrets IA nécessaires. Les variables Netlify de preview doivent cibler le projet test; les valeurs de production ne doivent pas être recopiées dans les previews.

### Fichiers de cette phase

- Modifiés : `app.js`, `index.html`, `_headers`, `sw.js`, `netlify/lib/billing.mts`, `netlify/lib/cassandre.mts`, fonctions Netlify de facturation/Cassandre, `tests/supabase-runtime-policy.test.mjs`, `CASSANDRE_HANDOFF.md`.
- Ajoutés : `netlify/lib/supabase-runtime-policy.mjs`, `netlify/functions/repwise-runtime-config.mts`, `runtime-config.js`, `supabase/functions/cassandre-brain/index.ts`, `supabase/migrations/20261103000000_repwise_cassandre_foundation.sql`, `supabase/ROLLBACK_TEST_FOUNDATION.md`, `tests/cassandre-owner-guard.test.mjs`, `tests/foundation-migration.test.mjs`.
- Les chemins du projet sont toujours non suivis par Git; aucun commit, push, PR, déploiement ou changement de configuration distante n'a été effectué.

### Prochaine étape recommandée

Installer/activer un environnement PostgreSQL local isolé et le Supabase CLI, puis exécuter dans cet environnement vierge la fondation, `20261104202211...`, puis `20261109091437...`. Corriger toute erreur SQL ou de privilège avant d'envisager leur application au projet de test hébergé. Après validation locale, créer un snapshot du projet test, appliquer ces trois migrations uniquement au projet test, créer des comptes fictifs et vérifier les RPC/RLS; ne pas déployer `cassandre-brain` avant d'avoir configuré ses secrets de test et vérifié l'UID fondateur par deux comptes distincts.

## Décision de publication bêta — 10 novembre 2026

- Contrôles critiques non satisfaits : les outils Supabase connectés refusent actuellement l'accès au projet de test, y compris aux lectures d'URL, de clés publiques, de tables et d'historique. Aucune migration ni Edge Function ne peut donc être vérifiée ou installée dans ce projet.
- Le connecteur Netlify ne retourne aucune variable d'environnement de site pour `repwise-coaching`. Les variables de test nécessaires à l'application et aux fonctions ne sont donc pas confirmées/configurées. Les variables partagées d'équipe n'ont pas été inspectées.
- Le dépôt GitHub `bltraining/Repwise` est accessible, mais la branche distante `feature/cassandre-whatsapp-agents` est absente. Localement, les fichiers de l'application et Cassandre restent non suivis; aucun commit n'a été créé ou envoyé.
- `package.json` n'a aucun script et `netlify.toml` est absent. Aucun build Netlify confirmé ni Deploy Preview n'est disponible. Le site Netlify a un déploiement courant prêt, mais cela ne valide pas cette copie locale.
- Scan local des fichiers Git pour les formats de secrets usuels : aucune correspondance trouvée; aucun fichier `.env` présent. `.env*` et `.netlify/` sont ignorés par Git.
- Campagne de tests locale : 22 tests, 20 réussis, 0 échec, 2 intégrations quota ignorées car elles nécessitent Supabase local. Cela ne valide pas les appels Supabase réels, les permissions fondateur en Edge, ni le parcours UI en navigateur.
- WhatsApp Meta demeure facultatif pour la bêta et est désactivé tant que le mode test Meta n'est pas configuré. Stripe doit également rester limité aux clés de test hors production.
- Décision : ne pas pousser, créer de preview ni publier sur le domaine public tant que l'accès Supabase test, les secrets de test, une vérification SQL PostgreSQL et un Deploy Preview réussi ne sont pas disponibles. Aucun changement de production, commit, push, migration ou déploiement n'a été fait.

Prochaine action indispensable du fondateur : rétablir l'accès en lecture au projet Supabase de test `ahcdiqmxlblitbbbqxzo` et autoriser/configurer ses secrets de test côté Netlify. Ensuite seulement, valider les migrations sur PostgreSQL isolé et reprendre la séquence de preview/publication.

## Vérifications Supabase locales — 10 novembre 2026

- Supabase CLI `3.1.0` installé en dépendance de développement; `supabase/config.toml` initialisé sans remplacer les migrations. Docker Desktop et la pile locale sont opérationnels. Mailpit a été exclu car son port local était déjà occupé.
- Trois migrations appliquées uniquement à Supabase local, dans l'ordre : `20261103000000`, `20261104202211`, `20261109091437`. Aucun ordre distant n'a été utilisé.
- Contrôle SQL local : 0 table sans RLS dans `public`/`cassandre_private`, 0 privilège direct de table pour `anon`/`authenticated`, 6 agents enregistrés et 8 RPC Cassandre. Aucun compte ni donnée de production utilisé.
- Tests d'intégration quota exécutés avec des comptes fictifs : 10 réservations acceptées puis la 11e refusée; 11 requêtes simultanées n'en ont réservé que 10. 2 réussis, 0 échec, 0 ignoré.
- RPC de tâches testées localement avec une tâche fictive : réservation unique entre deux workers, reprise via `needs_correction`, tâche terminée non réclamée une seconde fois. La tâche et les comptes de test ont été supprimés.
- `cassandre-brain` servi localement avec JWT vérifié : requête sans JWT = 401; UID fondateur fictif authentifié = 503 attendu faute de clé IA; coach non fondateur = 403; même coach avec identité de fondateur falsifiée dans le corps = 403. Les comptes et fichiers temporaires ont été supprimés; les traces de refus restent dans le journal d'audit local.
- Build et navigateur non validés : `package.json` ne définit pas de scripts et `netlify.toml` est absent; aucune campagne navigateur n'a été exécutée. WhatsApp Meta et appels IA réels non testés.
- L'installation npm locale a relevé 13 vulnérabilités (1 basse, 7 modérées, 5 élevées) et un script d'installation `esbuild` bloqué par la politique `allowScripts`. Aucun correctif automatique ni mise à niveau n'a été lancé.
- Aucun déploiement, push, commit, migration distante, changement de production ou opération financière. Prochaine étape utile : définir la commande et le dossier de build Netlify, puis exécuter un parcours UI dans un navigateur avant toute preview.

## Mise à disposition GitHub — 10 novembre 2026

- Les 63 fichiers source/configuration/tests nécessaires sont commités localement sur `feature/cassandre-whatsapp-agents`; aucun fichier `.env` ou temporaire n'est inclus. Le push de cette branche est l'étape courante.
- `main` reste inchangée. Aucun déploiement ni changement de base de données n'a été effectué.

## Préparation Netlify avant publication — 10 novembre 2026

- Build configuré avec `npm run build`, sortie limitée à `dist` et fonctions dans `netlify/functions`; les fichiers source, tests, docs et migrations ne sont pas publiés. Les 21 fonctions ont été empaquetées par `netlify build --offline --context deploy-preview` avec succès.
- `@netlify/functions` mis à jour vers 6.1.1 après vérification de l'export `Config` utilisé et de son exigence Node >=22.12. Le build cible Node 22.12.0. `npm audit` : 0 vulnérabilité (avant mise à jour : 13, dont 5 hautes dans les outils de développement/bundling).
- Test ciblé `supabase-runtime-policy` : 4 réussis, y compris refus d'une URL de production en Deploy Preview et absence de clé service-role dans le navigateur.
- Inventaire Netlify sans lecture des valeurs : deux variables de site, `STRIPE_SECRET_KEY` et `SUPABASE_SERVICE_ROLE_KEY`, présentes pour les contextes production et Deploy Preview; aucune variable partagée d'équipe. URL/clé publique Supabase, UID fondateur, jeton interne et configuration IA ne sont pas présentes dans cet inventaire. Les Deploy Previews resteront en échec fermé tant que leurs valeurs de test n'auront pas été configurées dans les scopes runtime/functions.
- Mode IA : aucun fournisseur IA n'est configuré sur le site ou l'équipe; worker désactivé par défaut et quota par défaut nul. Aucun appel IA payant n'a été effectué. Les fonctions financières refusent une clé Stripe live en Deploy Preview; aucune opération Stripe n'a été lancée.
- Aucun navigateur automatisable n'est disponible dans cette session; aucun test visuel n'a été revendiqué. Aucun déploiement, preview, changement de données ou réglage distant n'a eu lieu. La publication reste bloquée par les variables test manquantes et la vérification visuelle.
- Configuration et build commités sur `feature/cassandre-whatsapp-agents` (commit `e812180`) puis poussés sur `origin`; `main` n'a pas été modifiée.

## Démo publique Repwise + Cassandre — 10 novembre 2026

- Mode `build:demo` ajouté dans le commit `98bc40f`, poussé sur `feature/cassandre-whatsapp-agents`. Il ne publie que `index.html` et `_headers`; CSP sans scripts ni connexions externes. La page affiche uniquement des données fictives, les six agents et des actions administratives désactivées.
- Site Netlify isolé `repwise-cassandre-demo` créé sur le plan gratuit, sans variable d'environnement ni liaison Git. Déploiement brouillon `6af2f25ea1cd7230fe732675` prêt à l'URL HTTPS : `https://6af2f25ea1cd7230fe732675--repwise-cassandre-demo.netlify.app/`.
- Aucun backend/fonction n'a été envoyé (`available_functions=[]`); POST anonyme sur `/.netlify/functions/cassandre-command` renvoie 404. Les headers distants confirment CSP `connect-src none` et `script-src none`; la page répond HTTP 200, TLS validé, avec les libellés de démo, Cassandre et les six agents.
- Protection SSO retirée uniquement sur le site de démonstration pour permettre sa consultation publique. Le site `repwise-coaching`, ses secrets, Supabase et le domaine de production n'ont pas été modifiés.
- Aucun navigateur pilotable n'était disponible; validation faite par requêtes HTTPS et inspection du contenu, pas par test visuel interactif. La démo n'exécute pas les fonctions réelles : toute activation backend reste à préparer séparément.

## Correction du routage privé Cassandre — 10 novembre 2026

- `audit` et l'agent Technique utilisent maintenant `cassandre_private/audit_log` et `cassandre_private/tasks`, routés par un adaptateur commun vers le RPC privé. Aucun appel privé en notation pointée ne reste dans les fonctions Netlify.
- Test ciblé `tests/cassandre-audit-write.test.mjs` : 2 réussis; vérifie le payload d'écriture audit et l'adaptation de la lecture `tasks` au RPC.
- Migration différentielle `20261110104855_cassandre_audit_rpc_permissions.sql` : exige le RPC existant, retire l'exécution à `public`/`anon`/`authenticated` et la réserve à `service_role`. Appliquée uniquement au Supabase local. Test SQL local : ACL confirmée, fausse ligne d'audit écrite puis supprimée.
- Build `netlify build --offline --context deploy-preview` réussi; les 21 fonctions ont été empaquetées. Aucun déploiement, changement distant, paiement ou appel IA.

## Vérification de raccordement Cassandre — 10 novembre 2026

- Consultation Supabase distante en lecture seule uniquement. Le projet Repwise existant possède le socle `cassandre_private` (agents, tasks, decisions, daily_reports, audit_log), les six agents, `public.cassandre_save_report` et les migrations de fondation/rapport (`20261106155226`, `20261106155403`). `public.cassandre_private_api` et `cassandre_cancel_task` sont absents à distance; les colonnes d’orchestration de `tasks`, `requests` et les tables WhatsApp/settings/ai_usage manquent. Aucune politique RLS n’est définie sur les tables privées; l’accès reste encadré par les révocations de privilèges du socle.
- Ordre sur une base locale vierge : `20261103000000` fondation, `20261104202211` quota/Stripe/Premium, `20261109091437` orchestration + RPC API, `20261110104855` ACL du RPC. Sur le Supabase Repwise existant, ne pas rejouer les deux premières : le socle est déjà présent sous d’autres versions; la migration Cassandre à préparer est `20261109091437`, puis `20261110104855`. `20261110104855` dépend explicitement de `cassandre_private_api` créé par `20261109091437`. La migration du 04/11 est hors dépendance pour le statut des missions et inclut une mise à jour de données Premium; ne pas l’appliquer comme prérequis Cassandre.
- Supabase local non lié à un projet distant; les quatre migrations sont enregistrées dans l’ordre ci-dessus. Base locale construite par les migrations du dépôt, pas une copie complète de la production. Les migrations n’ont pas été rejouées.
- Tests ciblés exécutés : `node --test tests/founder-policy.test.mjs tests/cassandre-owner-guard.test.mjs tests/cassandre-audit-write.test.mjs` — 5 réussis.
- Parcours Auth JWT → commande « Où en sont mes missions ? » → lecture persistée non validé en bout en bout : Node 26 refuse le constructeur TypeScript à propriété de paramètre dans `billing.mts` en mode strip-only. Aucun appel IA ni service distant n’a été effectué. Comptes fictifs et profils créés par les essais interrompus supprimés de la base locale (4 comptes, 2 profils); la suppression a été confirmée par le CLI.
- Aucun fichier applicatif, migration ou réglage distant modifié. Aucun déploiement, appel IA, Stripe ou WhatsApp.
- Prochaine étape : lancer le parcours via le runtime Netlify local ou un bundler TypeScript déjà disponible, puis tester seulement après cela l’authentification et la lecture réelle. Avant tout changement distant, générer et relire une migration différentielle explicitement ciblée sur le schéma Supabase existant; ne jamais exécuter automatiquement.

## Test d’intégration Cassandre Netlify local — 10 novembre 2026

- Défaut corrigé dans `netlify/lib/cassandre.mts` : « Où en sont mes missions ? » n’était pas reconnu (seule la forme singulière « où en est » l’était), ce qui envoyait à tort la commande vers le worker IA. Le test `tests/cassandre-command-intents.test.mjs` couvre les deux formes.
- Parcours exécuté via `netlify dev --offline` et Supabase local : JWT du fondateur accepté; la fonction `/api/cassandre-command` répond 200 et lit une tâche fictive; la demande apparaît dans le tableau de bord et son audit `status_requested` est bien enregistré. Un UID de fondateur falsifié dans le corps n’accorde aucun droit; autre coach : 403; sans JWT : 401.
- Aucun worker n’a été lancé. Aucune configuration IA, Stripe ou WhatsApp n’a été fournie. Les deux comptes, profils, tâche et lignes d’audit fictifs ont été supprimés après vérification.
- Test différentiel sur une base temporaire locale, sans comptes métier ni secrets : le schéma Cassandre de fondation a été repris sans données, puis `20261109091437` et `20261110104855` appliquées dans cet ordre. Le RPC retourne les six agents pour `service_role`; exécution `anon`/`authenticated` refusée, accès direct `anon` au schéma/tables refusé; RLS activé sur les tables. Base temporaire supprimée.
- Tests ciblés : 6 réussis (`cassandre-command-intents`, `founder-policy`, `cassandre-owner-guard`, `cassandre-audit-write`). Aucune migration distante, publication ou modification de production. Build complet distinct non relancé; Netlify Dev a empaqueté et servi la fonction pendant le test.
- Correction et test prêts à committer/pousser sur `feature/cassandre-whatsapp-agents`; aucun changement à `main`.

## Préparation bêta fonctionnelle en consultation — 10 novembre 2026

- Vérification Supabase distante en lecture seule : migrations `20261109091437` et `20261110104855` absentes de l'historique de production, donc non appliquées. L'organisation Supabase est au plan Free : pas de sauvegardes quotidiennes automatiques selon la documentation; aucune sauvegarde manuelle exploitable n'est confirmée. La liste CLI documentée (`supabase backups list --remote=...`) reste inaccessible faute de session CLI autorisée. Aucune étape de migration distante poursuivie.
- Préparation locale limitée à la bêta consultation : `CASSANDRE_READ_ONLY_MODE=true` bloque côté serveur les demandes autres que le statut avant la création de tâche; configuration Cassandre et connexions WhatsApp renvoient 403. Le runtime ne publie au navigateur qu'un booléen de lecture seule; l'interface masque agents, rapports, validations et WhatsApp et propose la consultation des missions.
- Site Netlify dédié `repwise-cassandre-beta` (ID `50f7aeed-c985-427a-8651-8ecfb02bfb98`) présent, plan gratuit, sans déploiement HTTPS; la protection SSO d'équipe est active. Cause du 403 identifiée : la première requête précisait des scopes de variables; Netlify réserve les scopes personnalisés aux plans Pro/Enterprise. Avec les scopes par défaut (tous), les six drapeaux non secrets ont été configurés avec succès. L'utilisateur courant est Owner de l'équipe; aucune permission ne manque pour ces variables simples.
- Variables bêta encore absentes : `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CASSANDRE_OWNER_USER_ID`; le backend a donc besoin d'un raccordement explicitement autorisé au Supabase choisi. Les autres variables définies sur la bêta sont uniquement `CASSANDRE_READ_ONLY_MODE=true`, `CASSANDRE_WORKER_ENABLED=false`, `CASSANDRE_WHATSAPP_TEST_MODE=false`, `CASSANDRE_DAILY_REPORT_TEST_MODE=false`, `CASSANDRE_DAILY_AI_CALL_LIMIT=0`, `CASSANDRE_DAILY_AI_TOKEN_LIMIT=0`. Aucun secret, identifiant Supabase ou Stripe n'a été configuré.
- CSP du dépôt autorise encore les hôtes Supabase de production et de test. Le contrôle runtime a été renforcé : une URL de production n'est renvoyée que sur `repwise-coaching.netlify.app` en contexte production; le domaine beta ne peut pas recevoir cette configuration. Réviser la CSP du site dédié avant tout déploiement bêta.
- Tests exécutés après les changements : `node --test tests/cassandre-command-intents.test.mjs tests/supabase-runtime-policy.test.mjs` — 9 réussis; `node --check app.js` — réussi; `git diff --check` — réussi; `npm run build` — réussi, 12 entrées statiques copiées vers `dist`. Aucun test de navigateur, de connexion distante ni de fonction réelle effectué.
- Fichiers modifiés : `app.js`, `index.html`, `netlify/lib/cassandre.mts`, `netlify/functions/cassandre-settings.mts`, `netlify/functions/repwise-runtime-config.mts`, `netlify/functions/whatsapp-connection-request.mts`, `netlify/functions/whatsapp-connection-verify.mts`, `netlify/lib/supabase-runtime-policy.mjs`, `tests/cassandre-command-intents.test.mjs`, `tests/supabase-runtime-policy.test.mjs`.
- Prochaine action : confirmer une sauvegarde/export exploitable dans le Dashboard Supabase (Database > Backups, si disponible) ou avec accès CLI/Management API; faire valider explicitement les migrations/raccordement; configurer les credentials de l'environnement choisi, durcir la CSP, puis seulement déployer et vérifier un statut authentifié. Ne pas utiliser le Supabase de production avant autorisation.

## Sauvegarde Repwise avant migrations — 10 novembre 2026

- Vérification du projet Supabase existant en lecture seule : organisation au plan Free, migrations Cassandre `20261109091437` et `20261110104855` absentes; aucune sauvegarde distante ou archive locale restaurable n'est confirmée. Les sauvegardes quotidiennes automatiques sont réservées aux plans payants selon la documentation Supabase.
- La Supabase CLI locale v3.1.0 fonctionne avec autorisation locale pour son fichier de télémétrie. `supabase backups list --remote=dpbfkzmoizjdevrwuukb` a été tenté en lecture seule et s'est arrêté avec `AccessTokenRequiredError` (aucune session/jeton disponible), avant de lister les sauvegardes. `pg_dump` et `pg_restore` sont absents du PATH; aucun mot de passe DB ou URL de connexion dans l'environnement; daemon Docker arrêté. Aucune connexion à la base ni aucun export effectué; aucune donnée production lue ou copiée.
- Migrations non retestées sur une copie production faute de dump; les tests déjà consignés sur une base locale construite du dépôt ne remplacent pas ce contrôle. Aucune migration distante exécutée.
- Prochaine action indispensable : propriétaire, depuis un terminal local autorisé, démarrer Docker Desktop, disposer de `pg_dump`/`pg_restore` gratuits (ou du client officiel approprié), puis établir la connexion Supabase par le Dashboard/CLI sans transmettre le mot de passe dans le chat. Exporter en format personnalisé vers un dossier local privé hors dépôt et restaurer dans une base locale temporaire avant d'envisager les migrations. Respecter l'absence de quota supplémentaire.

## Suivi de l’export après authentification CLI — 10 novembre 2026

- Après `supabase login`, la commande officielle `supabase backups list --remote=dpbfkzmoizjdevrwuukb` a répondu `backups: []`; aucune sauvegarde physique n'est disponible.
- Le mot de passe PostgreSQL a été oublié. Les tentatives interactives via l’image officielle `postgres:17` n'ont pas réussi : les deux artefacts `repwise-before-cassandre-20261110*.dump` font 0 octet, permissions 600, dans un dossier 700; ils sont conservés mais ne sont pas des sauvegardes. Aucun accès en lecture de données n'a abouti, aucune restauration ni migration distante exécutée.
- La documentation Supabase CLI v3 confirme qu'un token d'accès peut autoriser un rôle temporaire pour `supabase db dump`; cette commande exporte du SQL et n'offre pas le format archive personnalisé `-Fc`. Pour respecter strictement la demande `pg_dump -Fc`, il faut retrouver le mot de passe DB; ne pas le réinitialiser sans accord explicite, car cela change l'accès PostgreSQL du projet.
- Prochaine étape : soit le propriétaire retrouve le mot de passe DB et le saisit uniquement dans l'invite locale, soit il valide explicitement le format SQL produit par la CLI comme solution de remplacement; ne pas faire de changement de mot de passe en production.

## Exports CLI et restauration des schémas applicatifs — 10 novembre 2026

- Session CLI v3.1.0 confirmée; `projects list` identifie le projet actif `dpbfkzmoizjdevrwuukb`. `supabase db dump --help` consultée. Exports réalisés en SQL par rôle temporaire CLI, sans mot de passe DB et sans modification de données distante :
  - `~/Documents/Projets/Repwise-sauvegardes/repwise-cli-20261110-856e0ea/schema.sql` — 82 720 octets, `0600`.
  - `data.sql` — 62 663 octets, `0600`.
  - `roles.sql` — 297 octets, `0600`.
  - Dossier parent `0700`; hors dépôt Git. `roles.sql` a 3 `ALTER ROLE`, aucun champ mot de passe ni déclaration de rôle complète.
- Le schéma restauré contient 18 tables `public` et 5 tables `cassandre_private`. Les 23 volumes de lignes exportés puis restaurés correspondent exactement aux comptes distants (316 lignes au total). Import des données en transaction avec contraintes actives; pas d'erreur.
- Restauration vérifiée dans un PostgreSQL 17 temporaire, réseau désactivé, stockage tmpfs, exports montés en lecture seule. Le schéma exigeait `auth.uid()` et des FKs vers `auth.users`; un schéma/table Auth minimale et un identifiant factice ont été créés uniquement dans la base temporaire. RLS activé sur 23/23 tables, 52 politiques, 96/96 contraintes validées; ACL locales identiques aux checks distants : `anon`/`authenticated` sans usage du schéma privé ni SELECT tasks, `service_role` autorisé. `cassandre_save_report(jsonb)` existe et est exécutable par `service_role` seulement. `cassandre_private_api` et `cassandre_cancel_task` absents du distant, comme déjà constaté avant migrations.
- Le conteneur de restauration a été supprimé après contrôle; les fichiers d'export sont conservés. Les exports Supabase CLI excluent les utilisateurs Auth, Storage/objets, secrets et paramètres de projet, schémas créés par extensions; le dump de rôles ne reconstitue pas le cluster complet. Aucun objet Storage, clé, secret ou configuration n'a été exporté.
- Conclusion : les deux exports SQL sont non vides et restaurables pour les schémas applicatifs `public` et `cassandre_private`, avec correspondance des tables, contraintes, ACL, RLS et volumes. Ce n'est pas une sauvegarde complète du projet Supabase; les migrations de production restent bloquées tant qu'un backup complet des éléments Auth/Storage/configuration requis ou un plan de reprise explicitement accepté n'est pas confirmé.

## Validation finale migrations — 2026-11-10

- Reprise des trois exports applicatifs protégés déjà présents; aucun nouvel export distant. Restauration PostgreSQL 17 temporaire avec réseau désactivé, exports et migrations montés en lecture seule. Base Auth minimale et utilisateur factice uniquement dans cette copie, car les dumps applicatifs n'incluent pas Supabase Auth.
- Application locale réussie, dans l'ordre demandé : `20261109091437_cassandre_orchestration_whatsapp.sql`, puis `20261110104855_cassandre_audit_rpc_permissions.sql`. Aucun échec SQL; le NOTICE sur `last_inbound_at` déjà existant est sans conséquence.
- Avant : 23 tables / 316 lignes. Après : 31 tables / 317 lignes. Les comptes de lignes des 23 tables originales sont inchangés (316 au total); la ligne supplémentaire est le réglage initial dans `cassandre_private.settings`. Les 7 autres nouvelles tables sont vides. Les tests fictifs ont tous été exécutés en transaction puis annulés.
- Contrôles : six agents présents; RLS actif sur toutes les tables applicatives; aucune contrainte non validée. RPC `cassandre_private_api` exécutable par `service_role`, refusée à `anon` et `authenticated`; l'accès direct au schéma privé est également refusé à ces rôles.
- Tests transactionnels réussis : réservation de tâche et refus du doublon, fin de tâche, verrouillage unique de synthèse, réservation/refus au quota journalier et enregistrement d'usage; lecture des six agents et écriture/lecture d'un audit fictif par le RPC. Aucun résidu de test.
- Conteneur PostgreSQL temporaire arrêté; exports d'origine conservés. Aucun accès hébergé, aucune migration distante, aucun changement production, Netlify, Stripe ou WhatsApp.
- Limite : cette validation couvre la copie restaurée des schémas applicatifs; elle ne reconstitue pas Auth, Storage, secrets, paramètres Supabase ni toutes les extensions gérées. Elle ne prouve donc pas à elle seule la compatibilité d'une migration distante avec l'ensemble du projet hébergé.

## Dernière validation avant bêta — 2026-11-10

### Empreintes et migrations
- Restauration des mêmes exports existants dans un conteneur PostgreSQL 17 temporaire, réseau désactivé; aucun nouvel export distant.
- Calcul avant/après : MD5 d'une concaténation déterministe des représentations JSONB de chaque ligne, triées par JSONB, avec fuseau SQL UTC. Résultat : 23/23 tables initiales identiques, 316 lignes avant et après, zéro empreinte différente.
- Les migrations 20261109091437 puis 20261110104855 ont réussi localement. Elles ajoutent huit tables; la migration crée une ligne dans cassandre_private.settings, d'où 317 lignes dans l'ensemble après migration. Conteneur arrêté ensuite.

### Auth et Storage
- Repwise dépend de Supabase Auth : l'interface utilise les sessions, l'inscription, la connexion, la récupération et le changement de mot de passe; les fonctions Netlify valident les jetons Auth. public.profils.id dépend de auth.users.id. Les trois exports ne contiennent pas le schéma ni les utilisateurs Auth : la restauration précédente n'avait qu'une table Auth factice, pas de comptes restaurables.
- Aucune utilisation de supabase.storage/storage.from, d'endpoint Storage ou de bucket n'a été trouvée dans le code applicatif inspecté. Les exports ne couvrent toutefois ni le schéma/metadata Storage ni les objets. Ne pas conclure qu'il n'existe aucun bucket ou objet dans le projet hébergé.
- Documentation officielle : supabase db dump exclut auth et storage par défaut; les backups SQL ne contiennent pas les objets Storage. La fonction officielle « Restore to a new project » peut transférer les données Auth (dont hashes de mots de passe et identités), mais les fichiers/paramètres Storage, réglages Auth/API, Edge Functions, extensions et réglages de projet demandent une reconfiguration ou une récupération distincte. Références : https://supabase.com/docs/reference/cli/supabase-db-dump ; https://supabase.com/docs/guides/platform/backups ; https://supabase.com/docs/guides/platform/clone-project ; https://supabase.com/docs/guides/storage/management/download-objects.

### Bêta consultation : blocages
- CASSANDRE_READ_ONLY_MODE est transmis comme booléen et les commandes non reconnues comme consultation sont refusées côté serveur. Cependant, la recherche de doublon dans processFounderMessage précède ce refus et peut renvoyer des tâches encore en attente; /api/cassandre-command les transmet ensuite au worker. Les fonctions worker/synthèse/réconciliation et le webhook WhatsApp ne sont pas toutes arrêtées par le mode consultation. Le mode seul ne garantit donc pas l'absence d'exécution IA/WhatsApp.
- Le rapport quotidien et le réconciliateur ont un garde-fou CASSANDRE_WORKER_ENABLED; Stripe exige une clé de test hors contexte production mais n'est pas globalement désactivé par le mode consultation. Aucun réglage ou secret Netlify du site bêta n'a été inspecté : leur absence ne peut pas être confirmée.
- Avant bêta : corriger le contrôle serveur avant le chemin de déduplication, bloquer les workers/synthèses/réconciliateur/webhooks/notifications et Stripe en mode consultation; vérifier l'environnement du site bêta. Exiger uniquement le projet Supabase de test (ahcdiqmxlblitbbbqxzo), URL et clé publique de test, clé service-role uniquement serveur et UID coach de test; CASSANDRE_READ_ONLY_MODE=true; laisser workers/internal token, Stripe et WhatsApp non configurés/désactivés. Vérifier ensuite la commande de statut et les refus, sans connecter le projet de production.
- Aucun déploiement, changement distant, appel IA, paiement ou changement de données n'a été effectué. La bêta fonctionnelle n'est pas validée tant que les garde-fous code et la configuration Netlify dédiée ne sont pas vérifiés.

## Verrouillage bêta consultation — 2026-11-10

- Le mode CASSANDRE_READ_ONLY_MODE est désormais vérifié avant la déduplication des commandes; un doublon de mission renvoie zéro task ID en consultation. Le statut reste accessible via cassandre-command après requireFounder/JWT.
- Barrière supplémentaire centrale : dispatchTask refuse en mode consultation; askModel refuse aussi. Les endpoints worker de tâche et synthèse, le routeur et les notifications WhatsApp, le webhook WhatsApp, le réconciliateur et le rapport quotidien sont bloqués côté serveur. Les connexions WhatsApp étaient déjà refusées. La génération IA de programmes Repwise est également refusée.
- Tous les endpoints Stripe utilisent getStripe; cette fonction refuse le mode consultation avant de construire un client Stripe.
- Couverture de tests ciblée ajoutée dans tests/cassandre-command-intents.test.mjs pour l'ordre du garde et du chemin de doublon, les endpoints d'arrière-plan/planifiés/IA/WhatsApp/Stripe, et l'authentification fondateur avant traitement.
- Tests réellement lancés : node --test tests/cassandre-command-intents.test.mjs : 6 réussis, 0 échoué. npm run build : réussi (12 entrées statiques copiées dans dist). git diff --check : réussi.
- Variables à vérifier dans le contexte Deploy Preview, valeurs non lues : SUPABASE_URL et SUPABASE_PUBLISHABLE_KEY du projet test ahcdiqmxlblitbbbqxzo; SUPABASE_SERVICE_ROLE_KEY uniquement côté serveur; CASSANDRE_OWNER_USER_ID du coach fictif; CASSANDRE_READ_ONLY_MODE=true. Garder CASSANDRE_WORKER_ENABLED désactivé et ne pas configurer les clés IA, Stripe, WhatsApp ni CASSANDRE_INTERNAL_TOKEN.
- Seule la configuration locale netlify.toml a été considérée (build npm run build, publication dist, fonctions netlify/functions). Aucun réglage ni indicateur du site Netlify distant n'a été consulté ou modifié : la valeur réelle du mode consultation et l'absence des secrets sur le site bêta restent à confirmer dans Deploy Preview.
- Aucun déploiement, migration, accès à Supabase hébergé ou test avec compte réel. Le code est verrouillé, mais la bêta ne doit pas être considérée active tant que les variables du site dédié ne sont pas vérifiées et que le parcours JWT/statut n'est pas testé en prévisualisation.

## Tentative de publication bêta — 2026-11-10

- Site isolé identifié : repwise-cassandre-beta (ID Netlify 50f7aeed-c985-427a-8651-8ecfb02bfb98). SSO requis pour tous les visiteurs; protection conservée. Les sites repwise-coaching et repwise-cassandre-demo n'ont pas été ciblés.
- Environnement Netlify de ce site inspecté sans afficher les valeurs : CASSANDRE_READ_ONLY_MODE=true pour le contexte all, CASSANDRE_WORKER_ENABLED désactivé. Aucun SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, Stripe, clé IA ou identifiant/secret WhatsApp dans les variables propres au site; aucune variable d'équipe partagée listée.
- Sans configuration Supabase, /.netlify/functions/repwise-runtime-config échoue fermé et runtime-config.js affiche le message explicite présent dans index.html. Aucun backend de production ni repwise-cassandre-demo utilisé.
- Le dossier dist a passé un scan de motifs de secrets : aucun résultat. Le commit ciblé est a5f4529; les six tests ciblés et le build avaient réussi sur ce même commit avant la tentative.
- Tentative réelle de publication uniquement vers le site beta via Netlify CLI documentée, avec dist et fonctions Netlify : refus HTTP 403 « Account credit usage exceeded - new deploys are blocked until credits are added ». Le site ne liste aucun déploiement après l'échec; le déploiement n'a pas eu lieu. Aucun changement d'indicateur ni de secret effectué.
- Blocage restant : l'administrateur du compte doit résoudre le quota/crédit Netlify pour permettre un nouveau déploiement. Ensuite, la bêta restera non connectée et affichera le message Supabase jusqu'à configuration d'un projet de test isolé et de ses variables publiques/serveur. Ne pas contourner par Supabase production.

## Publication statique Cloudflare Pages — 2026-11-10

- Wrangler 4.160.0 exécuté via npx (pas d'installation globale); authentification OAuth Cloudflare réussie. Aucun projet Pages n'existait. Le projet repwise-cassandre-beta a été créé en Direct Upload sur la branche de production feature/cassandre-whatsapp-agents.
- La création standard a été interceptée par le routage Wrangler vers Workers et a échoué sans déploiement. La commande a explicitement suggéré --force pour créer directement l'ancien projet Pages; le projet a ensuite été créé avec ce mode. Le déploiement suivant a utilisé wrangler pages deploy normalement, sans --force.
- Publication confirmée de la source d3be501 : déploiement f49e3f28-6ef3-4117-a53d-c743a3e64f84, statut Production, URL https://f49e3f28.repwise-cassandre-beta.pages.dev et alias https://repwise-cassandre-beta.pages.dev. Les deux URL répondent HTTP 200 avec vérification TLS réussie.
- Le dossier dist de publication contenait uniquement index.html et _headers. La réponse HTML en ligne correspond octet pour octet au fichier local; les six agents sont présentés comme aperçu, la page indique explicitement que les fonctionnalités backend sont inactives, sans script ni endpoint Supabase/Stripe/WhatsApp/Netlify. Scan de secrets sans résultat.
- En-têtes confirmés en ligne : CSP default-src none, script-src none, connect-src none, frame-ancestors none; X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy no-referrer, X-Robots-Tag noindex,nofollow.
- Aucun projet Supabase ni fonction Cloudflare n'est connecté; aucun worker IA, Stripe ou WhatsApp n'est actif. Pas de changement Netlify/Supabase/production. dist local restauré ensuite par npm run build standard; aucun fichier applicatif modifié.
- Coût : aucun écran de mise à niveau ou achat; le contenu statique Pages relève de l'offre Free, dont les requêtes de ressources statiques sont gratuites et illimitées selon https://developers.cloudflare.com/pages/functions/pricing/ et https://developers.cloudflare.com/pages/platform/limits/.
- Suite pour la bêta fonctionnelle : créer séparément une Pages Function/Worker pour la seule route de consultation, avec validation JWT fondateur, accès uniquement à un Supabase test isolé via secrets serveur, tests authentification et refus; ne pas porter les fonctions Netlify telles quelles ni connecter Supabase production.

## Consultation Cassandre sur Cloudflare Pages — 2026-11-10

- Ajout de deux Pages Functions Cloudflare : `functions/api/runtime-config.js` ne divulgue que l'URL verrouillée du Supabase test et sa clé publique; `functions/api/cassandre-command.js` accepte uniquement la demande de consultation, vérifie le JWT par Auth, compare l'UID au `CASSANDRE_OWNER_USER_ID` serveur, exige `profils.role=coach`, lit les tâches du propriétaire via le RPC privé et journalise dans `audit_log`. Les créations, dispatchs, IA, Stripe et WhatsApp n'ont aucune route dans la démo.
- Le routage Pages est limité à `/api/runtime-config` et `/api/cassandre-command`. L'interface de démonstration permet la connexion et l'interrogation; les valeurs affichées dans le reste du tableau restent explicitement fictives. CSP ajustée au strict nécessaire (scripts locaux et connexion au seul domaine Supabase de test).
- Pré-requis secrets côté Cloudflare, non configurés par ce changement : `SUPABASE_URL` (doit être le projet test `ahcdiqmxlblitbbbqxzo`), `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` et `CASSANDRE_OWNER_USER_ID`; `CASSANDRE_READ_ONLY_MODE=true`. Le projet Supabase test est signalé vierge, aucune migration distante ni configuration/secrets Cloudflare n'a été modifié. Sans ces éléments la fonction renvoie 503 sans requête distante, et l'interface reste indisponible.
- Tests ciblés `tests/cloudflare-cassandre-beta.test.mjs` : 5 réussis (configuration test seulement, requête anonyme, identité non fondatrice même si elle se prétend fondatrice, commande interdite, chemin fondateur authentifié avec profil coach, lecture filtrée et audit). Réponses Supabase simulées; aucun accès réel au Supabase ni compte test utilisé.
- Build `npm run build:demo` réussi; `node --check` réussi sur les deux fonctions et le script navigateur; `git diff --check` réussi. Pas de test navigateur réel ni de test local Wrangler des Pages Functions effectué. Aucun déploiement effectué : le projet test vierge et les secrets/UID test manquants empêchent de démontrer une consultation réelle.
- Prochaine étape : initialiser l'environnement Supabase test avec les migrations requises et un fondateur/coach fictif, puis configurer uniquement les variables Cloudflare dédiées avant un essai navigateur et un déploiement de bêta.

## Reprise du développement depuis mobile — 2026-11-10

- Le développement se poursuit sur `feature/cassandre-whatsapp-agents`; `origin` est `https://github.com/bltraining/Repwise.git`. La tête locale et la tête GitHub vérifiées avant cette synchronisation étaient toutes deux `8bf68f1`.
- Changements à synchroniser : Cloudflare Pages Functions de consultation, interface de connexion démo, CSP/routage, build démo, cinq tests ciblés et ce handoff. Aucun `.env`, export SQL, sauvegarde, secret ou donnée client n'est requis; `dist/` est ignoré par Git.
- Tests précédemment effectués sur ces changements : `npm run build:demo`, trois `node --check`, cinq tests ciblés et `git diff --check` réussis. Aucune consultation réelle Supabase, aucun déploiement, aucune migration distante.
- Pour continuer sur le Mac depuis le téléphone : dans l'application ChatGPT/Codex du Mac, ouvrir **Settings → Connections → Control this Mac or PC → Set up/Add**, scanner le QR code avec ChatGPT mobile et garder le Mac allumé/en ligne. La session distante utilise le checkout local et ses fichiers.
- Pour Codex Cloud : l'environnement doit être créé puis publié depuis Codex Web ou Desktop, relié au dépôt GitHub et à `feature/cassandre-whatsapp-agents`; sélectionner ensuite cet environnement dans l'application mobile. Cette session ne dispose pas d'une commande ou connexion UI permettant de créer/publier l'environnement Cloud à la place du propriétaire. Le travail non poussé n'est pas automatiquement inclus dans une nouvelle tâche Cloud.
- Prochaine action technique : initialiser le Supabase test vierge et configurer les seules variables Cloudflare de test listées plus haut avant tout essai d'intégration; ne pas connecter Supabase production.

## Cloudflare Workers — première version statique isolée — 2026-11-11

- Branche `feature/cassandre-whatsapp-agents`, code de départ `4ef9d7d`. Nouveau Worker isolé `repwise-cassandre`, configuration `wrangler.cloudflare.jsonc`, build `npm run build:cloudflare`; aucun changement au build ou aux fonctions Netlify.
- Le build publie uniquement `index.html` et `_headers` depuis `cloudflare/static/`. La page est script-free, données fictives, six agents présentés comme aperçu; workers IA, Supabase, Stripe, WhatsApp, tâches et rapports automatiques inactifs. Le Worker répond 404/no-store aux routes non statiques. Aucun secret ni endpoint d'application dans les assets.
- Contrôles exécutés : build Cloudflare réussi; 2 tests ciblés réussis; `git diff --check` réussi; Wrangler 4.160.1 dry-run réussi (2 assets, binding ASSETS uniquement). Wrangler local n'a pas pu démarrer à cause des permissions d'écriture des logs et du port loopback dans l'environnement; pas de test navigateur local.
- Déploiement Wrangler confirmé le 2026-11-11, version `6b2bf81d-7e57-4c21-9f68-3256f0098e8f`, Worker `repwise-cassandre`; URL `https://repwise-cassandre.repwise-coaching.workers.dev`. Après la propagation initiale, contrôle HTTPS par Node réussi : HTTP 200; CSP stricte (`default-src 'none'`, aucun script/connexion réseau), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`; la page contient bien les six agents. `/api/cassandre-command` et `/not-found` répondent HTTP 404 `Not Found`, `Cache-Control: no-store`.
- Coût : aucun achat, activation d'offre payante ou service backend. Les assets sont servis directement (`run_worker_first=false`); seuls les chemins qui invoquent du code Worker sont soumis aux limites du plan Workers Free. Aucune base hébergée, aucun appel IA, paiement ou message n'a été utilisé.
- Ordre de migration complet : (1) frontend/auth : assets statiques et SDK Supabase navigateur, clé publique seulement; (2) commande de consultation : Worker avec vérification JWT Auth et UID fondateur côté serveur, secret Supabase test uniquement; (3) orchestration six agents : remplacer le runtime Netlify par Workers/Queues ou Workflows avec réservation/idempotence persistantes; (4) planifications/rapports : Cron Triggers et exécution durable, fuseau Paris testé; (5) Stripe et WhatsApp : endpoints Worker adaptés, signatures via Web Crypto, secrets serveur, idempotence et tests sandbox/Meta. Les fonctions Netlify d'origine demeurent intactes; aucune fonction backend n'est migrée ou activée ici.
- Prochaine action : préparer le Supabase de test avec compte fictif avant de porter la seule commande de consultation vers Worker. Ne jamais utiliser Supabase production.

## Repwise original sur Cloudflare — aperçu sans backend — 2026-11-11

- Le Worker existant `repwise-cassandre` sert désormais le frontend original du dépôt : `index.html`, `app.js`, entraînement, historique, nutrition, coach et Cassandre, ainsi que le manifeste, icônes, CSS légal et pages CGV/confidentialité/mentions légales. Les fichiers métier et les 21 fonctions Netlify du dépôt sont conservés; le build Netlify standard reste inchangé.
- Build dédié `npm run build:cloudflare`, sortie locale ignorée `dist-cloudflare/`. La copie déployée omet le SDK Supabase et l'ancien `runtime-config.js` Netlify. Un chargeur local fixe `REPW_SUPABASE_CONFIG` à `{ cassandreReadOnly: true }` sans fetch; le mode aperçu rend visible Cassandre/ses six agents mais désactive ses commandes, l'authentification, la facturation, l'export/suppression et les actions IA/coach sensibles. Le bandeau précise que les données sont fictives et non enregistrées.
- Sécurité contrôlée : aucun identifiant Supabase production, clé ou secret service-role dans le bundle; le client SDK n'est pas inclus. Le `app.js` original conserve ses chemins Netlify métier, mais aucun runtime Netlify ou endpoint de backend n'est déployé sur Cloudflare; sans client Supabase, les parcours live ne s'initialisent pas. CSP autorise uniquement la connexion same-origin, sans domaine Supabase; routes `/api/cassandre-command` et `/api/stripe-checkout` répondent 404/no-store. Aucun raccordement Supabase/Netlify/Stripe/WhatsApp/IA ni tâche planifiée.
- Build, 2 tests ciblés, syntaxe des scripts concernés, `git diff --check` et Wrangler dry-run réussis. Scan du bundle pour l'URL Supabase production et motifs de secrets sans résultat. Vérification HTTPS après déploiement : `/`, `/app.js`, chargeur, script aperçu, CGV, confidentialité, mentions légales et icône HTTP 200; les deux routes backend vérifiées HTTP 404. En-têtes observés : CSP stricte (`connect-src 'self'`), nosniff, HSTS 1 an, X-Frame-Options DENY, Referrer-Policy no-referrer. Safari n'a pas fourni de fenêtre visible/automatisable dans cette session, donc aucun contrôle visuel ni interaction par navigateur n'est revendiqué.
- Dernier déploiement du 2026-11-11 sur la même URL `https://repwise-cassandre.repwise-coaching.workers.dev`, version Worker `d4f9ab2e-d48f-409d-8374-94dc063ab5ba`.
- Prochaine étape fonctionnelle : créer le Supabase de test isolé et ses comptes fictifs, puis adapter et tester uniquement le login et la commande de consultation côté Worker. Garder les données de production, paiements, IA, WhatsApp, agents exécutés et rapports désactivés. Les tâches/queues/planifications devront être migrées séparément; ne pas retirer les fonctions Netlify existantes.

## Repwise public sans nom d'assistant interne — 2026-11-11

- Worker `repwise` créé et déployé sur `https://repwise.repwise-coaching.workers.dev`, version finale `f937f358-d1e1-4100-a10c-668c469f36d4`. Nouveau Worker vérifié HTTPS avant retrait des anciennes destinations.
- Le build Cloudflare sert l'interface Repwise, ses sections Entraînement, Historique, Nutrition, Coach et Assistant Repwise, ses pages légales, icônes, scripts et manifeste. Le build remplace les IDs de présentation et les libellés internes, retire du `app.js` livré les gestionnaires et requêtes propres à l'administration interne, et ne publie pas le SDK Supabase. Les fonctions source Netlify et l'implémentation interne restent inchangées dans le dépôt.
- Aucun texte correspondant au nom interne dans les fichiers texte servis par le Worker (HTML, JS, manifeste, en-têtes, pages légales) après contrôle public; l'accueil, les ressources, les pages légales et les icônes répondent HTTP 200. CSP same-origin seulement, HSTS 1 an, nosniff et X-Frame-Options DENY. La route `/api/assistant-command` renvoie 404 générique.
- Les anciennes destinations Cloudflare ont été conservées jusqu'au succès HTTPS de `repwise`, puis retirées : l'ancien Worker renvoie HTTP 404 et le projet Pages `repwise-cassandre-beta` a été supprimé; l'ancienne URL Pages répond désormais 530 et ne sert plus son ancien site. L'ancien domaine Netlify `repwise-cassandre-demo.netlify.app` répond 404; le domaine principal Netlify répond 200 sans occurrence du nom.
- Hydratation : seuls les boutons de bouteille 1 L (`.hy .bt`) sont agrandis par `scale(1.18)`, à proportions uniformes; les verres de 250 ml ne changent pas. La grille reste en flex-wrap mobile. Le code ne propose pas de bouteilles distinctes 500/750 ml. Pas d'inspection visuelle réelle sur téléphone/Safari dans cet environnement.
- Vérifications : `npm run build:cloudflare`; 2 tests ciblés réussis; vérification syntaxique des scripts; `git diff --check`; scan du dossier de publication sans nom interne ni motifs de secrets; vérification HTTP réelle des routes/pages/headers. Aucune liaison Supabase/Netlify, aucun paiement, appel IA ou message.
- Limite confidentialité : l'API publique GitHub confirme que `bltraining/Repwise` est public. Les sources internes, `CASSANDRE_HANDOFF.md` et l'historique Git exposent déjà le nom; des commits le contiennent. Cette livraison ne réécrit pas l'historique ni la visibilité du dépôt. Le rendre strictement privé exige un changement de visibilité décidé par le propriétaire; l'effacement historique exigerait ensuite une réécriture coordonnée, non effectuée ici.
- Prochaine action fonctionnelle : le projet Supabase de test reste à initialiser; avant toute authentification ou commande réelle, ajouter un Worker backend isolé avec contrôle UID fondateur et tester exclusivement sur ce projet test.

## Sécurité, mobile et environnement de test — 2026-11-11

- GitHub `bltraining/Repwise` est toujours public. La connexion GitHub Codex lit le dépôt avec permission `admin`; Cloudflare est configuré comme Worker statique déployé directement par Wrangler (pas de lien de build Git). La CLI `gh` et une action de changement de visibilité ne sont pas disponibles dans cette session, donc le dépôt n'a pas été rendu privé. L'accès après un éventuel changement de visibilité n'a pas été testé.
- Test navigateur Playwright réel à 390 px sur le Worker : Entraînement, Historique, Nutrition et Coach s'ouvrent; largeur du document 390 px, pas de débordement horizontal du document, aucune erreur JavaScript. La barre de navigation est défilable horizontalement (contenu 435 px dans 354 px disponibles).
- Hydratation testée localement dans le navigateur : quatre verres donnent 1,0 L. Bouteille 1 L mesurée à 40,1 × 89,7 px (échelle CSS 1,18); verres 250 ml inchangés à 30 × 40 px.
- Un projet Supabase distinct `repwise-cassandre-test` a été créé dans l'organisation gratuite après confirmation du coût à 0 €/mois; il est `ACTIVE_HEALTHY`, région `eu-west-1`, ref `qlwlyectatosrelqynkz`. Il est vierge : aucune table ni migration. Aucune donnée, secret, migration ou fonction n'a été ajouté.
- Aucun code applicatif modifié ni déploiement effectué. La bêta reste un aperçu statique, sans authentification, requête métier, agents, IA, Stripe ou WhatsApp. Prochaine étape : préparer le schéma de test depuis les migrations vérifiées, créer un compte coach fictif, puis porter et tester l'authentification et la seule commande de consultation dans un Worker isolé.

## Accès fondateur isolé — 2026-11-11

- Le build Cloudflare retire entièrement de l'HTML public le panneau administratif, son onglet et ses styles. Le nom interne et les six fiches n'apparaissent dans aucun asset navigateur; l'interface privée est créée dynamiquement uniquement après réponse autorisée du Worker. La session passe par cookies `HttpOnly`, `Secure`, `SameSite=Strict`, pas par localStorage.
- `cloudflare/worker.js` accepte uniquement la connexion et le tableau en lecture. Le Worker vérifie le compte auprès de Supabase Auth Test, compare l'UID serveur `CASSANDRE_OWNER_USER_ID`, puis renvoie les six agents au fondateur. Les requêtes métier sont lues via le RPC privé seulement si le secret service-role test est configuré; il n'est jamais transmis au navigateur. Toutes les autres routes d'action restent 404.
- Les variables non secrètes de `wrangler.founder-test.jsonc` verrouillent `CASSANDRE_READ_ONLY_MODE=true` et l'URL de test `https://qlwlyectatosrelqynkz.supabase.co`. Aucun publishable key, UID propriétaire, service-role key ni compte Auth fictif n'est configuré. Le projet Supabase est toujours vierge, donc aucune donnée métier n'est lue.
- Worker isolé déployé : `https://repwise-founder-test.repwise-coaching.workers.dev`, version `cf893a27-653d-4517-bb9e-4b9fb72f4a23`. HTTPS 200; endpoint anonyme `/api/founder-panel` réel : 401; connexion sans configuration : 503. L'interface publique à 390 px ne montre que Repwise et les quatre onglets publics. Le Worker `repwise` existant n'a pas été remplacé.
- Tests ciblés : 9 réussis (7 tests d'accès/lecture seule et 2 tests de build/assets). Les branches propriétaire et non-propriétaires sont simulées avec des réponses Auth contrôlées; elles ne constituent pas encore des tests avec de vrais comptes Supabase. Aucune migration distante n'a été appliquée.
- Bloquant avant accès fondateur réel : créer un compte fondateur fictif dans Supabase Test, définir son UID exact dans le secret Cloudflare, configurer la clé publishable test, puis préparer le schéma Cassandre et le secret service-role test si la lecture des tâches/rapports est activée. Le contrôle 403 doit ensuite être vérifié avec un vrai compte coach/client non fondateur avant de remplacer le Worker public.

## Validation Auth fondateur sur Supabase Test — 2026-11-11

- Projet utilisé exclusivement : `qlwlyectatosrelqynkz` (`repwise-cassandre-test`, eu-west-1). Migrations appliquées dans l'ordre : fondation `20261103000000`, quota/idempotence `20261104202211`, orchestration `20261109091437`, permissions audit `20261110104855`. Les quatre migrations sont enregistrées côté test.
- Vérifications DB : tables applicatives et Cassandre avec RLS actif; aucune permission SELECT directe `anon`/`authenticated` sur ces tables. Les RPC Cassandre consultés sont exécutables par `service_role`; aucun privilège `anon`/`authenticated` relevé. Six agents initiaux présents.
- Worker isolé `https://repwise-founder-test.repwise-coaching.workers.dev`, variable `CASSANDRE_READ_ONLY_MODE=true`, URL Supabase test figée. Clés publique et `service_role` de TEST stockées comme secrets Cloudflare; aucun secret de production n'a été lu ou utilisé. Seuls ces deux secrets restent listés après nettoyage.
- Correction de `cloudflare/worker.js` : audit serveur de l'ouverture de session fondatrice, des refus d'utilisateurs authentifiés non fondateurs et de la lecture du tableau. `cloudflare/static/founder-access.js` rattache maintenant le panneau privé au document; le test navigateur avait révélé que le panneau demeurait détaché.
- Test réel temporaire : comptes Supabase Test fictifs coach fondateur / coach / client. Résultats API : visiteur 401; coach et client 403 au login et sur l'endpoint avec JWT; fondateur 200. Le tableau contenait les six agents et une mission fictive persistée. Cookies `HttpOnly; Secure; SameSite=Strict`. Aucun contenu privé renvoyé aux non-fondateurs ni appel externe à IA/Stripe/WhatsApp.
- Audit DB réel confirmé : événements `founder_access_denied`, `founder_session_started`, `founder_panel_read` enregistrés. Test Playwright à 390 px : Cassandre et mission visibles après connexion fondateur; aucune mention privée avant connexion; 390 px de largeur document, zéro erreur JS, aucune requête vers un autre domaine.
- Nettoyage vérifié : les 3 utilisateurs Auth, profils, requête, tâche et entrées audit fictives supprimés; aucun résidu pour leurs UID. Les six agents et le réglage de configuration persistent. L'UID Cloudflare du fondateur fictif a été retiré après suppression; le Worker refuse donc toute nouvelle connexion jusqu'à configuration d'un compte de test fondateur durable. Le panneau reste fermé par défaut.
- Tests après correction : 8/8 tests ciblés, `node --check`, `npm run build:cloudflare` et `git diff --check` réussis. Worker test redéployé; HTTPS 200, endpoint anonyme 401, en-têtes de sécurité actifs. Aucune modification du Worker `repwise`, de `main`, de Supabase production, ni service payant.
- Prochaine étape : créer/choisir un compte fondateur dédié dans Supabase TEST, puis renseigner son UID dans le secret `CASSANDRE_OWNER_USER_ID` du Worker test. Ne pas utiliser l'UID de production; ne connecter la bêta publique qu'après ce contrôle.
