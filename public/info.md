# Шаблон за статия — подсказка (reference)

Този файл е чист reference/checklist . Не е статия — копирам frontmatter-а долу и следвам структурата, когато пиша нова статия.

## 1. Frontmatter

Всеки файл започва и завършва с `---`.

```yaml
---
title: "Заглавие на статията"
description: "1-2 изречения — показват се в листинга и в Google"
pubDate: 2026-09-12
category: "DevOps"
tags: ["Tag1", "Tag2", "Tag3"]
author: "LinuxDev Team"
featured: false
readTime: "12 мин"
heroImage: "/images/category/slug.webp"
heroImageAlt: "Alt текст за картинката"
---
```

| Поле | Задължително | Описание |
|---|---|---|
| `title` | ✅ | Заглавие на статията |
| `description` | ✅ | 1-2 изречения, за листинг и SEO |
| `pubDate` | ✅ | Дата на публикуване, формат `YYYY-MM-DD` |
| `category` | ✅ | Точно едно от: `Linux`, `DevOps`, `Technologies`, `Security`, `Cloud`, `Tools` — с главна буква |
| `tags` | ❌ | Масив от тагове, показват се като badge-ове |
| `author` | ❌ | По подразбиране `"LinuxDev Team"` |
| `featured` | ❌ | `true`, ако трябва да е във featured секцията |
| `readTime` | ❌ | Приблизително време за четене |
| `heroImage` | ❌ | Път в `public/images/...`, започва с `/` |
| `heroImageAlt` | ❌ | Alt текст за картинката (SEO) |

**Правила, които лесно се пропускат:**
- `category` — стриктно едно от шестте, с главна буква, без вариации.
- `pubDate` — само `YYYY-MM-DD`, без час, без друг формат.
- `heroImage` — пътят винаги започва с `/` (root спрямо `public/`).

## 2. Структура на съдържанието

След затварящия `---` следва markdown по тази скица:

```
## Защо [темата] има значение
(въведение — какъв проблем решава темата)

## 1. [Първи съвет/секция]
(обяснение + пример)

## 2. [Втори съвет/секция]
(обяснение + пример)

...

## Заключение
(обобщение, без повторение на изброеното)
```

## 3. Правила за форматиране

- `##` за основни секции, `###` за подсекции.
- Код в блокове с изричен език: ```bash, ```dockerfile, ```yaml, ```python и т.н.
- Inline код с обратни кавички: `code`.
- Списъци: `-` за неподредени, `1.` за подредени.
- **Bold** — пестеливо, само за истински важно.
- Връзки `[text](url)` — само когато реално добавят стойност.
- Цитати с `>` — за важни бележки/предупреждения.

## 4. Стил на писане (лични предпочитания)

- Чист български език, минимум англицизми в прозата.
- Професионална терминология — на английски (`caching`, `layer`, `build context` и т.н.), не се превежда на сила.
- Директен, честен тон — без клишета от типа „Радвам се да помогна", без излишни любезности.
- Топло и приятелско, но не разводнено.
- Точност над всичко — никакви халюцинирани факти, версии, команди или числа. Ако нещо не е проверено — изрично се отбелязва несигурността.
- Ако има по-добър, по-безопасен или по-ефективен подход — предлага се веднага, не се крие зад "и това е ОК".

## 5. Тестване локално

```bash
npm run dev
```

- Провери за грешки в конзолата.
- `npm run build` — минава ли чисто?
- Link checker — всички връзки живи ли са?
- Rich Results Test — валидна ли е schema-та (ако има structured data)?

## 6. Deploy

```bash
git add .
git commit -m "Добавяне на статия за ..."
git push
```


## Навигация и layout

| Какво | Къде |
|---|---|
| **Менюта (header)** | `src/data/navigation.ts` → `mainNav` |
| **Footer линкове** | `src/data/navigation.ts` → `footerLinks` |
| **Header компонент** | `src/components/Header.astro` |
| **Footer компонент** | `src/components/Footer.astro` |
| **Base layout** | `src/layouts/BaseLayout.astro` |
| **Глобални стилове** | `src/styles/global.css` |
| **Tailwind конфиг** | `tailwind.config.mjs` |

## Съдържание

| Какво | Къде |
|---|---|
| **Статии (blog)** | `src/content/posts/*.md` |
| **Уроци (tutorials)** | `src/content/tutorials/*.md` |
| **Schema за колекции** | `src/content.config.ts` |

## Страници (рутинг)

| URL | Файл |
|---|---|
| `/` | `src/pages/index.astro` |
| `/blog` | `src/pages/blog/index.astro` |
| `/blog/<slug>` | `src/pages/blog/[...slug].astro` |
| `/tutorials` | `src/pages/tutorials/index.astro` |
| `/tutorials/<slug>` | `src/pages/tutorials/[...slug].astro` |
| `/linux`, `/devops`, `/technologies`, `/security`, `/cloud`, `/tools` | `src/pages/[category].astro` |
| `/404` | `src/pages/404.astro` |

## Компоненти

| Компонент | Файл | Използва се за |
|---|---|---|
| **PostCard** | `src/components/PostCard.astro` | Карта на статия в листинг |
| **TutorialCard** | `src/components/TutorialCard.astro` | Карта на урок в листинг |
| **Header** | `src/components/Header.astro` | Горна навигация |
| **Footer** | `src/components/Footer.astro` | Долна навигация |
| **Badge** | `src/components/ui/Badge.astro` | Категорийни badge-ове |
| **SafeImage** | `src/components/ui/SafeImage.astro` | Изображения с fallback |
| **CodeCopy** | `src/components/CodeCopy.astro` | Copy button на код блокове |

## Utility функции

| Функция | Файл |
|---|---|
| `formatDate()` | `src/lib/utils.ts` |

## Инфраструктура

| Какво | Къде |
|---|---|
| **Sitemap** | генерира се автоматично от `@astrojs/sitemap` |
| **Robots.txt** | `public/robots.txt` |
| **LLMs.txt** | `public/llms.txt` |
| **Favicon** | `public/favicon.svg` |
| **Hero images** | `public/images/<category>/` |

## Deployment

- **Repo:** `github.com/fedya-dev/linux-devops-portal`
- **Hosting:** Cloudflare Pages
- **Domain:** `https://linuxdev.fedia.eu`
- **CI/CD:** GitHub Actions → `.github/workflows/deploy.yml`
- **Тригер:** `git push` към `main`

## Ежедневен workflow

```bash
# 1. Пишеш нова статия
nano src/content/posts/моята-статия.md

# 2. Тестваш локално
npm run dev

# 3. Проверяваш build
npm run build

# 4. Пушваш
git add .
git commit -m "Add article: заглавие"
git push
```

# 5. Изчакваш 1-2 минути, проверяваш GitHub Actions

# 6. Отваряш https://linuxdev.fedia.eu/blog/моята-статия

## Синхронизиране

Когато се седне на домашния си компютър или работният лаптоп, преди да започнеш да пишеш нов код, просто отвори терминала в същата папка и изпълни:

```bash
git pull
```
Тази команда ще свали всичко, което е качено от лаптоп или домашният ми компютър и ще бъде напълно синхронизирани!