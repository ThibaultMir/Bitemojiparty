# Bitmoji Party — Dossier complet de reconstruction

## Introduction

Bitmoji Party est un party game multijoueur 3D lancé par Snap dans le cadre de **Snap Games**.

Contrairement à une idée répandue, le jeu n'est pas sorti en 2018 mais le **4 avril 2019**, au moment du lancement officiel de Snap Games. Snap le présentait comme l'un de ses jeux first-party phares.

Source :
- Snap Inc. — Snap Games launch announcement  
  https://investor.snap.com/news/news-details/2019/Snap-Inc-Unveils-Snap-Games/default.aspx

L'objectif de ce document est de rassembler tout ce qui est nécessaire pour comprendre, analyser et potentiellement recréer l'expérience de Bitmoji Party avec des technologies modernes et une approche de développement largement assistée par IA.

---

# 1. Concept fondamental

Bitmoji Party est un **party game multijoueur temps réel sur mobile**, basé sur des mini-jeux très courts, simples à comprendre, sociaux et volontairement chaotiques.

Le joueur incarne son propre avatar Bitmoji en 3D.

Le concept peut être résumé ainsi :

> Plusieurs amis apparaissent sous la forme de leurs avatars Bitmoji et enchaînent des mini-jeux courts. Pour chaque manche, un joueur devient aléatoirement le **Game Master** et joue contre tous les autres.

Le designer Layton Hawkes décrit explicitement une structure **1-vs-Many**, avec un Game Master sélectionné aléatoirement.

Source :
- Layton Hawkes — Bitmoji Party  
  https://www.laytonhawkes.com/bitmoji-party

L'objectif de Snap n'était pas simplement de créer un jeu mobile compétitif traditionnel.

L'expérience cherchait surtout à recréer la sensation :

> être assis ensemble devant le même écran.

Snap Games permettait de lancer un jeu directement depuis une conversation Snapchat, sans téléchargement séparé, tout en continuant à utiliser les interactions sociales de Snapchat.

Source :
- Snap Newsroom — Introducing Snap Games  
  https://newsroom.snap.com/introducing-snap-games?lang=en-GB

---

# 2. Les piliers de design

Pour recréer correctement Bitmoji Party, on peut identifier six piliers de design essentiels.

## 2.1 Instantanéité

L'expérience doit réduire au maximum la friction.

La séquence idéale est :

```text
Chat
↓
Lancer le jeu
↓
Les amis rejoignent
↓
La partie commence
```

Pas de long téléchargement.

Pas de configuration complexe.

Pas de tutoriel interminable.

Les jeux Snap étaient directement disponibles dans Snapchat.

Source :
- Snap Newsroom  
  https://newsroom.snap.com/introducing-snap-games?lang=fr-FR

---

## 2.2 L'avatar du joueur est le héros

Le joueur n'incarne pas un personnage générique.

Il incarne une version cartoon de lui-même.

C'est un élément émotionnel important.

Voir son propre avatar :

- tomber dans une piscine ;
- devenir zombie ;
- se faire éjecter ;
- danser ;
- gagner ;
- faire une pose ridicule ;

est beaucoup plus personnel et amusant que jouer un personnage anonyme.

Cette personnalisation est l'un des éléments centraux de l'identité de Bitmoji Party.

---

## 2.3 Contrôles extrêmement simples

Les mini-jeux sont conçus pour être compris immédiatement.

Les contrôles doivent fonctionner avec peu d'actions :

- déplacement tactile ;
- tap ;
- drag ;
- maintien ;
- relâchement.

Par exemple, Zombie Escape utilisait un déplacement tactile simple.

Source :
- GamesBeat  
  https://gamesbeat.com/why-snapchat-is-making-mobile-games-like-bitmoji-tennis/

---

## 2.4 Parties très courtes

Les mini-jeux durent volontairement très peu de temps.

La boucle émotionnelle recherchée est davantage :

```text
anticipation
↓
chaos
↓
réaction sociale
↓
résultat
↓
revanche
```

que :

```text
apprentissage complexe
↓
maîtrise
↓
optimisation
```

Les manches peuvent être pensées autour d'une durée d'environ 20 à 60 secondes selon le mini-jeu.

---

## 2.5 Asymétrie

Le principe fondamental de Bitmoji Party est :

```text
1 Game Master
VS
Tous les autres joueurs
```

Le Game Master n'a pas le même objectif ni les mêmes capacités.

Cela produit une dynamique très différente d'un jeu où tous les joueurs ont exactement les mêmes pouvoirs.

---

## 2.6 Le social est aussi important que la compétition

Bitmoji Party ne se limite pas aux mini-jeux.

Layton Hawkes décrit une phase d'intermission dédiée aux interactions sociales.

Cette phase pouvait inclure :

- photobooth ;
- piste de danse ;
- boutique intégrée à l'environnement 3D.

Source :
- Layton Hawkes  
  https://www.laytonhawkes.com/bitmoji-party

