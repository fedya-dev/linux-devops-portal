---
title: 'Bash scripting: 10 patterns, които използвам всеки ден'
description: >-
  Практични Bash patterns от реален production опит. Error handling, argument
  parsing, logging, trap handlers и още — с примери, които можеш да копираш
  веднага.
pubDate: 2026-09-12T00:00:00.000Z
category: DevOps
tags:
  - Bash
  - Scripting
  - Linux
  - Automation
  - Shell
author: LinuxDev Team
featured: false
readTime: 10 мин
heroImage: /images/tools/bash-scripting-patterns.webp
heroImageAlt: Bash scripting patterns
draft: false
---

Писал съм стотици Bash скриптове. Повечето са били за автоматизация на повтарящи се задачи — deploy, backup, log rotation, мониторинг. Някои са били елегантни. Други са били катастрофи, които са изтривали production директории в 3 часа сутринта.

Разликата между добрия и лошия Bash скрипт не е в това колко команди знаеш. Разликата е в **patterns** — как обработваш грешки, как парсваш аргументи, как логваш, как се справяш с cleanup. Тези неща не се учат от tutorials. Учат се от production.

В тази статия ще ти покажа 10 patterns, които използвам всеки ден. Всеки е тестван, всеки решава реален проблем, всеки можеш да копираш директно.

## 1. Strict mode — `set -euo pipefail`

Първият ред на **всеки** сериозен скрипт трябва да е това:

```bash
#!/usr/bin/env bash
set -euo pipefail
```

**Какво прави всяка опция:**
- `-e` — спри при първа грешка (non-zero exit code)
- `-u` — спри при използване на недефинирана променлива
- `-o pipefail` — ако която и да е команда в pipe се провали, целият pipe се проваля

**Защо има значение:**

```bash
# БЕЗ strict mode — скриптът продължава след грешка
#!/bin/bash
rm -rf /tmp/data
cp important.txt /tmp/data/  # Ако /tmp/data не съществува, cp ще се провали
echo "Готово"                # Но ще продължи и ще каже "Готово"
```

```bash
# СЪС strict mode — спира при първа грешка
#!/usr/bin/env bash
set -euo pipefail
rm -rf /tmp/data
cp important.txt /tmp/data/  # Ако се провали, скриптът спира ТУК
echo "Готово"                # Няма да се изпълни
```

Без `set -e`, скриптът ще продължи след счупена команда и ще направи още по-голяма беля. С `set -e`, спира веднага — по-добре е да се провали рано, отколкото да направи нещо наполовина.

## 2. Error handling с trap

`set -e` е добър, но понякога трябва да направиш cleanup преди да излезеш. Тук идва `trap`.

```bash
#!/usr/bin/env bash
set -euo pipefail

TEMP_DIR=$(mktemp -d)

cleanup() {
    local exit_code=$?
    rm -rf "$TEMP_DIR"
    if [ $exit_code -ne 0 ]; then
        echo "Скриптът се провали с код $exit_code" >&2
    fi
    exit $exit_code
}

trap cleanup EXIT
trap 'echo "Прекъснато с Ctrl+C" >&2; exit 130' INT
trap 'echo "Terminated" >&2; exit 143' TERM

# Основна логика
echo "Работя в $TEMP_DIR"
touch "$TEMP_DIR/file1"
touch "$TEMP_DIR/file2"
```

**Какво прави:**
- `trap cleanup EXIT` — изпълни cleanup при всяко излизане (нормално, грешка, Ctrl+C)
- `trap '...' INT` — при Ctrl+C
- `trap '...' TERM` — при `kill`

**Защо е критично:** Ако скриптът ти създава temp файлове, отваря connections, или заема locks, `trap` гарантира, че те се освобождават при всякакви обстоятелства — дори при `kill -9` (не, това не хваща, но при повечето случаи работи).

## 3. Argument parsing

Има два подхода. Единият е ръчен, другият с `getopts`.

