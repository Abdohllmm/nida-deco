# NIDAL DECO — site web et administration

Site de l'entreprise NIDAL DECO (Casablanca) : services d'aménagement sur mesure, catalogue de produits avec commande par WhatsApp, réalisations, demande de devis et espace d'administration.

- **Frontend** : React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router, TanStack Query, React Hook Form + Zod.
- **Backend** : Java 21, Spring Boot 4.1 (Web MVC, Security, Data JPA, Validation, Actuator), Flyway, PostgreSQL.
- **Médias** : disque local en développement, stockage objet compatible S3 (Supabase Storage) en production.

```
/frontend              Interface React (site public + administration)
/backend               API Spring Boot, migrations Flyway, tests, Dockerfile
/contenu               Photos réelles + manifestes (réalisations, produits)
/scripts               Import du contenu via l'API d'administration
/docker-compose.yml    PostgreSQL pour le développement local
/.env.example          Modèle de configuration (à copier en .env)
/.dockerignore         Exclusions du contexte de construction Docker
```

---

## 1. Architecture de production

```
Navigateur ──HTTPS──▶ Spring Boot (un seul conteneur, une seule origine)
                        ├─ /                     build React + métadonnées Open Graph
                        ├─ /api/**               API JSON
                        ├─ /media/{fichier}      redirection vers le stockage objet
                        ├─ /sitemap.xml, /robots.txt
                        ├─ /actuator/health      état de santé (seul point Actuator exposé)
                        │
                        ├──▶ PostgreSQL distant (Neon ou autre)
                        └──▶ Supabase Storage (API S3) pour les images
```

Points structurants :

- **Une seule origine.** Le frontend appelle `/api`, `/media`, `/sitemap.xml` et `/robots.txt` en chemins relatifs. L'authentification repose sur une session serveur (cookie `NDSESSION`, HttpOnly, SameSite=Lax, Secure en production) et une protection CSRF par cookie `XSRF-TOKEN`. Servir le frontend depuis un autre domaine casserait la connexion et les formulaires.
- **Spring Boot sert le build React** (dossier `FRONTEND_DIST_DIR`). Les routes de l'application retombent sur `index.html` ; le backend y inscrit le titre, la description et les balises Open Graph de la page demandée. Ce n'est pas du rendu côté serveur : le contenu reste produit par React.
- **Les images ne sont jamais sur le disque du conteneur en production.** `/media/{fichier}` redirige vers `S3_PUBLIC_BASE_URL/media/{fichier}`.

## 2. Prérequis

| Pour | Il faut |
|---|---|
| Développer en local | Java 21, Node 22 (ou 20.19+), Docker Desktop démarré |
| Construire l'image | Docker |
| Déployer | Un PostgreSQL distant (par exemple Neon), un bucket Supabase Storage, un hébergeur de conteneurs Docker (Render, Railway, Koyeb, Fly.io, un serveur privé…) |

Maven n'a pas besoin d'être installé : le projet embarque le Maven Wrapper (`mvnw`).

Les commandes sont données pour **PowerShell**. Sous macOS/Linux, remplacez `.\mvnw.cmd` par `./mvnw` et `$env:NOM = "valeur"` par `export NOM=valeur`.

## 3. Variables d'environnement

Aucune valeur sensible n'est dans le code ni dans ce dépôt. `.env.example` liste les noms ; `.env` (jamais versionné) contient vos valeurs locales.

### Base de données

| Variable | Rôle |
|---|---|
| `DB_URL` | URL JDBC. **Obligatoire en production.** Neon : `jdbc:postgresql://HOTE.neon.tech/BASE?sslmode=require` |
| `DB_USERNAME`, `DB_PASSWORD` | Identifiants. **Obligatoires en production.** |
| `DB_POOL_SIZE` | Connexions maximum (5 par défaut en production) |
| `DB_NAME`, `DB_PORT` | Développement local uniquement (Docker Compose) |

### Serveur