Une recréation fidèle ne devrait donc pas être une simple suite de mini-jeux.

Elle devrait contenir un espace social.

---

# 3. Structure générale d'une partie

Une session de Bitmoji Party peut être reconstruite autour de la boucle suivante :

```text
OUVERTURE DU JEU
      ↓
LOBBY / PARTY
      ↓
Les joueurs rejoignent
      ↓
Matchmaking éventuel
      ↓
Sélection du Game Master
      ↓
Présentation du mini-jeu
      ↓
Compte à rebours
      ↓
Mini-jeu
      ↓
Résultat
      ↓
Classement
      ↓
Récompenses
      ↓
Intermission sociale
      ↓
Mini-jeu suivant
```

---

# 4. Nombre de joueurs

Un écran documenté du jeu indique :

> Play with up to 7 friends! Remaining slots will be filled with guests.

Cela implique un maximum de :

```text
1 joueur local
+
7 amis
=
8 joueurs
```

Source :
- Layton Hawkes  
  https://www.laytonhawkes.com/bitmoji-party

Pour une recréation :

```text
MIN_PLAYERS = 2
MAX_PLAYERS = 8
```

Les places manquantes peuvent être remplies par :

- invités ;
- joueurs publics ;
- bots.

---

# 5. Les quatre mini-jeux de lancement

Snap confirme quatre mini-jeux principaux au lancement :

1. Pool Party
2. Kick Off
3. Spin Session
4. Zombie Escape

Source :
- Snap Newsroom  
  https://newsroom.snap.com/introducing-snap-games?lang=fr-FR

Tous reposent globalement sur une structure :

```text
Game Master
VS
Groupe
```

---

# 6. Pool Party

## 6.1 Concept

Pool Party se déroule autour d'une piscine.

Les joueurs normaux se déplacent sur une zone composée de plateformes ou de dalles flottantes.

Le Game Master est placé à l'extérieur de cette zone.

---

## 6.2 Objectif du Game Master

Le Game Master contrôle une sorte de :

- lance-pierre géant ;
- canon ;
- dispositif projetant des objets de piscine.

Son objectif est de faire tomber les autres joueurs dans l'eau.

Le Los Angeles Times décrit explicitement le Game Master contrôlant un gros lance-pierre.

Source :
- Los Angeles Times  
  https://www.latimes.com/business/technology/la-fi-tn-snap-snapchat-announcements-keynote-evan-spiegel-20190404-story.html

Une autre critique décrit la mécanique comme consistant à tirer sur les plateformes pour éliminer les autres joueurs.

Source :
- Gambo Games review  
  https://gambogames.weebly.com/bitmoji-party-review.html

---

## 6.3 Objectif des autres joueurs

Les autres joueurs doivent :

- courir ;
- observer les attaques ;
- changer de position ;
- éviter les zones ciblées ;
- rester sur les plateformes.

Condition principale :

```text
tomber dans l'eau
=
élimination
```

---

## 6.4 Rythme

Une capture du jeu montre une manche avec environ 19 secondes restantes.

Cela confirme le caractère très court des manches.

Source :
- Curved  
  https://curved.de/news/snap-games-snapchat-laesst-euch-kostenlos-spiele-mit-freunden-zocken-652027

---

## 6.5 Proposition de reconstruction

```text
24 à 36 plateformes
↓
Game Master choisit une zone
↓
Indicateur visuel d'attaque
↓
Délai de télégraphe
↓
Projectile lancé
↓
Impact
↓
Plateforme secouée / détruite
↓
Joueur touché
↓
Knockback
↓
Chute dans l'eau
↓
Élimination
```

Le rythme peut accélérer progressivement.

---

# 7. Zombie Escape

## 7.1 Concept

Zombie Escape fonctionne comme une variante de :

- tag ;
- infection ;
- chasse.

Au début :

```text
1 zombie
+
plusieurs humains
```

Le zombie est généralement le Game Master.

---

## 7.2 Objectif du zombie

Le zombie doit poursuivre les humains.

Lorsqu'il reste suffisamment près d'un joueur pendant un certain temps, celui-ci devient à son tour zombie.

Source :
- GamesBeat  
  https://gamesbeat.com/why-snapchat-is-making-mobile-games-like-bitmoji-tennis/

---

## 7.3 Propagation

```text
1 zombie
7 humains
↓
infection
↓
2 zombies
6 humains
↓
infection
↓
3 zombies
5 humains
↓
...
```

Chaque joueur infecté rejoint l'équipe zombie.

---

## 7.4 Condition de victoire

### Zombies

Convertir tous les humains avant la fin du chrono.

### Humains

Avoir au moins un survivant lorsque le chrono expire.

GamesBeat décrit une situation où le temps expire alors que des humains restent encore en vie, ce qui entraîne leur victoire.

---

## 7.5 Pourquoi cette mécanique fonctionne socialement

Zombie Escape produit naturellement des histoires entre joueurs :

