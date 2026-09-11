---
title: "WireGuard VPN: сигурна връзка между два сървъра"
description: "Пълен step-by-step guide за настройка на WireGuard tunnel между два Linux сървъра — от инсталация до автоматично стартиране и troubleshooting."
pubDate: 2026-09-11
category: "Linux"
level: "Intermediate"
duration: "25 мин"
tags: ["WireGuard", "VPN", "Networking", "Security", "Ubuntu"]
prerequisites:
  - "Два Linux сървъра (Ubuntu 22.04 / Debian 12) с root или sudo достъп"
  - "Публични IP адреси или поне един публично достъпен сървър"
  - "Основни познания по IP addressing и SSH"
  - "Отворен UDP порт (по подразбиране 51820) във firewall-а"
featured: true
heroImage: "/images/linux/wireguard-vpn-two-servers.webp"
heroImageAlt: "WireGuard VPN tunnel между два сървъра"
---

## Какво ще построиш

В този tutorial ще настроим **site-to-site WireGuard VPN** между два Linux сървъра — например production сървър в Hetzner и backup сървър в DigitalOcean. След като приключиш:

- Двата сървъра ще комуникират помежду си през **криптиран tunnel** (ChaCha20-Poly1305)
- Ще имат вътрешни IP адреси от мрежата `10.0.0.0/24`
- Tunnel-ът ще се вдига автоматично при reboot
- Ще можеш да добавяш нови peer-ове (напр. лаптопа си) за секунди

## Защо WireGuard, а не OpenVPN

| Критерий | WireGuard | OpenVPN |
|---|---|---|
| Codebase | ~4,000 реда | ~70,000+ реда |
| Криптография | Модерна (ChaCha20, Curve25519) | Остаряла (OpenSSL зависимости) |
| Performance | Ядрена имплементация, ~3-5× по-бърз | User-space, по-бавен |
| Конфигурация | Един файл, ~10 реда | Стотици редове, сертификати |
| Setup време | ~15 минути | ~1 час |
| Kernel support | 5.6+ (вградено) | Винаги user-space |

За повечето use cases **WireGuard е по-добрият избор** през 2026. OpenVPN има смисъл само ако имаш legacy изисквания или трябва да минеш през строг corporate firewall (WireGuard използва UDP, OpenVPN може и TCP).

## Архитектура на setup-а

```
     Server A (Hetzner)              Server B (DigitalOcean)
     Public: 203.0.113.10            Public: 198.51.100.20
     WG:     10.0.0.1/24             WG:     10.0.0.2/24
            │                                │
            └─────── WireGuard Tunnel ───────┘
                   (UDP, порт 51820)
```

- **Server A** = "hub", слуша на публичен порт 51820
- **Server B** = "spoke", инициира връзката към A
- Вътрешна мрежа: `10.0.0.0/24` (никога не използвай тази мрежа другаде!)

## Стъпка 1: Инсталация на WireGuard

На **двата сървъра** изпълни:

```bash
sudo apt update
sudo apt install -y wireguard wireguard-tools
```

Провери версията:

```bash
wg --version
```

Очакван резултат: `wireguard-tools v1.0.20210914` или по-нова.

> **Забележка:** Ако си на kernel < 5.6, ще трябва да инсталираш и `wireguard-dkms`. На Ubuntu 22.04+ това не е нужно, защото модулът е вграден в kernel-а.

## Стъпка 2: Генерирай ключове

WireGuard използва **двойка ключове** (private + public) за всеки peer. Private ключът никога не напуска сървъра.

На **Server A**:

```bash
cd /etc/wireguard
umask 077
wg genkey | tee server-a-private.key | wg pubkey > server-a-public.key

cat server-a-private.key
cat server-a-public.key
```

На **Server B**:

```bash
cd /etc/wireguard
umask 077
wg genkey | tee server-b-private.key | wg pubkey > server-b-public.key

cat server-b-private.key
cat server-b-public.key
```

**Запиши си public ключовете на двата сървъра** — ще ти трябват в следващите стъпки. Private ключовете **остават само на съответния сървър**.

> **Сигурност:** `umask 077` гарантира, че само root може да чете файловете. Ако го пропуснеш, private ключовете ще бъдат четени от всеки потребител — това е сериозна дупка.

## Стъпка 3: Конфигурация на Server A (hub)

Създай `/etc/wireguard/wg0.conf`:

```bash
sudo nano /etc/wireguard/wg0.conf
```

Съдържание:

```ini
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <SERVER_A_PRIVATE_KEY>

PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

[Peer]
PublicKey = <SERVER_B_PUBLIC_KEY>
AllowedIPs = 10.0.0.2/32
```

**Замести:**
- `<SERVER_A_PRIVATE_KEY>` — private ключът на A (от `server-a-private.key`)
- `<SERVER_B_PUBLIC_KEY>` — public ключът на B
- `eth0` — името на мрежовия интерфейс на A. Провери с `ip route | grep default`.

## Стъпка 4: Конфигурация на Server B (spoke)

Създай `/etc/wireguard/wg0.conf` на Server B:

```ini
[Interface]
Address = 10.0.0.2/24
PrivateKey = <SERVER_B_PRIVATE_KEY>

[Peer]
PublicKey = <SERVER_A_PUBLIC_KEY>
Endpoint = 203.0.113.10:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

**Замести:**
- `<SERVER_B_PRIVATE_KEY>` — private ключът на B
- `<SERVER_A_PUBLIC_KEY>` — public ключът на A
- `203.0.113.10` — публичният IP на A

`PersistentKeepalive = 25` е важно, ако B е зад NAT — изпраща keepalive пакет на всеки 25 секунди, за да поддържа tunnel-а отворен.

## Стъпка 5: Отвори firewall порта

На **Server A** (само той слуша на публичен порт):

```bash
sudo ufw allow 51820/udp
sudo ufw reload
```

На Server B не е нужно да отваряш порт — той инициира връзката.

## Стъпка 6: Стартирай WireGuard

На **двата сървъра**:

```bash
sudo systemctl enable --now wg-quick@wg0
sudo systemctl status wg-quick@wg0
```

Трябва да видиш `active (exited)` — това е нормално за wg-quick, той не е daemon.

## Стъпка 7: Провери връзката

На **Server A**:

```bash
sudo wg show
```

Очакван резултат:

```
interface: wg0
  public key: <A_PUBLIC_KEY>
  private key: (hidden)
  listening port: 51820