| Variable | Rôle |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` en production (déjà défini dans l'image Docker). Sans profil : développement local. |
| `SERVER_PORT` | Port d'écoute (8080 dans l'image). S'il est absent, la variable `PORT` de l'hébergeur est utilisée. |
| `APP_PUBLIC_BASE_URL` | URL publique du site, sans slash final. **Obligatoire en production** (sitemap, robots.txt, Open Graph). |
| `FRONTEND_DIST_DIR` | Dossier du build React (`/app/frontend-dist` dans l'image). Vide = API seule. |
| `SERVER_FORWARD_HEADERS_STRATEGY` | `native` en production : le schéma HTTPS et l'adresse du visiteur sont lus dans `X-Forwarded-*`. |
| `APP_CORS_ALLOWED_ORIGINS` | À laisser vide : même origine. |
| `SESSION_TIMEOUT` | Durée d'inactivité avant déconnexion (30 min). |
| `SESSION_COOKIE_SECURE` | `true` en production. |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW` | Limitation des tentatives de connexion (5 par 15 min). |

### Images

| Variable | Rôle |
|---|---|
| `APP_MEDIA_STORAGE` | `filesystem` (défaut hors production) ou `s3` (défaut du profil `prod`) |
| `MEDIA_MAX_FILE_SIZE`, `MEDIA_MAX_REQUEST_SIZE` | Taille maximale d'une image (8 Mo) et d'une requête (10 Mo) |
| `MEDIA_STORAGE_DIR` | Mode `filesystem` : dossier des images |
| `S3_ENDPOINT` | Mode `s3` : endpoint de l'API S3 |
| `S3_REGION` | Région indiquée par le fournisseur (Supabase : région du projet, par exemple `eu-central-1`). Aucune valeur par défaut. |
| `S3_BUCKET` | Nom du bucket |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Clés d'accès S3 (chez Supabase : accès à tous les buckets du projet) |
| `S3_PUBLIC_BASE_URL` | Adresse publique du bucket, sans slash final |

En mode `s3`, les six variables `S3_*` sont obligatoires. S'il en manque une, **l'application refuse de démarrer** et nomme les variables manquantes, sans jamais afficher de valeur.

### Commandes ponctuelles

| Variable | Rôle |
|---|---|
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` | Création du premier administrateur (section 7) |
| `ADMIN_RESET_EMAIL`, `ADMIN_RESET_PASSWORD` | Réinitialisation d'un mot de passe (section 7) |

## 4. Lancement local

Mode développement : PostgreSQL dans Docker, images sur disque, interface servie par Vite.

```powershell
Copy-Item .env.example .env        # puis choisissez DB_PASSWORD dans .env
docker compose up -d               # PostgreSQL, accessible uniquement depuis la machine

cd backend
.\mvnw.cmd spring-boot:run                                   # base vide
# ou, pour des contenus d'exemple :
$env:SPRING_PROFILES_ACTIVE = "demo"; .\mvnw.cmd spring-boot:run

cd ..\frontend
npm install
npm run dev
```

- Site : http://localhost:5180 — administration : http://localhost:5180/admin — API : http://localhost:8080.
- Vite relaie `/api`, `/media`, `/sitemap.xml` et `/robots.txt` vers le backend : le navigateur ne voit qu'une origine, comme en production.
- Les images téléversées vont dans `data/media` (mode `filesystem`).
- Créez d'abord un administrateur (section 7).

### Données de démonstration (profil `demo`)

Le profil `demo` crée six services, des produits et des réalisations d'exemple. Il n'agit **que s'il est activé explicitement** et **que si la base ne contient aucun contenu**.

- Chaque contenu d'exemple porte un badge « Démonstration » ; le tableau de bord de l'administration rappelle combien il en reste.
- Les photos sont des visuels de banques d'images sous licence CC0 (`backend/src/main/resources/demo/photos/CREDITS.md`). **Ce ne sont pas des réalisations de NIDAL DECO.**
- Aucun prix n'est attribué (« Prix sur demande »).

## 5. Construction Docker

L'image contient le JAR et le build React. Elle se construit **depuis la racine** du dépôt :

```powershell
docker build -f backend/Dockerfile -t nidal-deco .
```

- Trois étapes : build React (Node 22), build Maven (Java 21), exécution (JRE 21 Alpine, utilisateur non-root).
- **Tests pendant la construction** : les tests unitaires s'exécutent toujours. Les tests d'intégration ont besoin de Docker pour démarrer un PostgreSQL jetable ; indisponible pendant un `docker build`, ils y sont signalés comme *ignorés*. Lancez la suite complète avec `.\mvnw.cmd test` (section 9) avant de construire.
- Pour sauter tous les tests : `--build-arg SKIP_TESTS=true`.
- L'image ne contient ni `.env`, ni médias locaux, ni `node_modules`, ni le dossier `contenu/` (voir `.dockerignore`).

### Lancer l'image en local

Créez un fichier `.env.docker` (non versionné) :

```
DB_URL=jdbc:postgresql://HOTE:5432/BASE
DB_USERNAME=...
DB_PASSWORD=...
APP_PUBLIC_BASE_URL=http://localhost:8080
SESSION_COOKIE_SECURE=false
APP_MEDIA_STORAGE=s3
S3_ENDPOINT=...
S3_REGION=eu-central-1
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=...
```

```powershell
docker run --rm -p 8080:8080 --env-file .env.docker nidal-deco
```

- `SESSION_COOKIE_SECURE=false` n'est nécessaire qu'en HTTP local : en HTTPS, laissez la valeur par défaut.
- Pour essayer sans stockage objet, avec le PostgreSQL de Docker Compose et des images sur le disque du conteneur (perdues à son arrêt) :

```powershell
docker run --rm -p 8080:8080 --network projetnidaldeco_default `
  -e DB_URL=jdbc:postgresql://postgres:5432/nidaldeco -e DB_USERNAME=nidaldeco -e DB_PASSWORD=VOTRE_MOT_DE_PASSE `
  -e APP_PUBLIC_BASE_URL=http://localhost:8080 -e SESSION_COOKIE_SECURE=false -e APP_MEDIA_STORAGE=filesystem `
  nidal-deco
