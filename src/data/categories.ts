export const categories = [
  {
    id: 'linux-kernel',
    name: 'Linux Kernel',
    slug: 'linux/kernel',
    count: 42,
    description: 'Kernel tuning, modules, scheduling, memory management',
    icon: 'kernel',
  },
  {
    id: 'containers',
    name: 'Containers',
    slug: 'linux/containers',
    count: 38,
    description: 'Docker, Podman, containerd, rootless, security',
    icon: 'container',
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    slug: 'devops/kubernetes',
    count: 56,
    description: 'Production clusters, operators, service mesh',
    icon: 'k8s',
  },
  {
    id: 'terraform',
    name: 'Terraform',
    slug: 'devops/terraform',
    count: 29,
    description: 'IaC modules, multi-cloud, state management',
    icon: 'terraform',
  },
  {
    id: 'cicd',
    name: 'CI/CD',
    slug: 'devops/cicd',
    count: 47,
    description: 'Pipelines, GitOps, progressive delivery',
    icon: 'cicd',
  },
  {
    id: 'observability',
    name: 'Observability',
    slug: 'devops/observability',
    count: 33,
    description: 'Prometheus, Grafana, OpenTelemetry, tracing',
    icon: 'obs',
  },
  {
    id: 'security',
    name: 'Security',
    slug: 'technologies/security',
    count: 41,
    description: 'Hardening, SELinux, zero-trust, supply chain',
    icon: 'security',
  },
  {
    id: 'networking',
    name: 'Networking',
    slug: 'linux/networking',
    count: 35,
    description: 'eBPF, Cilium, WireGuard, netfilter',
    icon: 'network',
  },
] as const;

export const linuxTopics = [
  {
    title: 'Kernel Tuning & Performance',
    desc: 'sysctl, cgroups, CPU affinity, memory management',
    level: 'Advanced' as const,
    href: '/blog/kernel-tuning',
  },
  {
    title: 'Systemd Deep Dive',
    desc: 'Units, targets, timers, socket activation, hardening',
    level: 'Intermediate' as const,
    href: '/blog/systemd-deep-dive',
  },
  {
    title: 'Containers from Scratch',
    desc: 'Namespaces, cgroups, overlayfs, rootless containers',
    level: 'Advanced' as const,
    href: '/blog/containers-from-scratch',
  },
  {
    title: 'Networking Stack',
    desc: 'netfilter, nftables, eBPF, WireGuard, BGP',
    level: 'Advanced' as const,
    href: '/blog/linux-networking',
  },
  {
    title: 'Storage & Filesystems',
    desc: 'ZFS, Btrfs, LVM, Ceph, performance tuning',
    level: 'Intermediate' as const,
    href: '/blog/storage-filesystems',
  },
  {
    title: 'Security Hardening',
    desc: 'SELinux, AppArmor, seccomp, auditd, CIS benchmarks',
    level: 'Advanced' as const,
    href: '/blog/linux-hardening',
  },
] as const;

export const devopsTopics = [
  {
    title: 'Kubernetes Production',
    desc: 'HA clusters, operators, service mesh, multi-cluster',
    icon: '☸️',
    href: '/blog/k8s-production',
  },
  {
    title: 'GitOps & CD',
    desc: 'ArgoCD, Flux, progressive delivery, canary & blue-green',
    icon: '🔄',
    href: '/blog/gitops-argocd',
  },
  {
    title: 'Infrastructure as Code',
    desc: 'Terraform, Pulumi, Crossplane, Ansible at scale',
    icon: '🏗️',
    href: '/blog/iac-terraform',
  },
  {
    title: 'Observability Stack',
    desc: 'Prometheus, Grafana, Loki, Tempo, OpenTelemetry',
    icon: '📊',
    href: '/blog/observability-stack',
  },
  {
    title: 'CI/CD Pipelines',
    desc: 'GitHub Actions, GitLab CI, Tekton, advanced patterns',
    icon: '⚙️',
    href: '/blog/cicd-pipelines',
  },
  {
    title: 'Platform Engineering',
    desc: 'Internal Developer Platforms, Backstage, self-service',
    icon: '🚀',
    href: '/blog/platform-engineering',
  },
] as const;

export const techItems = [
  {
    name: 'eBPF',
    category: 'Systems',
    desc: 'Kernel programmability for networking, security & observability',
  },
  {
    name: 'WebAssembly',
    category: 'Runtime',
    desc: 'Portable sandboxed execution for edge & serverless',
  },
  {
    name: 'Cilium',
    category: 'Networking',
    desc: 'eBPF-powered CNI, service mesh and security',
  },
  {
    name: 'OpenTelemetry',
    category: 'Observability',
    desc: 'Vendor-neutral telemetry collection standard',
  },
  {
    name: 'Nix / NixOS',
    category: 'Systems',
    desc: 'Reproducible builds and declarative systems',
  },
  {
    name: 'Web3 / Blockchain Infra',
    category: 'Emerging',
    desc: 'Node operations, validators and decentralized infra',
  },
] as const;

export const tools = [
  {
    name: 'kubectl-aliases',
    desc: 'Powerful aliases collection for daily k8s work',
    type: 'Script',
    github: '#',
  },
  {
    name: 'sysctl-optimizer',
    desc: 'Automated kernel parameter tuning based on workload',
    type: 'Tool',
    github: '#',
  },
  {
    name: 'helm-diff-check',
    desc: 'CI-friendly Helm chart diff and validation',
    type: 'CI Plugin',
    github: '#',
  },
  {
    name: 'ebpf-trace-kit',
    desc: 'Ready-to-use eBPF tracing scripts for common issues',
    type: 'Scripts',
    github: '#',
  },
  {
    name: 'terraform-modules',
    desc: 'Production-grade reusable Terraform modules',
    type: 'IaC',
    github: '#',
  },
  {
    name: 'docker-slim-bench',
    desc: 'Container image size & security benchmarking',
    type: 'Tool',
    github: '#',
  },
] as const;
