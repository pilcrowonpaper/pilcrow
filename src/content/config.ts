import { z, defineCollection } from 'astro:content';

const postsCollection = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        description: z.string(),
        tldr: z.string().optional(),
        date: z.date(),
        hidden: z.boolean().optional(),
    }),
});

export const collections = {
    posts: postsCollection,
};
