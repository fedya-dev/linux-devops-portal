---
title: "Kubernetes Network Policies: Zero Trust Networking"
description: "Имплементация на Zero Trust модел в Kubernetes чрез Network Policies, Calico и Cilium. Практически примери с default-deny, microsegmentation и egress контрол."
pubDate: 2026-09-05
category: "DevOps"
tags: ["Kubernetes", "NetworkPolicy", "Calico", "Cilium", "Security"]
author: "LinuxDev Team"
featured: false
readTime: "10 мин"
heroImage: "/images/devops/kubernetes-network-policies.webp"
heroImageAlt: "Kubernetes Network Policies архитектура"
---

## Защо default-allow е опасен

По подразбиране в Kubernetes **всички pod-ове могат да комуникират помежду си**, без значение от namespace-а, етикетите или ролята им. Това е удобно за разработка, но в production е **сериозна дупка за сигурност**.

Представи си следния сценарий:

- Frontend pod е компрометиран чрез RCE в зависимост
- Атакуващият иска да достигне до базата данни
- Kubernetes **не предлага никаква защита** по подразбиране — pod-ът може да се свърже директно с PostgreSQL на порт 5432, без нищо да го спре

**Network Policies** са решението. Те позволяват да дефинираш точно кой с кого може да говори, на кой порт и по кой протокол.

## Какво е Zero Trust в Kubernetes контекст

**Zero Trust** означава: **никой не е доверен по подразбиране**, дори ресурси в същия клъстер.

Традиционният "perimeter" модел предполага:
- Вътре в мрежата → доверено
- Извън мрежата → недоверено

Zero Trust отхвърля това. Вместо "вътре vs вън", той пита: **"Този конкретен pod има ли право да говори с онзи конкретен pod, на този конкретен порт?"**

В Kubernetes това се постига с **default-deny** политики + явни allow правила.

## NetworkPolicy API — основи

NetworkPolicy е **стандартен Kubernetes ресурс** (от 1.7+), но:

> ⚠️ **Важно:** NetworkPolicy се **дефинира** от Kubernetes API, но се **прилага** от CNI плъгина. Ако използваш Flannel или стандартния Docker bridge — **политиките няма да работят**. Нужен ти е CNI с поддръжка на NetworkPolicy: Calico, Cilium, Weave, Antrea.

### Структура на политика

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: <име>
  namespace: <namespace>
spec:
  podSelector: {}        # към кои pod-ове се прилага
  policyTypes:           # Ingress, Egress или двете
    - Ingress
    - Egress
  ingress: [...]         # правила за входящ трафик
  egress: [...]          # правила за изходящ трафик
```

Трите ключови концепции:

1. **podSelector** — избира pod-ове по етикети. Празен `{}` = всички pod-ове в namespace-а.
2. **policyTypes** — указва дали политиката контролира входящ (Ingress), изходящ (Egress) или и двата трафика.
3. **ingress/egress** — списък от правила. Ако е празен списък (`[]`), **блокира всичко**.

## Стъпка 1: Default-deny политика

Първата стъпка при Zero Trust е да **блокираш всичко по подразбиране**, после да отваряш само нужното.

### Default-deny Ingress за целия namespace

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

Това казва: **"Всички pod-ове в namespace `production` не приемат никакъв входящ трафик, освен ако друга политика изрично не го разреши."**

### Default-deny Egress

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-egress
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
```

> ⚠️ **Внимание:** Ако приложиш default-deny Egress, pod-овете **няма да могат да достигат до DNS** (kube-dns в `kube-system`). Ще трябва да добавиш изрично правило за DNS.

### Default-deny и за двете

Ако искаш тотално затваряне:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

## Стъпка 2: Разреши DNS

Без DNS pod-овете не могат да resolve-ват service имена. Задължително добави:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

Това разрешава на всички pod-ове в `production` да достигат DNS на порт 53 (UDP и TCP).

## Стъпка 3: Microsegmentation между tier-ове

Класическа 3-tier архитектура:

```
Frontend  →  Backend  →  Database
```

