# Bitemoji Party — Édition navigateur

Recréation jouable des quatre mini-jeux de lancement de Bitmoji Party, basée sur `bitmoji-party-reconstruction.md`. Les scènes, personnages, animations et règles de cette version sont des créations et adaptations originales ; aucun asset Snapchat n'est inclus.

## Jouer

Servir le dossier `dist` avec un serveur HTTP statique, par exemple `python3 -m http.server 8000 --directory dist`, puis ouvrir `http://localhost:8000`. Le jeu demande WebGL 2 et JavaScript ; les modules ES doivent être servis en HTTP, pas en `file://`.

Aucune installation de dépendance ni compilation n'est nécessaire. Three.js 0.180.0 est livré localement avec sa licence MIT. Aucun CDN, compte, serveur de matchmaking ou service externe n'est requis à l'exécution.

- **Solo** : un joueur et sept bots.
- **À deux** : deux joueurs sur le même clavier et six bots ; écran partagé dans le manoir.
- **Party complète** : les quatre jeux dans un ordre aléatoire, intermissions dans le lobby et classement cumulé.
- **Partie rapide** : choix du mini-jeu et du rôle joueur / Game Master.
- **Avatar** : pseudo, huit couleurs de vêtements, six teints, quatre coiffures.
- **Lobby** : déplacements, danses, boutique de danses et photo PNG téléchargeable.
- **Progression locale** : pièces, danses et avatar conservés sur cet appareil, dans le stockage du navigateur.

## Commandes

| Action | Joueur 1 | Joueur 2 | Mobile |
| --- | --- | --- | --- |
| Déplacement / visée | ZQSD ou WASD | Flèches | Joystick |
| Saut / sprint / attaque (hors tir de piscine) | Espace | Entrée | Bouton d'action |
| Lance-pierre de piscine (Game Master) | Glisser puis relâcher à la souris | Même souris quand J2 est maître | Glisser puis relâcher au doigt |
| Inverser le disque (Game Master) | F | Maj droite | Bouton Inverser |
| Danse | E | — | Bouton sourire |
| Pause | Échap ou P | — | Bouton pause |

Dans Pool Party, le Game Master attrape la balle jaune en bas de l’écran, tire vers le bas puis relâche. La traction horizontale envoie la balle du côté opposé ; la traction verticale règle la portée. Il n’y a ni cible ni trajectoire de visée et les touches d’action ne tirent pas. Kick Off conserve la visée souris et le clic pour frapper. Les commandes sont rappelées avant chaque manche. La partie se met en pause quand la fenêtre perd le focus ou que l'onglet est masqué.

## Règles implémentées

| Mini-jeu | Durée maximale | Survivants | Game Master |
| --- | --- | --- | --- |
| Pool Party | 30 s | Surveiller la balle et sauter entre 10 pièces de 2 à 5 cases | Tirer puis relâcher le lance-pierre ; une pièce touchée coule en entier ; recharge 2,4 s |
| Zombie Escape | 60 s | Fuir, sprinter, contourner les meubles | Infecter après 2 secondes de proximité ; les infectés rejoignent la chasse |
| Kick Off | 30 s | Esquiver ou sauter la botte, éviter l'éjection | Aligner la jambe mécanique, frapper puis se rétracter |
| Spin Session (Disco) | 30 s | Courir gauche/droite à contre-sens sur la tranche d’une roue verticale | Inverser le disque et déclencher une accélération temporaire |

Un Game Master est attribué à chaque manche. Dans une party, le maître est tiré au sort parmi les huit avatars à chaque manche ; les répétitions sont possibles. Les places restantes sont jouées par les bots. Un survivant ou un Game Master victorieux gagne 100 points ; les autres reçoivent des points de survie ou d'élimination. Les scores s'additionnent pendant la party.

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

## Recherche et corrections

Voir [le dossier par mini-jeu](docs/minigames-research.md) pour les sources, images, vidéos, différences implémentées et incertitudes. Cette passe remplace la chute verticale de Pool Party par un tir depuis le lance-pierre, la botte volante par une jambe mécanique, allonge l’infection avec une jauge et retire la barre de Spin Session non étayée. Le tirage du Game Master devient aléatoire. Les modes « speed / haut / bas » de Kick Off restent non confirmés.

## Périmètre et références

