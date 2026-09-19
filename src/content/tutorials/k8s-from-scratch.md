---
title: Building a Production Kubernetes Cluster from Scratch
description: >-
  Step-by-step guide за изграждане на HA Kubernetes клъстер с kubeadm, etcd и
  HAProxy.
heroImage: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=1200&q=80'
heroImageAlt: Server infrastructure
pubDate: 2026-09-01T00:00:00.000Z
category: DevOps
level: Advanced
duration: 45 мин
tags:
  - Kubernetes
  - kubeadm
  - HA
  - etcd
prerequisites:
  - Linux admin basics
  - Networking fundamentals
  - TLS concepts
featured: true
draft: false
---

## Цел на туториала

Ще изградим **High Availability** Kubernetes клъстер с:

- 3 control plane nodes
- 3 worker nodes
- External etcd cluster (или stacked)
- HAProxy + Keepalived за API server VIP

## Предварителни изисквания

- 6 VM-а (или bare metal) с Ubuntu 24.04
- Минимум 2 vCPU / 4 GB RAM на control plane
- Статични IP адреси
- Достъп до интернет за pull на images

## Стъпка 1: Подготовка на nodes

```bash
# На всички nodes
sudo apt update && sudo apt install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo systemctl enable --now containerd

# Disable swap
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Стъпка 2: Инсталиране на kubeadm

```bash
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg

echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
  https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt update
sudo apt install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl
```

## Стъпка 3: Init на първия control plane

```bash
sudo kubeadm init \
  --control-plane-endpoint "k8s-api.example.com:6443" \
  --upload-certs \
  --pod-network-cidr=10.244.0.0/16
```

След това join останалите control plane и worker nodes с генерираните команди.

## Следващи стъпки

1. Инсталирай CNI (Cilium или Calico)
2. Настрой MetalLB или cloud load balancer
3. Добави monitoring (kube-prometheus-stack)
4. Имплементирай NetworkPolicies

Готов си за production-like среда.
