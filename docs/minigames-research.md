# Bitmoji Party : règles, références et corrections

Recherche et comparaison du 10 septembre 2026. Périmètre : les **quatre mini-jeux de lancement** déjà présents dans ce dépôt. Ce document complète `bitmoji-party-reconstruction.md` ; ses hypothèses ne sont pas utilisées comme preuves historiques.

## Comment lire ce dossier

- **Confirmé** : explicitement décrit par un membre de l'équipe, l'annonce officielle ou un témoignage identifié.
- **Adaptation** : décision de programmation ou d'équilibrage de cette version, même si elle traduit un principe confirmé.
- **À vérifier** : détail sans preuve consultable suffisamment précise. Une miniature, une description de moteur de recherche ou le titre d'une vidéo ne prouve pas une commande.

Les recherches ont porté sur les titres exacts, les commandes, les témoignages, les articles de lancement, les portfolios de créateurs, les captures et les vidéos de joueurs. Les liens retrouvés sont conservés ci-dessous, y compris lorsqu'une ancienne archive ne répond plus. Les séquences vidéo n'ont pas pu être visionnées intégralement : aucun minutage de gameplay ni transcription n'est inventé.

## Sources textuelles effectivement consultées

| ID | Source | Apport et portée |
| --- | --- | --- |
| S1 | [Snap — annonce du 4 avril 2019](https://investor.snap.com/news/news-details/2019/Snap-Inc-Unveils-Snap-Games/default.aspx) | Source officielle : noms des quatre mini-jeux de lancement et jeu partagé avec avatars 3D. Ne donne pas les paramètres de collision ni les variantes d'attaque. |
| S2 | [Layton Hawkes — portfolio du Senior Game Designer](https://www.laytonhawkes.com/bitmoji-party) | Source de l'équipe : structure asymétrique, un Game Master choisi aléatoirement contre les autres joueurs ; intermission sociale avec piste de danse, boutique et cabine photo. |
| S3 | [GamesBeat — interview de Will Wu et John Imah, 1er juillet 2019](https://gamesbeat.com/why-snapchat-is-making-mobile-games-like-bitmoji-tennis/) | Démonstration par Snap : manches décrites comme durant 30 secondes ; infection après plusieurs secondes à proximité ; conversion en zombie ; humains gagnants à l'expiration du temps. Le texte mentionne déjà six mini-jeux à cette date : il ne décrit donc pas exclusivement la version du premier jour. |
| S4 | [Kobey Martin — Bitmoji Party Review, Gambo Games](https://gambogames.weebly.com/bitmoji-party-review.html) | Témoignage de joueur : jambe mécanique dans Kick Off, poursuite dans Zombie Escape, équilibre sur roue tournante dans Spin Session, lance-pierre et dalles qui coulent dans Pool Party. Décrit aussi l'absence de choix direct du mini-jeu. Date non affichée. Les jugements et affirmations commerciales du test ne servent pas de spécification. |
| S5 | [Los Angeles Times — reportage du 4 avril 2019](https://www.latimes.com/business/technology/la-fi-tn-snap-snapchat-announcements-keynote-evan-spiegel-20190404-story.html) | Le lance-pierre projette des jouets de piscine. |
| S6 | [PlayCanvas — présentation des jeux](https://playcanvas.com/industries/games) | Source du moteur d'origine : confirme la collection initiale. Ne décrit pas les commandes détaillées. |

## Pool Party

**Principe confirmé :** un joueur attaque au lance-pierre ; les autres évitent de tomber lorsque des dalles de piscine sont visées et coulent (S4).

| Point | Avant | Maintenant | Statut |
| --- | --- | --- | --- |
| Tir | Sphère apparaissant au-dessus de la cible et tombant verticalement | Jouet visible depuis le lance-pierre, trajectoire en cloche jusqu'à la dalle annoncée | Lance-pierre confirmé ; forme, courbe et vitesse adaptées |
| Impact | Dalle détruite, trou persistant et recul à proximité | Conservé ; impact et arrivée du projectile partagent le même délai | Principe S4 ; rayon, recul et persistance exacte à vérifier |
| Terrain | 36 plateformes flottantes colorées | Conservé | Nombre et dimensions adaptés, pas un relevé exact de l'original |
| Durée | 40 s | 30 s | Application du rythme décrit en S3 ; durée de chaque révision historique non vérifiée |
| Joueurs | Déplacement libre et saut | Conservé | Commandes navigateur adaptées |

**Références visuelles :** [capture indexée chez Elite Daily](https://www.elitedaily.com/news/best-snapchat-games), [ancienne capture CURVED](https://curved.de/news/snap-games-snapchat-laesst-euch-kostenlos-spiele-mit-freunden-zocken-652027), [article Webrazzi](https://webrazzi.com/2019/04/05/yeni-oyun-platformu-snap-games-ile-snapchat-eski-gunlerine-geri-donebilir/). Leur état d'accès figure dans le catalogue ci-dessous.

**À vérifier avant une nouvelle modification :** nombre exact de dalles, réapparition éventuelle, saut dans l'original, palette des projectiles, taille des zones touchées, charge du lance-pierre, cadence et commandes tactiles exactes.

## Zombie Escape

**Principe confirmé :** l'infection exige de rester près d'un humain, puis celui-ci rejoint la chasse ; les humains encore présents peuvent gagner au chrono (S3).

| Point | Avant | Maintenant | Statut |
| --- | --- | --- | --- |
| Infection | Conversion en 0,52 s | Conversion en 2 s de proximité, jauge au-dessus du personnage | Durée allongée d'après S3 ; valeur de 2 s choisie ici |
| Rupture du contact | Progression qui diminue à distance | Conservée et testée | Récupération adaptée, valeur historique inconnue |
| Propagation | Les infectés restent jouables | Conservée et vérifiée entre plusieurs générations de zombies | Principe confirmé |
| Obstacles | Murs et meubles empêchent le contact | Conservé ; impossible d'infecter à travers un mur | Contrainte de cette carte |
| Bots | Poursuite avec destinations espacées | Suivi continu d'une cible proche et visible, vitesse zombie de 4,9 contre 4,6 pour un humain | Équilibrage propre à la recréation pour permettre le contact prolongé |
| Carte | Manoir de 40 × 50 unités, caméra suiveuse et vision limitée | Conservé, soit 2 000 unités² / 400 unités² = **5× la surface de référence** | Demande utilisateur ; aucune mesure prétendue de la carte Snapchat |
| Durée | 60 s | 60 s | Exception volontaire pour le manoir XXL |

**Références visuelles à consulter :** [article Futurezone avec captures de lancement](https://futurezone.at/apps/mit-dieser-neuen-funktion-will-snapchat-seine-user-zurueckgewinnen/400458691), [bande-annonce officielle](https://www.youtube.com/watch?v=zlbRDJhUXwE), [vidéos intégrées par Layton Hawkes](https://www.laytonhawkes.com/bitmoji-party). Le plan détaillé et les consignes affichées n'ont pas pu être relevés dans ces archives pendant cette recherche.

**À vérifier :** temps exact par version, portée d'infection, cumul de plusieurs zombies, vitesse relative des équipes, sprint d'origine, vision et obstacles de la carte initiale. Le sprint et les meubles du manoir sont des adaptations conservées à la demande du projet.

## Kick Off

Le titre de lancement est **Kick Off** (S1). « Kickball » est traité ici comme une référence à ce mini-jeu, pas comme la preuve d'un cinquième jeu.

**Principe confirmé :** un joueur utilise une jambe mécanique pour frapper les autres (S4).

| Point | Avant | Maintenant | Statut |
| --- | --- | --- | --- |
| Attaque | Botte indépendante traversant le terrain comme un projectile | Ensemble mécanique ancré à l'arrière, préparation, extension et rétraction | Jambe mécanique confirmée ; construction télescopique et animation adaptées |
| Collision | Toucher pendant la traversée | Collision balayée pendant l'extension, un impact maximal par cible et par coup ; retour inoffensif | Règle précise choisie ici |
| Éjection | Recul trop faible pour menacer les bots au centre | Impulsion renforcée pour que toucher puisse faire sortir du terrain | Correction d'équilibrage, pas une valeur d'origine |
| Défense | Esquive latérale et saut | Conservés ; bots avec réactions imparfaites | Commandes et comportement adaptés |
| Durée | 40 s | 30 s | Rythme inspiré de S3 |

**Cas « speed / haut / bas » : non confirmé.** Les recherches avec le titre, ces termes et des variantes anglaises n'ont pas fourni de témoignage consultable établissant ces trois commandes. L'exemple fourni dans la demande est une méthode de travail, pas une source historique. Aucun bouton portant ces noms n'a donc été ajouté artificiellement. Cela ne prouve pas que ces commandes n'ont jamais existé.

**Images et vidéo à vérifier :** [bande-annonce Snap](https://www.youtube.com/watch?v=zlbRDJhUXwE), [Gameplay & Review sélectionné dans le portfolio du concepteur](https://www.youtube.com/watch?v=LGGvGkm1bDM), [branding et stickers retrouvés dans l'index d'images](https://www.audreybeale.com/bitmoji-party-final). Un sticker n'établit ni une hauteur de frappe ni une touche de commande.

**À vérifier :** orientation et articulation de la jambe, terrain exact, attaque haute/basse, réglage de vitesse, esquive accroupie éventuelle, balayage latéral, frappe chargée, cooldown. Une vidéo montrant l'écran du Game Master serait la meilleure prochaine preuve.

## Spin Session

**Principe confirmé :** maintenir son équilibre sur une roue qui tourne (S4). Le rôle asymétrique du Game Master est confirmé à l'échelle du jeu (S2), sans détail de ses boutons pour cette épreuve.

| Point | Avant | Maintenant | Statut |
| --- | --- | --- | --- |
| Danger | Disque tournant et barre balayeuse infligeant des impacts | Équilibre, transport par le disque et glissement vers le bord | Barre retirée car ajout de la recréation non étayé ; cela ne démontre pas son absence dans toutes les versions originales |
| Rotation | Décor et déplacement utilisaient des coefficients différents | Même vitesse angulaire de référence pour le disque et son transport | Correction de cohérence de simulation |
| Changement de sens | Inversion instantanée | Décélération, passage par zéro, puis accélération inverse | Inertie adaptée |
| Commandes du maître | Inverser, accélérer temporairement | Conservées | Réglage exact d'origine non confirmé |
| Durée | 40 s | 30 s | Rythme inspiré de S3 |

**Vidéo repérée :** [ChristineSky0524 — Snapchat Bitmoji Party | Spin Session](https://www.youtube.com/watch?v=s9rfPp2pU8k). Le titre est bien indexé, mais le lecteur était indisponible pendant la consultation. Ne pas en déduire des commandes non vues.

**À vérifier :** boutons du Game Master, sens et amplitude des rotations, inclinaison du plateau, accélération continue ou par paliers, obstacles éventuels, saut et conditions exactes d'élimination. Les paramètres de force, rayon et vitesse restent propres à cette version.

## Règles communes corrigées

- Le Game Master est désormais tiré au sort parmi les huit avatars à chaque manche, sans imposer le passage du joueur humain. Un même avatar peut être sélectionné plusieurs fois (structure aléatoire de S2).
- Une party mélange les quatre mini-jeux au lieu de toujours suivre le même ordre. Le fait de proposer chaque jeu exactement une fois en quatre manches reste un choix de cette recréation ; le témoignage S4 ne décrit pas cet algorithme.
- La partie rapide avec choix du rôle reste un accès d'entraînement pratique, pas une reproduction du menu décrit en S4.
- Le barème de points, les récompenses, le duo clavier, les bots, les sauts et les paramètres de mouvement sont des adaptations. Le multijoueur Snapchat n'est pas implémenté.

## Catalogue d'images et vidéos retrouvées

Ces liens servent à la recherche ; aucune image de Snap n'est intégrée comme texture ou avatar du jeu. « Indexé » signifie retrouvé par la recherche, pas visionné ni validé image par image. Les légendes automatiques des moteurs de recherche ne sont pas des preuves.

| Référence | Type / intérêt | État constaté |
| --- | --- | --- |
| [Snap — Introducing Bitmoji Party!](https://www.youtube.com/watch?v=zlbRDJhUXwE) | Bande-annonce officielle, direction artistique générale | Indexée et intégrée dans le portfolio S2 ; lecture complète non obtenue |
| [Gameplay & Review](https://www.youtube.com/watch?v=LGGvGkm1bDM) | Vidéo de joueur relayée par le concepteur | Page retrouvée ; vidéo non visionnée |
| [Spin Session — ChristineSky0524](https://www.youtube.com/watch?v=s9rfPp2pU8k) | Vidéo consacrée à ce mini-jeu | Indexée ; lecteur inaccessible pendant la recherche |
| [Layton Hawkes — miniature de sa vidéo](https://video.squarespace-cdn.com/content/v1/63f82c73ce019538c41e4d83/f519b1a5-f13c-45ce-a800-471d676516a6/thumbnail) | Lobby ; l'index montre une scène d'attente | Lien image résolu ; pas une preuve sur les attaques |
| [Elite Daily — capture de piscine](https://imgix.bustle.com/uploads/image/2020/2/14/fa4a7ea7-b013-428b-953c-73a33adc8888-untitled.jpg?auto=format%2Ccompress&crop=faces&fit=crop&h=864&w=414) | Plateformes et interface ; article général de sélection de jeux | Retrouvée dans l'index, téléchargement non obtenu |
| [Wccftech — écran titre](https://cdn.wccftech.com/wp-content/uploads/2019/05/SnapChatGame3-518x1030.png) | Menu et ambiance festive | Indexé ; pas de règle fine déduite |
| [Audrey Beale — grille de stickers](https://images.squarespace-cdn.com/content/v1/5ce985da915a3a0001039c39/1559097617684-5BZQ171GRYH5FWHVIJR0/bitmoji_sticker_grid.png) | Titres et communication visuelle, dont Kick Off et Spin Session | Image indexée ; page du portfolio renvoyant 404 |
| [Futurezone — image historique](https://image.futurezone.at/images/cfs_landscape_1232w_693h/3387154/snapchat-games-platform-launch.png) | Captures promotionnelles | Accès image refusé pendant cette recherche |
| [CURVED — ancienne image Pool Party](https://curved.de/media/cache/article_head/cms/2019/04/Snap-Games-Bitmoji-Party-2.jpg?v=2026022113) | Piscine et plateformes | Redirige désormais vers une page générique O2 ; inutilisable comme preuve directement consultée |
| [Webrazzi — ancienne image](https://cdn.webrazzi.com/uploads/2019/04/snapchat-games-platform-bitmoji-party-806.jpg) | Captures de lancement | Accès refusé |

Les autres noms de jeux apparaissant dans des articles ou des stickers ne sont pas automatiquement ajoutés : cette passe porte sur les quatre jeux demandés et déjà développés. Il faut dater chaque témoignage pour ne pas mélanger la sortie de 2019 et les ajouts ultérieurs.

## Validation et limites de cette livraison

Les tests de simulation vérifient les collisions, la conversion progressive, sa propagation, l'absence d'infection à travers un mur, la trajectoire du lance-pierre, la frappe mécanique, le saut, la rotation, les tirages de party, la connectivité du manoir et la terminaison des manches.

Sur cinq graines déterministes avec uniquement des bots, les survivants de Pool Party sont 5/3/6/4/6, ceux de Kick Off 0/2/1/2/0, ceux de Spin Session 6/6/6/7/6. Les zombies gagnent les cinq manches, entre 35,3 et 53,5 secondes. Ce petit échantillon révèle une difficulté différente selon les épreuves ; il ne constitue pas une validation d'équilibrage humain.

Le module Three.js tronqué dans le précédent transfert GitHub a également été restauré. L'intégrité des fichiers envoyés est contrôlée par leurs empreintes Git.

Pas de validation visuelle dans un navigateur pendant cette passe. Cette livraison ne prétend donc pas restituer tous les détails historiques : elle réduit les écarts démontrables et expose les informations manquantes pour les prochaines corrections.
