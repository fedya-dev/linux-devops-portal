import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import astroBrokenLinksChecker from 'astro-broken-links-checker';
import pagefind from 'astro-pagefind';

// https://astro.build/config
export default defineConfig({
  site: 'https://linuxdev.fedia.eu',

  integrations: [
    tailwind(),
    mdx(),
    sitemap({
      filter: (page) =>
        !page.includes('/404') &&
        !page.includes('/500'),
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      serialize(item) {
        // Начална страница
        if (item.url === 'https://linuxdev.fedia.eu/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        }

        // Уроци и блог статии
        else if (
          item.url.includes('/tutorials/') ||
          item.url.includes('/blog/')
        ) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        }

        // Категории
        else if (
          ['/linux', '/devops', '/technologies', '/tutorials', '/blog', '/scripts', '/tools']
            .some(path => item.url.endsWith(path) || item.url.endsWith(path + '/'))
        ) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        }

        return item;
      },
    }),

    astroBrokenLinksChecker({
      checkExternalLinks: false,
      throwError: true,
    }),

    // Pagefind — локална full-text търсачка
    pagefind(),
  ],

  compressHTML: true,

  build: {
    inlineStylesheets: 'auto',
  },

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});