```

Le site est alors sur http://localhost:8080 et l'état de santé sur http://localhost:8080/actuator/health.

## 6. Déploiement

Le projet ne se déploie pas seul : voici la marche à suivre sur un hébergeur de conteneurs.

### 6.1 PostgreSQL (exemple : Neon)

1. Créez un projet et une base.
2. Relevez l'hôte, la base, l'utilisateur et le mot de passe.
3. Formez l'URL JDBC : `jdbc:postgresql://HOTE/BASE?sslmode=require` (sans identifiants dans l'URL). Préférez l'hôte de connexion directe à l'hôte « pooler ».

Les tables sont créées par Flyway au premier démarrage.

### 6.2 Supabase Storage (images)

Supabase sert **uniquement** au stockage des images, par son API compatible S3. Ni sa base de données ni son authentification ne sont utilisées.

1. **Projet** : sur supabase.com, *New project*, plan **Free**, dans une région proche (par exemple *Central EU (Frankfurt)*). Le mot de passe de base demandé à la création ne sert pas à ce site ; conservez-le quand même.
2. **Bucket** : *Storage → New bucket*, nom `nidal-deco-media`, option **Public bucket** activée. Vous pouvez limiter les types à `image/jpeg, image/png, image/webp` et la taille à 8 Mo. Ce bucket ne doit contenir que les images du site : tout ce qu'il contient est lisible par quiconque en connaît l'adresse.
3. **Connexion S3** : *Storage → S3* (ou *Storage → Settings*). Activez la connexion S3 si elle ne l'est pas, puis relevez :
   - **Endpoint** → `S3_ENDPOINT`, de la forme `https://REF.storage.supabase.co/storage/v1/s3` ;
   - **Region** → `S3_REGION`, par exemple `eu-central-1`. Jamais `auto`.
4. **Clés S3** : au même endroit, *New access key*. L'*Access key ID* est `S3_ACCESS_KEY_ID` ; le *Secret access key*, affiché une seule fois, est `S3_SECRET_ACCESS_KEY`.
5. **Adresse publique** : `S3_PUBLIC_BASE_URL` = `https://REF.supabase.co/storage/v1/object/public/nidal-deco-media`, sans slash final. `REF` est la référence du projet, visible dans l'adresse du tableau de bord.

Ne confondez pas les deux adresses : `S3_ENDPOINT` est l'API par laquelle le serveur envoie et supprime les fichiers ; `S3_PUBLIC_BASE_URL` est l'adresse où les navigateurs lisent les images. L'application vérifie leur forme au démarrage et refuse de démarrer si elles sont inversées, si elles ne désignent pas le même projet ou si l'adresse publique ne se termine pas par le nom du bucket.

