# syntax=docker/dockerfile:1
#
# Image unique : Spring Boot sert l'API, les médias et le build React sur la même origine.
# À construire depuis la RACINE du dépôt :
#
#   docker build -f backend/Dockerfile -t nidal-deco .
#
# Les tests s'exécutent par défaut. Pour les sauter explicitement :
#
#   docker build -f backend/Dockerfile --build-arg SKIP_TESTS=true -t nidal-deco .

# ---------- 1. Frontend : build React (Vite 8 demande Node 20.19+ ou 22.12+) ----------
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---------- 2. Backend : JAR exécutable (Maven officiel, Java 21) ----------
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /build
COPY backend/pom.xml ./
COPY backend/src ./src
ARG SKIP_TESTS=false
# Le dépôt Maven local est conservé dans un cache de construction : les dépendances ne sont
# téléchargées qu'une fois, et une construction interrompue (coupure réseau) reprend où elle
# s'était arrêtée.
#
# Les tests unitaires s'exécutent toujours. Les tests d'intégration ont besoin de Docker
# (PostgreSQL jetable) : indisponible pendant un « docker build », ils y sont signalés
# comme ignorés. Lancez-les avec « ./mvnw test » sur une machine où Docker tourne.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -q -Dmaven.wagon.http.retryHandler.count=5 package -DskipTests=${SKIP_TESTS} \
    && cp target/nidaldeco-backend-*.jar /build/app.jar

# ---------- 3. Exécution : JRE 21 minimal, utilisateur non-root ----------
FROM eclipse-temurin:21-jre-alpine AS runtime
RUN addgroup -S app && adduser -S -G app -h /app app \
    && mkdir -p /app/frontend-dist /app/data/media \
    && chown -R app:app /app
WORKDIR /app
COPY --from=backend --chown=app:app /build/app.jar /app/app.jar
COPY --from=frontend --chown=app:app /frontend/dist /app/frontend-dist

# Aucun secret ici : base de données, clés S3 et URL publique sont fournies au lancement.
ENV FRONTEND_DIST_DIR=/app/frontend-dist \
    SERVER_PORT=8080 \
    SPRING_PROFILES_ACTIVE=prod \
    MEDIA_STORAGE_DIR=/app/data/media \
    JAVA_TOOL_OPTIONS="-XX:TieredStopAtLevel=1 -XX:+UseSerialGC -Xss512k -XX:MaxRAMPercentage=60"
# Réglages JVM pour une petite instance (0,1 CPU, 512 Mo) : compilateur JIT allégé et ramasse-miettes
# série réduisent fortement le temps de démarrage et l'empreinte mémoire (mesuré : démarrage 2,3 fois
# plus rapide, environ 200 Mo). Sur un serveur plus puissant, remplacez JAVA_TOOL_OPTIONS au lancement.

USER app
EXPOSE 8080

# /actuator/health est fourni par Spring Boot Actuator (seul point exposé) ; il vérifie aussi la base.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD wget -q -O /dev/null "http://127.0.0.1:${SERVER_PORT}/actuator/health" || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
