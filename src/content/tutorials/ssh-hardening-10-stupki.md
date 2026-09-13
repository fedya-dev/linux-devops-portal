---
title: "SSH Hardening: 10 стъпки за защитен SSH сървър"
description: "Пълно ръководство за защита на SSH сървър от нулата. Ключове вместо пароли, Fail2ban, порт промени, 2FA и всичко, което всеки production сървър трябва да има."
pubDate: 2026-09-13
category: "Technologies"
level: "Beginner"
duration: "30 мин"
tags: ["SSH", "Security", "Hardening", "Linux", "Ubuntu"]
prerequisites:
  - "Linux сървър (Ubuntu 22.04 / Debian 12) с root или sudo достъп"
  - "Работеща SSH връзка към сървъра"
  - "Локална машина с SSH клиент"
featured: true
heroImage: "/images/technologies/ssh-hardening.webp"
heroImageAlt: "SSH Hardening стъпки"
---

SSH е вратата към твоя сървър. И тази врата е отворена за целия интернет — буквално. Всеки скенер, всеки бот, всеки атакуващ може да я намери за минути, след като сървърът излезе онлайн. Ако е защитена само с парола, ти разчиташ на късмет — че никой няма да познае комбинацията, преди да се умори.

През последните години съм виждал хиляди опити за SSH brute-force атаки на моите сървъри. Ботове, които пробват `root:password`, `admin:admin`, `ubuntu:ubuntu` — стотици пъти в минута, 24/7. Ако SSH е отворен на порт 22 с парола, ти си мишена. Не "може би", а "със сигурност".

Този урок е моят пълен checklist за SSH hardening. 10 стъпки, които прилагам на **всеки** сървър, който вдигам. Всяка стъпка е тествана, всяка решава реален проблем, всяка е нещо, което съм виждал да спасява сървър.

Ще минеш през целия процес — от генериране на SSH ключове до настройка на 2FA. Накрая ще имаш SSH сървър, който можеш да оставиш отворен за интернет без страх.

## Защо SSH hardening е критичен

Нека започнем с числата. Според данни от различни security reports:

- **SSH brute-force атаките са между 30% и 50%** от всички observed attacks на публични сървъри
- Средно един нов сървър получава **първия опит за SSH login в рамките на 5 минути** след като излезе онлайн
- **80%+ от успешните пробиви** в малки и средни инфраструктури започват от слаб SSH достъп

Ако си на cloud provider (Hetzner, DigitalOcean, AWS), вероятно вече си виждал в логовете:

```bash
sudo journalctl -u ssh | grep "Failed password" | tail -20
```

Ще видиш нещо такова:

```
Failed password for root from 45.123.45.67 port 51234 ssh2
Failed password for root from 45.123.45.67 port 51235 ssh2
Failed password for admin from 45.123.45.67 port 51236 ssh2
Failed password for root from 103.75.11.22 port 60123 ssh2
...
```

Това са ботове, които пробват. Ако имаш слаба парола, ще я познаят. Ако имаш SSH ключ, те дори не могат да пробват.

## Стъпка 1: Провери текущото състояние

Преди да пипаш каквото и да е, разбери какво имаш в момента.

```bash
# Провери SSH конфигурацията
sudo sshd -T

# Виж активния config
sudo cat /etc/ssh/sshd_config

# Провери версията
ssh -V

# Кой слуша на SSH порт
sudo ss -tlnp | grep ssh

# Провери логовете за failed logins
sudo journalctl -u ssh --since "24 hours ago" | grep -c "Failed password"
```

Ако последната команда върне число над 100 — значи някой активно те атакува. Това е нормално за публичен сървър. Ако върне 0 — или имаш късмет, или SSH не е достъпен отвън.

## Стъпка 2: Генерирай SSH ключове (на локалната машина)

**Тази стъпка се прави на твоя компютър**, не на сървъра.

Ако вече имаш SSH ключ — провери:

```bash
ls -la ~/.ssh/
```