### Ръчен (за прости случаи)

```bash
#!/usr/bin/env bash
set -euo pipefail

usage() {
    cat <<EOF
Usage: $0 [OPTIONS] <input> <output>

Options:
    -v, --verbose    Verbose output
    -f, --force      Overwrite output
    -h, --help       Show this help

Arguments:
    input            Input file
    output           Output file
EOF
    exit 1
}

VERBOSE=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Unknown option: $1" >&2
            usage
            ;;
        *)
            break
            ;;
    esac
done

if [ $# -lt 2 ]; then
    echo "Error: missing arguments" >&2
    usage
fi

INPUT="$1"
OUTPUT="$2"

echo "Input: $INPUT"
echo "Output: $OUTPUT"
echo "Verbose: $VERBOSE"
```

### С `getopts` (за POSIX-съвместимост)

```bash
#!/bin/bash
set -euo pipefail

VERBOSE=false
OUTPUT=""

while getopts "vo:h" opt; do
    case $opt in
        v) VERBOSE=true ;;
        o) OUTPUT="$OPTARG" ;;
        h) echo "Usage: $0 [-v] [-o output]"; exit 0 ;;
        \?) echo "Invalid option: -$OPTARG" >&2; exit 1 ;;
        :) echo "Option -$OPTARG requires an argument" >&2; exit 1 ;;
    esac
done

shift $((OPTIND - 1))

# Останалите аргументи са в $@
echo "Remaining args: $@"
```

**Защо `getopts` не е винаги по-добър:** `getopts` не поддържа long options (`--verbose`). За тях трябва ръчният подход или `getopt` (с тире).

## 4. Logging с timestamps

Простото `echo` не е достатъчно. Искаш timestamps, log levels, и цветове.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Цветове (само ако сме в терминал)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi

log() {
    local level=$1
    shift
    local msg="$*"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        INFO)  echo -e "${BLUE}[$timestamp] [INFO]${NC}  $msg" ;;
        WARN)  echo -e "${YELLOW}[$timestamp] [WARN]${NC}  $msg" >&2 ;;
        ERROR) echo -e "${RED}[$timestamp] [ERROR]${NC} $msg" >&2 ;;
        OK)    echo -e "${GREEN}[$timestamp] [OK]${NC}    $msg" ;;
    esac
}

log INFO "Стартиране на backup"
log WARN "Дискът е 85% пълен"
log ERROR "Не мога да достъпя /var/backups"
log OK "Backup завършен успешно"
```

**Защо `[ -t 1 ]`:** Ако изходът е пренасочен към файл (`./script.sh > log.txt`), цветовете стават на боклук. Тази проверка ги изключва автоматично.

**Защо `>&2`:** WARN и ERROR отиват в stderr, не в stdout. Така можеш да правиш:

```bash
./script.sh > output.txt 2> errors.txt
```

## 5. Проверки преди работа

Никога не приемай, че командите са налични. Провери ги.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Провери дали си root
if [ "$EUID" -ne 0 ]; then
    echo "Този скрипт трябва да се изпълни като root" >&2
    exit 1
fi

# Провери дали команда съществува
require_command() {
    if ! command -v "$1" &>/dev/null; then
        echo "Грешка: '$1' не е инсталиран" >&2
        exit 1
    fi
}

require_command curl
require_command jq
require_command docker

# Провери дали файл съществува
if [ ! -f "/etc/app/config.yml" ]; then
    echo "Грешка: /etc/app/config.yml не съществува" >&2
    exit 1
fi

# Провери дали директория съществува
if [ ! -d "/var/log/app" ]; then
    echo "Създавам /var/log/app..."
    mkdir -p /var/log/app
fi

# Провери дали променлива е дефинирана
if [ -z "${DATABASE_URL:-}" ]; then
    echo "Грешка: DATABASE_URL не е дефинирана" >&2
    exit 1
fi

echo "Всички проверки минаха"
```

## 6. Четене на файл ред по ред

Правилният начин:

```bash
#!/usr/bin/env bash
set -euo pipefail

while IFS= read -r line; do
    echo "Ред: $line"
done < input.txt
```

**Защо точно този синтаксис:**
- `IFS=` — не премахвай leading/trailing whitespace
- `-r` — не интерпретирай backslash като escape character
- `< file` — чети от файл, не от pipe (важно за `ssh` и подобни)

**Ако четеш от pipe:**

```bash
# ГРЕШНО — while цикълът върви в subshell, променливите не се запазват
cat file.txt | while read line; do
    count=$((count + 1))
done
echo $count  # Ще покаже 0, не реалния брой
```

```bash
# ПРАВИЛНО
while read -r line; do
    count=$((count + 1))
done < file.txt
echo $count  # Ще покаже правилния брой
```

**Или с process substitution:**

```bash
count=0
while read -r line; do
    count=$((count + 1))
done < <(cat file.txt)
```

## 7. Arrays и associatиве arrays

Bash поддържа indexed и associative arrays. Те са много по-мощни от обикновените променливи.

### Indexed arrays

```bash
#!/usr/bin/env bash
set -euo pipefail

servers=("web01" "web02" "web03" "db01")

# Достъп
echo "Първи сървър: ${servers[0]}"

# Всички елементи
echo "Всички: ${servers[@]}"

# Брой елементи
echo "Брой: ${#servers[@]}"

# Итерация
for server in "${servers[@]}"; do
    echo "Обработвам $server"
done

# Append
servers+=("cache01")

# Проверка дали съществува
if [[ " ${servers[*]} " =~ " web02 " ]]; then
    echo "web02 е в списъка"
fi
```

### Associative arrays (Bash 4+)

```bash
#!/usr/bin/env bash
set -euo pipefail

declare -A config
config[host]="db.example.com"
config[port]="5432"
config[user]="admin"

# Достъп
echo "Host: ${config[host]}"

# Итерация
for key in "${!config[@]}"; do
    echo "$key = ${config[$key]}"
done

# Проверка дали ключ съществува
if [[ -v config[password] ]]; then
    echo "Password е зададена"
else
    echo "Password липсва"
fi
```

**Защо са важни:** Без arrays, ще пишеш `$SERVER1`, `$SERVER2`, `$SERVER3`... което не се разширява. С arrays, можеш да добавяш, итерираш, филтрираш.

## 8. Idempotency — скриптът може да се пусне няколко пъти

Добрият скрипт може да се пусне 10 пъти и резултатът да е един и същ. Това се нарича **idempotency**.

```bash
#!/usr/bin/env bash
set -euo pipefail

# ЛОШО — ще се провали при второ пускане
mkdir /var/lib/myapp
cp config.yml /var/lib/myapp/

# ДОБРО — може да се пусне многократно
mkdir -p /var/lib/myapp
cp -n config.yml /var/lib/myapp/ 2>/dev/null || true

# ИЛИ още по-добре
install -d /var/lib/myapp
if [ ! -f /var/lib/myapp/config.yml ]; then
    cp config.yml /var/lib/myapp/
    echo "Config копиран"
else
    echo "Config вече съществува, пропускам"
fi

# Работа с Docker — idempotent
docker rm -f myapp 2>/dev/null || true
docker run -d --name myapp myimage:latest
```

**Защо е важно:** Ако скриптът се провали по средата, можеш да го пуснеш отново без страх. Ако го пускаш от cron, няма да имаш проблеми с "вече съществува".

## 9. Паралелно изпълнение с `xargs -P`

Понякога искаш да изпълниш команда на много сървъри паралелно. `xargs -P` е най-простият начин.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Последователно (бавно)
for server in web01 web02 web03 web04; do
    ssh "$server" "sudo systemctl restart nginx"
done

# Паралелно (4 едновременно)
printf '%s\n' web01 web02 web03 web04 | \
    xargs -P 4 -I {} ssh {} "sudo systemctl restart nginx"

