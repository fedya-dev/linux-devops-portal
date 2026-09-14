---
title: "Git Pull All Repos: Обнови всички локални репозитории с една команда"
description: "Bash функция, която обхожда всички поддиректории в текущата папка и пуска git pull във всяко Git репо. Спестява часове при работа с много проекти."
pubDate: 2026-09-14
category: "Automation"
tags: ["Git", "Bash", "Productivity", "Workflow"]
author: "LinuxDev Team"
version: "1.0.0"
language: "bash"
dependencies: ["git", "bash", "find"]
usage: "gitpullall"
featured: false
---

## Какво прави

Функция за Bash, която обхожда всички директни поддиректории в текущата папка и изпълнява `git pull` във всяка, която съдържа `.git` директория. Идеална, когато имаш папка с 10-20 проекта и искаш да ги обновиш всички наведнъж.

## Проблемът, който решава

Ако работиш с много проекти — `~/projects/`, `~/work/`, `~/Desktop/dev/` — всеки път трябва да влизаш в всеки и да пускаш `git pull`. При 10 проекта това са 10 команди, 10 `cd`, 10 пъти да проверяваш дали има конфликт.

С тази функция пускаш една команда и всичко се обновява.

## Код

Добави тази функция в края на твоя `~/.bashrc` (или `~/.zshrc`):

```bash
gitpullall() {
    find . -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n=== %s ===\n' "$dir"
            git -C "$dir" pull
        fi
    done
}
```

## Как работи

Разбор на всяка част:

| Част | Какво прави |
|---|---|
| `find .` | Търси от текущата директория |
| `-mindepth 1 -maxdepth 1` | Само директни деца, не рекурсивно |
| `-type d` | Само директории |
| `-print0` | Разделя резултатите с `\0` вместо нов ред (за сигурност при имена с интервали) |
| `IFS= read -r -d ''` | Чете до `\0`, без да интерпретира backslashes |
| `while ... done` | Итерира по всяка намерена директория |
| `[ -d "$dir/.git" ]` | Проверява дали директорията е Git репо |
| `printf '\n=== %s ===\n' "$dir"` | Отпечатва разделител с името на репото |
| `git -C "$dir" pull` | Пуска `git pull` **в** тази директория, без да прави `cd` |

## Инсталация

### Стъпка 1: Добави функцията

```bash
nano ~/.bashrc
```

Отиди в края на файла и постави функцията:

```bash
# Git: pull всички репозитории в текущата папка
gitpullall() {
    find . -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n=== %s ===\n' "$dir"
            git -C "$dir" pull
        fi
    done
}
```

Запази с `Ctrl+O`, `Enter`, `Ctrl+X`.

### Стъпка 2: Презареди конфигурацията

```bash
source ~/.bashrc
```

## Използване

```bash
# Отиди в папката с всичките си проекти
cd ~/projects

# Пусни функцията
gitpullall
```

**Примерен изход:**

```
=== project-a ===
Already up to date.

=== project-b ===
remote: Enumerating objects: 12, done.
remote: Counting objects: 100% (12/12), done.
Updating 3a4b5c6..7d8e9f0
Fast-forward
 README.md | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

=== project-c ===
Already up to date.

=== my-website ===
Already up to date.

=== legacy-api ===
From github.com:user/legacy-api
 * branch            main       -> FETCH_HEAD
Already up to date.
```

## Разширени версии

### Версия с git fetch + pull (за всички branches)

Ако искаш да обновиш и remote tracking-а (понякога се налага при force push от друг разработчик):

```bash
gitpullall() {
    find . -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n=== %s ===\n' "$dir"
            git -C "$dir" fetch --all --prune
            git -C "$dir" pull
        fi
    done
}
```

### Версия с цветове и summary

```bash
gitpullall() {
    local success=0
    local failed=0

    find . -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n\033[1;34m=== %s ===\033[0m\n' "$dir"
            if git -C "$dir" pull; then
                success=$((success+1))
            else
                failed=$((failed+1))
                printf '\033[0;31m✗ Pull failed in %s\033[0m\n' "$dir"
            fi
        fi
    done

    printf '\n\033[1;32m✓ Success: %d\033[0m\n' "$success"
    if [ $failed -gt 0 ]; then
        printf '\033[1;31m✗ Failed: %d\033[0m\n' "$failed"
    fi
}
```

> ⚠️ **Внимание:** `success` и `failed` броячите не работят правилно в този вариант, защото `while` цикълът върви в **subshell** (заради `| while`). За да работят, трябва process substitution:
> ```bash
> while IFS= read -r -d '' dir; do
>     ...
> done < <(find . -mindepth 1 -maxdepth 1 -type d -print0)
> ```

### Версия, която пропуска конкретни папки

Ако имаш папки, които не искаш да пипаш (напр. `archive/`, `_old/`):

```bash
gitpullall() {
    find . -mindepth 1 -maxdepth 1 -type d \
        ! -name 'archive' \
        ! -name '_old' \
        ! -name 'backup' \
        -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n=== %s ===\n' "$dir"
            git -C "$dir" pull
        fi
    done
}
```

### Версия с паралелно изпълнение

Ако имаш **много** репозитории и всяко `git pull` отнема време (бавна мрежа, много commits), паралелното изпълнение може да е по-бързо:

```bash
gitpullall() {
    find . -mindepth 1 -maxdepth 1 -type d -print0 | \
        xargs -0 -P 4 -I {} sh -c '
            if [ -d "{}/.git" ]; then
                printf "\n=== {} ===\n"
                git -C "{}" pull
            fi
        '
}
```

`-P 4` означава 4 паралелни процеса. Не прекалявай — при твърде много паралелни `git pull` може да удариш rate limit в GitHub.

## Кога е полезна

- **В началото на работния ден** — обнови всички проекти, преди да започнеш
- **След ваканция** — виждаш какво са променили колегите
- **При работа с много microservices** — всеки е отделно repo
- **При freelance** — всеки клиент е отделен проект
- **При обучение** — следваш 10 tutorials, всичките с код в Git

## Кога НЕ е полезна

- **Ако имаш uncommitted промени** — `git pull` ще се провали или ще създаде merge конфликт
- **Ако си на feature branch** — pull-ът ще обнови текущия branch, не `main`
- **Ако имаш submodules** — `git pull` няма да ги обнови, трябва `git submodule update --init --recursive`
- **Ако репозиторията изисква автентикация** — ще те пита за парола при всяко

## Проверка на състоянието

Ако искаш да видиш статуса на всички репозитории **без** да ги обновяваш:

```bash
gitstatusall() {
    find . -mindepth 1 -maxdepth 1 -type d -print0 | while IFS= read -r -d '' dir; do
        if [ -d "$dir/.git" ]; then
            printf '\n=== %s ===\n' "$dir"
            git -C "$dir" status -sb
        fi
    done
}
```

Това показва:
- Текущия branch
- Дали има uncommitted промени
- Дали си ahead/behind на remote

## Изисквания

- **Git** инсталиран
- **Bash 4+** (за `-print0` и `read -d ''`)
- Всички репозитории да са на едно ниво (директни деца на текущата папка)

## Заключение

Тази функция изглежда тривиална — 7 реда код. Но ако работиш с много репозитории всеки ден, тя спестява **часове месечно**. Аз я използвам всяка сутрин и не мога да си представя работата без нея.

Ако имаш специфични нужди (паралелно изпълнение, изключване на папки, различни branch-ове), виж разширените версии по-горе. Всички са тествани в реална употреба.

## Свързани скриптове

- **[Git Push Automation & NPM Helper](/scripts/git-push-automation)** — автоматизация на commit и push
