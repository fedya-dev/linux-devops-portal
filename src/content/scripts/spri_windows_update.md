---
title: 'Windows Update Control: Блокиране и възстановяване на ъпдейтите'
description: >-
  Два batch скрипта за пълен контрол над Windows Update на Windows 11 — единият
  блокира всички ъпдейти, другият възстановява настройките по подразбиране.
pubDate: 2026-09-16T00:00:00.000Z
category: Automation
tags:
  - Windows
  - Windows Update
  - Batch
  - Automation
  - Scripts
author: LinuxDev Team
version: 1.0.0
language: other
dependencies:
  - Windows 11 Pro
  - Administrator rights
usage: Десен бутон → Run as administrator
featured: false
draft: false
heroImageAlt: ''
---

> ⚠️ **Сериозно предупреждение:** Windows Update носи **security patches**. Ако го блокираш за постоянно, системата ти остава уязвима към нови експлоити. Използвай тези скриптове **само** на:
> - Тестови машини и виртуални машини
> - Лаптопи за презентации
> - Системи без чувствителни данни
> - Временни installation-и
>
> **Не ги използвай** на production сървъри, на личния си компютър с важни данни, или на машини, които са част от корпоративна мрежа.

## Защо този скрипт

Windows 11 Pro има навика да:
- Рестартира автоматично по средата на работа
- Инсталира ъпдейти по време, когато не искаш
- Сваля няколко GB ъпдейти без предупреждение
- "Възстановява" настройките, които си блокирал (чрез WaaSMedicSvc)

Group Policy опциите (`gpedit.msc`) работят, но Windows често ги "поправя" при следващия update. Тези скриптове правят промените директно в registry-то и services, което е по-надеждно.

## Скрипт 1: Спиране на Windows Update

Запази като `Spri_Windows_Update.bat`:

```batch
@echo off
:: Проверка за администраторски права
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ГРЕШКА] Стартирайте скрипта с десен бутон -> Run as administrator!
    pause
    exit /b
)

echo ===================================================
echo   Спиране на Windows Update (Windows 11 Pro)
echo ===================================================

:: 1. Спиране на услугите
echo 1. Спиране на свързаните услуги...
net stop wuauserv >nul 2>&1
net stop bits >nul 2>&1
net stop dosvc >nul 2>&1
net stop UsoSvc >nul 2>&1
sc stop WaaSMedicSvc >nul 2>&1

:: 2. Промяна на Startup type на Disabled
echo 2. Забраняване на автоматичното стартиране...
sc config wuauserv start= disabled >nul 2>&1
sc config bits start= disabled >nul 2>&1
sc config dosvc start= disabled >nul 2>&1
sc config UsoSvc start= disabled >nul 2>&1

:: 3. Блокиране през Registry (Group Policy еквивалент)
echo 3. Прилагане на политики за забрана в Registry...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v NoAutoUpdate /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" /v AUOptions /t REG_DWORD /d 1 /f >nul 2>&1
reg add "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /v DisableWindowsUpdateAccess /t REG_DWORD /d 1 /f >nul 2>&1

:: 4. Блокиране на WaaSMedicAgent (защита срещу auto-repair)
echo 4. Блокиране на WaaSMedicSvc...
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc" /v Start /t REG_DWORD /d 4 /f >nul 2>&1

echo ===================================================
echo   ГОТОВО! Windows Update е успешно спрян.
echo ===================================================
pause
```

## Скрипт 2: Възстановяване на Windows Update

Запази като `Pusni_Windows_Update.bat`:

```batch
@echo off
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo Стартирайте като Администратор!
    pause
    exit /b
)

echo Връщане на настройките на Windows Update...

:: 1. Изтриване на Group Policy настройките
reg delete "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" /f >nul 2>&1

:: 2. Възстановяване на WaaSMedicSvc
reg add "HKLM\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc" /v Start /t REG_DWORD /d 3 /f >nul 2>&1

:: 3. Възстановяване на Startup type на services
sc config wuauserv start= demand >nul 2>&1
sc config bits start= delayed-auto >nul 2>&1
sc config dosvc start= delayed-auto >nul 2>&1
sc config UsoSvc start= auto >nul 2>&1

:: 4. Стартиране на services
net start wuauserv >nul 2>&1
net start bits >nul 2>&1
net start UsoSvc >nul 2>&1

echo Настройките са възстановени!
echo Препоръчително: рестартирайте компютъра.
pause
```

## Използване

### Стъпка 1: Изтегли скриптовете

Създай два `.bat` файла на Desktop:
- `Spri_Windows_Update.bat`
- `Pusni_Windows_Update.bat`

