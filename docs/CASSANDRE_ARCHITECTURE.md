# Cassandre — architecture locale et mise en route sûre

Ce document décrit les changements locaux de la branche `feature/cassandre-whatsapp-agents`. Aucun changement n'a été appliqué à Supabase, Netlify, Meta, Stripe ou GitHub.

## Architecture ajoutée

- `cassandre-command` authentifie la session Supabase, vérifie le rôle coach et compare l'identifiant au compte fondateur configuré. Il demande à Cassandre de découper une instruction en tâches affectées à un ou plusieurs des six agents existants.
- `cassandre-task-worker-background` réserve une seule tâche à la fois, collecte des indicateurs agrégés, applique les consignes propres à l'agent et conserve le résultat. `cassandre-synthesis-background` réunit les résultats lorsque toutes les tâches sont terminées.
- `cassandre-quality-control.mts` vérifie le format du résultat, exige une preuve pour qualifier un constat de vérifié et refuse certaines affirmations d'action financière effectuée.
- `cassandre_private_api` est une RPC publique réservée à `service_role`; elle sert de façade aux tables de `cassandre_private`. Les tables ne sont pas exposées aux rôles du navigateur.
- `cassandre-task-reconciler` reprend les tâches en attente ou bloquées par un worker interrompu. Il reste inactif sans le drapeau runtime `CASSANDRE_WORKER_ENABLED=true`.
- `cassandre-notifications-background` envoie les synthèses WhatsApp et les rapports quotidiens au numéro vérifié; le module refuse tout envoi hors identifiant de téléphone Meta de test.
- Le webhook WhatsApp vérifie le défi Meta et la signature `X-Hub-Signature-256`, accepte uniquement le numéro vérifié lié au fondateur, déduplique les messages et route les demandes vers Cassandre.
- Les réponses texte libres sont limitées aux 24 heures suivant un message entrant. Hors fenêtre, le code ne tente un modèle que si un nom et une langue de modèle préapprouvé sont configurés; tous les appels restent verrouillés au numéro de test déclaré.
- La fonction de rapport quotidien consulte le réglage stocké dans `cassandre_private.settings`, utilise l'heure de Paris et crée un rapport uniquement si le réglage est activé et si l'option de test est configurée.

## Données réellement accessibles aux agents

Les collecteurs sont volontairement agrégés et plafonnés à 200 clients par coach. Les champs personnels et les notes individuelles ne sont pas envoyés au modèle.

- Commercial/financier : nouveaux clients et nombre d'abonnements associés. Le chiffre d'affaires et le MRR restent indisponibles; ils sont explicitement marqués comme non collectés.
- Clients : séances et clients actifs sur 30 jours; l'activité historique complète n'est pas incluse.
- Nutrition : nombre de repas sur 7 jours. Le projet ne contient pas de table de plans nutritionnels structurés identifiée.
- Programmes : nombre de programmes par statut, sans publication ni modification.
- Technique : tâches Cassandre seulement. Les journaux Netlify ne sont pas connectés.

Les agents sont donc opérationnels sur ces données limitées, mais ne couvrent pas encore toutes les analyses de la mission. Aucun résultat ne doit être interprété comme un MRR réel ou comme un audit complet des journaux techniques.

## Variables runtime nécessaires

Ne pas placer ces valeurs dans `netlify.toml`, le code client ou Git. Les variables marquées secrètes doivent être définies dans les réglages Netlify avec la portée Functions. Les identifiants sont listés ici sans valeurs :

