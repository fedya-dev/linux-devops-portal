---
title: 'Dockerfile best practices: 15 съвета от production'
description: >-
  Практически съвети за писане на ефективни Dockerfile образи. Multi-stage
  builds, caching, сигурност и оптимизация на размера — с реални примери от
  production среди.
pubDate: 2026-09-12T00:00:00.000Z
category: DevOps
tags:
  - Docker
  - Dockerfile
  - Best Practices
  - DevOps
author: LinuxDev Team
featured: false
readTime: 14 мин
heroImage: /images/devops/dockerfile-best-practices.webp
heroImageAlt: Dockerfile best practices
draft: false
---

Писал съм стотици Dockerfile-ове. Някои са били елегантни — 80 MB образи, които се build-ват за 30 секунди. Други са били катастрофи — 2 GB чудовища, които се build-ват 15 минути и съдържат `node_modules` от три различни проекта.

Разликата между добрия и лошия Dockerfile не е в "знаенето на синтаксиса". Всички знаят `FROM`, `RUN`, `COPY`. Разликата е в **разбирането как работи Docker под капака** — как се кешират слоевете, как се наследяват, как се оптимизира размерът.

В тази статия ще ти дам 15 съвета, които съм научил от реални production среди. Всеки съвет има пример — "лошо vs добре", за да видиш разликата веднага.

## 1. Pin-вай base image версията

Най-честата грешка, която виждам:

```dockerfile
FROM node:latest
```

`latest` не е версия. Тя е "каквото е най-новото в момента, когато build-ваш". Утре може да е Node 20, вдругиден Node 22, а след месец — Node 24 с breaking changes. Build-ът, който е работил вчера, днес може да се счупи без никой да е пипал Dockerfile-а.

```dockerfile
# Добре — конкретна версия
FROM node:20.11.1-alpine3.19

# Още по-добре — с digest за пълна сигурност
FROM node:20.11.1-alpine3.19@sha256:abc123...
```

**Практическо правило:** Винаги pin-вай до minor версия (напр. `20.11`), не до major (`20`). Ако искаш пълна сигурност — използвай digest (`@sha256:...`), който е immutable.

## 2. Използвай Alpine или distroless

Големината на base image-а определя долната граница на твоя образ.

```
ubuntu:22.04         → 77 MB
debian:12            → 124 MB
node:20              → 1.1 GB  ← базиран на Debian
node:20-alpine       → 130 MB  ← базиран на Alpine
node:20-slim         → 240 MB  ← Debian без излишното
gcr.io/distroless/nodejs20 → 90 MB  ← без shell
```

```dockerfile
# Лошо — 1.1 GB само за base
FROM node:20

# Добре — 130 MB
FROM node:20-alpine

# Най-добре за production — 90 MB, без shell
FROM gcr.io/distroless/nodejs20
```

**Защо distroless е по-сигурен:** Няма shell, няма package manager, няма curl/wget. Ако някой пробие приложението ти, той не може да изпълни нищо друго освен твоя binary.

**Кога Alpine не е добър избор:**
- Ако използваш native dependencies, които изискват `glibc` (Alpine използва `musl`) — може да имаш проблеми с компилация или runtime
- Ако трябва да debug-ваш в контейнера — Alpine има само `busybox`, не пълния GNU toolset

## 3. Multi-stage builds

Това е най-мощната техника за намаляване на размера. Идеята: build-ваш в един stage (с всички build tools), копираш само резултата в друг stage (минимален).

```dockerfile
# Лошо — 1.4 GB
FROM node:20
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["node", "dist/index.js"]
# Проблемът: node_modules с dev dependencies, source code, build tools — всичко остава
```

```dockerfile
# Добре — 180 MB
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
CMD ["node", "dist/index.js"]
```

**Какво се случва:**
1. **Stage `builder`** — има всичко: source code, dev dependencies, build tools. Този stage се изхвърля след build-а.
2. **Final stage** — взема само `dist/` (компилирания код) и production `node_modules`.

**Резултат:** от 1.4 GB на 180 MB — 8× по-малък образ, по-бърз deploy, по-малко attack surface.

### Multi-stage за Go — още по-драматично

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o myapp .

