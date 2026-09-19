---
title: Проверка на дублирани IP адреси в Proxmox VE
description: >-
  Bash скрипт, който сканира VM-та и LXC контейнери в Proxmox VE и открива
  дублирани IP адреси в мрежите 10.110.110.0/24 и 10.20.20.0/24
pubDate: 2026-09-10T00:00:00.000Z
category: Networking
tags:
  - proxmox
  - bash
  - networking
  - ip-management
  - sysadmin
author: LinuxDev Team
version: 1.0.0
language: bash
dependencies:
  - qm
  - pct
usage: sudo ./proxmox-ip-check.sh
featured: true
draft: false
heroImageAlt: ''
---

# Проверка на използваните IP адреси в Proxmox VE

Скриптът обхожда всички виртуални машини (`qm`) и LXC контейнери (`pct`) в Proxmox VE, извлича конфигурираните им IP адреси и проверява за дублирания в две зададени мрежи: `10.110.110.0/24` и `10.20.20.0/24`.

## Изисквания

- Изпълнение с root права (или чрез `sudo`)
- Достъп до командите `qm` и `pct` (т.е. изпълнение директно на Proxmox VE хоста)

## Скрипт

```bash
#!/bin/bash

# Скрипт за проверка на използваните IP адреси в Proxmox VE
# Проверява мрежи 10.110.110.0/24 и 10.20.20.0/24 за дублирани IP

if [ "$EUID" -ne 0 ]; then
  echo "Моля, стартирайте скрипта като root (или чрез sudo)."
  exit 1
fi

echo "Проверка на използваните IP адреси в Proxmox..."
echo "-------------------------------------------"

declare -A IP_OWNERS

echo "Събиране на информация за контейнерите и виртуалните машини..."

# 1. VM-тата (Твоята оригинална, сигурна команда)
for vmid in $(qm list | awk 'NR>1 && $1>=100 {print $1}'); do
  ips=$(qm config $vmid | grep -oE 'ip=[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | cut -d= -f2)
  for ip in $ips; do
    IP_OWNERS["$ip"]+="VM $vmid, "
  done
done

# 2. LXC контейнерите (Твоята оригинална команда, но с тръбване през tr за вторични IP-та)
for ctid in $(pct list | awk 'NR>1 {print $1}'); do
  ips=$(pct config $ctid | tr ',' '\n' | grep -oE 'ip=[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | cut -d= -f2)
  for ip in $ips; do
    IP_OWNERS["$ip"]+="LXC $ctid, "
  done
done

# Функция за проверка на конкретна мрежа
check_network() {
  LOCAL_NETWORK=$1
  echo ""
  echo "Проверка за мрежа ${LOCAL_NETWORK}.0/24:"
  echo "----------------------------------"

  LOCAL_IPS=()
  DUP_FOUND=0

  for ip in "${!IP_OWNERS[@]}"; do
    if [[ "$ip" == ${LOCAL_NETWORK}.* ]]; then
      LOCAL_IPS+=("$ip")

      owners_clean="${IP_OWNERS[$ip]%, }"
      owner_count=$(echo "$owners_clean" | tr ',' '\n' | wc -l)

      if [ "$owner_count" -gt 1 ]; then
        if [ "$DUP_FOUND" -eq 0 ]; then
          echo "ВНИМАНИЕ: Намерени дублирани IP адреси:"
          DUP_FOUND=1
        fi
        echo "  Дублиран IP: $ip"
        echo "  Използван от: $owners_clean"
        echo "-------------------------"
      fi
    fi
  done

  if [ "$DUP_FOUND" -eq 0 ]; then
    echo "Няма дублирани IP адреси в тази мрежа."
  fi

  echo ""
  echo "Използвани IP адреси в мрежа ${LOCAL_NETWORK}.0/24:"
  printf '%s\n' "${LOCAL_IPS[@]}" | sort -V | uniq
}

check_network "10.110.110"
check_network "10.20.20"

echo ""
echo "Проверката приключи."
```

## Бележка по логиката

- `IP_OWNERS` е асоциативен масив (`declare -A`), в който за всеки IP се трупат собствениците (VM ID или CT ID). При над един собственик на един и същ IP скриптът го маркира като дублиран.
- `pct config` минава през `tr ',' '\n'`, за да хване и вторични мрежови интерфейси (net1, net2...), не само първия ред с `ip=`.
- Мрежите за проверка са хардкоднати (`10.110.110`, `10.20.20`) — ако имаш повече VLAN-и, добави още извиквания на `check_network`.
