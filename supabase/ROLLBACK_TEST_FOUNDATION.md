# Retour arrière — fondation Supabase de test

La fondation `20261103000000_repwise_cassandre_foundation.sql` est destinée à un projet de test vierge. Elle est transactionnelle, mais les migrations suivantes créent des fonctions et des tables qui dépendent de son schéma.

Avant application, conserver un snapshot du projet test. Pour revenir à un état vierge après l'application d'une ou plusieurs migrations, utiliser le reset du projet/branche de test ou restaurer ce snapshot depuis Supabase. Ne pas exécuter un script `DROP` général : il pourrait supprimer des objets préexistants ou des données de test utiles.

Aucun retour arrière SQL automatique n'est fourni. La fondation et les migrations suivantes n'ont pas été appliquées durant cette intervention.
