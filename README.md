# NIDAL DECO — site web et administration

Site de l'entreprise NIDAL DECO (Casablanca) : présentation des services d'aménagement sur mesure, catalogue de produits avec commande par WhatsApp, réalisations, formulaire de contact et espace d'administration.

- **Frontend** : React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod.
- **Backend** : Java 21, Spring Boot 4.1 (Web MVC, Security, Data JPA, Validation), Flyway, PostgreSQL.
- **Infrastructure locale** : Docker Compose (PostgreSQL uniquement).

```
/frontend            Interface React (site public + administration)
/backend             API Spring Boot, migrations Flyway, tests
/docker-compose.yml  PostgreSQL pour le développement
/.env.example        Modèle de configuration (à copier en .env)
/data/media          Images téléversées (créé au premier lancement, non versionné)
```

## 1. Prérequis

| Outil | Version | Remarque |
|---|---|---|
| Java (JDK) | 21 | `java -version` |
| Node.js | 20 ou plus | `node -v` |
| Docker Desktop | récent | doit être **démarré** (PostgreSQL et tests backend) |

Maven n'a pas besoin d'être installé : le projet embarque le Maven Wrapper (`mvnw`).

Les commandes ci-dessous sont données pour **PowerShell** (Windows). Sous macOS/Linux, remplacez `.\mvnw.cmd` par `./mvnw` et `$env:NOM = "valeur"` par `export NOM=valeur`.

## 2. Configuration

```powershell
Copy-Item .env.example .env
```

Ouvrez `.env` et choisissez au minimum un mot de passe pour `DB_PASSWORD`. Ce fichier est lu par Docker Compose **et** par le backend. Il ne doit jamais être versionné (il est dans `.gitignore`).

## 3. Lancer PostgreSQL

```powershell
docker compose up -d
docker compose ps        # l'état doit être « healthy »
```

La base n'écoute que sur `127.0.0.1`. Les tables sont créées automatiquement par Flyway au démarrage du backend.

## 4. Créer le premier administrateur

Il n'existe ni inscription publique ni identifiant par défaut. Le premier compte se crée par une commande ponctuelle, avec des variables d'environnement **temporaires** :

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "bootstrap-admin"
$env:BOOTSTRAP_ADMIN_EMAIL = "vous@exemple.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "un-mot-de-passe-long"     # 10 à 72 caractères
.\mvnw.cmd spring-boot:run
Remove-Item Env:SPRING_PROFILES_ACTIVE, Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD
```

La commande crée le compte puis s'arrête. Elle **refuse de s'exécuter si un administrateur existe déjà** : elle ne peut ni recréer ni écraser un compte. Le mot de passe est haché avec BCrypt ; il n'est jamais stocké en clair. Une fois connecté, l'administrateur change son email et son mot de passe dans **Mon compte**.

### Mot de passe oublié

Aucune récupération par email n'est proposée, car aucun service d'email n'est configuré. La réinitialisation se fait sur le serveur, par une personne qui y a accès :

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "reset-admin-password"
$env:ADMIN_RESET_EMAIL = "vous@exemple.com"
$env:ADMIN_RESET_PASSWORD = "nouveau-mot-de-passe-long"
.\mvnw.cmd spring-boot:run
Remove-Item Env:SPRING_PROFILES_ACTIVE, Env:ADMIN_RESET_EMAIL, Env:ADMIN_RESET_PASSWORD
```

