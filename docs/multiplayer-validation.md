# Validation du multijoueur — 12 septembre 2026

Les quatre mini-jeux utilisent le serveur de rooms testé ici. Cette validation porte sur les sources de cette livraison ; elle ne constitue pas un test du déploiement public, qui reste à effectuer sur un hébergement de serveur persistant.

## Résultats reproductibles

Environnement : Node.js 24.19.0. Les sorties chiffrées sont conservées dans [multiplayer-test-results.json](multiplayer-test-results.json).

| Commande | Couverture | Résultat |
| --- | --- | --- |
| `npm test` | Règles des quatre jeux, contrôles locaux, géométrie 3D, rooms, client réseau, véritable HTTP/WebSocket et SQLite | 65 tests passants, 0 échec |
| `npm run test:stress` | 64 scénarios de convergence, 32 manches avec incidents, 8 parties complètes | 104 scénarios passants |
| `npm run test:load` | 8 rooms simultanées, 64 connexions TCP/WebSocket réelles | Aucun client en erreur, même état dans chaque room |

Les 64 scénarios de convergence couvrent les quatre jeux et les huit tailles de room, avec deux profils de délai variable allant jusqu’à dix pas de simulation (environ 167 ms). Chaque essai compare intégralement l’état public final à celui obtenu sans retard. Le délai est variable, mais l’ordre des paquets d’une connexion est conservé, comme sur un WebSocket.

Les 32 manches perturbées ajoutent 15 % de commandes supprimées, des commandes livrées après la fenêtre de correction, des doublons et des déconnexions/reconnexions. Elles vérifient les positions finies, les scores bornés, la fin de manche et l’absence de résurrection après confirmation d’une élimination. Une correction dans les 200 ms peut légitimement annuler une collision provisoire : elle ne doit pas être confondue avec une résurrection après reconnexion.

Les huit parties complètes parcourent chacune les quatre jeux avec un redémarrage par manche. Les scores finaux doivent être exactement la somme des scores confirmés, sans double comptage. Total des simulations : **164 785 pas**, **50 600 livraisons de commandes**, **10 368 doublons**, **7 062 commandes supprimées**, **4 979 commandes trop anciennes**, **28 coupures** et **32 redémarrages**. Graine reproductible : `20260912`.

Le tirage du maître est vérifié avec les poids exacts de chaque taille de room, 110 000 tirages avec trois humains et 20 000 tirages où seuls les quatre humains sont admissibles. Les humains ne sont pas supposés occuper des indices consécutifs.

## Test du vrai serveur

Les tests d’intégration démarrent `server/node-server.js`, créent des rooms par HTTP et ouvrent de vraies connexions WebSocket. Ils vérifient notamment :

- huit places, refus de la neuvième, nouvelle tentative de création idempotente ;
- interdiction pour un invité de lancer, interdiction pour un coureur de commander le pied, réception de l’attaque légitime par les huit clients ;
- origine forgée, corps HTTP mal formé, taille excessive et serveur complet ;
- absence des secrets dans les états publics et absence des routes de test en production ;
- reprise de la même session, remplacement de l’ancienne connexion sans doubler la place et reconnexion automatique du vrai `RoomClient` ;
- sauvegarde dans un fichier SQLite, arrêt et redémarrage du processus avec conservation du code et du créateur ;
- reprise des tirs de piscine même si le compteur du navigateur a été remis à zéro pendant le relais par bot.

L’essai de charge simule quatre secondes de jeu accélérées pour huit rooms et 64 connexions, avec commandes à 20 Hz. Il reçoit **5 384 messages**, soit environ **22,9 Mo**. Dans cet environnement, le traitement d’un pas global est de **3,44 ms au 95e percentile**, au maximum **5,23 ms** ; mémoire résidente finale : **137 Mo**. Ces mesures sont un essai court sur cette machine, pas une garantie de capacité ni un test d’endurance sur Internet. La limite d’admission de 64 rooms doit être calibrée sur le serveur cible.

## Parcours navigateur

Le navigateur disponible désactive WebGL. La route Vite `/__tests/online` charge la vraie page, le vrai code d’interface et de réseau, ainsi que le serveur de développement utilisant le même moteur de room. Seul `World` est remplacé par un rendu vide. Ce remplacement n’existe pas dans `dist` et n’est pas servi en production.

Parcours effectués dans deux onglets : création, affichage du code et du lien, arrivée par le lien direct dans la bonne room, liste passant à deux humains et six bots, lancement désactivé chez l’invité, démarrage d’une manche, état partagé de Zombie Escape, pause sans arrêter le chrono commun, reprise explicite, résultats identiques et rejeu réservé au créateur. L’erreur de room inexistante est également affichée correctement.

Cette passe a notamment corrigé une invocation incorrecte de `fetch` détectée uniquement dans le navigateur, une connexion qui pouvait se terminer après un départ volontaire, et une pause en ligne qui ne proposait pas de reprendre la main au bot. Les tests automatiques couvrent aussi le compteur de tirs après relais, le maître conservé après redémarrage et les spectateurs tardifs qui doivent rester spectateurs.

## Limites et mise en service

- Le rendu WebGL complet, les téléphones physiques, les réseaux mobiles réels et le comportement sur Safari n’ont pas été testés dans cet environnement. Les tests de géométrie et les commandes existants restent passants.
- Un réseau très dégradé dépassant le budget de correction peut toujours produire du retard ou des commandes rejetées. Une coupure prolongée peut expirer la room ; aucun système ne peut garantir une partie continue sans connectivité.
- Un redémarrage conserve les scores acquis mais recommence la manche interrompue. Il ne reprend pas l’image exacte où le serveur s’était arrêté.
- Le serveur Node a été exécuté et testé. Docker, Caddy, les certificats et l’accès public n’ont pas été exécutés ici, faute de moteur Docker et d’accès à un serveur de production.
- Le processus est unique, avec SQLite sur un volume persistant. La réplication et la reprise après perte complète de cette machine nécessitent une infrastructure supplémentaire.

Les étapes concrètes de déploiement et de vérification sur le domaine public sont dans [multiplayer.md](multiplayer.md). La publication statique existante ne suffit pas à rendre les rooms disponibles.
