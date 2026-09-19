---
title: 'Git и GitHub: Пълен наръчник с команди'
description: >-
  Изчерпателен списък с най-важните Git команди — от инициализация на repository
  до branching, merge, rebase и работа с remote.
pubDate: 2026-09-16T00:00:00.000Z
category: Tools
level: Intermediate
duration: 15 min
tags:
  - git
  - github
  - version-control
  - cli
  - devops
author: LinuxDev Team
featured: false
readTime: 15 min
heroImage: /images/git-github-komandi.webp
heroImageAlt: Git и GitHub терминал команди
draft: false
---

# Git и GitHub: Пълен наръчник с команди

Git е стандартът за version control в разработката на софтуер. Този наръчник покрива командите, които реално се използват всеки ден — от базова настройка до по-сложни операции като rebase и cherry-pick.

## Конфигурация

Първоначална настройка на потребителското име и имейл, използвани за commit-и:

```bash
git config --global user.name "Твоето име"
git config --global user.email "email@example.com"

# Проверка на текущата конфигурация
git config --list

# Задаване на default branch за нови repos
git config --global init.defaultBranch main
```

## Инициализация и клониране

```bash
# Създаване на нов repository в текуща папка
git init

# Клониране на съществуващ remote repository
git clone https://github.com/user/repo.git

# Клониране в конкретна папка
git clone https://github.com/user/repo.git my-folder

# Клониране само на определен branch
git clone -b branch-name --single-branch https://github.com/user/repo.git
```

## Статус и разлики

```bash
# Показва състоянието на working directory
git status

# Показва промените, които не са staged
git diff

# Показва промените, които са staged (готови за commit)
git diff --staged

# Разлика между два commit-а
git diff commit1 commit2

# Разлика между branch-ове
git diff branch1..branch2
```

## Staging и commit

```bash
# Добавяне на конкретен файл в staging area
git add path/to/file

# Добавяне на всички промени (включително изтривания)
git add -A

# Добавяне на всички промени в текущата папка
git add .

# Interactive staging — избираш по парче (hunk)
git add -p

# Commit на staged промените
git commit -m "Съобщение за commit-а"

# Add + commit в една стъпка (само за tracked файлове)
git commit -am "Съобщение"

# Промяна на последния commit (съобщение или добавени файлове)
git commit --amend -m "Ново съобщение"

# Празен commit — без реални файлови промени
git commit --allow-empty -m "Empty commit"
```

## История

```bash
# Пълна история на commit-ите
git log

# Кратка история, по един ред на commit
git log --oneline

# История с графично представяне на branch-овете
git log --oneline --graph --all

# История на конкретен файл
git log --all -- path/to/file

# Кой е променил кой ред (blame)
git blame path/to/file

# Търсене на commit по съдържание в съобщението
git log --grep="търсен текст"
```

## Branching

```bash
# Списък на локалните branch-ове
git branch

# Списък на всички branch-ове, вкл. remote
git branch -a

# Създаване на нов branch
git branch branch-name

# Превключване към branch
git checkout branch-name

# Създаване и превключване в едно (старият синтаксис)
git checkout -b branch-name

# Модерният еквивалент (Git 2.23+)
git switch branch-name
git switch -c branch-name

# Изтриване на branch (само ако е merge-нат)
git branch -d branch-name

# Принудително изтриване (дори не merge-нат)
git branch -D branch-name

# Преименуване на текущия branch
git branch -m нов-name
```

## Merge и rebase

```bash
# Merge на branch в текущия
git merge branch-name

# Merge без fast-forward (винаги създава merge commit)
git merge --no-ff branch-name

# Rebase на текущия branch върху друг
git rebase branch-name

# Interactive rebase — squash, reorder, edit на commit-и
git rebase -i HEAD~5

# Продължаване след разрешен конфликт при rebase
git rebase --continue

# Прекратяване на rebase и връщане към старото състояние
git rebase --abort
```

## Работа с remote

```bash
# Показва конфигурираните remote-и
git remote -v

# Добавяне на нов remote
git remote add origin https://github.com/user/repo.git

# Промяна на URL на съществуващ remote
git remote set-url origin новия-url

# Изтегляне на промени без merge (само fetch)
git fetch origin

# Изтегляне и merge (fetch + merge)
git pull

# Pull с rebase вместо merge
git pull --rebase

# Push към remote branch
git push origin branch-name

# Първи push — задава upstream tracking
git push -u origin branch-name

# Force push (внимание — презаписва remote историята)
git push --force

# По-безопасен force push — проваля се при чужди нови commit-и
git push --force-with-lease

# Push на всички branch-ове
git push --all

# Изтриване на remote branch
git push origin --delete branch-name
```

## Отмяна на промени

```bash
# Връщане на файл към последния commit (отхвърля локални промени)
git checkout -- path/to/file
git restore path/to/file    # модерен синтаксис

# Премахване на файл от staging area (без да губи промените)
git restore --staged path/to/file
git reset HEAD path/to/file  # по-стар синтаксис

# Отмяна на последния commit, но запазва промените (unstaged)
git reset --soft HEAD~1

# Отмяна на последния commit и промените в staging
git reset --mixed HEAD~1

# Пълна отмяна — изтрива и файловите промени (внимание, необратимо)
git reset --hard HEAD~1

# Създава нов commit, който отменя ефекта на друг commit
git revert commit-hash

# Изчистване на untracked файлове (dry-run първо!)
git clean -n
git clean -f
```

## Stash (временно скатаване на промени)

```bash
# Скатаване на текущите промени
git stash

# Скатаване със съобщение
git stash save "описание"

# Списък на stash-натите промени
git stash list

# Прилагане на последния stash (запазва го в списъка)
git stash apply

# Прилагане и премахване от списъка
git stash pop

# Прилагане на конкретен stash
git stash apply stash@{2}

# Изтриване на конкретен stash
git stash drop stash@{2}

# Изчистване на всички stash-ове
git stash clear
```

## Tags

```bash
# Списък на съществуващите tags
git tag

# Създаване на лек (lightweight) tag
git tag v1.0.0

# Създаване на annotated tag с съобщение
git tag -a v1.0.0 -m "Release 1.0.0"

# Push на конкретен tag
git push origin v1.0.0

# Push на всички tags
git push --tags

# Изтриване на локален tag
git tag -d v1.0.0

# Изтриване на remote tag
git push origin --delete v1.0.0
```

## Cherry-pick и submodules

```bash
# Прилагане на конкретен commit от друг branch
git cherry-pick commit-hash

# Добавяне на submodule
git submodule add https://github.com/user/repo.git path

# Инициализиране и изтегляне на submodules при clone
git submodule update --init --recursive
```

## Чести проблеми и решения

**"fatal: no upstream branch"** — branch-ът никога не е бил push-нат:
```bash
git push -u origin branch-name
```

**"rejected... non-fast-forward"** — remote-ът има commit-и, които локално ги няма:
```bash
git pull --rebase
git push
```

**"nothing to commit, working tree clean"**, но искаш все пак push — направи празен commit:
```bash
git commit --allow-empty -m "Empty commit"
git push
```

**Merge конфликт** — Git маркира конфликтните участъци с `<<<<<<<`, `=======`, `>>>>>>>` директно в файла. След ръчна редакция:
```bash
git add path/to/resolved-file
git commit
```

## Полезни alias-и

Добави в `~/.gitconfig`, за да съкратиш най-често използваните команди:

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm "commit -m"
git config --global alias.lg "log --oneline --graph --all"
```