peer: <B_PUBLIC_KEY>
  endpoint: 198.51.100.20:45678
  allowed ips: 10.0.0.2/32
  latest handshake: 12 seconds ago
  transfer: 1.2 KiB received, 2.4 KiB sent
```

Ако виждаш `latest handshake` и ненулев `transfer` — tunnel-ът работи.

Провери ping през tunnel-а:

```bash
# От Server A
ping -c 3 10.0.0.2

# От Server B
ping -c 3 10.0.0.1
```

И двата ping-а трябва да минат.

## Стъпка 8: Автоматично стартиране при reboot

`systemctl enable` вече го направи. За да си сигурен:

```bash
sudo systemctl is-enabled wg-quick@wg0
```

Трябва да върне `enabled`.

## Добавяне на трети peer (твоят лаптоп)

За да добавиш лаптопа си към VPN-а:

**1. На лаптопа генерирай ключове:**

```bash
wg genkey | tee laptop-private.key | wg pubkey > laptop-public.key
```

**2. На Server A добави peer-а в `wg0.conf`:**

```ini
[Peer]
PublicKey = <LAPTOP_PUBLIC_KEY>
AllowedIPs = 10.0.0.3/32
```

**3. Презареди конфигурацията без да спираш tunnel-а:**

```bash
sudo wg addconf wg0 <(wg-quick strip wg0)
```

**4. На лаптопа създай `wg0.conf`:**

```ini
[Interface]
Address = 10.0.0.3/24
PrivateKey = <LAPTOP_PRIVATE_KEY>
DNS = 1.1.1.1

[Peer]
PublicKey = <SERVER_A_PUBLIC_KEY>
Endpoint = 203.0.113.10:51820
AllowedIPs = 10.0.0.0/24
PersistentKeepalive = 25
```

**5. Вдигни tunnel-а:**

```bash
sudo wg-quick up wg0
```

Сега можеш да ping-неш `10.0.0.1` и `10.0.0.2` от лаптопа.

> **Бонус:** Ако искаш **целият** трафик на лаптопа да минава през VPN-а, промени `AllowedIPs = 0.0.0.0/0, ::/0`. Това прави Server A да е твоят "exit node".

## Troubleshooting

### Tunnel-ът не се вдига

```bash
sudo journalctl -u wg-quick@wg0 -n 50 --no-pager
```

Виж последните 50 реда от лога.

### Ping не минава, но `wg show` показва handshake

Най-честата причина: **firewall блокира forward-натия трафик**. Провери:

```bash
sudo iptables -L FORWARD -n -v
sudo sysctl net.ipv4.ip_forward
```

`net.ipv4.ip_forward` трябва да е `1`. Ако е `0`, включи го:

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-wireguard.conf
sudo sysctl -p /etc/sysctl.d/99-wireguard.conf
```

### Handshake работи, но само в едната посока

Провери `AllowedIPs` на двата peer-а. Те трябва да са **симетрични**:

- На A: `AllowedIPs = 10.0.0.2/32` (B)
- На B: `AllowedIPs = 10.0.0.0/24` (цялата мрежа, включително A)

### Промени в конфигурацията не се прилагат

WireGuard **не презарежда конфигурацията автоматично**. След промяна:

```bash
sudo wg-quick down wg0
sudo wg-quick up wg0
```

Или за нулев downtime:

```bash
sudo wg addconf wg0 <(wg-quick strip wg0)
```

### Провери дали портът е достъпен отвън

От **друга машина** (не от Server A):

```bash
nc -u -v 203.0.113.10 51820
```

Ако не се свързва — firewall или cloud provider security group блокира UDP.

## Verification checklist

Преди да продължиш към production, увери се, че:

- [ ] `sudo wg show` показва `latest handshake` на всички peer-ове
- [ ] `ping 10.0.0.1` от B и `ping 10.0.0.2` от A работят
- [ ] Private ключовете имат права `600` (`ls -la /etc/wireguard/`)
- [ ] `wg-quick@wg0` е `enabled` за автоматично стартиране
- [ ] Firewall-ът позволява само UDP 51820, не TCP
- [ ] `net.ipv4.ip_forward = 1` (ако правиш routing между peer-ове)

## Какво следва

Сега имаш работещ WireGuard tunnel. Следващи стъпки, които можеш да разгледаш:

1. **Site-to-site routing** — добави маршрути, така че машини зад Server A да достъпват машини зад Server B
2. **WireGuard + systemd-networkd** — по-модерен начин за конфигурация без `wg-quick`
3. **Автоматизация с Ansible** — генерирай ключове и deploy-ни конфигурации на N сървъра
4. **Monitoring** — Prometheus exporter за WireGuard metrics

## Заключение

WireGuard дава това, което OpenVPN не може — **криптиран tunnel за 15 минути, без сертификати, без сложна PKI, без главоболия**. Kernel-level performance означава, че можеш да push-неш гигабити трафик през него без забележим overhead.

За production среди — съхранявай private ключовете в secrets manager (Vault, SOPS), не в git. И винаги тествай конфигурацията в staging преди да я deploy-неш на production.