> Tu m'as infecté, puis on a poursuivi quelqu'un d'autre ensemble.

Ce type d'interaction crée des souvenirs sociaux et des réactions spontanées.

---

# 8. Kick Off

## 8.1 Concept

Kick Off repose sur une idée volontairement absurde.

Le Game Master contrôle une gigantesque :

- jambe ;
- botte ;
- structure mécanique de frappe.

Les autres joueurs se trouvent dans une arène.

---

## 8.2 Objectif du Game Master

Faire sortir les autres joueurs de la zone.

Une critique contemporaine décrit Kick Off comme un mode dans lequel une personne tente de frapper les autres avec une jambe mécanique.

Source :
- Gambo Games  
  https://gambogames.weebly.com/bitmoji-party-review.html

---

## 8.3 Reconstruction probable

```text
Joueurs
→ déplacement libre

Game Master
→ choisit direction
→ charge
→ déclenche un kick
→ zone d'impact
→ knockback
→ joueurs éjectés
```

---

## 8.4 Principes d'animation

La physique doit être volontairement cartoon.

Utiliser :

- anticipation exagérée ;
- squash & stretch ;
- ragdoll ;
- gros knockback ;
- réactions faciales ;
- poses absurdes.

Le fun visuel est plus important que le réalisme.

---

# 9. Spin Session

## 9.1 Concept

Les joueurs sont placés sur une plateforme circulaire ou une roue tournante.

Une critique décrit le mini-jeu comme une épreuve où il faut garder son équilibre sur une roue en rotation.

Source :
- Gambo Games  
  https://gambogames.weebly.com/bitmoji-party-review.html

---

## 9.2 Objectif

Les joueurs doivent éviter de tomber.

La plateforme :

- tourne ;
- accélère ;
- peut changer de direction ;
- peut devenir instable.

---

## 9.3 Reconstruction possible

```text
Plateforme tourne
↓
Vitesse augmente
↓
Sens change
↓
Joueurs compensent
↓
Collisions
↓
Glissade
↓
Chute
↓
Élimination
```

---

## 9.4 Physique recommandée

La simulation n'a pas besoin d'être réaliste.

On peut utiliser une combinaison artificielle de :

```text
velocity plateforme
+
velocity joueur
+
force centrifuge arcade
+
collisions
+
impulsions
```

---

# 10. Sélection du Game Master

Layton Hawkes confirme que le Game Master était sélectionné aléatoirement.

Source :
- https://www.laytonhawkes.com/bitmoji-party

Pour une recréation moderne, un simple random peut être frustrant.

Une version plus équitable pourrait être :

```pseudo
candidates = players.sortedBy(numberOfTimesGameMaster)

subset = playersWithLowestGMCount(candidates)

gameMaster = random(subset)
```

Ainsi, chaque joueur a régulièrement accès au rôle spécial.

---

# 11. Lobby et matchmaking

Le lobby semble faire partie intégrante du jeu.

Un écran montre :

> Finding Players...

puis :

> Play with up to 7 friends! Remaining slots will be filled with guests.

Source :
- Layton Hawkes  
  https://www.laytonhawkes.com/bitmoji-party

L'idée importante est que les avatars sont déjà présents dans un espace 3D.

Le lobby n'est donc pas simplement :

```text
Alice
Bob
Charlie
David
```

mais plutôt :

```text
Alice      Bob

      You

Charlie    David
```

Les joueurs existent déjà physiquement dans le monde.

---

# 12. Lobby social 3D

Pour une recréation, le lobby devrait être un véritable espace de rencontre.

Les joueurs peuvent :

- marcher ;
- regarder les autres ;
- utiliser des emotes ;
- danser ;
- attendre la partie.

Cela rend l'attente elle-même amusante.

---

# 13. Intermission sociale

Layton Hawkes décrit une phase dédiée aux interactions sociales entre les mini-jeux.

Elle peut contenir :

- photobooth ;
- dance floor ;
- shop ;
- interactions libres.

Source :
- https://www.laytonhawkes.com/bitmoji-party

---

# 14. Photobooth

Le photobooth permet aux joueurs de se regrouper.

Fonctionnement probable :

```text
entrer dans le photobooth
↓
avatars se positionnent
↓
poses automatiques
↓
compte à rebours
↓
photo
↓
souvenir partagé
```

Ce mécanisme est particulièrement intéressant car il transforme la session de jeu en souvenir social.

---

# 15. Dance Floor

La piste de danse permet aux joueurs :

- de lancer des animations ;
- d'utiliser des mouvements débloqués ;
- d'interagir sans objectif compétitif.

Cela donne un espace de respiration entre les manches.

---

# 16. Boutique physique

La boutique pouvait être intégrée directement dans l'environnement 3D.

Au lieu d'un simple menu :

```text
SHOP
```

le joueur peut approcher physiquement une zone ou un vendeur.

Cela renforce la sensation d'un monde partagé.

---

# 17. Emotes et danses

La bande-annonce officielle de Bitmoji Party mentionne notamment :

