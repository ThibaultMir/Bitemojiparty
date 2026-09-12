# Rooms multijoueurs

Cette version ajoute un serveur commun aux quatre mini-jeux. Un navigateur crée une room, partage son code à six chiffres ou son lien `?room=123456`, puis le créateur lance la partie. Aucun compte, téléchargement ou installation n’est demandé aux joueurs.

## Règles

Huit places par partie. Les places sans humain sont remplies par des bots. Une neuvième personne reçoit une erreur explicite. Les arrivées pendant une manche regardent cette manche et jouent à partir de la suivante. Rejouer depuis le classement est réservé au créateur, comme le premier lancement.

| Humains présents dans la liste de la manche | Chance de chaque humain | Chance de chaque bot |
| --- | --- | --- |
| 1 | 2/9 = 22,22 % | 1/9 = 11,11 % |
| 2 | 2/10 = 20 % | 1/10 = 10 % |
| 3 | 2/11 = 18,18 % | 1/11 = 9,09 % |
| 4 à 8 | 1 / nombre d’humains | 0 % |

Les places humaines réservées pendant une coupure restent humaines pour le tirage. Le bot prend seulement les commandes temporairement. Il n’y a pas de transfert des droits du créateur. Le tirage est renouvelé à chaque manche, avec répétitions possibles.

## Synchronisation et coupures

- `server/room.js` possède la simulation, les collisions, les éliminations et les scores. Les clients transmettent uniquement des commandes validées ; envoyer une position ou un score ne donne aucun pouvoir.
- Simulation à 60 pas par seconde, état complet envoyé 20 fois par seconde. Tous les mini-jeux passent par le même protocole.
- Numéros de séquence et identifiants de manche empêchent les doublons et les anciennes attaques. Historique de 12 pas (200 ms) pour recalculer les commandes retardées, avec les mêmes décisions aléatoires et les mêmes bots. Les scores sont confirmés après cette fenêtre.
- Les autres personnages et les obstacles sont affichés avec une interpolation de 75 ms. Les commandes des coureurs tiennent compte de cette image retardée. Une prédiction locale limitée rend le déplacement et le saut réactifs ; les collisions restent décidées par le serveur. Lorsque le délai dépasse le budget de correction, l’équité parfaite n’est pas garantie : les commandes trop anciennes sont rejetées.
- Commandes de déplacement neutralisées après 500 ms sans mise à jour. Relais par bot dès une déconnexion connue, ou après deux secondes sans nouvelles. Le retour reprend le même personnage et son état, sans annuler une élimination confirmée.
- Reconnexion automatique avec délais progressifs, détection des connexions silencieuses, état complet au retour. Une room disparue est signalée au lieu de boucler indéfiniment.
- Pause et passage en arrière-plan : la partie continue. Le bouton Reprendre rend la main au joueur. En mode local, la pause conserve son ancien fonctionnement.
- Le créateur dispose de deux minutes pour revenir. Son départ volontaire ferme la room. Les invités inactifs sont retirés après une minute dans le lobby ou le classement. Durée maximale d’une room : deux heures.
- SQLite conserve code, places, créateur, scores confirmés et ordre des jeux. Après un redémarrage du processus, la manche interrompue recommence avec cinq secondes de préparation et le même maître. Les scores acquis restent inchangés. Les arrivées tardives ne récupèrent pas une place active grâce au redémarrage.
- Un ralentissement serveur de plus d’une seconde suspend l’avancement du chrono ; il ne simule pas brutalement toute la durée manquée.

La session est un secret aléatoire de 256 bits conservé dans `sessionStorage`. Le serveur stocke son empreinte. Le lien partagé contient uniquement le code de la room. Recharger le même onglet conserve la place ; fermer définitivement cet onglet peut perdre la session, notamment celle du créateur. Une copie du même secret dans deux onglets remplace l’ancienne connexion, sans dédoubler le joueur.

## Démarrer sur un serveur Node.js

Depuis la racine, avec Node.js 24 et npm :

```sh
npm ci --omit=dev
npm start
```

Pour un essai sur cette machine, ouvrir `http://localhost:3000`. Pour un accès public, servir le même processus derrière un proxy HTTPS qui accepte les WebSockets et définir `APP_ORIGIN` exactement sur l’origine publique, par exemple `https://party.example.com`. Le jeu et son API partagent cette origine : aucun service tiers n’est nécessaire dans le navigateur.

| Variable | Valeur par défaut | Utilité |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP interne |
| `APP_ORIGIN` | origine HTTP de la requête | Origine autorisée ; obligatoire derrière HTTPS |
| `ROOM_DATABASE` | `data/rooms.sqlite` | Fichier situé sur un disque persistant |
| `MAX_ROOMS` | `64` | Limite d’admission ; à ajuster après mesure sur le serveur cible |
| `TRUST_PROXY` | désactivé | Mettre `1` uniquement si le port Node est inaccessible au public et qu’un proxy de confiance transmet l’adresse client |

Une seule instance Node possède les rooms et la base. Ne pas démarrer plusieurs réplicas indépendants derrière un répartiteur : ils ne partageraient pas la simulation en mémoire. Une extension à plusieurs machines demanderait un routage par room et une persistance partagée adaptée.

`GET /health` permet de vérifier que le processus répond. Les créations sont limitées à dix par adresse source et par tranche de dix minutes ; les nouvelles rooms sont refusées si la capacité configurée est atteinte. Les connexions et messages ont également des limites de taille et de fréquence. Ces garde-fous ne constituent pas une protection complète contre un déni de service distribué.

Le serveur remplace automatiquement `/multiplayer-config.js` par sa propre origine. Une publication statique de `dist` seule ne contient pas de serveur de rooms et affiche le multijoueur indisponible. Les routes `/__tests/*` sont réservées à Vite et sont absentes du serveur de production.

## Déploiement Docker avec HTTPS

Le dépôt fournit `Dockerfile`, `deploy/compose.yaml` et `deploy/Caddyfile`. Sur une machine équipée de Docker Compose, avec un domaine pointant vers cette machine et les ports 80/443 accessibles :

```sh
GAME_DOMAIN=party.example.com docker compose -f deploy/compose.yaml up -d --build
```

Remplacer le domaine d’exemple par le domaine réel. Le port de Node reste interne au réseau Docker. Le volume `rooms` conserve SQLite et les volumes du proxy conservent ses certificats. Sauvegarder ces données avec les mécanismes de l’hébergeur ; supprimer le volume des rooms perdrait les sessions sauvegardées. Le proxy Caddy prend en charge les connexions WebSocket. [Documentation Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Après installation : ouvrir le lien public dans deux navigateurs, créer/rejoindre, vérifier que seul le créateur lance, jouer une manche, couper puis rétablir une connexion et redémarrer le processus pendant une manche. Les commandes de validation locales sont documentées dans le [rapport de tests](multiplayer-validation.md).

Le paquet npm `ws` fournit le transport WebSocket ; `node:sqlite` fournit la base embarquée utilisée par le serveur. [Documentation ws](https://github.com/websockets/ws/blob/master/doc/ws.md), [documentation Node.js SQLite](https://nodejs.org/api/sqlite.html).

## État du déploiement

Le code, le serveur et les fichiers de déploiement sont fournis. Aucun serveur public Node/WebSocket n’a été provisionné pendant cette passe : les capacités d’hébergement accessibles pour le Site existant publient uniquement son dossier statique. Le multijoueur ne doit donc pas être présenté comme disponible sur l’ancien lien tant que le serveur ci-dessus n’a pas été déployé. Les joueurs devront accéder à une URL publique sans contrôle d’accès propriétaire.
