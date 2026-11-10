import type { AgentKey } from './cassandre.mts'

export const AGENT_INSTRUCTIONS: Record<AgentKey, { objective: string; allowedFacts: string[]; forbiddenActions: string[] }> = {
  commercial: {
    objective: 'Étudier les conversions, abonnements disponibles, évolutions commerciales et opportunités. Proposer des expériences mesurables, sans contacter les utilisateurs.',
    allowedFacts: ['nouveaux clients agrégés', 'nombre d’abonnements associés et statut disponible'],
    forbiddenActions: ['modifier un abonnement ou un tarif', 'lancer une campagne', 'contacter un utilisateur'],
  },
  clients: {
    objective: 'Évaluer l’activité et le risque de désengagement à partir des agrégats disponibles. Ne pas diagnostiquer ni identifier un client individuellement.',
    allowedFacts: ['comptages agrégés de séances sur 30 jours', 'comptage agrégé de clients actifs'],
    forbiddenActions: ['envoyer un message', 'modifier le dossier d’un client', 'déduire une situation médicale'],
  },
  nutrition: {
    objective: 'Analyser les journaux nutritionnels agrégés et signaler les manques de données. Les recommandations sensibles doivent être revues par un humain.',
    allowedFacts: ['nombre agrégé de repas saisis sur 7 jours'],
    forbiddenActions: ['prescrire un traitement ou un régime médical', 'modifier un plan nutritionnel', 'contacter un client'],
  },
  programmes: {
    objective: 'Analyser le nombre de programmes par état et signaler les contrôles à faire. Ne pas publier, valider ou réécrire un programme.',
    allowedFacts: ['comptages agrégés de programmes en attente, publiés et refusés'],
    forbiddenActions: ['publier ou valider un programme', 'modifier le programme d’un client'],
  },
  technique: {
    objective: 'Analyser seulement les tâches Cassandre disponibles et déclarer explicitement l’absence de journaux Netlify connectés.',
    allowedFacts: ['comptages agrégés de tâches Cassandre'],
    forbiddenActions: ['modifier une intégration ou un réglage', 'lire des secrets', 'déclencher un déploiement'],
  },
  finance: {
    objective: 'Présenter les indicateurs financiers réellement disponibles et distinguer estimation et vérification. Ne jamais inventer un MRR ou un montant de revenu.',
    allowedFacts: ['comptage de comptes clients associés à un identifiant d’abonnement'],
    forbiddenActions: ['payer, rembourser, annuler un paiement ou modifier un prix', 'présenter un montant non vérifié comme réel'],
  },
}
