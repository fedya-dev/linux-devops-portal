---
title: "Proxmox LXC Backup Sync"
description: "Автоматично синхронизиране на LXC бекъпи от Proxmox сървър към локална директория с rsync, логване и проследяване на свалените файлове."
pubDate: 2026-09-11
category: "Backup"
tags: ["Proxmox", "LXC", "Backup", "Rsync", "Bash"]
author: "LinuxDev Team"
version: "1.0.0"
language: "bash"
dependencies: ["rsync", "ssh", "bash"]
usage: "./proxmox-backup-sync.sh"
featured: false
---

## Какво прави

Скрипт за автоматично синхронизиране на LXC контейнерни бекъпи от отдалечен Proxmox сървър към локална директория. Използва `rsync` през SSH, следи кои бекъпи вече са свалени, логва всички действия и автоматично изтрива стари бекъпи.

## Характеристики

- Синхронизира бекъпи на **няколко LXC контейнера** наведнъж
- Използва `rsync` с `--partial` за възобновяване на прекъснати трансфери
- Логва всичко в `backup_sync.log` с timestamp
- Проследява свалените бекъпи в `.downloaded_backups` — не сваля повторно
- Автоматично изтриване на локални бекъпи по-стари от `KEEP_DAYS` дни
- Конфигурация чрез външен `.conf` файл
- Ако конфигурационният файл липсва — създава примерен и излиза с инструкции

## Код

```bash
#!/bin/bash

# Конфигурационен файл
CONFIG_FILE="$(dirname "$0")/backup_config.conf"
LOG_FILE="$(dirname "$0")/backup_sync.log"
DOWNLOADED_FILE="$(dirname "$0")/.downloaded_backups"

# Функция за логване
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Проверка дали конфигурационният файл съществува
if [[ ! -f "$CONFIG_FILE" ]]; then
    log "ERROR: Конфигурационният файл $CONFIG_FILE не съществува!"
    cat > "$CONFIG_FILE" << 'EOF'
# Конфигурация за Proxmox backup sync
PROXMOX_HOST=10.110.110.68
PROXMOX_USER=root
REMOTE_BACKUP_PATH=/backup512/dump
LOCAL_BACKUP_PATH=/mnt/d/backup_proxmox

# LXC контейнери за синхронизиране (разделени със запетая)
LXC_IDS=111,114

# SSH опции (по избор)
SSH_OPTIONS="-o ConnectTimeout=30 -o ServerAliveInterval=60"

# Максимален брой дни за задържане на локални бекъпи (0 = безкрайно)
KEEP_DAYS=30
EOF
    log "Създаден е примерен конфигурационен файл: $CONFIG_FILE"
    log "Моля, редактирайте го според вашите нужди и стартирайте отново скрипта."
    exit 1
fi

# Зареждане на конфигурацията
source "$CONFIG_FILE"

# Създаване на локална директория ако не съществува
mkdir -p "$LOCAL_BACKUP_PATH"

# Създаване на файл за проследяване на свалените бекъпи
touch "$DOWNLOADED_FILE"

log "Започвам проверка за нови бекъпи..."
log "Наблюдавани LXC контейнери: $LXC_IDS"

# Функция за получаване на списък с отдалечени бекъпи
get_remote_backups() {
    local lxc_id=$1
    ssh $SSH_OPTIONS "${PROXMOX_USER}@${PROXMOX_HOST}" \
        "find ${REMOTE_BACKUP_PATH} -name 'vzdump-lxc-${lxc_id}-*.tar.zst' -type f -printf '%f\n'" 2>/dev/null
}

# Функция за проверка дали бекъп е вече свален
is_downloaded() {
    local backup_name=$1
    grep -Fxq "$backup_name" "$DOWNLOADED_FILE"
}

# Функция за маркиране на бекъп като свален
mark_as_downloaded() {
    local backup_name=$1
    echo "$backup_name" >> "$DOWNLOADED_FILE"
}

# Функция за изтриване на стари локални бекъпи
cleanup_old_backups() {
    if [[ "$KEEP_DAYS" -gt 0 ]]; then
        log "Изтривам локални бекъпи по-стари от $KEEP_DAYS дни..."
        find "$LOCAL_BACKUP_PATH" -name "vzdump-lxc-*.tar.zst" -type f -mtime +$KEEP_DAYS -delete
    fi
}

# Главен цикъл за всеки LXC контейнер
IFS=',' read -ra LXC_ARRAY <<< "$LXC_IDS"
for lxc_id in "${LXC_ARRAY[@]}"; do
    lxc_id=$(echo "$lxc_id" | xargs)
    log "Проверявам за нови бекъпи на LXC $lxc_id..."

    remote_backups=$(get_remote_backups "$lxc_id")

    if [[ -z "$remote_backups" ]]; then
        log "Няма намерени бекъпи за LXC $lxc_id"
        continue
    fi

    while IFS= read -r backup_file; do
        [[ -z "$backup_file" ]] && continue

        if ! is_downloaded "$backup_file"; then
            log "Намерен нов бекъп: $backup_file"
            log "Започвам сваляне..."

            if rsync -avz --partial --progress -e "ssh $SSH_OPTIONS" \
                "${PROXMOX_USER}@${PROXMOX_HOST}:${REMOTE_BACKUP_PATH}/${backup_file}" \
                "${LOCAL_BACKUP_PATH}/"; then

                log "Успешно свален: $backup_file"
                mark_as_downloaded "$backup_file"
            else
                log "ERROR: Грешка при сваляне на $backup_file"
            fi
        else
            log "Бекъп $backup_file вече е свален, прескачам..."
        fi
    done <<< "$remote_backups"
done

cleanup_old_backups

log "Завършена проверка за нови бекъпи."
```