> unlock some new dance moves

Source :
- YouTube  
  https://www.youtube.com/watch?v=zlbRDJhUXwE

Cela implique une progression autour de :

- danses ;
- emotes ;
- éléments sociaux.

---

## 17.1 Structure possible

```text
Player
├── Avatar
├── Emotes
│   ├── Wave
│   ├── Clap
│   ├── Laugh
│   └── Angry
└── Dances
    ├── Dance_01
    ├── Dance_02
    └── Dance_03
```

---

# 18. Score et récompenses

Des captures montrent un écran de résultat avec :

- classement ;
- avatar ;
- nom ;
- position ;
- monnaie.

Source :
- Yen.com.gh  
  https://yen.com.gh/facts-lifehacks/196880-20-fun-snapchat-games-play-by-friends/

Exemple :

```text
1st  Player A   20 coins
1st  You        20 coins
3rd  Player C   10 coins
```

---

## 18.1 Deux systèmes à séparer

### Score de manche

Détermine le classement temporaire.

### Monnaie persistante

Permet éventuellement d'acheter :

- danses ;
- emotes ;
- accessoires ;
- cosmétiques.

---

# 19. Monétisation originale

Snap Games utilisait notamment des publicités récompensées.

Les utilisateurs pouvaient regarder une publicité courte en échange de :

- monnaie ;
- bonus ;
- power-up ;
- récompense.

Source :
- Los Angeles Times  
  https://www.latimes.com/business/technology/la-fi-tn-snap-snapchat-announcements-keynote-evan-spiegel-20190404-story.html

Pour un MVP de reconstruction, ce système n'est pas nécessaire.

Une boucle simple suffit :

```text
partie
↓
XP
↓
coins
↓
cosmétiques
```

---

# 20. Interface utilisateur

Bitmoji Party est pensé pour smartphone.

L'expérience doit donc fonctionner principalement en portrait.

Une structure approximative :

```text
┌─────────────────────┐
│                     │
│                     │
│       GAME 3D       │
│                     │
│                     │
├─────────────────────┤
│ Chat / Voice / UI   │
└─────────────────────┘
```

---

# 21. Intégration sociale

Snap indique que les joueurs pouvaient :

- voir leurs amis ;
- envoyer des chats ;
- utiliser le chat vocal ;
- jouer simultanément.

Source :
- Snap Newsroom  
  https://newsroom.snap.com/introducing-snap-games?lang=en-GB

Une recréation moderne peut réserver :

```text
75 à 85 % de l'écran
=
jeu

15 à 25 % de l'écran
=
couche sociale
```

---

# 22. Direction artistique

Le style visuel repose sur :

- formes arrondies ;
- couleurs saturées ;
- matériaux simples ;
- peu de textures complexes ;
- éclairage doux ;
- environnement cartoon ;
- proportions exagérées ;
- animations expressives.

---

# 23. Objectif technique de la direction artistique

Ce style est également très efficace techniquement.

Il permet :

- faible coût GPU ;
- modèles peu complexes ;
- petites textures ;
- chargements rapides ;
- compatibilité mobile.

Un intervenant PlayCanvas a évoqué Bitmoji Party comme exemple de jeu capable d'afficher plusieurs personnages tout en restant performant sur mobile.

Source :
- PlayCanvas forum  
  https://forum.playcanvas.com/t/playcanvas-getting-adopted-by-professional-betting-studio-questions/17343

---

# 24. Technologie originale

## 24.1 PlayCanvas

Bitmoji Party a été développé avec PlayCanvas.

PlayCanvas indique :

> The PlayCanvas Engine is the beating heart of Snap Games.

Bitmoji Party apparaît également dans les showcases PlayCanvas.

Sources :
- https://dev.playcanvas.com/industries/games
- https://blog.playcanvas.com/playcanvas-showcase-2021/

---

## 24.2 Stack probable

Cela implique une architecture largement basée sur :

```text
JavaScript
+
HTML5
+
WebGL
+
PlayCanvas
```

Le jeu avait donc l'apparence d'une expérience mobile native tout en reposant sur une technologie web 3D.

---

# 25. Localisation

PlayCanvas a utilisé Bitmoji Party comme exemple de contenu localisé.

Le jeu existait notamment en :

- anglais ;
- français ;
- espagnol.

Source :
- PlayCanvas blog  
  https://blog.playcanvas.com/page/8/

---

## 25.1 Architecture de localisation recommandée

Les textes ne doivent jamais être codés directement dans les scènes.

Exemple :

```json
{
  "game.start": "GO!",
  "game.you_are_out": "You are out!",
  "results.winner": "WINNER",
  "lobby.finding_players": "Finding Players..."
}
```

---

# 26. Architecture multijoueur recommandée

Une reconstruction moderne devrait utiliser une logique de serveur autoritaire.

```text
                     ┌──────────────┐
                     │ Matchmaking  │
                     └──────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Game Session  │
                    │    Server     │
                    └───────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
      Player A          Player B          Player C
      Browser           Browser           Browser
```