Fonctionnement : chaque image est enregistrée sous la clé `media/{uuid}.{jpg|png|webp}` et lue à `S3_PUBLIC_BASE_URL/media/{uuid}.jpg`. Sur le site, l'adresse reste `/media/{uuid}.jpg`, qui redirige vers Supabase. Le domaine Supabase est automatiquement autorisé comme source d'images dans la politique de sécurité du site (CSP).

À savoir :

- **Les clés S3 de Supabase donnent accès à tous les buckets du projet** et contournent ses règles d'accès. Elles ne doivent exister que dans les variables du serveur. Ne créez pas d'autres buckets sensibles dans ce projet.
- **Offre gratuite** : 1 Go de fichiers, 5 Go de trafic sortant par mois, 2 projets actifs. En cas de dépassement, Supabase restreint le service ; il ne facture pas l'offre gratuite d'après sa documentation.
- **Mise en pause** : un projet gratuit est mis en pause après environ une semaine sans activité suffisante. Les images du site deviennent alors illisibles jusqu'à ce que vous le réactiviez depuis le tableau de bord Supabase. La documentation ne précise pas si la simple lecture d'images compte comme activité.
- Les images supprimées le sont définitivement (pas de versions).

### 6.3 Hébergeur de conteneurs (Render, Railway…)

Le fichier `render.yaml` à la racine décrit ce service pour Render (Blueprint) : plan `free` explicite, région Francfort, aucun secret. Sur Render : *New → Blueprint*, choisissez le dépôt, puis saisissez les valeurs demandées. À la main, ou sur un autre hébergeur :

1. Créez un service web **à partir du dépôt Git**, type Docker, avec :
   - chemin du Dockerfile : `backend/Dockerfile` ;
   - contexte de construction : la **racine** du dépôt.
2. Ajoutez les variables : `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `APP_PUBLIC_BASE_URL`, et les six `S3_*`. `SPRING_PROFILES_ACTIVE=prod`, `FRONTEND_DIST_DIR` et `APP_MEDIA_STORAGE=s3` sont déjà les valeurs de l'image.
3. **Port** : l'image écoute sur 8080. Si l'hébergeur impose un autre port, donnez à `SERVER_PORT` la valeur attendue.
4. **Contrôle de santé** : chemin `/actuator/health`.
5. **Domaine et HTTPS** : l'hébergeur fournit le certificat. Mettez l'adresse finale (`https://…`, sans slash) dans `APP_PUBLIC_BASE_URL`, puis redéployez.
6. Créez l'administrateur (section 7), puis importez le contenu (section 8).

Ne séparez pas le frontend sur un autre domaine (Vercel, Netlify…) : la session et le CSRF exigent une origine unique.

### 6.4 Sur un serveur privé avec disque persistant

Même image, avec `APP_MEDIA_STORAGE=filesystem`, `MEDIA_STORAGE_DIR=/app/data/media` et un volume monté sur ce dossier (`-v nidal-medias:/app/data/media`). Placez un reverse proxy HTTPS devant (Caddy, Nginx…), qui transmet `X-Forwarded-Proto` et `X-Forwarded-For` et accepte des requêtes de 10 Mo.

## 7. Premier administrateur

Il n'existe ni inscription publique ni identifiant par défaut. Le premier compte se crée par une commande ponctuelle, sans serveur web : le processus crée le compte et s'arrête.

**Avec le JAR**, vers la base distante :

```powershell
$env:SPRING_PROFILES_ACTIVE = "bootstrap-admin"
$env:BOOTSTRAP_ADMIN_EMAIL = "vous@exemple.com"
$env:BOOTSTRAP_ADMIN_PASSWORD = "un-mot-de-passe-long"      # 10 à 72 caractères
$env:DB_URL = "jdbc:postgresql://HOTE/BASE?sslmode=require"
$env:DB_USERNAME = "..."
$env:DB_PASSWORD = "..."
java -jar backend\target\nidaldeco-backend-0.0.1-SNAPSHOT.jar
Remove-Item Env:SPRING_PROFILES_ACTIVE, Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_PASSWORD, Env:DB_URL, Env:DB_USERNAME, Env:DB_PASSWORD
```

(Le JAR se construit avec `cd backend; .\mvnw.cmd package -DskipTests`.)

**Avec l'image Docker** :

