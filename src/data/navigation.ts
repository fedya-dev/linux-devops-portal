export const mainNav = [
  { label: 'Начало', href: '/' },
  { label: 'Linux', href: '/linux' },
  { label: 'DevOps', href: '/devops' },
  { label: 'Технологии', href: '/technologies' },   // беше Technologies
  { label: 'Блог', href: '/blog' },
  { label: 'Уроци', href: '/tutorials' },
  { label: 'Скриптове', href: '/scripts' },
] as const;

export const footerLinks = {
  Платформа: [
    { label: 'Linux', href: '/linux' },
    { label: 'DevOps', href: '/devops' },
    { label: 'Технологии', href: '/technologies' },
    { label: 'Блог', href: '/blog' },
    { label: 'Уроци', href: '/tutorials' },
  ],
  Ресурси: [
    { label: 'Инструменти и скриптове', href: '/tools' },
    { label: 'GitHub', href: 'https://github.com/fedya-dev' },
  ],
  Общност: [                                        // беше Community
    { label: 'Discord', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Telegram', href: '#' },
  ],
} as const;