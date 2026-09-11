---
title: "eBPF Hands-on: Writing your first XDP program"
description: "Напиши и зареди първата си XDP програма. От hello-world до packet drop/pass."
heroImage: "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80"
heroImageAlt: "Server infrastructure"
pubDate: 2026-08-28
category: "Linux"
level: "Advanced"
duration: "30 мин"
tags: ["eBPF", "XDP", "Networking", "C"]
prerequisites: ["C basics", "Linux networking", "clang/llvm"]
featured: true
---

## Какво е XDP?

**XDP** (eXpress Data Path) е най-ранната точка, в която можеш да обработваш пакети в Linux — още преди те да стигнат до networking stack-а. Идеален за DDoS mitigation, load balancing и high-performance filtering.

## Инструменти

```bash
sudo apt install clang llvm libbpf-dev linux-tools-$(uname -r)
```

## Hello XDP

```c
#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

SEC("xdp")
int xdp_pass(struct xdp_md *ctx) {
    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

Компилирай и зареди:

```bash
clang -O2 -g -target bpf -c xdp_pass.c -o xdp_pass.o
sudo ip link set dev eth0 xdp obj xdp_pass.o sec xdp
```

## Drop всички ICMP

```c
#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <bpf/bpf_helpers.h>

SEC("xdp")
int xdp_drop_icmp(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end)
        return XDP_PASS;

    if (eth->h_proto != __constant_htons(ETH_P_IP))
        return XDP_PASS;

    struct iphdr *iph = (void *)(eth + 1);
    if ((void *)(iph + 1) > data_end)
        return XDP_PASS;

    if (iph->protocol == IPPROTO_ICMP)
        return XDP_DROP;

    return XDP_PASS;
}

char _license[] SEC("license") = "GPL";
```

## Cleanup

```bash
sudo ip link set dev eth0 xdp off
```

Сега имаш основата. Следващата стъпка е maps, tail calls и CO-RE.