```powershell
docker run --rm `
  -e SPRING_PROFILES_ACTIVE=bootstrap-admin `
  -e BOOTSTRAP_ADMIN_EMAIL=vous@exemple.com -e BOOTSTRAP_ADMIN_PASSWORD=un-mot-de-passe-long `
  -e "DB_URL=jdbc:postgresql://HOTE/BASE?sslmode=require" -e DB_USERNAME=... -e DB_PASSWORD=... `
  nidal-deco
```

**En local**, depuis `backend/` (la base est lue dans `.env`) : définissez les trois premières variables puis `.\mvnw.cmd spring-boot:run`.

Comportement :

- Le compte n'est créé **que si aucun administrateur n'existe**. Sinon la commande refuse et ne modifie rien.
- Variables absentes ou invalides : refus.
- **Code de sortie** : `0` si le compte est créé, `2` en cas de refus (le motif est dans les journaux).
- Le mot de passe n'est jamais affiché ni journalisé ; il est stocké haché (BCrypt).

### Mot de passe oublié

Aucune récupération par email (aucun service d'email n'est configuré). Même commande, avec `SPRING_PROFILES_ACTIVE=reset-admin-password`, `ADMIN_RESET_EMAIL` et `ADMIN_RESET_PASSWORD`.

## 8. Importer le contenu

Après un premier déploiement, la base ne contient que les paramètres de l'entreprise.

Deux scripts créent le contenu réel en passant par l'API d'administration, avec les mêmes contrôles que les formulaires. Le profil `demo` n'est pas nécessaire. Ils ignorent ce qui existe déjà et peuvent être relancés sans créer de doublon.

```powershell
$env:ADMIN_EMAIL = "vous@exemple.com"; $env:ADMIN_PASSWORD = "votre-mot-de-passe"
$env:SITE_URL = "https://votre-domaine"
node scripts/importer-realisations.mjs      # contenu/realisations/manifest.json
node scripts/importer-catalogue.mjs         # contenu/catalogue/manifest.json
```

Lancez-les dans cet ordre :

1. `importer-realisations.mjs` : trois réalisations (cuisine, salle à manger, tables basses), reprises des publications Instagram de l'entreprise à sa demande.
2. `importer-catalogue.mjs` :
   - trois tables basses fournies par l'entreprise, sans prix (« Prix sur demande ») ;
   - les six services. Quatre utilisent de vraies photos ; « Dressings sur mesure » et « Menuiserie aluminium » utilisent des illustrations de banque d'images et portent le badge « Démonstration » jusqu'à ce que vous les remplaciez ;
   - la photo d'accueil, reprise de la réalisation cuisine si aucune n'est encore choisie.

Les photos importées sont envoyées dans le stockage configuré (Supabase Storage en production).

## 9. Tests

| Suite | Commande | Prérequis |
|---|---|---|
| Backend (66 tests) | `cd backend; .\mvnw.cmd test` | Docker démarré (PostgreSQL jetable via Testcontainers). Sans Docker, les tests d'intégration sont ignorés. |
| Frontend (26 tests) | `cd frontend; npm test` | aucun |
| Typage | `cd frontend; npm run typecheck` | aucun |
| E2E Playwright (13 tests) | voir ci-dessous | application lancée |

Les tests du stockage S3 utilisent un client simulé : aucun appel réseau vers Supabase ou Neon.

Tests E2E : PostgreSQL démarré, backend lancé avec le profil `demo` et le contenu importé, un administrateur existant.

```powershell
cd frontend
npx playwright install chromium          # une seule fois
$env:E2E_ADMIN_EMAIL = "vous@exemple.com"; $env:E2E_ADMIN_PASSWORD = "votre-mot-de-passe"
npm run e2e
```

`E2E_BASE_URL` vise une autre adresse (par exemple `http://localhost:8080`). Les tests n'envoient aucun message WhatsApp. Ils laissent des demandes nommées « E2E … », à supprimer dans l'administration.

## 10. Fonctionnement à connaître