- Identité et workers : `CASSANDRE_OWNER_USER_ID`, `CASSANDRE_INTERNAL_TOKEN`, `CASSANDRE_WORKER_ENABLED`.
- Plafonds IA obligatoires : `CASSANDRE_DAILY_AI_CALL_LIMIT` et `CASSANDRE_DAILY_AI_TOKEN_LIMIT`.
- Fournisseur IA : soit `GEMINI_API_KEY` et `GEMINI_MODEL`, soit `OPENAI_API_KEY` et `OPENAI_MODEL`. Les appels sont potentiellement payants; le plafond de tokens est une estimation basée sur la longueur du texte.
- Test WhatsApp Meta : `CASSANDRE_WHATSAPP_TEST_MODE=true`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEST_PHONE_NUMBER_ID`, `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_CHALLENGE_PEPPER`, `WHATSAPP_AUTH_TEMPLATE_NAME`, `WHATSAPP_AUTH_TEMPLATE_LANGUAGE`, `WHATSAPP_NOTIFICATION_TEMPLATE_NAME` et `WHATSAPP_NOTIFICATION_TEMPLATE_LANGUAGE`.
- Rapport planifié : `CASSANDRE_DAILY_REPORT_TEST_MODE=true`. Le réglage stocké reste désactivé par défaut.

Ne pas configurer de numéro, jeton ou application WhatsApp de production dans cette phase. Le code exige le mode test et l'identifiant de numéro Meta de test pour chaque envoi.

## Migration et isolation

Le fichier `supabase/migrations/20261109091437_cassandre_orchestration_whatsapp.sql` est local et n'a pas été exécuté. Il dépend des tables et fonctions Cassandre déjà présentes dans le projet Supabase : `cassandre_private.agents`, `tasks`, `decisions`, `daily_reports`, `audit_log` et `public.cassandre_save_report`.

Le dépôt GitHub `bltraining/Repwise` ne contient actuellement que son README sur `main`; les migrations fondatrices Cassandre et l'historique SQL complet sont absents du dossier de récupération. Une base Supabase de test vierge ne peut donc pas être reconstruite avec les migrations actuellement présentes. Avant les essais d'intégration, il faut récupérer et versionner le schéma de base complet dans un environnement de test isolé, ou créer une branche de test depuis le bon projet en vérifiant son coût. Ne jamais utiliser le projet de production pour les essais.

La migration ajoute une RPC publique réservée à `service_role` au lieu d'exposer `cassandre_private` dans les schémas API. Les tables nouvelles ont RLS activé; aucune politique ni autorisation navigateur n'est créée. La RPC doit être revue par rapport aux migrations fondatrices absentes avant application à une base de test.

## Plan de test reproductible

1. Préparer un projet Supabase de test et un vrai schéma initial versionné, puis appliquer les migrations dans l'ordre sur cette base seulement.
2. Utiliser un coach fictif configuré comme fondateur dans l'environnement de test. Vérifier qu'un autre coach, un client et un appel sans session reçoivent `403` ou `401`.
3. Tester une mission simple, une mission multi-agents, l'exécution en double, la réservation simultanée d'une tâche, la reprise après verrou expiré, l'échec IA et la synthèse après le dernier agent.
4. Vérifier les compteurs d'appels/tokens, le refus au plafond, le comportement quand le fournisseur est absent et le marquage `unavailable` des données manquantes.
5. Dans l'application Meta de test uniquement, tester défi GET, signature valide/invalide, numéro inconnu, message dupliqué, fenêtre de 24 h (juste avant/à expiration), modèles d'authentification et de notification préapprouvés, envoi/réponse et changement du numéro.
6. Tester la programmation horaire autour des changements heure d'été/hiver, les rapports sans données, la déduplication par date et le stockage via `cassandre_save_report`.
7. Vérifier qu'aucun rôle `anon`/`authenticated` ne peut appeler `cassandre_private_api`, lire les tables privées ou modifier les tâches. Répéter les tests coach/client et les parcours Repwise existants.

## État des vérifications

- Vérifié localement : syntaxe JavaScript de `app.js` et `sw.js` et syntaxe TypeScript Node des modules/fonctions Netlify.
- Vérifié localement : 8 tests unitaires réussis sur les prix/règles Stripe déjà présents et le contrôle qualité Cassandre.
- Non exécuté : 2 tests de quota Supabase, car aucun Supabase local n'est configuré. Ils restent automatiquement ignorés sans identifiants locaux fictifs.
- Non exécuté : compilation/bundling Netlify (dépendances absentes), test navigateur de l'interface, test de migration PostgreSQL, test Supabase avec un coach fictif, appel Gemini/OpenAI, test Meta Cloud API et génération du rapport planifié.
- Aucun message WhatsApp, appel IA réel, paiement, changement de réglage ou déploiement n'a été déclenché.