Правилото: **Frontend говори само с Backend, Backend говори само с Database. Frontend никога не говори директно с Database.**

### Етикети на pod-овете

Увери се, че pod-овете имат етикети:

```yaml
# Frontend deployment
metadata:
  labels:
    app: frontend
    tier: web

# Backend deployment
metadata:
  labels:
    app: backend
    tier: api

# Database deployment
metadata:
  labels:
    app: postgres
    tier: db
```

### Политика: Backend приема само от Frontend

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-allow-frontend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
```

Backend pod-овете приемат трафик **само** от pod-ове с етикет `app: frontend`, **само** на порт 8080.

### Политика: Database приема само от Backend

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: postgres-allow-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432
```

Сега **Frontend не може да достигне Database директно**, дори да знае IP адреса. Това е смисълът на microsegmentation.

## Стъпка 4: Cross-namespace комуникация

Често имаш `monitoring` namespace, който трябва да scrape-ва метрики от `production`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - protocol: TCP
          port: 9090
```

**Синтаксисът е важен:** `namespaceSelector` **и** `podSelector` в **един** `from` елемент означава **"pod в monitoring namespace с етикет app=prometheus"**. Ако ги разделиш на два елемента, става **"или namespace monitoring, или pod app=prometheus навсякъде"** — много по-широко.

```yaml
# Правилно (AND)
from:
  - namespaceSelector:
      matchLabels:
        name: monitoring
    podSelector:
      matchLabels:
        app: prometheus

# Грешно (OR — разрешава много повече)
from:
  - namespaceSelector:
      matchLabels:
        name: monitoring
  - podSelector:
      matchLabels:
        app: prometheus
```

## Стъпка 5: Egress контрол

Досега разгледахме само Ingress. Zero Trust изисква и **Egress** контрол — какво може да напуска pod-а.

### Пример: Backend може да говори само с Database и external API

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-egress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Egress
  egress:
    # DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
    # Database
    - to:
        - podSelector:
            matchLabels:
              app: postgres
      ports:
        - protocol: TCP
          port: 5432
    # External API (по IP range)
    - to:
        - ipBlock:
            cidr: 203.0.113.0/24
            except:
              - 203.0.113.5/32
      ports:
        - protocol: TCP
          port: 443
```

Backend може да говори само с:
- DNS
- PostgreSQL
- External API на `203.0.113.0/24` (с изключение на `203.0.113.5`)

Всичко останало е блокирано.

## Calico vs Cilium — кой да избера

И двата CNI-та поддържат стандартния NetworkPolicy API, но всеки има собствени разширения.

| Feature | Calico | Cilium |
|---|---|---|
| Стандартен NetworkPolicy | ✅ | ✅ |
| Layer 7 policies (HTTP/gRPC) | ⚠️ Enterprise само | ✅ Open source |
| FQDN-based egress | ⚠️ Enterprise | ✅ `toFQDNs` |
| eBPF-based | Опционално (dataplane) | ✅ По подразбиране |
| Performance overhead | По-висок (iptables) | По-нисък (eBPF) |
| Hubble (observability) | ❌ | ✅ Вградено |
| Cluster-wide default-deny | ✅ `GlobalNetworkPolicy` | ✅ `CiliumClusterwideNetworkPolicy` |

### Cilium: FQDN-based egress

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-github
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  egress:
    - toFQDNs:
        - matchName: "api.github.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

**Само Cilium** (open source) позволява FQDN-based egress. При Calico това е Enterprise feature.

### Cilium: Layer 7 HTTP policies

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-api-get-only
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            http:
              - method: "GET"
                path: "/api/v1/.*"
