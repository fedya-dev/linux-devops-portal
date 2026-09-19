---
title: 'Как да инсталираме Astro – стъпка по стъпка'
description: >-
  Наскоро започнах да работя с Astro и останах очарован. В тази статия ще ви покажа какво е Astro, как да го инсталирате, каква е структурата на проекта и как да започнете да го използвате.
pubDate: 2026-09-12T00:00:00.000Z
category: DevOps
tags: [Astro, JavaScript, Web Development, Frontend]
author: LinuxDev Team
featured: false
readTime: 10 мин
heroImage: /images/kak-da-instalirame-astro.webp
heroImageAlt: Astro framework installation guide
level: Beginner
duration: 10 мин
draft: false
---

Наскоро започнах да работя с Astro и останах очарован. Ще ви разкажа защо този framework ми хареса толкова много и как лесно можете да го инсталирате и започнете да го използвате. В тази статия ще минем през всичко стъпка по стъпка – от това какво представлява Astro, през инсталацията, структурата на файловете, основните команди, до това как реално да работите с него.

## Какво е Astro?

Astro е модерен web framework, създаден специално за съдържателно ориентирани сайтове – блогове, документация, портфолиа, маркетинг страници и подобни. Основната му идея е да генерира възможно най-бързи уебсайтове, като по подразбиране изпраща към браузъра минимално количество JavaScript.

Това, което най-много ми хареса, е **Islands Architecture**. Страниците се рендират като статичен HTML, а интерактивните компоненти (React, Vue, Svelte и др.) се „зареждат“ само там, където са нужни. Резултатът е изключително бързи сайтове с отлични Core Web Vitals.

Astro поддържа:
- Markdown и MDX
- Компоненти от различни UI frameworks в един проект
- Static Site Generation (SSG) и Server-Side Rendering (SSR)
- Интеграции с Tailwind, React, Vue, Svelte и много други

## Предварителни изисквания

Преди да започнете, уверете се, че имате:

- **Node.js** версия 22.12.0 или по-нова (нечетните версии като v23 не се поддържат официално)
- Предпочитан package manager – npm, pnpm или yarn
- Текстов редактор – силно препоръчвам VS Code с официалното [Astro разширение](https://marketplace.visualstudio.com/items?itemName=astro-build.astro-vscode)

Проверете версията на Node с:

```bash
node -v
```

## Инсталация на Astro (препоръчителен начин)

Най-лесният и препоръчителен начин е чрез официалния CLI wizard.

Отворете терминала и изпълнете:

```bash
npm create astro@latest
```

Ще се стартира интерактивен асистент, който ще ви зададе няколко въпроса:

1. Къде да създаде проекта (име на папката)
2. Кой starter template да използва (Basics, Blog, Minimal и др.)
3. Дали да инсталира зависимостите
4. Дали да инициализира git repository
5. (По желание) дали да добави интеграции

След като процесът приключи, влезте в новата папка:

```bash
cd my-astro-project
```

Ако сте пропуснали инсталацията на зависимостите по време на wizard-а, изпълнете:

```bash
npm install
```

### Алтернативни команди според package manager-а

```bash
# pnpm
pnpm create astro@latest

# yarn
yarn create astro
```

Можете също да стартирате проекта с готов template или интеграция:

```bash
npm create astro@latest -- --template blog
npm create astro@latest -- --add react --add tailwind
```

## Ръчна инсталация (ако предпочитате)

Ако искате пълен контрол, можете да инсталирате Astro ръчно:

```bash
mkdir my-astro-project
cd my-astro-project
npm init --yes
npm install astro
```

След това добавете в `package.json` следните скриптове:

```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview"
}
```

Създайте базовите файлове:

- `src/pages/index.astro`
- `public/robots.txt`
- `astro.config.mjs`
- `tsconfig.json`

## Структура на проекта

След инсталацията типичният Astro проект изглежда така:

```
my-astro-project/
├── public/                 # Статични файлове (favicon, robots.txt, изображения)
│   └── favicon.svg
├── src/
│   ├── components/         # Преизползваеми компоненти
│   ├── layouts/            # Layouts
│   ├── pages/              # Страници (file-based routing)
│   │   └── index.astro
│   ├── styles/             # CSS / Sass файлове
│   └── assets/             # Изображения, които Astro ще оптимизира
├── astro.config.mjs        # Конфигурация на Astro
├── package.json
└── tsconfig.json
```

### Важни папки и файлове

- **`src/pages/`** – всяка `.astro`, `.md` или `.mdx` файл тук става страница
- **`src/components/`** – тук слагам всичките си компоненти
- **`public/`** – файловете се копират директно в build-а без обработка
- **`astro.config.mjs`** – мястото, където добавям интеграции и настройки

## Основни команди

След като проектът е готов, най-често използваните команди са:

```bash
# Стартиране на development сървър (с hot reload)
npm run dev

# Билд за production
npm run build

# Преглед на production build локално
npm run preview

# Добавяне на интеграция (React, Tailwind, MDX и др.)
npx astro add react
npx astro add tailwind
```

Development сървърът по подразбиране работи на `http://localhost:4321`.

## Как да започна да работя с Astro

### 1. Първа страница

Отворете `src/pages/index.astro` и добавете нещо просто:

```astro
---
// Frontmatter – кодът тук се изпълнява само на сървъра
const title = "Моят първи Astro сайт";
---

<html lang="bg">
  <head>
    <meta charset="utf-8" />
    <title>{title}</title>
  </head>
  <body>
    <h1>Здравей, Astro!</h1>
    <p>Това е моята първа страница.</p>
  </body>
</html>
```

### 2. Създаване на компонент

Създайте файл `src/components/Header.astro`:

```astro
---
const { title } = Astro.props;
---

<header>
  <h1>{title}</h1>
  <nav>
    <a href="/">Начало</a>
    <a href="/about">За мен</a>
  </nav>
</header>
```

И го използвайте в страницата:

```astro
---
import Header from '../components/Header.astro';
---

<Header title="Моят сайт" />
```

### 3. Добавяне на Markdown страница

Създайте `src/pages/about.md`:

```markdown
---
title: За мен
---

# Здравейте!

Аз съм разработчик, който наскоро започна да използва Astro.
```

### 4. Добавяне на интеграции

Искате Tailwind? Изпълнете:

```bash
npx astro add tailwind
```

Искате React компоненти?

```bash
npx astro add react
```

Astro автоматично актуализира `astro.config.mjs` и инсталира нужните пакети.

## Полезни съвети от моя опит

- Започнете с **Minimal** или **Basics** template, за да разберете структурата
- Използвайте `.astro` файлове за layout и статично съдържание
- Добавяйте UI frameworks само когато наистина ви трябва интерактивност
- Проверявайте `astro.config.mjs` след всяко добавяне на интеграция
- Използвайте `npm run build` често, за да виждате какво се генерира в `dist/`

## Заключение

Astro се оказа изключително приятен за работа. Леката крива на обучение, отличната производителност и гъвкавостта с различни frameworks ме убедиха, че си заслужава. Инсталацията е бърза, структурата е логична, а възможностите – много.

Ако още не сте го пробвате – сега е идеалният момент. Стартирайте `npm create astro@latest` и започнете да експериментирате.

Успех и приятно кодене!
```