FROM scratch
COPY --from=builder /app/myapp /myapp
ENTRYPOINT ["/myapp"]
```

**Резултат:** 5 MB образ. `scratch` е празен образ — има само твоя binary. Няма shell, няма нищо друго. Това е максимумът за сигурност и минимализъм.

## 4. Редът на COPY има значение за caching

Docker кешира всеки слой. Ако даден слой не се е променил, Docker го взема от кеша. Но **ако един слой се промени, всички следващи се rebuild-ват**.

```dockerfile
# Лошо — всеки code change invalidates npm install
COPY . .
RUN npm install
```

Ако промениш `README.md`, `COPY . .` се променя → `npm install` се rebuild-ва → чакаш 2 минути за нищо.

```dockerfile
# Добре — npm install се кешира, ако package.json не се променя
COPY package.json package-lock.json ./
RUN npm install
COPY . .
```

Сега `README.md` промяна invalidates само последния `COPY . .`, а `npm install` остава в кеша.

**Златно правило:** Копирай **първо** нещата, които се променят рядко (`package.json`), и **накрая** тези, които се променят често (source code).

## 5. Комбинирай RUN командите

Всеки `RUN` създава нов слой. Слоевете се добавят — не се "смаляват" от следващия слой.

```dockerfile
# Лошо — 3 слоя, всеки +100 MB
RUN apt update
RUN apt install -y curl
RUN rm -rf /var/lib/apt/lists/*
# Проблемът: rm премахва файловете, но в нов слой.
# Предишният слой все още съдържа файловете. Образът е по-голям.
```

```dockerfile
# Добре — 1 слой, чист
RUN apt update && \
    apt install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

**Защо работи:** Всичко е в един `RUN`, значи е в един слой. `rm` премахва файловете **преди** слоят да бъде финализиран. Резултатът е чист.

## 6. Използвай `.dockerignore`

Ако нямаш `.dockerignore`, всичко в проекта отива в Docker daemon-а при всеки build. Включително `node_modules/`, `.git/`, `.env`.

```
# .dockerignore
node_modules
.git
.gitignore
.env
.env.*
*.log
dist
build
coverage
.vscode
.idea
README.md
docker-compose*.yml
Dockerfile*
.dockerignore
```

**Защо има значение:**
1. **Скорост** — 200 MB `node_modules` не се изпращат на daemon-а при всеки build
2. **Размер** — `.git/` може да е 100+ MB
3. **Сигурност** — `.env` файлове не попадат случайно в образа

Провери дали работи:
```bash
docker build -t test .
docker run --rm test ls -la
# Не трябва да виждаш .git, node_modules и т.н.
```

## 7. Non-root user

По подразбиране всичко в контейнера работи като **root**. Това е лошо:

- Ако някой пробие приложението, той е root в контейнера
- Ако има kernel exploit, той може да излезе извън контейнера като root
- Някои cloud платформи блокират root контейнери

```dockerfile
# Лошо
FROM node:20
COPY . /app
WORKDIR /app
CMD ["node", "index.js"]
# Всичко като root
```

```dockerfile
# Добре
FROM node:20
WORKDIR /app
COPY --chown=node:node . .
USER node
CMD ["node", "index.js"]
# Node образът вече има user "node" (UID 1000)
```

**Ако base image-ът няма non-root user:**

```dockerfile
FROM alpine:3.19
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --chown=app:app . .
USER app
CMD ["./app"]
```

**Провери:**
```bash
docker run --rm myimage whoami
# Трябва да върне "node" или "app", не "root"
```

## 8. Не съхранявай secrets в образа

```dockerfile
# КАТЕГОРИЧНО ГРЕШНО
ENV API_KEY=sk-1234567890abcdef
RUN echo "password123" > /app/password.txt
ARG DATABASE_URL=postgres://user:pass@host/db
```

**Защо е грешно:**
- `ENV` стойностите се виждат с `docker inspect`
- `RUN echo` файловете остават в слоя, дори да ги изтриеш после
- `ARG` стойностите се виждат в `docker history`

**Как да го направиш правилно:**

**Build-time secrets** (BuildKit):
```dockerfile
# syntax=docker/dockerfile:1.4
FROM node:20
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm install
```

```bash
docker build --secret id=npm_token,src=~/.npmrc .
```

**Runtime secrets** (environment variables или secrets manager):
```bash
docker run -e API_KEY=sk-... myapp
# или
docker run --env-file .env.production myapp
```

## 9. HEALTHCHECK

Docker може да проверява дали контейнерът е "здрав". Ако не е — може да го рестартира (в Swarm или Kubernetes).

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

**Ако нямаш `curl` в образа** (Alpine, distroless):

```dockerfile
# С wget (Alpine)
HEALTHCHECK CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Или собствен healthcheck binary
COPY --from=builder /app/healthcheck /healthcheck
HEALTHCHECK CMD ["/healthcheck"]
```

**Защо има значение:** Kubernetes използва healthcheck, за да разбере кога pod-ът е готов да приема трафик. Без него → downtime при deploy.

## 10. Не използвай `apt upgrade`

```dockerfile
# Лошо
RUN apt update && apt upgrade -y && apt install -y curl
```

`apt upgrade` обновява **всички** пакети в образа. Това:
- Прави build-а недетерминиран (резултатът зависи от деня)
- Може да счупи неща (обновява libc, openssl и т.н.)
- Увеличава размера

```dockerfile
# Добре — само каквото ти трябва
RUN apt update && \
    apt install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*
```

**Ако ти трябват updates** — обнови base image-а:
```dockerfile
FROM debian:12.5
# вместо
FROM debian:12 + apt upgrade
```

## 11. Set WORKDIR, не използвай `cd`

```dockerfile
# Лошо
RUN cd /app && npm install
# cd работи само в текущия RUN, не влияе на следващите
```

```dockerfile
# Добре
WORKDIR /app
RUN npm install
# Работи за всички следващи RUN, COPY, CMD
```

`WORKDIR` създава директорията, ако не съществува, и влияе на **всички** следващи инструкции. `cd` в `RUN` влияе само в рамките на този `RUN`.

## 12. Форматът на CMD и ENTRYPOINT има значение

Има два формата: **shell** и **exec**.

```dockerfile
# Shell формат — работи, но не е правилно
CMD node index.js
# Стартира /bin/sh -c "node index.js"
# Node НЕ е PID 1, не получава SIGTERM директно. Проблем при graceful shutdown.
```

```dockerfile
# Exec формат — правилно
CMD ["node", "index.js"]
# Node е PID 1, получава сигнали директно, graceful shutdown работи.
```

**Практическо правило:** Винаги използвай **exec формат** (`["...", "..."]`). Единственото изключение е, когато трябва shell features (pipe, redirect, env substitution).

### ENTRYPOINT vs CMD

```dockerfile
# ENTRYPOINT = какво да се изпълни (не се презаписва лесно)
# CMD = аргументи по подразбиране (могат да се презапишат)
ENTRYPOINT ["node"]
CMD ["index.js"]
```

```bash
docker run myapp              # изпълнява: node index.js
docker run myapp other.js     # изпълнява: node other.js
```

## 13. Label-и за metadata

```dockerfile
LABEL org.opencontainers.image.title="My App" \
      org.opencontainers.image.description="My awesome application" \
      org.opencontainers.image.version="1.2.3" \
      org.opencontainers.image.authors="team@example.com" \
      org.opencontainers.image.source="https://github.com/myorg/myapp" \
      org.opencontainers.image.licenses="MIT"
```

**Защо:** Label-ите се виждат с `docker inspect`, помагат за автоматизация, интеграция с container registries, документация. Помагат и на security scanners (trivy, grype) да идентифицират образа.

## 14. Оптимизация за размер — по-дълбоко

Ако искаш още по-малки образи:

**Използвай `apk add --no-cache` (Alpine):**
```dockerfile
RUN apk add --no-cache curl
# --no-cache = не запазва apk cache, директно инсталира
```

**Използвай `npm ci` вместо `npm install`:**
```dockerfile
RUN npm ci --only=production
# ci = clean install, само от lockfile, по-бърз, детерминиран
# --only=production = без dev dependencies
```

**Използвай `--no-install-recommends` (Debian/Ubuntu):**
```dockerfile
RUN apt install -y --no-install-recommends curl
# Не инсталира "препоръчани" пакети, само hard dependencies
```

**Използвай `--strip` за Go binary:**
```dockerfile
RUN go build -ldflags="-s -w" -o myapp .
# -s = strip symbol table
# -w = strip DWARF debug info
# Резултат: 30% по-малък binary
```

**Компресирай с UPX (за Go/C):**
```dockerfile
RUN upx --best --lzma myapp
# Може да намали binary-то с 50-70%
```

## 15. Провери образа за уязвимости

Build-ът е само началото. Провери какво си произвел.

**Trivy** — безплатен, бърз, най-често използван:
```bash
trivy image myapp:latest
```

**Grype:**
```bash
grype myapp:latest
```

**Docker Scout** (вграден в Docker Desktop):
```bash
docker scout cves myapp:latest
```

**Какво ще видиш:** списък с CVE-та в base image-а и dependencies. Не всички са critical за твоя случай, но трябва да знаеш какво имаш.

**Автоматизирай в CI:**
```yaml
# GitHub Actions
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    severity: 'CRITICAL,HIGH'
    exit-code: '1'  # fail build при critical
```

## Пълен пример — production-ready Node.js Dockerfile

Ето как изглежда всичко заедно:

```dockerfile
# syntax=docker/dockerfile:1.4

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20.11.1-alpine3.19 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# ============================================
# Stage 2: Build
# ============================================
FROM node:20.11.1-alpine3.19 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:20.11.1-alpine3.19 AS runtime

# Security: update packages
RUN apk upgrade --no-cache && \
    apk add --no-cache tini

WORKDIR /app

# Copy production deps
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy built app
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./

# Metadata
LABEL org.opencontainers.image.title="my-app" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/myorg/myapp"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Security: non-root
USER node

EXPOSE 3000

# tini = proper init, reaps zombies, forwards signals
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

**Какво прави този Dockerfile:**
- ✅ Pinned версии (`node:20.11.1-alpine3.19`)
- ✅ Multi-stage (deps → builder → runtime)
- ✅ Layer caching (package.json първо)
- ✅ Alpine base (малък)
- ✅ Production dependencies само
- ✅ Non-root user
- ✅ tini за PID 1
- ✅ Health check
- ✅ Labels за metadata
- ✅ Exec формат на CMD/ENTRYPOINT

**Резултат:** ~150 MB образ, който стартира за 2 секунди.

## Чеклист за всеки Dockerfile

- [ ] Base image е pinned (не `latest`)
- [ ] Multi-stage build, ако има build стъпка
- [ ] `.dockerignore` съществува и е попълнен
- [ ] `COPY package.json` преди `COPY . .`
- [ ] RUN команди са комбинирани с `&&`
- [ ] `--no-install-recommends` или `--no-cache`
- [ ] Non-root user (`USER`)
- [ ] Няма secrets в ENV/ARG
- [ ] Exec формат за CMD/ENTRYPOINT
- [ ] HEALTHCHECK дефиниран
- [ ] Labels за metadata
- [ ] Cleanup в същия RUN (`rm -rf`)
- [ ] Използва се `npm ci`, не `npm install`
- [ ] Образът е сканиран за CVE-та

## Заключение

Dockerfile-ът изглежда просто — 5-10 реда. Но разликата между добър и лош Dockerfile е **в детайлите**. Multi-stage builds, ред на COPY, non-root user, health checks — всичко това определя дали образът е 100 MB или 1 GB, дали deploy-ът е 10 секунди или 10 минути, дали е сигурен или уязвим.

**Практическо правило:** Всеки път, когато пишеш Dockerfile, си задавай въпросите:
1. **Какъв е размерът на образа?** Ако >200 MB — прегледай за оптимизации
2. **Кой е потребителят в контейнера?** Ако `root` — поправи го
3. **Има ли healthcheck?** Ако не — добави го
4. **Кешира ли се добре?** Ако всеки build отнема минути — прегледай реда на COPY

Dockerfile-ът е като всеки код — той се подобрява с итерации. Започни с тези 15 съвета, приложи ги към текущите си Dockerfile-ове и виж разликата. Ще се изненадаш колко малко усилия дават голям резултат.