- **Logo** : `frontend/public/logo.png` par défaut (isolé d'une capture, 480 px). Remplaçable sans toucher au code dans **Administration → Paramètres**.
- **Photos fixes** : `frontend/public/images/` contient la photo d'accueil par défaut et les bandeaux de page (visuels CC0, voir `CREDITS.md`). La photo d'accueil se change dans **Paramètres** ; les autres se remplacent par des fichiers de même nom, puis reconstruction.
- **Images téléversées** : JPEG, PNG ou WebP, vérifiés sur leur contenu réel ; le nom enregistré est généré par le serveur ; une image utilisée ne peut pas être supprimée.
- **WhatsApp** : numéro principal et second numéro dans **Paramètres**, au format international sans `+` (`212661568771`). Le site ouvre seulement une conversation avec un message prérempli : il n'envoie rien et n'enregistre aucune commande. Les boutons de commande utilisent le numéro principal.
- **Devis** : formulaire accessible partout (en-tête, hero, services, réalisations, `/contact?type=devis`). Les demandes sont dans **Administration → Demandes**. Aucun email n'est envoyé.
- **SEO** : `sitemap.xml` ne liste que les contenus publiés ; `robots.txt` exclut `/admin` et `/api` ; un contenu inexistant ou en brouillon répond avec un vrai statut 404.
- **Identité visuelle** : couleurs et polices définies une seule fois dans `frontend/src/index.css` (bloc `@theme`).

## 11. Sauvegardes

Deux éléments, à sauvegarder ensemble puisque la base référence les fichiers :

- **Base** : `pg_dump` vers un fichier (`pg_dump -F c -d "postgresql://…" -f nidaldeco.dump`), ou les sauvegardes de votre fournisseur. Restauration : `pg_restore --clean --if-exists`.
- **Images** : le bucket Supabase (téléchargeable depuis son tableau de bord ou par l'API S3 ; ou, en mode `filesystem`, le dossier `MEDIA_STORAGE_DIR`).

Planifiez-les, conservez les copies ailleurs et testez une restauration.

## 12. Limites importantes

- **Mise en veille et démarrage lent** : une instance gratuite (0,1 CPU, 512 Mo) s'endort après 15 minutes sans visite. Le réveil relance Spring Boot. Mesuré sur un conteneur local bridé à 0,1 CPU : environ 7 minutes de démarrage, puis une première page en une dizaine de secondes ; la mémoire reste autour de 200 Mo. Le temps réel dépend du matériel de l'hébergeur. L'image est déjà réglée pour ce cas (compilateur JIT allégé, initialisation paresseuse) ; sur un serveur plus puissant, `APP_LAZY_INITIALIZATION=false` et un autre `JAVA_TOOL_OPTIONS` conviennent mieux.
- **Session en mémoire** : un redémarrage, un redéploiement ou un réveil déconnecte l'administrateur. Le dispositif suppose une seule instance du backend ; il en va de même pour la limitation des tentatives de connexion.
- **Persistance des images** : uniquement via le stockage objet. En mode `filesystem` sur un hébergeur à disque éphémère, elles disparaissent à chaque redémarrage.
- **Origine unique** : le frontend et l'API doivent rester sur le même domaine (cookies de session et CSRF).
- **Pas de paiement, de panier ni de commande enregistrée** : la commande se conclut dans WhatsApp.
- **Aucun email** : ni notification, ni confirmation, ni récupération de mot de passe.
- **Un seul rôle administrateur.** Changer de mot de passe ne ferme pas les autres sessions ouvertes.
- **Images non redimensionnées** : servies telles que téléversées ; préparez des photos d'environ 2000 px de large.
- **Site en français uniquement.**
- **Pages légales** : structures à compléter, exclues de l'indexation et non validées juridiquement.
- **Non vérifié** : le déploiement réel sur un hébergeur, la connexion à Neon et à Supabase Storage. Ont été vérifiés en local : la construction de l'image, son exécution contre PostgreSQL, et le mode `s3` contre un mini-serveur S3 de test (envoi, lecture par redirection, suppression, fichier identique à l'original). Ce serveur de test ne contrôle pas les signatures : le premier envoi d'image sur le stockage réel reste à valider.

## 13. Informations à fournir par l'entreprise

- Photos réelles supplémentaires (services, dressings, bandeaux de page) et logo en haute définition.
- Prix, dimensions et disponibilités réels des produits.
- Textes validés des services et de la présentation.
- Adresse, horaires et email de contact, s'ils doivent être affichés.
- Identité juridique (raison sociale, RC, ICE, IF), hébergeur et durée de conservation des données, pour les pages légales.
