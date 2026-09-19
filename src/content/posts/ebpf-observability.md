---
title: 'eBPF на практика: Observability без overhead'
description: >-
  Как да използваме eBPF за deep system observability с минимален performance
  impact. Практичен guide с bpftrace и BCC.
heroImage: /images/linux/ebpf-observability.webp
heroImageAlt: Terminal and code on screen
pubDate: 2026-09-10T00:00:00.000Z
category: Linux
tags:
  - eBPF
  - Observability
  - Performance
  - bpftrace
author: LinuxDev Team
featured: true
readTime: 12 мин
draft: false
---

# eBPF на практика: Observability без overhead

*Deep system observability с минимален performance impact — практически guide с bpftrace и BCC*

---

## Защо eBPF промени правилата на играта

Traditional observability tools имат фундаментален проблем: за да видиш какво прави kernel-ът, обикновено трябва или да инструментираш кода предварително (logging, metrics), или да платиш тежка performance такса чрез tools като `strace`, `tcpdump` в verbose режим, или kernel modules, писани ръчно за конкретен use case.

**eBPF (extended Berkeley Packet Filter)** решава това различно. Позволява да инжектираш sandboxed, JIT-compiled programs директно в Linux kernel, без да пипаш kernel source code и без да зареждаш custom kernel modules. Programs се верифицират преди изпълнение (eBPF verifier гарантира, че няма да crash-нат kernel-а или да влязат в infinite loop), после се компилират just-in-time до native machine code.

Резултатът: observability с overhead в рамките на единици проценти, вместо 10-30%+, каквито виждаш при heavy tracing с по-старите механизми.

### Кратко за архитектурата

- **eBPF program** – малка програма (обикновено писана в ограничен C subset), компилирана до eBPF bytecode.
- **Verifier** – статичен анализатор в kernel-а, който проверява safety (bounded loops, memory access, stack size).
- **JIT compiler** – превръща bytecode-а в native instructions за архитектурата (x86_64, ARM64 и др.).
- **Maps** – key-value structures, чрез които eBPF programs комуникират с user-space (hash maps, arrays, ring buffers, per-CPU structures).
- **Hooks** – точките, към които се attach-ва програмата: kprobes/kretprobes, uprobes, tracepoints, perf events, XDP, cgroup hooks, LSM hooks и т.н.

Именно комбинацията verifier + JIT + zero-copy maps е причината eBPF да позволява observability "in production", без страх от kernel panic или сериозна latency деградация.

---

## bpftrace vs BCC: кога кое

И двата инструмента са built on top на eBPF, но служат за различни сценарии.

| Критерий | bpftrace | BCC (BPF Compiler Collection) |
|---|---|---|
| Learning curve | Ниска — DTrace-like one-liner синтаксис | Висока — изисква Python/C++ и познаване на BPF API |
| Use case | Ad-hoc debugging, quick investigations | Production-grade tools, complex logic, persistent daemons |
| Performance overhead | Много нисък | Много нисък (същият underlying eBPF) |
| Гъвкавост | Ограничена за сложна state logic | Пълен контрол — custom maps, custom output formatting |
| Готови tools | Няколко built-in tools | 100+ готови tools (`biosnoop`, `tcplife`, `execsnoop` и др.) |

**Практическо правило:** започваш с bpftrace за бърза диагностика "какво по дяволите се случва точно сега", а преминаваш към BCC (или libbpf-базирано решение), когато трябва нещо persistent, с по-сложна логика или за production deployment.

---

## Инсталация на Ubuntu / Debian

### Проверка на kernel prerequisites

eBPF изисква относително modern kernel. Препоръчително е **Linux kernel 4.9+** за базова функционалност, но за пълните възможности (CO-RE, BTF, ring buffers) искаш **5.4+**, идеално **5.8+**.

```bash
uname -r
```

Провери дали kernel-ът е компилиран с BPF support:

```bash
grep CONFIG_BPF /boot/config-$(uname -r)
```

Очаквани стойности: `CONFIG_BPF=y`, `CONFIG_BPF_SYSCALL=y`, `CONFIG_BPF_JIT=y`.

### Инсталация на bpftrace

На Ubuntu 20.04+ и Debian 11+ (bullseye+), bpftrace е в стандартните repos:

```bash
sudo apt update
sudo apt install -y bpftrace
```

Проверка:

```bash
bpftrace --version
sudo bpftrace -e 'BEGIN { printf("bpftrace работи\n"); }'
```

Ако имаш нужда от най-новата версия (repo версията понякога изостава сериозно), компилирай от source:

```bash
sudo apt install -y bison cmake flex g++ git libelf-dev zlib1g-dev \
  libfl-dev systemtap-sdt-dev binutils-dev libcap-dev \
  clang-14 llvm-14-dev libclang-14-dev

git clone https://github.com/bpftrace/bpftrace.git
cd bpftrace
mkdir build && cd build
cmake -DCMAKE_BUILD_TYPE=Release ..
make -j$(nproc)
sudo make install
```

### Инсталация на BCC

```bash
sudo apt update
sudo apt install -y bpfcc-tools linux-headers-$(uname -r) python3-bpfcc
```

Проверка:

```bash
sudo /usr/sbin/execsnoop-bpfcc
```

**Важен нюанс**: имената на BCC tools в Ubuntu/Debian имат suffix `-bpfcc` (напр. `tcplife-bpfcc`, `biosnoop-bpfcc`), докато в upstream документацията и на други дистрибуции често са без него. Не се обърквай, когато следваш online guide-ове.

Ако искаш upstream (по-нова) версия на BCC, компилирането от source изисква повече зависимости и не е тривиално — за повечето production случаи repo версията е напълно достатъчна.

---

## Практически примери с bpftrace

### 1. Кои процеси правят най-много syscalls

```bash
sudo bpftrace -e 'tracepoint:raw_syscalls:sys_enter { @[comm] = count(); }'
```

Натисни `Ctrl+C`, за да видиш агрегирания резултат — histogram по process name.

### 2. Latency на `read()` syscall, per process

```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_read { @start[tid] = nsecs; }
tracepoint:syscalls:sys_exit_read /@start[tid]/ {
    @latency_ns[comm] = hist(nsecs - @start[tid]);
    delete(@start[tid]);
}'
```

Тук `hist()` автоматично прави log2 histogram — идеално за виждане на latency distribution, а не само средна стойност (която често лъже при tail latency проблеми).

### 3. Кой отваря кои файлове в реално време

```bash
sudo bpftrace -e '
tracepoint:syscalls:sys_enter_openat {
    printf("%s(%d) отваря: %s\n", comm, pid, str(args->filename));
}'
```

### 4. TCP retransmits — indicator за network проблеми

```bash
sudo bpftrace -e '
kprobe:tcp_retransmit_skb {
    printf("Retransmit от PID %d (%s)\n", pid, comm);
}'
```

### 5. Off-CPU анализ — къде процесите чакат, не къде горят CPU

```bash
sudo bpftrace -e '
tracepoint:sched:sched_switch {
    @start[args->prev_pid] = nsecs;
}
tracepoint:sched:sched_switch /@start[args->next_pid]/ {
    @off_cpu_ns[args->next_comm] = hist(nsecs - @start[args->next_pid]);
    delete(@start[args->next_pid]);
}'
```

Off-CPU time е критично важен и често пренебрегван metric — процес, чакащ на lock или на disk I/O, изглежда "спокоен" в CPU-центрирани dashboards, но реално деградира latency на потребителя.

---

## Практически примери с BCC

### execsnoop — всеки нов процес в системата

```bash
sudo execsnoop-bpfcc
```

Изключително полезно за security auditing и debugging на CI/CD pipelines, където искаш да видиш точно каква команда се изпълнява и кога.

### tcplife — lifecycle на TCP connections

```bash
sudo tcplife-bpfcc
```

Показва source/destination, портове, продължителност на connection-а и transferred bytes — без нуждата от пълен packet capture, какъвто прави `tcpdump`.

### biosnoop — block I/O latency per request

```bash
sudo biosnoop-bpfcc
```

Виждаш реалния disk I/O latency per request, вместо агрегирани `iostat` averages, които крият outliers.

### profile — CPU profiling чрез sampling

```bash
sudo profile-bpfcc -F 49 -p <PID> --stack-storage-size 8192 30
```

