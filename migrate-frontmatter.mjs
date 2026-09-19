import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const CONTENT_DIRS = [
  'src/content/posts',
  'src/content/tutorials',
  'src/content/scripts',
];

function processFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  const data = parsed.data;

  let changed = false;

  // 1. Ако някъде е останало categories (масив) → взимаме първия елемент
  if (Array.isArray(data.categories) && data.categories.length > 0) {
    data.category = data.categories[0];
    delete data.categories;
    changed = true;
  }

  // 2. Поправяме странни пътища на картинки
  if (typeof data.heroImage === 'string') {
    const original = data.heroImage;

    data.heroImage = data.heroImage
      .replace(/^\.\.\/\.\.\/assets\//, '/images/')
      .replace(/^\.\.\/assets\//, '/images/')
      .replace(/^\.\/images\//, '/images/')
      .replace(/^assets\//, '/images/')
      .replace(/^images\//, '/images/');

    // Ако няма водеща / и не е пълен URL
    if (!data.heroImage.startsWith('/') && !data.heroImage.startsWith('http')) {
      data.heroImage = '/images/' + data.heroImage;
    }

    if (data.heroImage !== original) changed = true;
  }

  // 3. Добавяме липсващи полета
  if (data.draft === undefined) {
    data.draft = false;
    changed = true;
  }
  if (data.featured === undefined) {
    data.featured = false;
    changed = true;
  }
  if (!Array.isArray(data.tags)) {
    data.tags = [];
    changed = true;
  }
  if (data.heroImageAlt === undefined) {
    data.heroImageAlt = '';
    changed = true;
  }

  if (changed) {
    const newContent = matter.stringify(parsed.content, data);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('✓ Обновен:', filePath);
  } else {
    console.log('– Без промяна:', filePath);
  }
}

function walk(dir) {
  if (!fs.existsSync(dir)) {
    console.log('Папката не съществува:', dir);
    return;
  }
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (/\.(md|mdx)$/i.test(entry.name)) {
      processFile(full);
    }
  }
}

console.log('Започвам миграция на Linux Dev...\n');
CONTENT_DIRS.forEach(walk);
console.log('\nГотово!');