## 5. Lancer le backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run                                   # base vide
# ou, pour découvrir le site avec des contenus d'exemple :
$env:SPRING_PROFILES_ACTIVE = "demo"; .\mvnw.cmd spring-boot:run
```

L'API écoute sur http://localhost:8080.

### Données de démonstration

Le profil `demo` crée des services, des produits (dont des bureaux) et des réalisations d'exemple. Il n'agit **que s'il est activé explicitement** et **que si la base ne contient encore aucun contenu** ; il n'est jamais actif en production par défaut.

- Tout contenu d'exemple porte un badge « Démonstration » sur le site, et le tableau de bord de l'administration rappelle combien il en reste à remplacer.
- Six services sont créés (cuisines, dressings, placards, aménagement intérieur, menuiserie bois, menuiserie aluminium) ; leurs textes sont des propositions à valider.
- Les produits et réalisations sont fictifs et **aucun prix n'est attribué** (« Prix sur demande »).
- Les photos sont des **visuels d'illustration issus de banques d'images** sous licence CC0 / domaine public. **Ce ne sont pas des réalisations de NIDAL DECO.** Sources et licences : `backend/src/main/resources/demo/photos/CREDITS.md`. Aucune photo n'est prise sur Instagram.
- Ces photos font environ 1000 px de large : suffisant pour une démonstration, mais vos photos réelles devraient être plus grandes (voir section 8).

Pour passer en contenu réel : ouvrez chaque élément dans l'administration, téléversez vos photos, corrigez les textes et décochez « Contenu de démonstration ».

Les données de démonstration ne sont créées que sur une base sans contenu. Pour les régénérer après une mise à jour, supprimez d'abord les services, produits et réalisations existants (ou repartez d'une base vide avec `docker compose down -v`, ce qui efface **toutes** les données, compte administrateur compris).

## 6. Lancer le frontend

```powershell
cd frontend
npm install
npm run dev
```

Le site est sur http://localhost:5180 et l'administration sur http://localhost:5180/admin.

Vite relaie `/api`, `/media`, `/sitemap.xml` et `/robots.txt` vers le backend : le navigateur ne voit qu'une seule origine, comme en production, et le cookie de session fonctionne sans CORS. Le port et l'adresse du backend se changent dans `frontend/.env` (voir `frontend/.env.example`).

## 7. Logo

Le logo affiché par défaut est `frontend/public/logo.png` (avec `logo-192.png` et `favicon.png`). Il a été **isolé de la capture d'écran Instagram fournie** : résolution 480 × 480 px, suffisante pour l'en-tête mais limitée pour un grand format.

Pour utiliser le fichier d'origine en meilleure qualité, au choix :

- **Administration → Paramètres → Logo** : téléversez le fichier, sans toucher au code ;
- ou remplacez les trois fichiers de `frontend/public/` puis reconstruisez le frontend.

## 8. Images et médias

### Photos fixes du site

Outre les contenus gérés dans l'administration, le site utilise quelques photos d'ambiance fixes, dans `frontend/public/images/` :

| Fichier | Emplacement |
|---|---|
| `hero.jpg` | Accueil, tant qu'aucune « Photo de l'accueil » n'est choisie dans **Paramètres** |
| `about.jpg` | Accueil, section de présentation |
| `cta.jpg` | Accueil, fond de la section « Vous avez un projet d'aménagement ? » |
| `banner-services.jpg`, `banner-produits.jpg`, `banner-realisations.jpg`, `banner-contact.jpg`, `banner-about.jpg` | Bandeau d'en-tête des pages correspondantes |

Ce sont également des visuels d'illustration CC0 (voir `frontend/public/images/CREDITS.md`). Pour les remplacer, déposez vos photos sous les mêmes noms (format paysage, 1600 à 1920 px de large recommandé) puis reconstruisez le frontend. La photo de l'accueil se change sans reconstruction, depuis **Administration → Paramètres**.

### Images téléversées

- Formats acceptés : **JPEG, PNG, WebP**. Taille maximale : `MEDIA_MAX_FILE_SIZE` (8 Mo par défaut).
- Le type est vérifié sur le **contenu réel** du fichier (signature binaire), pas sur son nom ni sur le type annoncé par le navigateur.
- Le nom enregistré est généré par le serveur (UUID + extension). Le nom d'origine n'est jamais utilisé comme chemin.
- Les fichiers sont écrits dans `MEDIA_STORAGE_DIR` (`data/media` à la racine par défaut), **hors du code source**, et servis uniquement comme images.
- Une image utilisée par un contenu ou par les paramètres ne peut pas être supprimée.
- Chaque image a un texte alternatif modifiable ; l'ordre des galeries se règle dans les formulaires.

Le stockage passe par l'interface `MediaStorage` (`backend/.../media`). L'implémentation fournie écrit sur disque ; un stockage objet peut la remplacer sans toucher au reste du code.

### Réalisations réelles importées

Le dossier `contenu/realisations/` contient les photos de trois réalisations de l'entreprise, reprises de ses publications Instagram à sa demande (cuisine, tables de salle à manger, tables basses), et un fichier `manifest.json` qui décrit les fiches : titre, type de projet, description, photos, avant/après.

Ces fiches vivent dans la base de données. Pour les recréer sur une autre installation (serveur de production, base neuve) :

```powershell
$env:ADMIN_EMAIL = "vous@exemple.com"; $env:ADMIN_PASSWORD = "votre-mot-de-passe"
$env:SITE_URL = "http://localhost:8080"      # adresse du site visé
node scripts/importer-realisations.mjs
```

Le script passe par l'API d'administration (mêmes contrôles que les formulaires) et ignore les réalisations déjà présentes : il peut être relancé sans risque. Pour ajouter d'autres projets de la même façon, déposez les photos dans le dossier et complétez `manifest.json` ; sinon, utilisez simplement **Administration → Réalisations**.

### Produits réels importés

De la même façon, `contenu/catalogue/` contient les photos des produits fournis par l'entreprise (trois tables basses) et une photo ajoutée au service « Placards et rangements », décrits dans son `manifest.json`. Le script `node scripts/importer-catalogue.mjs` (mêmes variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SITE_URL`) les recrée sur une autre installation et ignore ce qui existe déjà. Les produits sont créés sans prix (« Prix sur demande ») ; ajoutez un prix dans le manifeste ou dans l'administration.

