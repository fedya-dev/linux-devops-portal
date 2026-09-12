---
title: "WSL 2: Вашият мост между Windows 11 и Linux"
description: "Пълен гайд за инсталация и конфигурация на Windows Subsystem for Linux 2 в Windows 11. Научете как да работите с Linux директно от вашия Windows."
pubDate: 2026-09-12
category: "DevOps"
tags: ["WSL 2", "Windows 11", "Linux", "DevOps", "Development Environment", "Linux Terminal"]
author: "Федя Серафиев"
featured: true
readTime: "15 мин"
heroImage: "/images/devops/wsl2-bridge.webp"
heroImageAlt: "WSL 2 мост между Windows 11 и Linux"
---

## Увод

През последните години работата като разработчик на Windows машина стана драматично по-лесна благодарение на WSL 2 (Windows Subsystem for Linux версия 2). Преди това разработчиците на Windows трябваше да избират: или да използват виртуална машина (бавно и ресурсоемко), или да инсталират Linux като основна операционна система, което означаваше да се откажат от много Windows приложения.

WSL 2 е революционна технология, която ви позволява да работите с пълнофункционална Linux дистрибуция директно от Windows 11, без VM оувърхед. В тази статия ще ви покажа как да инсталирам и конфигурирам WSL 2 и как да го използвам в ежедневната си работа.

## Защо WSL 2?

Преди да се пуснем в инсталацията, ето защо избрах WSL 2:

### Производителност
WSL 2 използва реален Linux kernel чрез Hyper-V виртуализация, което е значително по-бързо от WSL 1 и сравнимо с нативния Linux по производителност.

### Интеграция с Windows
Мога да имам отворени Windows приложения (VS Code, Chrome, Slack) заедно с Linux терминал и да обменям файлове лесно.

### Удобство
Няма нужда от двойна зареждане или отделна машина. Всичко е на един екран.

### Съвместимост
Всички Linux инструменти, които използвам в production (Docker, Kubernetes, Node.js, Python, Ruby), работят идентично на WSL 2, както и на Linux сървърите.

## Системни изисквания

Преди да продължите, проверете дали имате:

- **Windows 11** (Pro, Enterprise или Home – WSL 2 е достъпен на всички версии)
- **Процесор с поддръжка на виртуализация** (Intel VT-x или AMD-V)
- **Минимум 4 GB RAM** (препоръчвам 8 GB или повече)
- **Свободно място на диска** – минимум 5–10 GB за Linux дистрибуцията

### Проверка на виртуализацията

Отворете **PowerShell като администратор** и напишете:

```powershell
systeminfo
```

Потърсете редовете **Hyper-V Requirements**. Трябва да видите нещо подобно:

```text
Hyper-V Requirements: A hypervisor has been detected. Features required for Hyper-V will not be displayed.
```

Ако виждате **No** на някоя линия, ще трябва да активирате виртуализацията в BIOS/UEFI.

## Инсталация на WSL 2

### Стъпка 1: Активиране на необходимите Windows функции

Отворете PowerShell като администратор и изпълнете:

```powershell
wsl --install
```

Тази команда е най-лесният начин да инсталирате WSL 2. Тя ще:

- Активира Windows Subsystem for Linux
- Активира платформата за виртуална машина на Hyper-V
- Инсталира Linux kernel
- Инсталира Ubuntu като основна дистрибуция

Процесът ще отнеме 5–10 минути. След завършване **рестартирайте компютъра**.

### Стъпка 2: Конфигурация след рестартиране

След рестартиране отворете терминал (cmd, PowerShell или Windows Terminal) и проверете инсталацията:

```powershell
wsl --list --verbose
```

Трябва да видите нещо подобно:

```text
NAME      STATE           VERSION
Ubuntu    Running         2
```

Ако виждате **VERSION 1** вместо **2**, променете версията с:

```powershell
wsl --set-version Ubuntu 2
```

## Избор на Linux дистрибуция

По подразбиране `wsl --install` инсталира **Ubuntu**. Това е отличен избор за начинаещи и за повечето разработчици, но имате и други опции.

### Налични дистрибуции

Вижте всички налични дистрибуции:

```powershell
wsl --list --online
```

Някои популярни опции:

- **Ubuntu** – препоръчвана за повечето; стабилна, добра документация, голяма общност
- **Ubuntu 22.04 LTS** – дългосрочна поддръжка, стабилна
- **Debian** – минималистична, лека
- **Fedora** – нови версии на пакетите, за тези, които искат най-новото
- **openSUSE** – мощна, добра за сървъри
- **Kali Linux** – за security тестване

### Инсталация на друга дистрибуция

За да инсталирате например **Ubuntu 22.04 LTS**:

```powershell
wsl --install --distribution Ubuntu-22.04
```

Или от **Microsoft Store** (графичен интерфейс):

