# NIDAL DECO — état du projet (15 octobre 2026)

## 1. Code

| | |
|---|---|
| Dépôt | `github.com/Abdohllmm/nida-deco`, branche `main` |
| Dernier commit publié | `dd8a4e8` — Déploiement : image Docker, stockage S3 (Supabase), profil de production |
| Modifications locales non publiées | voir ci-dessous (aucun commit, aucun push) |

### Correctifs locaux non encore publiés

**Performance (mesurée)**
- `MediaDtoSerializer.java` (nouveau), `MediaService.java` : l'API renvoie l'adresse publique Supabase des images ; le navigateur ne passe plus par `/media/…` (qui coûtait une requête et une lecture en base par image). `/media/…` redirige toujours.
- `SettingsService.java`, `SeoService.java` : paramètres de l'entreprise gardés 5 min en mémoire, vidés à chaque modification ; la page HTML n'interroge plus la base à chaque affichage.
- `application.yml` : compression gzip (JS + CSS de l'accueil : 544 Ko → 166 Ko).
- `HomePage.tsx` : le titre ne reste plus en squelette si les paramètres échouent ; l'image d'accueil n'est plus téléchargée deux fois.
- `logo-144.webp` (4,8 Ko au lieu de 148 Ko) utilisé dans `PublicLayout.tsx`, `AdminLayout.tsx`, `LoginPage.tsx` ; `logo.png` conservé (image de partage).

**Fiabilité**
- `api.ts`, `main.tsx` : délai de 15 s par requête (sauf envois de fichiers) puis message d'erreur avec « Réessayer », au lieu d'un squelette infini ; pas de seconde attente automatique après un délai dépassé.

**Docker**
- `backend/Dockerfile` : le cache Maven `RUN --mount=type=cache` (refusé par certains hébergeurs, dont Railway) est remplacé par une couche de dépendances classique.

**Nouveaux dossiers**
- `demo-pc/` : démonstration sur un PC avec Cloudflare Quick Tunnel (`demarrer.ps1`, `arreter.ps1`).
- `deploy/serveur/` : déploiement sur un serveur avec HTTPS automatique (section 5).

**Tests** : `api.test.ts` (nouveau), `S3MediaIntegrationTest`, `ContactAndSettingsIntegrationTest`, `IntegrationTest` mis à jour.
Dernières exécutions : backend 72/72, Vitest 33/33, Playwright E2E 13/13 (environnement local).

Pour publier ces correctifs :
```bash
git add -A && git status        # vérifier qu'aucun fichier .env n'apparaît
git commit -m "Performance, fiabilité du chargement, Dockerfile compatible hébergeurs, déploiement serveur"
git push origin main
```

## 2. Configuration Docker

| Fichier | Rôle |
|---|---|
| `backend/Dockerfile` | Image unique : build React + JAR Spring Boot, JRE 21, utilisateur non-root, port 8080. À construire depuis la racine du dépôt. |
| `.dockerignore` | Exclut secrets (`.env*`), `node_modules`, `target`, `data`, `contenu`, `scripts`… |
| `docker-compose.yml` | Développement local : PostgreSQL seul. |
| `deploy/serveur/compose.yaml` + `Caddyfile` | **Production sur serveur** : application + Caddy (HTTPS Let's Encrypt). Syntaxe validée ; non exécuté sur un vrai serveur. |
| `demo-pc/compose.yaml` | Démonstration sur PC (Quick Tunnel, URL temporaire). |
| `render.yaml` | Ancienne préparation Render (non utilisée : carte bancaire exigée). |

Image testée : 429 Mo ; démarrage 25 à 45 s sur un PC ; ~300 Mo de mémoire en fonctionnement.

## 3. Variables d'environnement (noms seuls)

**Obligatoires en production**

| Variable | Rôle |
|---|---|
| `APP_PUBLIC_BASE_URL` | URL publique `https://…` sans slash final (sitemap, robots, métadonnées). Fixée automatiquement par `deploy/serveur` à partir de `SITE_ADDRESS`. |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | Base Neon (`jdbc:postgresql://…?sslmode=require`). |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | Supabase Storage. |

**Fixées par l'image ou le compose (ne pas changer sans raison)**
`SPRING_PROFILES_ACTIVE=prod`, `SERVER_PORT=8080`, `FRONTEND_DIST_DIR=/app/frontend-dist`, `APP_MEDIA_STORAGE=s3`, `SESSION_COOKIE_SECURE=true`, `SERVER_FORWARD_HEADERS_STRATEGY=native`, `JAVA_TOOL_OPTIONS`, réglages `SPRING_DATASOURCE_HIKARI_*`.

**Facultatives** : `PORT`, `DB_POOL_SIZE`, `SESSION_TIMEOUT`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_WINDOW`, `CONTACT_MAX_PER_WINDOW`, `CONTACT_WINDOW`, `MEDIA_MAX_FILE_SIZE`, `MEDIA_MAX_REQUEST_SIZE`, `APP_CORS_ALLOWED_ORIGINS`, `APP_LAZY_INITIALIZATION`.

**Ponctuelles (commandes d'administration, à retirer ensuite)** : `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `ADMIN_RESET_EMAIL`, `ADMIN_RESET_PASSWORD`.

Les valeurs actuelles sont dans le fichier local `.env.deploy` (ignoré par Git). Ne jamais les mettre dans le dépôt.

## 4. Ressources existantes et contenu

| Ressource | État |
|---|---|
| Neon `nidal-deco-demo` (aws-eu-central-1, Free) | 3 migrations appliquées ; 1 administrateur ; contenu ci-dessous |
| Supabase Storage, bucket `nidal-deco-media` (public, Free) | 28 images sous `media/` |
| GitHub `Abdohllmm/nida-deco` | `dd8a4e8` |
| Démonstration PC | conteneurs locaux encore actifs ; **tunnel supprimé par Cloudflare le 15/10 à 09:15 UTC, URL inactive** |
| Render, Railway | rien de créé (carte exigée / essai expiré) |

**Contenu importé (vérifié le 15/10)**
- Réalisations (3) : Cuisine sur mesure, bois et vitrines éclairées ; Salle à manger : tables en marbre et bois ; Tables basses en bois et marbre.
- Produits (3, catégorie « Tables basses », sur commande, sans prix) : ND-TB-001, ND-TB-002, ND-TB-003.
- Services (6) : Cuisines modernes ; Placards et rangements ; Aménagement intérieur ; Menuiserie bois ; **Dressings sur mesure et Menuiserie aluminium marqués « démo »** (illustrations à remplacer par de vraies photos).
- Photo d'accueil définie ; WhatsApp 212661568771 et 212653878201.
- Aucune demande de devis ni donnée de test restante.

Limites des offres gratuites : Neon (stockage et calcul plafonnés, sans facturation ; mise en veille après 5 min, réveil de quelques secondes) ; Supabase Free (1 Go, 5 Go de trafic/mois ; un projet gratuit inactif peut être mis en pause — à surveiller, les images deviendraient indisponibles).

## 5. Déploiement sur le futur serveur

**Serveur conseillé** : VPS Linux (Ubuntu 24.04 ou Debian 12), 1 vCPU, **2 Go de RAM** (1 Go possible mais juste pendant la construction de l'image), 20 Go de disque, **en Europe (idéalement Francfort)** pour être proche de Neon et de Supabase. Un **nom de domaine** pointant vers le serveur est nécessaire pour le HTTPS, sans lequel la connexion administrateur ne fonctionne pas (cookies `Secure`).

1. **Publier le code** : commit + push des correctifs (section 1).
2. **DNS** : enregistrement `A` (et `AAAA` si IPv6) du domaine vers l'IP du serveur.
3. **Préparer le serveur**
   ```bash
   sudo apt update && sudo apt install -y git
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER   # puis se reconnecter
   sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443 && sudo ufw enable
   ```
4. **Récupérer le projet et les variables**
   ```bash
   git clone https://github.com/Abdohllmm/nida-deco.git && cd nida-deco/deploy/serveur
   cp variables.example .env && chmod 600 .env
   nano .env      # SITE_ADDRESS + valeurs DB_* et S3_* reprises de .env.deploy
   ```
5. **Lancer**
   ```bash
   docker compose up -d --build     # première construction : 5 à 10 min
   docker compose logs -f app       # attendre « Started NidalDecoApplication »
   ```
6. **Vérifier** : `https://DOMAINE/actuator/health` → `{"status":"UP"}` ; accueil, une fiche produit rechargée directement, `/sitemap.xml` ; connexion `https://DOMAINE/admin/login` avec le compte existant ; un envoi d'image depuis l'administration.
7. **Arrêter la démonstration PC** : `powershell -ExecutionPolicy Bypass -File demo-pc\arreter.ps1`.

**Mettre à jour plus tard**
```bash
cd nida-deco && git pull && cd deploy/serveur && docker compose up -d --build
```
Pendant la reconstruction, l'ancien conteneur continue de servir ; la bascule provoque une coupure de 30 à 60 s.

**Administrateur** : le compte existant est dans Neon, rien à recréer. Mot de passe oublié : profil `reset-admin-password` avec `ADMIN_RESET_EMAIL` et `ADMIN_RESET_PASSWORD`, décrit dans le README (section administrateur).

**Plus tard (facultatif)** : héberger PostgreSQL sur le serveur (`pg_dump` depuis Neon, `pg_restore`, puis changer `DB_*`) et/ou stocker les images sur disque (`APP_MEDIA_STORAGE=filesystem` + volume persistant), si l'on veut ne plus dépendre des offres gratuites.