```

Това позволява **само GET заявки** към `/api/v1/*`. POST, PUT, DELETE се блокират на L7 ниво. Това е **невъзможно** със стандартния NetworkPolicy.

### Calico: GlobalNetworkPolicy

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny-all
spec:
  selector: all()
  types:
    - Ingress
    - Egress
```

**Cluster-wide** default-deny — не само за един namespace. Полезно за начална конфигурация.

## Практически workflow

### 1. Аудит — какво реално комуникира

Преди да приложиш политики, разбери какво реално се случва. Cilium има вграден **Hubble**:

```bash
# Включи Hubble
cilium hubble enable --ui

# Виж всички потоци в production namespace
hubble observe --namespace production --follow
```

Calico има подобен инструмент — **Calico Flow Logs** (Enterprise) или `calicoctl` за debug.

### 2. Прилагане в staging първо

```bash
# Смени на staging namespace
kubectl config set-context --current --namespace=staging

# Приложи политиките в "audit" режим, ако CNI-то го поддържа
kubectl apply -f network-policies/
```

### 3. Мониторинг след прилагане

```bash
# Провери дали има дропнати пакети
kubectl logs -n kube-system -l k8s-app=calico-node --tail=100 | grep -i drop

# Cilium
cilium monitor --type drop
```

### 4. Инкрементално

**Никога** не прилагай default-deny наведнъж в production. Стъпка по стъпка:

1. Първо **наблюдавай** кой с кого говори
2. Добави **явни allow** правила за потвърдената комуникация
3. **Накрая** добави default-deny
4. Монитори 24-48 часа за дропнати пакети
5. Итерирай

## Чести грешки

### 1. Забравил си DNS

```yaml
# Default-deny egress без DNS → pod-овете не могат да resolve-ват имена
# Винаги добавяй:
egress:
  - to:
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: kube-system
    ports:
      - protocol: UDP
        port: 53
```

### 2. Объркваш AND vs OR в selectors

```yaml
# AND (правилно за "pod в namespace X с label Y")
- namespaceSelector:
    matchLabels:
      name: monitoring
  podSelector:
    matchLabels:
      app: prometheus

# OR (разрешава много повече от нужното)
- namespaceSelector:
    matchLabels:
      name: monitoring
- podSelector:
    matchLabels:
      app: prometheus
```

### 3. Мислиш, че политиките работят, но CNI-то ги игнорира

Flannel **не поддържа** NetworkPolicy. Ако приложиш политики с Flannel, те ще се запишат в etcd, но нищо няма да се случи.

```bash
# Провери CNI
kubectl get pods -n kube-system | grep -E "calico|cilium|weave|flannel"
```

### 4. Забравил си egress към API server

Ако pod-овете използват service account tokens за достъп до API server-а, добави:

```yaml
egress:
  - to:
      - ipBlock:
          cidr: <API_SERVER_IP>/32
    ports:
      - protocol: TCP
        port: 443
```

### 5. Не тестваш в staging

Приложи в staging namespace първо. 24 часа наблюдение. После в production.

## Verification checklist

- [ ] CNI поддържа NetworkPolicy (Calico, Cilium, Weave, Antrea)
- [ ] Default-deny политика е приложена за всички production namespace-и
- [ ] DNS egress правило съществува
- [ ] Всяка комуникация е изрично разрешена (не разчиташ на defaults)
- [ ] Cross-namespace правила използват `namespaceSelector` + `podSelector` в **един** елемент
- [ ] Monitoring показва 0 неочаквани дропнати пакети за 24 часа
- [ ] Egress политики съществуват (не само Ingress)
- [ ] FQDN-based egress се използва, ако CNI-то го поддържа

## Заключение

Zero Trust в Kubernetes **не е продукт**, който инсталираш — това е **модел**, който прилагаш постепенно. Започни с default-deny, добавяй явни allow правила, наблюдавай, итерирай.

**Calico** е добър избор, ако вече го използваш или ако ти трябва стабилност и голяма общност. **Cilium** е по-модерният избор — eBPF dataplane, FQDN-based egress, Layer 7 policies, вграден Hubble за observability — всичко в open source.

Истинската стойност на Network Policies не е в предотвратяването на пробив — **пробиви ще се случват**. Стойността е в **ограничаването на щетите**, когато пробивът стане. Компрометиран frontend pod, който не може да достигне до базата данни, е много по-малък проблем от компрометиран frontend pod, който има пълен достъп до целия клъстер.