---

# 27. Responsabilités serveur

Le serveur doit gérer :

```text
room
players
gameMaster
currentMinigame
timer
playerStates
importantCollisions
score
roundResults
```

---

# 28. Responsabilités client

Le client gère :

```text
input
camera
animations
FX
interpolation
UI
audio
```

---

# 29. Modèle réseau possible

```ts
interface GameState {
  roomId: string;

  phase:
    | "lobby"
    | "intro"
    | "playing"
    | "results"
    | "intermission";

  minigame:
    | "poolParty"
    | "kickOff"
    | "spinSession"
    | "zombieEscape";

  gameMasterId: string;

  remainingTime: number;

  players: PlayerState[];
}
```

---

## 29.1 Joueur

```ts
interface PlayerState {
  id: string;
  name: string;

  position: Vector3;
  rotation: Quaternion;

  alive: boolean;

  team?: "human" | "zombie";

  score: number;
  coins: number;

  emote?: string;
}
```

---

# 30. Architecture des mini-jeux

Il faut éviter de développer chaque mini-jeu comme une application indépendante.

Une interface commune peut être utilisée.

```ts
interface Minigame {
  load(): Promise<void>;

  start(players: Player[]): void;

  update(dt: number): void;

  handleInput(
    player: Player,
    input: PlayerInput
  ): void;

  isFinished(): boolean;

  getResults(): Result[];

  unload(): void;
}
```

---

# 31. Minigame Manager

```text
MinigameManager
├── PoolParty
├── KickOff
├── SpinSession
└── ZombieEscape
```

Cela rend beaucoup plus simple l'ajout de nouveaux mini-jeux générés ou assistés par IA.

---

# 32. Le véritable système derrière Bitmoji Party

La mécanique fondamentale n'est pas un mini-jeu précis.

Le système principal est :

```text
ASYMMETRIC PARTY MINIGAME FRAMEWORK
```

Chaque mini-jeu doit avoir :

### Rôle A

Un joueur avec un pouvoir spectaculaire.

### Rôle B

Tous les autres tentent de survivre ou d'accomplir un objectif opposé.

---

# 33. Exemples

```text
Game Master             Others

Zombie                  Humans
Slingshot               Swimmers
Mechanical Foot         Runners
Spinning Machine        Survivors
```

---

# 34. Extension avec de nouveaux mini-jeux

Ce framework permet d'imaginer rapidement :

```text
Snowball Cannon         Skiers
Giant Vacuum            Tiny Players
UFO                      Farmers
Shark                    Swimmers
Dragon                   Knights
Giant Cat                Mice
Laser Controller         Runners
```

Chaque mini-jeu peut rester :

- très simple ;
- très lisible ;
- très court ;
- très spectaculaire.

---

# 35. Pourquoi ce design est adapté au développement avec IA

Bitmoji Party est particulièrement adapté à une production assistée par IA.

Chaque mini-jeu :

- utilise peu de règles ;
- dispose d'un environnement réduit ;
- réutilise les mêmes personnages ;
- réutilise les mêmes contrôles ;
- utilise la même architecture réseau ;
- dure moins d'une minute ;
- possède une condition de victoire claire.

---

## 35.1 Architecture modulaire

```text
Core Engine
     │
     ├── Networking
     ├── Avatar
     ├── Movement
     ├── Lobby
     ├── Scoring
     ├── GameMaster
     └── Minigame API
             │
             ├── AI generated game 01
             ├── AI generated game 02
             ├── AI generated game 03
             └── ...
```

---

# 36. MVP recommandé

Il serait risqué de tenter de reproduire immédiatement l'intégralité du jeu.

Une roadmap progressive est préférable.

---

## Version 0.1

```text
Web app
+
4 joueurs
+
avatars génériques
+
multiplayer
+
Zombie Escape
```

Objectif :

valider le networking, les mouvements et la boucle de partie.

---

## Version 0.2

Ajouter :

```text
Pool Party
Game Master rotation
score
round transitions
```

---

## Version 0.3

Ajouter :

```text
8 joueurs
lobby
guests / bots
results
coins
```

---

## Version 0.4

Ajouter :

```text
Kick Off
Spin Session
```

---

## Version 0.5

Ajouter :

```text
dance floor
emotes
photo booth
shop
```

À ce stade, la majeure partie de l'expérience Bitmoji Party est reproduite.

---

# 37. Stack moderne recommandée

Puisque l'original utilisait PlayCanvas, il est parfaitement logique de rester sur une stack web.

Deux options sont particulièrement pertinentes.

---

## Option A — PlayCanvas

```text
PlayCanvas
+
TypeScript / JavaScript
+
WebSocket
```

Avantages :

- proche de la philosophie originale ;
- WebGL natif ;
- bon support mobile ;
- assets simples ;
- déploiement web direct.

---

## Option B — Three.js / React Three Fiber