### Second numéro

Un second téléphone et un second numéro WhatsApp se règlent dans **Administration → Paramètres**. Ils s'affichent dans les coordonnées (page Contact, accueil, pied de page). Les boutons « Commander sur WhatsApp », « Écrire sur WhatsApp » et le bouton flottant utilisent toujours le numéro principal.

## 9. Demande de devis

Le formulaire de devis est accessible partout : bouton « Demander un devis » de l'en-tête et du menu mobile (fenêtre modale), hero, pages services et réalisations, bas de l'accueil (version courte) et page `/contact` (`/contact?type=devis` amène directement au formulaire).

Champs : nom complet, téléphone, email (facultatif), type de projet, ville ou quartier (facultatif), budget envisagé (facultatif), message, et accord pour être recontacté (obligatoire, vérifié aussi par le serveur). La demande est enregistrée et consultable dans **Administration → Demandes**. Le site ne promet ni gratuité du devis ni délai de réponse : ajoutez ces mentions uniquement si l'entreprise les confirme.

## 9 bis. WhatsApp

Le numéro se règle dans **Administration → Paramètres → Numéro WhatsApp international**, au format international sans `+`, sans espace et sans `0` initial : `212661568771`. C'est la **seule** source du numéro pour tout le site. S'il est vide, les boutons WhatsApp sont masqués.

Le site construit un lien `https://wa.me/<numéro>?text=<message encodé>` et **se contente d'ouvrir WhatsApp** avec un message prérempli : il n'envoie rien, n'enregistre aucune commande et ne propose aucun paiement. Il n'y a pas d'intégration WhatsApp Business API.

## 10. Tests

| Suite | Commande | Prérequis |
|---|---|---|
| Backend (39 tests) | `cd backend; .\mvnw.cmd test` | Docker démarré (base PostgreSQL jetable via Testcontainers) |
| Frontend (26 tests) | `cd frontend; npm test` | aucun |
| Typage | `cd frontend; npm run typecheck` | aucun |
| E2E Playwright (13 tests) | voir ci-dessous | application lancée |

