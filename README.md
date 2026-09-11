# LinuxDev Portal

**Next-generation technical portal for Linux, Technologies & DevOps**

Специализиран технически портал от следващо поколение, изграден с **Astro 5**.

## Структура

```
src/
├── components/          # UI компоненти
│   ├── ui/              # Badge, Card
│   ├── Header.astro
│   ├── Footer.astro
│   ├── PostCard.astro
│   └── TutorialCard.astro
├── content/             # Content Collections (Markdown)
│   ├── posts/           # Блог статии
│   └── tutorials/       # Туториали
├── content.config.ts    # Schema за collections
├── data/                # Статични данни
│   ├── navigation.ts
│   └── categories.ts
├── layouts/
├── lib/                 # Utils (formatDate, slugify...)
├── pages/
│   ├── blog/            # /blog + /blog/[slug]
│   ├── tutorials/       # /tutorials + /tutorials/[slug]
│   ├── index.astro
│   ├── linux.astro
│   ├── devops.astro
│   ├── technologies.astro
│   └── tools.astro
└── styles/
```

## Features

- ✅ Astro Content Collections (posts + tutorials)
- ✅ Markdown с syntax highlighting (Shiki)
- ✅ Type-safe frontmatter schema
- ✅ Dynamic routes `/blog/[slug]`, `/tutorials/[slug]`
- ✅ Централизирани data файлове
- ✅ Reusable UI компоненти
- ✅ Modern dark UI + terminal hero
- ✅ Responsive

## Стартиране

```bash
npm install
npm run dev
```

Отвори http://localhost:4321

## Добавяне на съдържание

### Нова блог статия

Създай файл в `src/content/posts/my-article.md`:

```md
---
title: "Заглавие"
description: "Кратко описание"
pubDate: 2026-09-15
category: "DevOps"   # Linux | DevOps | Technologies | Security | Cloud
tags: ["Kubernetes", "GitOps"]
featured: false
readTime: "10 мин"
---

Съдържанието тук...
```

### Ново туториал

Създай файл в `src/content/tutorials/my-tutorial.md`:

```md
---
title: "Заглавие"
description: "Описание"
pubDate: 2026-09-15
category: "Linux"
level: "Intermediate"   # Beginner | Intermediate | Advanced
duration: "30 мин"
tags: ["eBPF"]
prerequisites: ["Linux basics"]
---

Стъпки...
```

## Tech Stack

- Astro 5 + MDX
- Tailwind CSS
- TypeScript
- Content Collections