## Използване

```bash
# 1. Направи скрипта изпълним
chmod +x proxmox-backup-sync.sh

# 2. Първо стартиране — създава backup_config.conf
./proxmox-backup-sync.sh

# 3. Редактирай конфигурацията
nano backup_config.conf

# 4. Пусни отново
./proxmox-backup-sync.sh
```

## Конфигурация

```ini
PROXMOX_HOST=10.110.110.68
PROXMOX_USER=root
REMOTE_BACKUP_PATH=/backup512/dump
LOCAL_BACKUP_PATH=/mnt/d/backup_proxmox

# LXC контейнери за синхронизиране (разделени със запетая)
LXC_IDS=111,114

# SSH опции
SSH_OPTIONS="-o ConnectTimeout=30 -o ServerAliveInterval=60"

# Дни за задържане на локални бекъпи (0 = безкрайно)
KEEP_DAYS=30
```

## Автоматизация с cron

```bash
# Всеки ден в 03:00
0 3 * * * /path/to/proxmox-backup-sync.sh >> /var/log/proxmox-sync.log 2>&1
```

## Файлове

| Файл | Описание |
|------|----------|
| `proxmox-backup-sync.sh` | Самият скрипт |
| `backup_config.conf` | Конфигурация (създава се автоматично при първо пускане) |
| `backup_sync.log` | Лог файл |
| `.downloaded_backups` | Списък на вече свалените бекъпи |

## Изисквания

- `rsync` инсталиран локално
- SSH достъп до Proxmox сървъра (препоръчително с **SSH ключ**, не парола)
- Proxmox сървър с активни LXC бекъпи (`.tar.zst`)
- Достатъчно място на локалния диск
- Root или sudo права

## Бележки

- **SSH ключ:** за да работи без парола в cron, настрой `ssh-copy-id root@10.110.110.68`
- **Прекъснат трансфер:** `--partial` позволява възобновяване
- **Проследяване:** ако искаш да свалиш отново бекъп — изтрий реда му от `.downloaded_backups`
- **KEEP_DAYS=0** изключва автоматичното изтриване