1. Отворете Microsoft Store
2. Потърсете **Ubuntu 22.04.1 LTS**
3. Кликнете **Install**

## Първа конфигурация на Ubuntu

### Стъпка 1: Първоначален вход

При първия път, когато отворите Ubuntu, ще бъдете попитани за потребителско име и парола:

```text
Installing, this may take a few minutes...
Please create a user account to use with your new WSL distro.
Enter new UNIX username: fedya
New UNIX password:
Retype new UNIX password:
```

Напишете своите данни. Паролата **няма да се вижда**, докато пишете – това е нормално.

### Стъпка 2: Обновяване на системата

Веднага след инсталацията обновете пакетния списък и всички пакети:

```bash
sudo apt update
sudo apt upgrade -y
```

`sudo` означава **Super User Do** – позволява ви да изпълнявате команди с администраторски права.

### Стъпка 3: Инсталация на основни инструменти

```bash
sudo apt install -y build-essential curl wget git nano vim
```

Това ще инсталира:

- **build-essential** – компилатори и инструменти за разработка
- **curl** и **wget** – инструменти за изтегляне на файлове
- **git** – контролна система за версии
- **nano** и **vim** – текстови редактори

## Работа с WSL 2 терминал

### Отваряне на WSL терминал

Имате няколко опции:

- От **PowerShell**: напишете просто `wsl` и ще влезете в Ubuntu терминала
- От **Windows Terminal**: изберете **Ubuntu** от падащото меню
- Кликнете с **десния бутон** в папка на Windows и изберете **Open Linux shell here**
- От **VS Code**: отворете интегрирания терминал (`Ctrl` + `` ` ``)

### Основни команди

Ако е първи път с Linux, ето някои основни команди:

```bash
# Вижте текущата директория
pwd

# Изпишете съдържанието на папка
ls -la

# Създайте нова папка
mkdir my-project

# Отидете в папка
cd my-project

# Създайте файл
touch filename.txt

# Вижте съдържанието на файл
cat filename.txt

# Редактирайте файл (nano е по-лесен за начинаещи)
nano filename.txt

# Изтрийте файл
rm filename.txt

# Изтрийте папка
rm -r my-folder

# Вижте дисковото пространство
df -h
```

## Интеграция на Windows файлове с WSL

### Достъп до Windows файловете от WSL

Вашите Windows файлове са достъпни в `/mnt/c/`:

```bash
# Отидете в Windows Home папката
cd /mnt/c/Users/YourUsername

# Вижте съдържанието на Desktop
ls /mnt/c/Users/YourUsername/Desktop

# Работете с файлове
cd /mnt/c/Users/YourUsername/Documents
```

### Достъп до WSL файлове от Windows

Можете да отворите WSL файловете от **Windows File Explorer**, като напишете в адресната лента:

```text
\\wsl$\Ubuntu
```

Или от терминал:

```powershell
explorer.exe \\wsl$\Ubuntu\home\fedya
```

### Файлов обмен – най-добрата практика

Препоръчвам да работите главно в **WSL файловата система** (`/home/fedya/`) за по-добра производителност. Файловата система в `/mnt/c/` е по-бавна поради интеграцията между операционните системи.

```bash
# Създайте проект папка в WSL
mkdir ~/projects
cd ~/projects

# Работете тук
git clone [https://github.com/example/repo.git](https://github.com/example/repo.git)
```

## Docker с WSL 2

Една от най-мощните характеристики на WSL 2 е Docker поддръжката.

### Инсталация на Docker

```bash
# Добавете Docker repository
curl -fsSL [https://get.docker.com](https://get.docker.com) -o get-docker.sh
sudo sh get-docker.sh

# Добавете вашия потребител към docker групата
sudo usermod -aG docker $USER

# Актуализирайте групите за текущата сесия
newgrp docker
```

### Проверка на Docker

```bash
docker --version
docker run hello-world
```

Ако видите **Hello from Docker!**, инсталацията е успешна.

### Docker Desktop за Windows

Алтернатива е **Docker Desktop** за Windows, който идва с интегрирана WSL 2 поддръжка:

1. Изтеглете от [docker.com](https://www.docker.com/)
2. Инсталирайте
3. Отворете Docker Desktop
4. Отидете в **Settings > Resources > WSL Integration**
5. Активирайте вашата Ubuntu дистрибуция

## Node.js и npm

### Инсталация на nvm (Node Version Manager)

Препоръчвам да използвате **nvm** за управление на Node версии:

```bash
curl -o- [https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh](https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh) | bash

# Затворете и отворете терминала или напишете:
source ~/.bashrc
```

### Инсталация на Node.js

```bash
# Вижте налични версии
nvm list-remote

# Инсталирайте LTS версия
nvm install --lts

# Проверете
node --version
npm --version
```

## Python разработка

### Инсталация на Python

```bash
# Проверете дали Python е инсталиран (обикновено е)
python3 --version

# Инсталирайте pip (Python пакет мениджър)
sudo apt install -y python3-pip

# Инсталирайте venv (виртуално обкръжение)
sudo apt install -y python3-venv
```

### Създаване на виртуално обкръжение

```bash
# Създайте проект
mkdir my-python-project
cd my-python-project

# Създайте виртуално обкръжение
python3 -m venv venv

# Активирайте го
source venv/bin/activate

# Инсталирайте пакети
pip install requests flask
```

> Забележка: правилната команда е `python3 -m venv venv`, а не `python3 -venv venv`.

## Git конфигурация

### Основна конфигурация

```bash
git config --global user.name "Федя Серафиев"
git config --global user.email "your-email@example.com"

# Проверете
git config --global --list
```

### SSH ключ за GitHub

```bash
# Генерирайте SSH ключ
ssh-keygen -t ed25519 -C "your-email@example.com"

# Прочетете публичния ключ
cat ~/.ssh/id_ed25519.pub
```

Скопирайте ключа и го добавете в **GitHub Settings > SSH Keys**.

## VS Code интеграция

### Инсталация на Remote – WSL разширение

1. Отворете **VS Code**
2. Отидете в **Extensions** (`Ctrl` + `Shift` + `X`)
3. Потърсете **Remote – WSL**
4. Кликнете **Install**

### Отваряне на проект в WSL

От WSL терминал, в папката на проекта:

```bash
code .
```

Това ще отвори VS Code с пълна WSL интеграция. Всички терминални команди, debugging и разширения ще работят в Linux контекста.

## Конфигурация на .wslconfig

За по-напреднала конфигурация създайте файл `.wslconfig` на Windows (в `C:\Users\YourUsername\.wslconfig`):

```ini
[wsl2]
# Количество RAM в GB (оставете поне 2 GB за Windows)
memory=6GB

# CPU ядра
processors=4

# Swap памет
swap=2GB

# Локализоване на дистрибуцията
localhostForwarding=true

# Mount опции
[interop]
enabled=true
appendWindowsPath=true
```

След това рестартирайте WSL:

```powershell
wsl --shutdown
```

## Полезни PowerShell команди

```powershell
# Вижте инсталирани дистрибуции
wsl --list --verbose

# Настройте по подразбиране дистрибуция
wsl --set-default Ubuntu

# Експортирайте дистрибуция
wsl --export Ubuntu C:\backup\Ubuntu.tar

# Импортирайте дистрибуция
wsl --import Ubuntu C:\wsl\Ubuntu C:\backup\Ubuntu.tar

# Освобождаване на пространство (compact)
wsl --manage Ubuntu --set-sparse true

# Премахване на дистрибуция
wsl --unregister Ubuntu
```

## Производителност и оптимизация

### Разрешаване на nested virtualization

Отворете `.wslconfig` и добавете:

```ini
[wsl2]
nestedVirtualization=true
```

### Изключване на ненужни услуги

```bash
# Вижте какви услуги работят
systemctl list-units --type=service

# Изключете ненужни (например snap)
sudo systemctl disable snapd
```

## Честа и неизправности

### WSL 2 е твърде бавен

**Решение:** Уверете се, че работите с файлове в `/home` директорията, а не в `/mnt/c`.

### Не мога да свържа интернет

```bash
# Проверете DNS
cat /etc/resolv.conf

# Коригирайте в /etc/wsl.conf
sudo nano /etc/wsl.conf
```

Добавете:

```ini
[network]
generateResolvConf=false
```

Създайте `/etc/resolv.conf`:

```bash
sudo nano /etc/resolv.conf
```

И добавете:

```text
nameserver 8.8.8.8
nameserver 8.8.4.4
```

### Остават WSL процеси след затваряне на терминала

Това е нормално поведение. За да спрете всички процеси:

```powershell
wsl --shutdown
```

## Заключение

WSL 2 трансформира начина ми на работа. Вече имам мощта на Linux, без да се отказвам от удобството и интеграцията на Windows. От Docker контейнери, през Node.js разработка, до системно администриране – всичко работи идеално.

Ако сте разработчик на Windows, силно препоръчвам да инсталирате WSL 2. Началното време за конфигурация (30–60 минути) ще се изплати с хиляди часове по-ефективна работа.

## Полезни ресурси

- [Официална документация на WSL](https://learn.microsoft.com/en-us/windows/wsl/)
- [Windows Terminal](https://aka.ms/terminal)
- [VS Code Remote Development](https://code.visualstudio.com/docs/remote/remote-overview)
- [Docker с WSL 2](https://docs.docker.com/desktop/wsl/)

*Статията е написана на базата на личен опит от работа с WSL 2 в Windows 11 от Федя Серафиев.*