```text
TypeScript
+
React
+
Three.js
+
React Three Fiber
```

Avantages :

- énorme écosystème JavaScript ;
- développement facilement assisté par IA ;
- intégration UI web simple ;
- excellente modularité.

---

# 38. Serveur

Une stack serveur simple :

```text
Node.js
+
Colyseus
+
WebSocket
```

Colyseus est particulièrement adapté aux jeux multijoueurs temps réel orientés rooms.

---

# 39. Base de données

Pour la progression :

```text
PostgreSQL
```

ou :

```text
Supabase
```

Données possibles :

```text
users
avatars
inventory
coins
emotes
dances
match_history
unlocks
```

Pour un MVP, la base de données peut être ignorée.

---

# 40. Authentification

On peut commencer très simplement :

```text
anonymous user
↓
username
↓
avatar config
```

Puis ajouter ensuite :

- email ;
- OAuth ;
- compte permanent.

---

# 41. Avatar system

Une recréation commerciale ne doit pas dépendre de Bitmoji.

Il faut construire son propre système d'avatar.

Composants possibles :

```text
head
hair
eyes
eyebrows
nose
mouth
skin
shirt
pants
shoes
accessories
```

Les avatars doivent partager un même rig afin de réutiliser toutes les animations.

---

# 42. Attention à la propriété intellectuelle

Le concept général d'un party game asymétrique peut servir d'inspiration.

Cependant, pour une publication commerciale, il faut éviter de copier directement :

- le nom Bitmoji Party ;
- la marque Bitmoji ;
- la marque Snapchat ;
- les logos ;
- les assets ;
- les personnages ;
- les animations exactes ;
- les décors exacts ;
- les sons ;
- les interfaces exactes.

---

# 43. Positionnement recommandé

Plutôt qu'un clone exact :

```text
Bitmoji Party
↓
inspiration
↓
successeur spirituel
```

Exemples de concepts de nom :

```text
Avatar Party
MiniMe Party
Toon Party
Pocket Party
```

L'idéal est de reprendre :

- la philosophie ;
- la structure ;
- la rapidité ;
- l'asymétrie ;
- la dimension sociale ;

mais pas les éléments protégés.

---

# 44. Fiche produit pour une IA de développement

Description concise pouvant être donnée à un agent de code :

> Créer un party game multijoueur 3D en portrait pour 2 à 8 joueurs. Chaque joueur possède un avatar cartoon personnalisé. Une session consiste en une succession de mini-jeux de 20 à 60 secondes. Dans chaque mini-jeu, un joueur est sélectionné comme Game Master et joue contre tous les autres avec des mécaniques asymétriques. Les contrôles doivent fonctionner avec un seul doigt. Après chaque manche, afficher un classement et attribuer des coins. Entre les manches, placer les joueurs dans un hub social permettant de marcher, utiliser des emotes, danser et prendre des photos. La priorité est donnée aux interactions sociales, au chaos, aux animations humoristiques et à l'accessibilité plutôt qu'à la profondeur compétitive.

---

# 45. Contraintes techniques suggérées

```text
Platform: mobile web
Orientation: portrait
Players: 2-8
Networking: realtime
Round duration: 20-60 sec
Input complexity: <= 2 actions
Session duration: 5-15 min
Rendering: stylized low-poly 3D
Target: 60 FPS modern phone / 30 FPS low-end
Game structure: 1-vs-Many
```

---

# 46. États de jeu

Un state machine simple peut gérer l'ensemble :

```text
BOOT
↓
AUTH
↓
LOBBY
↓
MATCHMAKING
↓
MINIGAME_INTRO
↓
PLAYING
↓
RESULTS
↓
INTERMISSION
↓
NEXT_MINIGAME
```

---

# 47. Système de session

```ts
type SessionPhase =
  | "boot"
  | "lobby"
  | "matchmaking"
  | "intro"
  | "playing"
  | "results"
  | "intermission"
  | "ended";
```

---

# 48. Système de round

```ts
interface Round {
  id: string;
  minigameId: string;
  gameMasterId: string;
  startedAt: number;
  duration: number;
  results?: RoundResult[];
}
```

---

# 49. Résultat

```ts
interface RoundResult {
  playerId: string;
  rank: number;
  score: number;
  coinsEarned: number;
}
```

---

# 50. Philosophie UX

Chaque mini-jeu doit pouvoir être compris en environ trois secondes.

Avant une manche :

```text
YOU ARE THE ZOMBIE
INFECT EVERYONE!
```

ou :

```text
SURVIVE!
DON'T FALL IN THE WATER
```

Éviter :

- longs paragraphes ;
- tutoriels vidéo ;
- menus complexes.

---

# 51. Télégraphie visuelle

Les attaques du Game Master doivent être extrêmement lisibles.

Exemple Pool Party :

```text
zone ciblée
↓
cercle / highlight
↓
0.5 à 1 seconde
↓
attaque
```

Le joueur doit comprendre pourquoi il a perdu.

---

# 52. Juice visuel