Ако виждаш `id_ed25519` и `id_ed25519.pub` — имаш ключ. Ако виждаш `id_rsa` — имаш стар ключ, който все още работи, но **препоръчвам да генерираш нов ED25519**.

### Генерирай нов ED25519 ключ

```bash
ssh-keygen -t ed25519 -C "fedia@laptop" -f ~/.ssh/id_ed25519
```

**Какво прави всяка опция:**
- `-t ed25519` — тип на ключа. ED25519 е по-нов, по-бърз и по-сигурен от RSA
- `-C "fedia@laptop"` — comment (обикновено email или описание). Помага да идентифицираш кой ключ е кой
- `-f ~/.ssh/id_ed25519` — файл къде да се запази

**Ще те попита за passphrase:**

```
Enter passphrase (empty for no passphrase):
```

**Задължително сложи passphrase.** Тя криптира private ключа на диска. Ако някой открадне лаптопа ти, без passphrase може да влезе навсякъде. С passphrase — не може.

Ще видиш:

```
Your identification has been saved in /home/fedia/.ssh/id_ed25519
Your public key has been saved in /home/fedia/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:abc123... fedia@laptop
The key's randomart image is:
+--[ED25519 256]--+
|    .o+..        |
|   . . =o..      |
...
```

### Копирай public ключа на сървъра

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@your-server.com
```

Ако `ssh-copy-id` не работи, направи го ръчно:

```bash
cat ~/.ssh/id_ed25519.pub | ssh user@your-server.com "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

### Тествай ключа ПРЕДИ да забраниш паролите

**Това е критично.** Ако забраниш паролите и ключът не работи, ще се заключиш от сървъра.

```bash
ssh -i ~/.ssh/id_ed25519 user@your-server.com
```

Ако влезеш без да пита за парола (само за passphrase на ключа) — работи. Ако пита за парола на сървъра — ключът не е конфигуриран правилно. **Не продължавай, докато не работи.**

> ⚠️ **Съвет:** Отвори **втори терминал** и задръж активна SSH сесия. Ако нещо се обърка, имаш backup достъп.

## Стъпка 3: Изключи root login

Първото нещо, което всеки бот пробва, е `root`. Ако root login е разрешен, ти даваш на атакуващия потребителско име, което със сигурност съществува.

```bash
sudo nano /etc/ssh/sshd_config
```

Намери реда:

```
PermitRootLogin yes
```

Промени го на:

```
PermitRootLogin no
```

**Защо:**

- `root` е името на потребител, което всеки знае. Атакуващият не трябва да гадае
- Всичко, което правиш като root, можеш да направиш със `sudo` от обикновен потребител
- Ако някой компрометира обикновен акаунт, щетите са по-малки, отколкото при root

**Ако все още нямаш non-root потребител:**

```bash
# Създай нов потребител
sudo adduser fedia

# Добави го в sudo групата
sudo usermod -aG sudo fedia

# Тествай
su - fedia
sudo whoami
# Трябва да върне: root
```

## Стъпка 4: Изключи password authentication

Това е най-важната стъпка. Без нея всичко останало е заобикаляне.

```bash
sudo nano /etc/ssh/sshd_config
```

Намери:

```
PasswordAuthentication yes
```

Промени на:

```
PasswordAuthentication no
```

Също провери:

```
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
```

**Защо:**

- **Brute-force става невъзможен** — няма парола за гадаене
- **Phishing става невъзможен** — няма парола, която да откраднат
- **Само хора с private key могат да влязат** — а private key не напуска твоята машина
- **Атакуващият не може да пробва нищо** — SSH просто ще откаже

**Ако имаш няколко потребители на сървъра**, всеки трябва да има SSH ключ, преди да включиш тази промяна. Иначе те ще загубят достъп.

## Стъпка 5: Изключи празни пароли

Провери дали някой акаунт има празна парола:

```bash
sudo awk -F: '($2 == "") {print $1}' /etc/shadow
```