Sample-ва stack traces с честота 49Hz за 30 секунди — класическата основа за генериране на **flame graphs**, без нуждата от heavyweight profilers.

### Custom BCC Python script — минимален пример

```python
from bcc import BPF

program = """
int hello(void *ctx) {
    bpf_trace_printk("Hello от eBPF!\\n");
    return 0;
}
"""

b = BPF(text=program)
b.attach_kprobe(event="do_sys_openat2", fn_name="hello")
b.trace_print()
```

Това е минималният skeleton: пишеш restricted-C програмата inline, компилираш я in-memory чрез BCC, attach-ваш я към kprobe и четеш output-а от trace pipe. За production случаи вместо `bpf_trace_printk` (ограничен и бавен) използваш BPF maps и `perf_buffer` или `ring_buffer` за ефективен data transfer към user-space.

---

## Performance impact: реални числа и защо е нисък

Overhead-ът на eBPF observability идва основно от три места:

1. **Program execution** — самата eBPF програма изпълнява се на всеки hit на hook-а (напр. всеки syscall entry). JIT-compiled кодът е близък до native performance, но всеки extra instruction на hot path има цена.
2. **Map operations** — четене/писане в BPF maps не е безплатно, особено при contention (много CPU cores пишат в един и същ map едновременно).
3. **Context switch до user-space** — ако постоянно pull-ваш данни (вместо push чрез ring buffer/perf buffer), добавяш latency.

Emпирично, добре написани bpftrace/BCC probes на tracepoints и kprobes добавят overhead в **диапазона под 1% до около 5%** в зависимост от честотата на hook-а (един read() syscall на секунда е тривиален; милиони network packets в секунда с XDP hook изисква повече внимание).

**Практически съвети за минимизиране на overhead:**

- Предпочитай **tracepoints** пред **kprobes**, когато е възможно — tracepoints имат стабилен ABI и обикновено по-нисък overhead.
- Използвай **per-CPU maps**, за да избегнеш lock contention между cores.
- Агрегирай в kernel space (чрез `count()`, `hist()`, `sum()` в bpftrace, или BPF_HASH в BCC) вместо да пращаш raw events към user-space един по един.
- За high-frequency events (network packets, scheduler events) предпочитай **ring buffer** пред по-стария **perf buffer** — по-нисък overhead и по-добра memory efficiency.
- Ограничавай sampling honestно — `profile-bpfcc` на 49Hz е практически незабележим; на 999Hz вече усещаш.

---

## Кога eBPF не е правилният избор

Честно казано — eBPF не е универсално решение за всичко:

- За **application-level tracing** (напр. distributed tracing между microservices) по-подходящи са instrumentation libraries (OpenTelemetry SDK) — eBPF вижда kernel- и syscall-ниво, не application business logic директно (макар uprobes да позволяват частично това).
- За **много стари kernel versions** (под 4.9) функционалността е силно ограничена или липсва.
- За **сложна, stateful production logic** ad-hoc bpftrace скриптове не са подходящи за дългосрочна поддръжка — там компилиран BCC/libbpf tool с proper CI/CD е по-правилният подход.

---

## Заключение

eBPF премести observability от "инструментирай предварително и се надявай, че си logнал точното нещо" към "виждаш реалността на system-а в реално време, без да го спираш". bpftrace ти дава скоростта на one-liner диагностика; BCC ти дава мощта на пълноценни, production-ready tools.

Комбинацията от verifier (safety), JIT (performance) и maps (ефективна комуникация с user-space) е причината overhead-ът да остава в границите на единици проценти дори при deep system-level tracing — нещо немислимо с по-старите подходи като heavy `strace` или custom kernel modules.

Ако до момента си разчитал само на `top`, `iostat` и агрегирани dashboards — следващата логична стъпка е да пуснеш първия си `bpftrace` one-liner на production система и да видиш какво реално се случва под повърхността.

---

*Технически бележки: примерите по-горе са тествани в контекста на съвременни Ubuntu/Debian дистрибуции с kernel 5.x+. Точното поведение и наличните tracepoints/kprobes може да варира между kernel versions — винаги проверявай наличността чрез `sudo bpftrace -l` преди да разчиташ на конкретен hook в production.*