# Паралелно с output
printf '%s\n' web01 web02 web03 web04 | \
    xargs -P 4 -I {} sh -c 'echo "=== {} ==="; ssh {} "uptime"'
```

**Опции:**
- `-P 4` — 4 паралелни процеса
- `-I {}` — placeholder за всеки аргумент
- `-n 1` — по един аргумент на команда

**За по-сложна логика** — GNU parallel:

```bash
# С GNU parallel (по-мощен, но трябва да се инсталира)
parallel -j 4 'ssh {} "sudo systemctl restart nginx"' ::: web01 web02 web03 web04
```

## 10. Function libraries

За по-големи скриптове, изнеси функциите в отделен файл.

**`lib/common.sh`:**

```bash
#!/usr/bin/env bash

# Цветове
if [ -t 1 ]; then
    RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
else
    RED=''; GREEN=''; YELLOW=''; NC=''
fi

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

die() {
    log_error "$*"
    exit 1
}

require_root() {
    [ "$EUID" -eq 0 ] || die "Трябва root достъп"
}

require_command() {
    command -v "$1" &>/dev/null || die "'$1' не е инсталиран"
}

retry() {
    local max_attempts=$1
    local delay=$2
    shift 2
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if "$@"; then
            return 0
        fi
        log_warn "Опит $attempt/$max_attempts се провали. Изчаквам ${delay}s..."
        sleep "$delay"
        attempt=$((attempt + 1))
    done

    return 1
}
```

**`deploy.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
source "$SCRIPT_DIR/lib/common.sh"

require_root
require_command docker
require_command curl

log_info "Стартиране на deploy"

if ! retry 3 5 curl -sf http://localhost:8080/health; then
    die "Health check не мина след 3 опита"
fi

log_info "Deploy завършен"
```

**Защо `BASH_SOURCE[0]`:** Работи, независимо откъде пускаш скрипта. Ако използваш `$0`, той ще е различен, ако скриптът е sourced.

## Бонус: Шаблон за нов скрипт

Ето какво копирам всеки път, когато започвам нов скрипт:

```bash
#!/usr/bin/env bash
#
# <кратко описание на скрипта>
#
# Usage: ./script.sh [OPTIONS]
#

set -euo pipefail

# ============================================
# Configuration
# ============================================
readonly SCRIPT_NAME=$(basename "$0")
readonly SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# ============================================
# Cleanup
# ============================================
cleanup() {
    local exit_code=$?
    # cleanup логика тук
    exit $exit_code
}
trap cleanup EXIT

# ============================================
# Logging
# ============================================
log() {
    local level=$1; shift
    printf '[%s] [%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$level" "$*"
}

info()  { log INFO "$@"; }
warn()  { log WARN "$@" >&2; }
error() { log ERROR "$@" >&2; }
die()   { error "$@"; exit 1; }

# ============================================
# Main
# ============================================
main() {
    info "Стартиране на $SCRIPT_NAME"
    # основна логика
    info "Готово"
}

main "$@"
```

## Заключение

Bash не е „просто shell скриптове". Той е **пълноценен език за програмиране**, с който можеш да напишеш production-ready инструменти. Разликата между „скрипт, който работи" и „скрипт, на който можеш да разчиташ" е в тези 10 patterns.

**Практическо правило:**
- Винаги `set -euo pipefail`
- Винаги `trap` за cleanup
- Винаги logging с timestamps
- Винаги проверки преди работа (команди, файлове, променливи)
- Винаги idempotent

Ако следваш тези 5 неща, скриптовете ти ще бъдат **предвидими**. А предвидимостта е всичко, когато работиш с production системи в 3 часа сутринта.

**Едно последно нещо:** Преди да пуснеш скрипт на production, пусни го в staging първо. Ако не можеш — поне го тествай с `bash -n script.sh` (syntax check) и `shellcheck script.sh` (static analysis). Shellcheck хваща 80% от грешките, които ще направиш.
