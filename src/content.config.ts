import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['Linux', 'DevOps', 'Technologies', 'Security', 'Cloud', 'Tools']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('LinuxDev Team'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    readTime: z.string().optional(),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
  }),
});

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.enum(['Linux', 'DevOps', 'Technologies', 'Security', 'Cloud', 'Tools']),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced']),
    duration: z.string(),
    tags: z.array(z.string()).default([]),
    prerequisites: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    heroImage: z.string().optional(),
    heroImageAlt: z.string().optional(),
  }),
});

export const collections = { posts, tutorials };