Le jeu doit exagérer les réactions.

Ajouter :

- camera shake ;
- particules ;
- freeze frames très courts ;
- bruitages cartoon ;
- réactions faciales ;
- animations ragdoll ;
- trails ;
- impacts.

---

# 53. Audio

L'audio doit soutenir la lisibilité.

Catégories :

```text
UI
movement
impact
warning
countdown
victory
defeat
emotes
ambient
music
```

---

# 54. Compte à rebours

Chaque manche peut commencer avec :

```text
3
2
1
GO!
```

Puis :

```text
10 SECONDS!
```

et :

```text
3
2
1
TIME!
```

Cela améliore l'anticipation sociale.

---

# 55. Caméra

La caméra doit privilégier :

- visibilité ;
- compréhension ;
- anticipation.

Elle ne doit pas chercher un réalisme cinématographique complexe.

Dans les jeux de survie :

- caméra légèrement en hauteur ;
- vue suffisamment large ;
- focalisation sur la zone dangereuse.

---

# 56. Réseau

Pour un jeu à huit joueurs, il n'est pas nécessaire d'envoyer toute la simulation à très haute fréquence.

On peut utiliser :

```text
client input
↓
server simulation
↓
snapshots
↓
client interpolation
```

Les événements critiques doivent être autoritaires :

- infection ;
- élimination ;
- score ;
- Game Master action ;
- fin de manche.

---

# 57. Bots

Les bots sont très utiles pour le MVP.

Ils permettent :

- de remplir les parties ;
- de tester sans huit joueurs ;
- d'accélérer QA ;
- de simuler la charge réseau.

---

# 58. Bot Zombie Escape

Comportement humain :

```text
repérer zombie le plus proche
↓
calculer direction opposée
↓
éviter obstacles
↓
ajouter légère erreur
```

Comportement zombie :

```text
choisir humain proche
↓
poursuivre
↓
maintenir proximité
↓
infecter
```

---

# 59. Bot Pool Party

```text
détecter zone télégraphiée
↓
calculer plateforme sûre
↓
se déplacer
↓
ajouter temps de réaction aléatoire
```

---

# 60. Métriques à mesurer

Pour améliorer les mini-jeux :

```text
round_completion_rate
average_round_duration
player_elimination_time
game_master_win_rate
survivor_win_rate
rematch_rate
session_duration
minigame_skip_rate
```

---

# 61. Équilibrage

Chaque mini-jeu doit tendre vers un résultat où aucune équipe ne gagne systématiquement.

Exemple :

```text
Game Master win rate ≈ 40 à 60 %
```

Une domination constante rendrait les rôles frustrants.

---

# 62. Génération de mini-jeux par IA

Une IA peut produire des mini-jeux à partir d'un template.

Prompt conceptuel :

```text
Create a 1-vs-many minigame.

Game Master:
one unique powerful mechanic.

Other players:
simple survival or avoidance mechanic.

Duration:
30 seconds.

Controls:
movement + one action maximum.

Environment:
small arena.

Elimination:
clear and visual.

Theme:
cartoon.
```

---

# 63. Template de définition de mini-jeu

```json
{
  "id": "snowball_survival",
  "duration": 35,
  "gameMaster": {
    "ability": "snowball_cannon"
  },
  "players": {
    "objective": "survive"
  },
  "arena": "frozen_lake",
  "winCondition": {
    "master": "eliminate_all",
    "players": "survive_timer"
  }
}
```

---

# 64. Création dynamique de contenu

L'architecture pourrait permettre :

```text
JSON config
+
prefabs
+
scripts génériques
=
nouveau mini-jeu
```

Cela permettrait à un agent IA de générer rapidement :

- règles ;
- paramètres ;
- scènes ;
- comportements ;
- UI.

---

# 65. Séparation logique / présentation

Chaque mini-jeu devrait séparer :

```text
MinigameRules
MinigameSimulation
MinigamePresentation
MinigameUI
```

Cela facilite :

- tests ;
- génération IA ;
- réutilisation ;
- équilibrage.

---

# 66. Tests automatisés

Exemples :

```text
Game Master always exists
Round always ends
Eliminated player cannot score
Timer cannot become negative
Zombie infection is deterministic server-side
All players receive results
```

---

# 67. Optimisation mobile

Priorités :

- low-poly ;
- atlas de textures ;
- LOD ;
- pooling ;
- animation culling ;
- limitation des particules ;
- baked lighting ;
- compression des assets.

---

# 68. Chargement

Chaque mini-jeu doit être préchargé pendant :

```text
results
+
intermission
```

afin d'éviter un écran de chargement visible entre les manches.

---

# 69. Session idéale

Une session pourrait être :

```text
Lobby
↓
Pool Party
↓
Results
↓
Intermission
↓
Zombie Escape
↓
Results
↓
Intermission
↓
Kick Off
↓
Results
↓
Spin Session
↓
Final Results
```

Durée totale :

```text
5 à 15 minutes
```