Копирай съдържанието от код блоковете по-горе.

### Стъпка 2: Изпълни като администратор

**Задължително** — десен бутон → **"Run as administrator"**. Ако го пуснеш с двоен клик, ще видиш "[ГРЕШКА] Стартирайте с Run as administrator" и ще излезе.

### Стъпка 3: Рестартирай

След като скриптът покаже "ГОТОВО!", рестартирай компютъра, за да влязат в сила промените.

### Стъпка 4: Провери

Отвори `services.msc` и провери:
- **Windows Update (`wuauserv`)** → Status: Stopped, Startup: Disabled
- **Background Intelligent Transfer Service (`bits`)** → Disabled
- **Delivery Optimization (`dosvc`)** → Disabled
- **Update Orchestrator Service (`UsoSvc`)** → Disabled
- **Windows Update Medic Service (`WaaSMedicSvc`)** → Disabled

## Връщане обратно

Ако решиш, че искаш отново ъпдейти:

1. Изпълни `Pusni_Windows_Update.bat` като администратор
2. Рестартирай компютъра
3. Отвори `Settings → Windows Update → Check for updates`

Ако след рестарт Windows Update не работи — отвори `services.msc` и стартирай `wuauserv` ръчно.

## Какво прави всеки компонент

| Service | Какво прави |
|---|---|
| `wuauserv` | Основната Windows Update услуга |
| `bits` | Background Intelligent Transfer — тегли ъпдейти |
| `dosvc` | Delivery Optimization — P2P ъпдейти между машини |
| `UsoSvc` | Update Orchestrator — планира кога да се инсталират |
| `WaaSMedicSvc` | "Medic" — оправя блокирани настройки и връща ъпдейтите |

## Алтернативи (по-безопасни)

### 1. Group Policy — отлагане на ъпдейти

`gpedit.msc` → Computer Configuration → Administrative Templates → Windows Components → Windows Update:

- **Configure Automatic Updates** → Enabled → "2 - Notify for download and auto install"
- **Specify deadline for automatic updates and restarts** → Enabled → deadline in days

Това не блокира ъпдейтите, но спира автоматичния рестарт.

### 2. Pause updates (вграден)

`Settings → Windows Update → Pause updates` → до 35 дни. След това трябва да инсталираш всичко натрупано.

### 3. Windows Update Blocker (WUB)

Безплатен инструмент от Sordum: `sordum.org/9470/windows-update-blocker-v1-8/`. Прави същото като скриптовете, но с GUI и toggle бутон. Препоръчително, ако не искаш да пипаш registry ръчно.

### 4. Registry — DisableAutoUpdate (по-леко)

Само `NoAutoUpdate = 1` в `HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU`. Не пипа services. По-лесно се връща обратно.

## Troubleshooting

### "Run as administrator" не работи

Някои корпоративни политики блокират admin rights. Провери дали акаунтът ти е в `Administrators` групата.

### Скриптът казва "Access denied"

Антивирусна програма или Windows Defender блокира registry промените. Добави изключение или временно изключи protection.

### Ъпдейтите се връщат след рестарт

Windows 11 има "self-healing" механизми. WaaSMedicSvc може да върне настройките, ако не е напълно спрян. Провери дали `Start = 4` е приложено в registry-то.

### Windows Update Settings показва грешка

Нормално е — Settings app очаква wuauserv да работи. Ще видиш "Something went wrong" съобщение. Игнорирай го — това е целта.

## Изисквания

- **Windows 11 Pro** (тествано)
- **Administrator rights** — задължително
- **Registry backup** — препоръчително преди първо изпълнение

## Backup на registry преди промени

```batch
reg export "HKLM\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate" update_backup.reg 2>nul
reg export "HKLM\SYSTEM\CurrentControlSet\Services\WaaSMedicSvc" waasmedic_backup.reg
```

Ако нещо се обърка — двоен клик на `.reg` файловете връща настройките.

## Заключение

Тези скриптове дават **пълен контрол** над Windows Update. Работят на Windows 11 Pro, тествани са, и са по-надеждни от Group Policy (която Windows често "поправя").

**Но не забравяй** — блокираните ъпдейти означават липса на security patches. Използвай ги разумно:
- На тестови машини → ок
- На личен компютър без важни данни → ок, с внимание
- На production → не
- На корпоративна машина → питай IT първо

Ако просто те дразни автоматичният рестарт — използвай **Group Policy за defer**, не пълен block. Windows ще продължи да се ъпдейтва, но няма да те рестартира по средата на работа.