Les tests E2E pilotent un vrai navigateur contre l'application en marche. Il faut : PostgreSQL démarré, le backend lancé **avec le profil `demo`** sur une base initialement vide, et un administrateur existant.

```powershell
cd frontend
npx playwright install chromium          # une seule fois
$env:E2E_ADMIN_EMAIL = "vous@exemple.com"
$env:E2E_ADMIN_PASSWORD = "votre-mot-de-passe"
npm run e2e
```

Sans ces deux variables, les tests d'administration sont ignorés. `E2E_BASE_URL` permet de viser une autre adresse (par exemple `http://localhost:8080` pour tester le build servi par Spring). Les tests n'envoient aucun message WhatsApp : ils inspectent seulement le lien généré. Les tests du formulaire de devis laissent des demandes nommées « E2E … » dans la base, à supprimer depuis l'administration.

## 11. Déploiement en production (HTTPS)

Un seul processus Java sert l'API **et** l'interface web.

1. Construire l'interface : `cd frontend; npm ci; npm run build` → dossier `frontend/dist`.
2. Construire l'API : `cd backend; .\mvnw.cmd package` → `backend/target/nidaldeco-backend-0.0.1-SNAPSHOT.jar`.
3. Sur le serveur, fournir un PostgreSQL et définir les variables d'environnement :

   | Variable | Valeur |
   |---|---|
   | `SPRING_PROFILES_ACTIVE` | `prod` (cookie de session `Secure`, prise en compte du proxy). **Ne pas ajouter `demo`.** |
   | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | accès à la base |
   | `APP_PUBLIC_BASE_URL` | `https://votre-domaine.ma` (sitemap, Open Graph) |
   | `FRONTEND_DIST_DIR` | chemin absolu du dossier `dist` |
   | `MEDIA_STORAGE_DIR` | dossier persistant, hors du répertoire de l'application |

4. Lancer `java -jar nidaldeco-backend-0.0.1-SNAPSHOT.jar`, puis créer l'administrateur (section 4, avec la même configuration de base).
5. Placer un **reverse proxy HTTPS** devant l'application (Nginx, Caddy, Traefik…) avec un certificat valide, par exemple Let's Encrypt. Il doit transmettre `X-Forwarded-Proto` et `X-Forwarded-For`, et autoriser des corps de requête d'au moins `MEDIA_MAX_REQUEST_SIZE` (10 Mo par défaut). Rediriger HTTP vers HTTPS et n'exposer publiquement ni le port 8080 ni PostgreSQL.

`APP_CORS_ALLOWED_ORIGINS` reste vide tant que l'interface et l'API partagent le même domaine, ce qui est le cas ici.

Le déploiement lui-même n'a pas été réalisé ni testé sur un serveur : seul le fonctionnement local du JAR servant le build a été vérifié.

## 12. Sauvegardes

Deux éléments sont à sauvegarder **ensemble** (la base référence les fichiers) :

```powershell
# Base de données
docker exec nidaldeco-postgres pg_dump -U nidaldeco -d nidaldeco -F c -f /tmp/nidaldeco.dump
docker cp nidaldeco-postgres:/tmp/nidaldeco.dump .\backups\nidaldeco-AAAA-MM-JJ.dump

# Images
Compress-Archive -Path .\data\media -DestinationPath .\backups\media-AAAA-MM-JJ.zip
```

Restauration : `pg_restore --clean --if-exists -U nidaldeco -d nidaldeco fichier.dump`, puis remise en place du dossier des médias. En production, adaptez ces commandes à votre PostgreSQL, planifiez-les, conservez les copies hors du serveur et **testez une restauration**.

## 13. SEO et partage de liens

