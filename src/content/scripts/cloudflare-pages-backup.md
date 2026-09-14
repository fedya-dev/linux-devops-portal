---
title: "Cloudflare Pages Multi-Project Backup"
description: "Автоматичен backup на няколко проекта към Cloudflare Pages директория с rsync и логване с timestamp."
pubDate: 2026-09-10
category: "Backup"
tags: ["Backup", "Rsync", "Cloudflare", "Bash", "Cron"]
author: "LinuxDev Team"
version: "1.0.0"
language: "bash"
dependencies: ["rsync", "bash"]
usage: "./cloudflare-backup.sh"
featured: true
---

## Какво прави

Скрипт за автоматичен backup на няколко проекта към `/mnt/d/cloudflare-pages/`, използвайки `rsync` с изключване на ненужни файлове. Логва всичко с timestamp.

## Характеристики

- Backup на **няколко проекта** с една команда
- Лог файл с дата за всеки backup
- Изключва `.git`, `node_modules`, `dist`, `.astro`, `*.log`, `*.tmp`
- Използва `rsync --delete` за пълна синхронизация
- Не спира при грешка в един проект — продължава със следващите
- Резюме в края: колко проекта са успешни, колко са се провалили

## Код

```bash
#!/usr/bin/env bash

BACKUP_DATE=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="/mnt/d/cloudflare-pages/backup_${BACKUP_DATE}.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

backup_project() {
    local SOURCE="$1"
    local DEST="$2"
    local NAME="$3"

    log "Starting backup of $NAME"

    if [ ! -d "$SOURCE" ]; then
        log "ERROR: Source directory $SOURCE does not exist!"
        return 1
    fi

    if ! mkdir -p "$DEST"; then
        log "ERROR: Could not create destination $DEST (is /mnt/d mounted?)"
        return 1
    fi

    rsync -avh --delete \
        --exclude=".git/" \
        --exclude="node_modules/" \
        --exclude="*.tmp" \
        --exclude="dist/" \
        --exclude=".astro/" \
        --exclude="*.log" \
        "$SOURCE" \
        "$DEST" 2>&1 | tee -a "$LOG_FILE"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log "SUCCESS: $NAME backed up successfully"
        return 0
    else
        log "ERROR: Backup of $NAME failed!"
        return 1
    fi
}

log "=== STARTING BACKUP PROCESS ==="

FAILED=0
SUCCESS_COUNT=0
TOTAL_COUNT=3

backup_project \
    "/mnt/c/Users/fedia/Desktop/project1/" \
    "/mnt/d/cloudflare-pages/project1/" \
    "project1" && SUCCESS_COUNT=$((SUCCESS_COUNT+1)) || FAILED=1

backup_project \
    "/mnt/c/Users/fedia/Desktop/project2/" \
    "/mnt/d/cloudflare-pages/project2/" \
    "project2" && SUCCESS_COUNT=$((SUCCESS_COUNT+1)) || FAILED=1

backup_project \
    "/mnt/c/Users/fedia/Desktop/project3/" \
    "/mnt/d/cloudflare-pages/project3/" \
    "project3" && SUCCESS_COUNT=$((SUCCESS_COUNT+1)) || FAILED=1

if [ $FAILED -eq 0 ]; then
    log "=== ALL BACKUPS COMPLETED SUCCESSFULLY ==="
else
    log "=== SOME BACKUPS FAILED ==="
fi

log "Finished at $(date)"
log ""
log "Резюме: $SUCCESS_COUNT от $TOTAL_COUNT проекта архивирани успешно."
if [ $FAILED -eq 0 ]; then
    log "Всички backup-и завършиха без грешки."
else
    log "Внимание: има неуспешни backup-и – провери лога по-горе за детайли."
fi
```

## Използване

```bash
# Направи скрипта изпълним
chmod +x cloudflare-backup.sh

# Пусни го
./cloudflare-backup.sh
```

## Конфигурация

Промени списъка с проекти в самия скрипт (секцията с `backup_project` извикванията):

```bash
backup_project \
    "/път/до/проект1/" \
    "/mnt/d/cloudflare-pages/проект1/" \
    "проект1" && SUCCESS_COUNT=$((SUCCESS_COUNT+1)) || FAILED=1
```

Добави още проекти по същия модел.

## Автоматизация с cron

```bash
# Всеки ден в 03:00
0 3 * * * /home/user/cloudflare-backup.sh >> /var/log/cloudflare-backup.log 2>&1
```

## Изисквания

- `rsync` инсталиран (`sudo apt install rsync`)
- `/mnt/d/` монтиран (WSL)
- Достатъчно място на диска