---

# 70. Résultat final de session

Afficher :

```text
PARTY WINNER
```

avec :

- podium ;
- avatars ;
- total de points ;
- coins ;
- animation de victoire.

---

# 71. Social first

Une recréation ne doit pas se concentrer uniquement sur la compétition.

Objectif :

```text
make players laugh together
```

plutôt que :

```text
build a hardcore skill ladder
```

---

# 72. Faits confirmés vs reconstruction

Il est important de distinguer les éléments confirmés par des sources de ceux proposés ici comme recommandations modernes.

---

## 72.1 Confirmé par des sources

- lancement le 4 avril 2019 ;
- lancement associé à Snap Games ;
- quatre mini-jeux principaux ;
- Pool Party ;
- Kick Off ;
- Spin Session ;
- Zombie Escape ;
- avatars Bitmoji 3D ;
- multijoueur temps réel ;
- intégration à Snapchat ;
- interaction sociale ;
- chat et vocal ;
- PlayCanvas ;
- structure 1-vs-Many ;
- Game Master sélectionné aléatoirement ;
- jusqu'à 7 amis plus le joueur ;
- guests remplissant les places ;
- lobby 3D ;
- intermission ;
- dance floor ;
- photobooth ;
- shop ;
- danses à débloquer ;
- monnaie / récompenses ;
- localisation multilingue.

---

## 72.2 Recommandations de reconstruction

Les éléments suivants sont proposés pour une implémentation moderne mais ne correspondent pas nécessairement aux spécifications internes exactes du jeu original :

- fréquences réseau ;
- architecture server-authoritative précise ;
- TypeScript ;
- Colyseus ;
- React ;
- Three.js ;
- Supabase ;
- durée standardisée des manches ;
- algorithme pseudo-aléatoire équitable de Game Master ;
- système de bots ;
- métriques analytics ;
- système de génération IA ;
- architecture JSON-driven.

---

# 73. Sources principales

## Snap

Snap Games launch:
https://investor.snap.com/news/news-details/2019/Snap-Inc-Unveils-Snap-Games/default.aspx

Introducing Snap Games:
https://newsroom.snap.com/introducing-snap-games?lang=en-GB

Version française:
https://newsroom.snap.com/introducing-snap-games?lang=fr-FR

---

## Designer du jeu

Layton Hawkes:
https://www.laytonhawkes.com/bitmoji-party

---

## PlayCanvas

PlayCanvas Games:
https://dev.playcanvas.com/industries/games

PlayCanvas Showcase:
https://blog.playcanvas.com/playcanvas-showcase-2021/

PlayCanvas Blog:
https://blog.playcanvas.com/page/8/

PlayCanvas Forum:
https://forum.playcanvas.com/t/playcanvas-getting-adopted-by-professional-betting-studio-questions/17343

---

## Articles contemporains

GamesBeat:
https://gamesbeat.com/why-snapchat-is-making-mobile-games-like-bitmoji-tennis/

Los Angeles Times:
https://www.latimes.com/business/technology/la-fi-tn-snap-snapchat-announcements-keynote-evan-spiegel-20190404-story.html

Curved:
https://curved.de/news/snap-games-snapchat-laesst-euch-kostenlos-spiele-mit-freunden-zocken-652027

Gambo Games review:
https://gambogames.weebly.com/bitmoji-party-review.html

Yen.com:
https://yen.com.gh/facts-lifehacks/196880-20-fun-snapchat-games-play-by-friends/

---

## Vidéo

Bitmoji Party / Snap Games trailer:
https://www.youtube.com/watch?v=zlbRDJhUXwE

---

# 74. Conclusion

Bitmoji Party peut être décrit comme :

> Un framework de mini-jeux sociaux 3D, synchrones, extrêmement courts, où un joueur reçoit temporairement un rôle puissant et asymétrique face à ses amis, le tout rendu personnel grâce à des avatars représentant les joueurs.

Le cœur du jeu n'est donc pas simplement la collection de mini-jeux.

Le véritable produit repose sur l'association de :

```text
avatars personnels
+
mini-jeux ultracourts
+
asymétrie
+
multijoueur temps réel
+
interactions sociales
+
faible friction
```

Pour un projet moderne développé avec l'aide de l'IA, Bitmoji Party constitue un excellent modèle.

Sa structure naturellement modulaire permet de créer :

- un moteur central ;
- un framework multijoueur ;
- un système d'avatar ;
- un hub social ;
- puis une grande quantité de mini-jeux indépendants.

Le fait que l'original ait lui-même été construit avec PlayCanvas et des technologies WebGL montre également qu'une reconstruction moderne sous forme de jeu web 3D est parfaitement cohérente avec l'architecture et la philosophie du produit original.

Le meilleur objectif n'est probablement pas de reproduire Bitmoji Party pixel par pixel, mais de recréer son **système fondamental** puis de construire un successeur spirituel plus moderne, extensible et adapté à la génération de contenu assistée par IA.