- Chaque page a un titre et une description ; `sitemap.xml` ne liste que les contenus publiés ; `robots.txt` exclut `/admin` et `/api`.
- **Ce n'est pas du rendu côté serveur (SSR).** Le contenu des pages est produit par React dans le navigateur.
- Pour les aperçus de liens (WhatsApp, réseaux sociaux), dont les robots n'exécutent pas JavaScript, le backend inscrit le titre, la description et les balises Open Graph de la page demandée directement dans le HTML qu'il sert. Cela ne fonctionne **que lorsque Spring sert l'interface** (`FRONTEND_DIST_DIR`) : derrière le serveur Vite de développement, les métadonnées ne sont posées que par JavaScript.
- Un produit, service ou projet inexistant ou en brouillon répond avec un vrai statut HTTP 404.

## 14. Sécurité — points clés

- Session serveur avec cookie `HttpOnly`, `SameSite=Lax`, `Secure` en production ; expiration après 30 min d'inactivité (`SESSION_TIMEOUT`).
- Protection CSRF sur toutes les écritures ; CORS fermé par défaut.
- Connexion limitée à 5 échecs par quart d'heure (par adresse IP et email) ; message d'erreur identique que le compte existe ou non.
- Les routes `/api/admin/**` sont protégées par le backend ; les routes publiques n'exposent que les contenus publiés.

## 15. Limites et fonctionnalités non implémentées

- **Pas de paiement en ligne, de panier ni de commande enregistrée** : la commande se fait dans WhatsApp, par choix.
- **Aucun email n'est envoyé** (ni notification de nouvelle demande, ni confirmation au visiteur, ni récupération de mot de passe). Les demandes se consultent dans l'administration.
- **Un seul rôle administrateur**, sans gestion de plusieurs comptes depuis l'interface.
- **Sessions et limitation des tentatives en mémoire** : un redémarrage déconnecte l'administrateur, et le dispositif suppose une seule instance du backend.
- **Changer de mot de passe ne ferme pas les autres sessions** déjà ouvertes ; elles expirent d'elles-mêmes.
- **Images non redimensionnées** : elles sont servies telles que téléversées. Préparez des photos raisonnables (environ 2000 px de large) ; l'orientation EXIF des photos de téléphone n'est pas corrigée.
- **Comparatif avant/après** : une seule paire d'images par réalisation.
- **Pas de filtre anti-spam avancé** sur le formulaire de devis, hormis une limite de 5 envois par 10 minutes et par adresse IP.
- **Photos de démonstration en résolution limitée** (environ 1000 px) : le hero est conçu en deux volets pour rester net, mais des photos réelles plus grandes donneront un meilleur rendu.
- **Site en français uniquement.**
- **Mentions légales et politique de confidentialité** : ce sont des structures à compléter, exclues de l'indexation et **non validées juridiquement**.

## 16. Informations à fournir par l'entreprise

À renseigner dans l'administration ou à transmettre :

- Photos réelles (produits, réalisations, accueil, bandeaux de page) dont l'entreprise détient les droits, et le logo en haute définition.
- Liste réelle des produits : références, prix éventuels, dimensions, matériaux, disponibilités.
- Textes validés des services et de la présentation.
- Adresse, horaires et email de contact, s'ils doivent être affichés.
- Identité juridique (raison sociale, RC, ICE, IF), hébergeur et durée de conservation des données, pour les pages légales.

## 17. Identité visuelle

Site de prestations orienté devis et réalisations : noir du logo pour l'en-tête des pages, les titres, le pied de page et quelques sections fortes ; fonds blancs et gris très clair ailleurs ; doré réservé aux accents (filet d'en-tête, labels, numéros, icônes, survols, bouton principal sur fond sombre). Typographie sans empattement : **Manrope** pour les titres (700–800) et **Inter** pour le texte, hébergées avec le site. Les couleurs et polices sont définies une seule fois, dans `frontend/src/index.css` (bloc `@theme`).
