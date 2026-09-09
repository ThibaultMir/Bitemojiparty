# Bitemoji Party — Édition navigateur

Recréation jouable des quatre mini-jeux de lancement de Bitmoji Party, basée sur `bitmoji-party-reconstruction.md`. Les scènes, personnages, animations et règles de cette version sont des créations et adaptations originales ; aucun asset Snapchat n'est inclus.

## Jouer

Servir le dossier `dist` avec un serveur HTTP statique, par exemple `python3 -m http.server 8000 --directory dist`, puis ouvrir `http://localhost:8000`. Le jeu demande WebGL 2 et JavaScript ; les modules ES doivent être servis en HTTP, pas en `file://`.

Aucune installation de dépendance ni compilation n'est nécessaire. Three.js 0.180.0 est livré localement avec sa licence MIT. Aucun CDN, compte, serveur de matchmaking ou service externe n'est requis à l'exécution.

- **Solo** : un joueur et sept bots.
- **À deux** : deux joueurs sur le même clavier et six bots ; écran partagé dans le manoir.
- **Party complète** : Pool Party → Zombie Escape → Kick Off → Spin Session, intermissions dans le lobby et classement cumulé.
- **Partie rapide** : choix du mini-jeu et du rôle joueur / Game Master.
- **Avatar** : pseudo, huit couleurs de vêtements, six teints, quatre coiffures.
- **Lobby** : déplacements, danses, boutique de danses et photo PNG téléchargeable.
- **Progression locale** : pièces, danses et avatar conservés sur cet appareil, dans le stockage du navigateur.

## Commandes

| Action | Joueur 1 | Joueur 2 | Mobile |
| --- | --- | --- | --- |
| Déplacement / visée | ZQSD ou WASD | Flèches | Joystick |
| Saut / sprint / attaque | Espace | Entrée | Bouton d'action |
| Inverser le disque (Game Master) | F | Maj droite | Bouton Inverser |
| Danse | E | — | Bouton sourire |
| Pause | Échap ou P | — | Bouton pause |

Le Game Master de Pool Party ou Kick Off peut aussi viser avec la souris et cliquer pour tirer. Les commandes sont rappelées avant chaque manche. La partie se met en pause quand la fenêtre perd le focus ou que l'onglet est masqué.

## Règles implémentées

| Mini-jeu | Durée maximale | Survivants | Game Master |
| --- | --- | --- | --- |
| Pool Party | 40 s | Éviter les cibles et les bouées qui coulent ; sauter | Viser et tirer au lance-pierre sur les 36 bouées |
| Zombie Escape | 60 s | Fuir, sprinter, contourner les meubles | Infecter par contact soutenu ; les infectés rejoignent la chasse |
| Kick Off | 40 s | Esquiver ou sauter la botte, éviter l'éjection | Viser une colonne et déclencher la botte géante |
| Spin Session | 40 s | Compenser la rotation, sauter la barre, rester sur le disque | Inverser le disque et déclencher une accélération temporaire |

Un Game Master est attribué à chaque manche. Dans une party, les quatre rôles sont distribués sans répétition, en incluant le ou les joueurs humains. Les places restantes sont jouées par les bots. Un survivant ou un Game Master victorieux gagne 100 points ; les autres reçoivent des points de survie ou d'élimination. Les scores s'additionnent pendant la party.

## Manoir demandé

- 40 × 50 unités = 2 000 unités², soit **5 fois** la référence de 20 × 20 = 400 unités². Le facteur porte sur la surface, pas sur chaque dimension.
- Pièces et couloirs reliés, ouvertures de quatre unités, obstacles solides : murs bas, canapés, tables, armoires, cercueils et chaudrons.
- Caméra orthographique suiveuse ; brouillard local avec rayon de visibilité de 11 unités. Les autres personnages sont masqués derrière les obstacles.
- Deux caméras indépendantes en mode deux joueurs.
- Déplacement avec sous-pas anti-traversée ; navigation des bots sur une grille ; infection empêchée à travers les obstacles.
- Fantômes amicaux, citrouilles expressives, bougies et portraits pour un manoir cartoon plutôt qu'horrifique.

## Structure

- `dist/index.html`, `dist/style.css` : interface responsive et boîtes de dialogue natives.
- `dist/app.js` : contrôles, session, progression locale, score, sons et interface.
- `dist/world.js` : rendu Three.js, avatars procéduraux, scènes et caméras.
- `dist/simulation.js` : règles sans dépendance de rendu, collisions, navigation et bots.
- `dist/vendor/` : Three.js et licence, servis localement.
- `tests/simulation.test.js` : tests de règles, connectivité du manoir, collisions, infection, fin de manche et scores.
- `.openai/hosting.json` : identité du Site et dossier statique à publier.

## Validation

Exécuter `npm test` (Node.js, aucune dépendance de test supplémentaire). Les tests couvrent notamment le facteur de surface, l'accès à toutes les zones, les collisions, l'infection sans traversée de murs, la destruction des plateformes, les commandes locales et la terminaison des quatre mini-jeux.

Les sources JavaScript et les références aux fichiers locaux ont également été vérifiées. Aucune validation visuelle automatisée dans un navigateur n'a été exécutée pendant cette livraison. Les performances et l'ergonomie sont à confirmer sur les appareils cibles.

## Périmètre et références

Cette version restitue la boucle de jeu et les quatre modes de lancement. **Elle n'implémente pas de parties en ligne**, de chat vocal, d'authentification Snapchat ou d'import Bitmoji. Le multijoueur disponible est local sur le même clavier. Les durées, règles fines, carte agrandie et équilibrage sont des adaptations, et non les paramètres internes exacts du jeu de 2019.

- [Snap — annonce officielle et quatre mini-jeux](https://newsroom.snap.com/introducing-snap-games?lang=fr-FR)
- [Layton Hawkes — structure asymétrique, lobby et intermission](https://www.laytonhawkes.com/bitmoji-party)
- [Captures du jeu original — références visuelles](https://futurezone.at/apps/mit-dieser-neuen-funktion-will-snapchat-seine-user-zurueckgewinnen/400458691)
- [Captures de Pool Party](https://curved.de/news/snap-games-snapchat-laesst-euch-kostenlos-spiele-mit-freunden-zocken-652027)

Projet indépendant, non affilié à Snap Inc.