Cette version restitue la boucle de jeu et les quatre modes de lancement. **Elle n'implémente pas de parties en ligne**, de chat vocal, d'authentification Snapchat ou d'import Bitmoji. Le multijoueur disponible est local sur le même clavier. Le rythme de 30 secondes et l’infection progressive sont inspirés de l’interview de Snap ; les valeurs fines, animations, carte agrandie et équilibrage restent des adaptations.

- [Snap — annonce officielle et quatre mini-jeux](https://newsroom.snap.com/introducing-snap-games?lang=fr-FR)
- [Layton Hawkes — structure asymétrique, lobby et intermission](https://www.laytonhawkes.com/bitmoji-party)
- [Captures du jeu original — références visuelles](https://futurezone.at/apps/mit-dieser-neuen-funktion-will-snapchat-seine-user-zurueckgewinnen/400458691)
- [Captures de Pool Party](https://curved.de/news/snap-games-snapchat-laesst-euch-kostenlos-spiele-mit-freunden-zocken-652027)

Projet indépendant, non affilié à Snap Inc.

### Correction Disco — 10 septembre 2026

La roue est verticale (diamètre 18, largeur 8), avec les sept joueurs sur sa tranche et une caméra de face surélevée. Maintenir gauche ou droite à contre-sens annule exactement l’entraînement de la roue ; courir dans son sens double le déplacement vers le vide. Sans commande, le joueur est emporté. Le Game Master inverse immédiatement le sens (F / Maj droite / bouton Inverser) et peut accélérer temporairement. Les bots réagissent avec un délai.

Dans ce mode, seuls gauche/droite servent aux coureurs : ni saut ni déplacement en profondeur. Le joystick mobile devient directionnel pour permettre une compensation complète. La chute commence au-delà de l’arc supérieur de sécurité, puis conserve la vitesse tangentielle du joueur. Les dimensions, vitesses et seuils sont des paramètres de cette adaptation.

### Piscine et commandes — 11 septembre 2026

Les 36 cases forment désormais dix pièces connectées : U, L, carré, T, zigzag, barre et dominos. Chaque pièce est un seul volume 3D et coule en entier. Une petite tolérance de 0,35 unité au bord facilite les impacts ; un tir dans l’eau ne se rabat jamais sur une pièce distante. La durée reste 30 secondes. La recharge passe de 1,15 à 2,4 secondes et commence au lancement, laissant environ douze occasions de tirer.

Les personnages ont un joystick sur écran tactile dans les quatre modes. Les maîtres ont les commandes de leur épreuve : lance-pierre tactile dans la piscine, joystick de visée et bouton de frappe dans Kick Off, inversion/accélération dans Disco, déplacement/sprint pour le zombie. Le clavier PC reste disponible ; le duo conserve ses commandes séparées et le maître utilise la souris dans la piscine, même si c’est J2.

Chaque contrôle conserve son propre identifiant de pointeur. Les gestes secondaires ne volent pas le joystick, ne relâchent pas une autre action et ne déclenchent pas un second tir. Annulation, perte de capture, pause, changement de manche, redimensionnement et perte de focus effacent les gestes en cours. Un relâchement pendant la recharge est rejeté et ne peut pas être rejoué à sa fin.

### Vérification des commandes

- `npm test` : 26 tests de simulation et de gestion des événements, dont clavier AZERTY/QWERTY, duo, gestes simultanés, annulations, limites de portée, pièces concaves, recharge et répétition des tirs.
- `npm install` puis `npm run dev` : serveur de développement Vite ; les fichiers de production restent les ressources statiques de `dist/`.
- Route de développement `/__tests/controls` : banc de test utilisant les vrais contrôles et leur CSS, avec formats PC, 390 × 844 et 844 × 390. Cette route et les tests ne sont pas inclus dans la publication statique.
- Essais navigateur : drag-and-drop souris, blocage d’un tir pendant la recharge, remise à zéro du joystick, inversion Disco et placement des commandes en portrait/paysage. Le tactile multipoint est simulé dans les tests d’événements ; aucun téléphone physique n’a été testé.
- Limite : le navigateur fourni désactive WebGL. Le rendu 3D complet n’a donc pas pu être vérifié visuellement ; le banc de test vérifie les commandes, pas le rendu.
- Vingt simulations avec uniquement des bots se terminent : quinze victoires du maître, cinq manches avec des survivants. Cet échantillon ne remplace pas une validation de difficulté avec des joueurs humains.
