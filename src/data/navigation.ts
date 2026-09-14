export const mainNav = [
  { label: 'Начало', href: '/' },
  { label: 'Linux', href: '/linux' },
  { label: 'DevOps', href: '/devops' },
  { label: 'Technologies', href: '/technologies' },
  { label: 'Блог', href: '/blog' },
  { label: 'Уроци', href: '/tutorials' },
  { label: 'Скриптове', href: '/scripts' },
  { label: 'Tools', href: '/tools' },
] as const;

export const footerLinks = {
  Платформа: [
    { label: 'Linux', href: '/linux' },
    { label: 'DevOps', href: '/devops' },
    { label: 'Technologies', href: '/technologies' },
    { label: 'Блог', href: '/blog' },
    { label: 'Уроци', href: '/tutorials' },
  ],
  Ресурси: [
    { label: 'Tools & Scripts', href: '/tools' },
    { label: 'GitHub', href: 'https://github.com/fedya-dev' },     // ← сложи реален URL
  ],
  Community: [
    { label: 'Discord', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Telegram', href: '#' },
  ],
} as const