Ако върне нещо — този акаунт има празна парола. Заключи го:

```bash
sudo passwd -l <username>
```

И в `/etc/ssh/sshd_config`:

```
PermitEmptyPasswords no
```

## Стъпка 6: Смени порта (опционално, но полезно)

**Това не е security чрез obscurity** — смененият порт не те прави защитен. Но намалява шума в логовете с 99%.

По подразбиране SSH е на порт 22. Ботовете сканират порт 22 автоматично. Ако го смениш на нещо друго (напр. 2222), повечето ботове няма да те намерят.

```bash
sudo nano /etc/ssh/sshd_config
```

Намери:

```
#Port 22
```

Промени на:

```
Port 2222
```

**Не забравяй да отвориш новия порт в firewall-а ПРЕДИ да рестартираш SSH:**

```bash
# UFW
sudo ufw allow 2222/tcp

# Или firewalld
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 2222 -j ACCEPT
```

След това рестартирай SSH и тествай от **друг терминал**:

```bash
ssh -p 2222 user@your-server.com
```

Ако работи — можеш да махнеш правилото за порт 22.

> ⚠️ **Внимание:** Ако използваш SELinux (RHEL, CentOS, Fedora), трябва да кажеш на SELinux за новия порт:
> ```bash
> sudo semanage port -a -t ssh_port_t -p tcp 2222
> ```

## Стъпка 7: Ограничи кои потребители могат да влизат

Ако имаш системни потребители (`www-data`, `postgres`, `nginx`, `docker`), те **не трябва** да могат да влизат през SSH. Само твоите лични акаунти.

```bash
sudo nano /etc/ssh/sshd_config
```

Добави в края:

```
AllowUsers fedia admin
```

Само `fedia` и `admin` могат да влизат през SSH. Всички останали — отказ.

**Или чрез група:**

```
AllowGroups ssh-users
```

И създай групата:

```bash
sudo groupadd ssh-users
sudo usermod -aG ssh-users fedia
```

**Защо:** Дори да създадеш системен потребител за приложение, той не може да бъде използван за SSH достъп. Това е важна защита срещу privilege escalation.

## Стъпка 8: Настрой timeout-и

Намали прозореца, в който атакуващ може да пробва.

```bash
sudo nano /etc/ssh/sshd_config
```

Добави или промени:

```
# Изчакай максимум 30 секунди за login
LoginGraceTime 30

# Максимум 3 опита за парола/ключ
MaxAuthTries 3

# Максимум 10 сесии на connection
MaxSessions 10

# Затвори idle сесия след 15 минути
ClientAliveInterval 300
ClientAliveCountMax 3

# Изключи X11 forwarding (не е нужно за сървъри)
X11Forwarding no

# Изключи TCP forwarding (освен ако не ти трябва)
AllowTcpForwarding no

# Изключи agent forwarding
AllowAgentForwarding no
```

**Какво прави всяко:**
- `LoginGraceTime 30` — дава на клиента 30 секунди, после затваря. Намалява DDoS прозореца.
- `MaxAuthTries 3` — след 3 неуспешни опита, connection-ът се затваря. Повечето default-и са 6.
- `ClientAliveInterval 300` — ако няма активност 5 минути, изпраща ping.
- `ClientAliveCountMax 3` — ако 3 ping-а не получат отговор (15 мин), затваря сесията.
- `X11Forwarding no` — X11 forwarding е рядко нужен и може да е рисков.
- `AllowTcpForwarding no` — не позволява на SSH да се използва като proxy. Ако използваш `ssh -L` за тунелиране, остави `yes`.

## Стъпка 9: Fail2ban — автоматично блокиране на атаки

Дори с всички тези настройки, атакуващите ще продължат да пробват. Fail2ban ги блокира автоматично, след като направят определен брой грешки.

### Инсталация

```bash
sudo apt update
sudo apt install -y fail2ban
```

### Конфигурация

```bash
sudo nano /etc/fail2ban/jail.local
```

Съдържание:

```ini
[DEFAULT]
# Блокирай за 1 час
bantime = 3600

# Прозорец за проверка — 10 минути
findtime = 600

# След 3 грешки — блокирай
maxretry = 3

# Игнорирай localhost
ignoreip = 127.0.0.1/8 ::1

# Email notifications (опционално)
# destemail = your@email.com
# sender = fail2ban@your-server.com
# action = %(action_mwl)s

[sshd]
enabled = true

# Ако си сменил порта — укажи новия
port = 2222

# Използвай systemd journal за логове (по-надеждно от /var/log/auth.log)
backend = systemd

# Режим — normal или aggressive
mode = normal
```

### Активирай

```bash
sudo systemctl enable fail2ban
sudo systemctl restart fail2ban

# Провери статус
sudo systemctl status fail2ban

# Виж какви jail-ове са активни
sudo fail2ban-client status

# Виж детайли за sshd jail
sudo fail2ban-client status sshd
```

### Тествай

Опитай да се свържеш с грешен ключ 3 пъти. След третия, IP-то ти ще бъде блокирано за час. Провери:

```bash
# Виж блокираните IP-та
sudo fail2ban-client status sshd

# Ще видиш:
# Banned IP list:   45.123.45.67 103.75.11.22 ...
```

**Ако се заключиш по погрешка** (напр. тестваш от локалната машина):

```bash
# От друг терминал (ако имаш достъп)
sudo fail2ban-client set sshd unbanip YOUR_IP

# Или изчакай 1 час
```

## Стъпка 10: Two-Factor Authentication (2FA)

Ако искаш максимална сигурност, добави 2FA. Дори ако някой открадне private ключа ти, без кода от телефона не може да влезе.

### Инсталация

```bash
sudo apt install -y libpam-google-authenticator
```

### Генерирай секрет за всеки потребител

```bash
# Като потребителя (не root)
google-authenticator
```

Ще отговориш на няколко въпроса:

```
Do you want authentication tokens to be time-based (y/n) y
# Сканирай QR кода с Google Authenticator или Authy

Do you want me to update your "/home/fedia/.google_authenticator" file? (y/n) y
Do you want to disallow multiple uses of the same authentication token? (y/n) y
Do you want to allow a rate limit of 3 login attempts every 30s? (y/n) y
Do you want to enable emergency scratch codes? (y/n) y
```

**Запази emergency scratch codes** — те са еднократни кодове за възстановяване, ако загубиш телефона.

### Конфигурирай SSH

```bash
sudo nano /etc/ssh/sshd_config
```

Промени:

```
KbdInteractiveAuthentication yes
UsePAM yes
```

И добави:

```
AuthenticationMethods publickey,keyboard-interactive
```

Това изисква **и** публичен ключ, **и** 2FA код.

### Конфигурирай PAM

```bash
sudo nano /etc/pam.d/sshd
```

Добави **в края**:

```
auth required pam_google_authenticator.so nullok
```

> ⚠️ **Внимание:** `nullok` означава, че потребители без 2FA конфигурация могат да влязат с ключ. Ако искаш задължително 2FA, махни `nullok`. Но първо се увери, че всички потребители имат генериран secret, иначе ще се заключат.

### Рестартирай и тествай

```bash
sudo systemctl restart ssh
```

**Отвори нов терминал** и тествай:

```bash
ssh -p 2222 user@your-server.com
```

Трябва да пита:
1. Passphrase за ключа
2. Verification code от Google Authenticator

Ако и двете минат — влизаш.

> ⚠️ **Ако нещо се обърка:** Задръж отворен **стария терминал** с активна сесия. Можеш да поправиш конфигурацията, без да се заключиш.

## Финален тест преди да затвориш стария терминал

Преди да излезеш от backup сесията, тествай **в нов терминал**:

```bash
# 1. Опитай да влезеш с парола (трябва да се провали)
ssh -o PubkeyAuthentication=no user@your-server.com
# → Permission denied (publickey)

# 2. Опитай като root (трябва да се провали)
ssh root@your-server.com
# → Permission denied

# 3. Опитай с ключ на новия порт (трябва да работи)
ssh -p 2222 -i ~/.ssh/id_ed25519 user@your-server.com
# → Welcome!

# 4. Опитай с грешен ключ 3 пъти (трябва да те блокира)
ssh -p 2222 -i ~/.ssh/wrong_key user@your-server.com
# → 3 опита, после connection refused
```

Ако **всички** тези тестове дават очаквания резултат — SSH-ът е защитен.

## Verification checklist

- [ ] SSH ключ работи и влизаш без парола
- [ ] Passphrase на ключа е сложена
- [ ] `PermitRootLogin no` в sshd_config
- [ ] `PasswordAuthentication no` в sshd_config
- [ ] `PermitEmptyPasswords no` в sshd_config
- [ ] `MaxAuthTries 3` в sshd_config
- [ ] `LoginGraceTime 30` в sshd_config
- [ ] `AllowUsers` или `AllowGroups` дефинирани
- [ ] Fail2ban работи (`systemctl status fail2ban`)
- [ ] Fail2ban блокира след 3 опита (тествано)
- [ ] 2FA работи (ако е приложена)
- [ ] Backup SSH сесия работи
- [ ] Firewall позволява само новия порт (ако си го сменил)
- [ ] Логовете показват, че failed attempts са блокирани

## Troubleshooting

### Заключих се от сървъра

Ако имаш **backup SSH сесия** отворена — използвай я. Ако не:

- **Cloud console** — Hetzner, DigitalOcean, AWS имат web console / VNC достъп
- **Rescue mode** — повечето cloud providers предлагат rescue boot
- **Физически достъп** — ако е локален сървър

### `Permission denied (publickey)` след като всичко изглежда правилно

```bash
# Провери permissions на SSH файловете
ls -la ~/.ssh/
# Трябва да виждаш:
# drwx------ .ssh
# -rw------- id_ed25519
# -rw-r--r-- id_ed25519.pub
# -rw------- authorized_keys

# Ако не са правилни:
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
```

### Fail2ban блокира моя IP

```bash
# От друг терминал
sudo fail2ban-client set sshd unbanip YOUR_IP
```

### SSH не стартира след промени

```bash
# Провери синтаксиса на конфигурацията
sudo sshd -t

# Ако има грешка — поправи я
sudo nano /etc/ssh/sshd_config

# Тествай пак
sudo sshd -t
```

## Заключение

SSH hardening не е еднократна задача. Това е **набор от практики**, които прилагаш всеки път, когато вдигаш нов сървър. 10-те стъпки в този урок отнемат около 30 минути, но те предпазват от **95%+ от реалните атаки**.

**Кои са най-важните:**
1. **SSH ключове вместо пароли** — без това всичко останало е заобикаляне
2. **Root login забранен** — намалява attack surface
3. **Fail2ban** — автоматично блокиране на атаки
4. **2FA** — максимум сигурност

Останалите са "nice to have" — не са критични, но добавят слоеве.

Ако имаш само 10 минути — направи **само** стъпки 2, 3 и 4. Това вече те прави много по-сигурен от 90% от сървърите в интернет.

**За в бъдеще:** Всеки път, когато вдигаш нов сървър — мини през този checklist. 30 минути сега спестяват дни на дебъг после, ако нещо се обърка.

## Какво следва

След като SSH е защитен, следващите логични стъпки:

1. **Firewall setup** — UFW или firewalld с default-deny
2. **WireGuard VPN** — за site-to-site или remote access
3. **Intrusion detection** — AIDE или Tripwire за file integrity
4. **Log monitoring** — централизиране на логове (Loki, ELK)
5. **Automatic updates** — unattended-upgrades за security patches

Ако този урок ти е бил полезен — приложи го на реален сървър. Не просто го прочети. SSH hardening е нещо, което се учи с ръце, не с очи.
