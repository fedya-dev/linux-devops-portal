---
title: Git Push Automation & NPM Helper
description: >-
  Bash функции и NPM скриптове за автоматизация на ежедневните Git push процеси
  и build/preview команди.
pubDate: 2026-09-13T00:00:00.000Z
category: Automation
tags:
  - Git
  - Bash
  - NPM
  - Productivity
  - Workflow
author: LinuxDev Team
version: 1.0.0
language: bash
dependencies:
  - git
  - npm
  - bash
usage: 'gp [commit message]'
featured: true
draft: false
heroImageAlt: ''
---

## Какво прави

Полезни Bash функции и NPM скриптове за спестяване на време при ежедневните рутинни операции с Git и изпълнение на build процеси. Автоматизацията елиминира повторните команди, проверява за налични промени и генерира ясни commit съобщения.

## Характеристики

- **Автоматична проверка за промени** — не прави празни commit-ове, ако няма променени файлове
- **Динамични съобщения за commit:**
  - Автоматично генерира съобщение с дата, час и брой променени файлове
  - Използва custom съобщение с префикс `Perf:`, когато е подаден аргумент
- **Оптимизирано качване** — `git add -A`, `git commit`, `git push` с една команда (`gp`)
- **NPM съкращения** — обединява build и preview (`bp`) или build и deploy в една команда

## Код

### 1. Bash автоматизация за Git (`~/.bashrc` или `~/.zshrc`)

```bash
# Git Push Automation Function
gp() {
    # Проверка за незапазени/нови промени (включително untracked файлове)
    if [ -n "$(git status --porcelain)" ]; then
        git add -A

        # Преброяване на променените файлове
        local files_count
        files_count=$(git diff --cached --name-only | wc -l | tr -d ' ')

        # Проверка дали е подадено съобщение като аргумент
        if [ -n "$1" ]; then
            git commit -m "Perf: $1 ($files_count file(s))"
        else
            local timestamp
            timestamp=$(date +"%Y-%m-%d %H:%M")
            git commit -m "Auto-commit: $files_count file(s) at $timestamp"
        fi

        git push origin main
    else
        echo "ℹ️ Няма промени за комит."
    fi
}
```

### 2. NPM автоматизация (`package.json`)

Отвори `package.json` и добави следните скриптове в секцията `"scripts"`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "bp": "npm run build && npm run preview",
    "deploy": "npm run build && git add . && git commit -m 'Auto-build deploy' && git push origin main"
  }
}
```

## Използване

### Git автоматизация

След като добавиш функцията в `.bashrc`, я презареди с:

```bash
source ~/.bashrc
```

След това можеш да я използваш от всяка проектна директория:

```bash
# Бърз push (генерира съобщение с брой файлове и дата/час)
gp

# Push с конкретно име/описание
gp "Нова статия за Docker"
```

### NPM команди

```bash
# Build и веднага след това preview
npm run bp

# Комплектен билд и push към repo-то
npm run deploy
```

## Изисквания

- **Git** инсталиран и конфигуриран
- **Bash** или **Zsh** shell
- Настроен SSH ключ или запазени данни за достъп до remote repository-то
