// This file is machine-generated - do not edit!
'use server';
/**
 * @fileOverview Extracts the latest chapter number from a manga webpage using GenAI.
 *
 * - extractLatestChapter - A function that extracts the latest chapter number from a manga webpage.
 * - ExtractLatestChapterInput - The input type for the extractLatestChapter function.
 * - ExtractLatestChapterOutput - The return type for the extractLatestChapter function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExtractLatestChapterInputSchema = z.object({
  mangaTitle: z.string().describe('The title of the manga.'),
  webpageContent: z.string().describe('The HTML content of the manga webpage.'),
});
export type ExtractLatestChapterInput = z.infer<typeof ExtractLatestChapterInputSchema>;

const ExtractLatestChapterOutputSchema = z.object({
  latestChapter: z.string().describe('The latest chapter number of the manga.'),
});
export type ExtractLatestChapterOutput = z.infer<typeof ExtractLatestChapterOutputSchema>;

export async function extractLatestChapter(input: ExtractLatestChapterInput): Promise<ExtractLatestChapterOutput> {
  return extractLatestChapterFlow(input);
}

const extractLatestChapterPrompt = ai.definePrompt({
  name: 'extractLatestChapterPrompt',
  input: {
    schema: z.object({
      mangaTitle: z.string().describe('The title of the manga.'),
      webpageContent: z.string().describe('The HTML content of the manga webpage.'),
    }),
  },
  output: {
    schema: z.object({
      latestChapter: z.string().describe('The latest chapter number of the manga.'),
    }),
  },
  prompt: `You are an AI assistant specialized in extracting the latest chapter number of a manga from a webpage.\n\nYou are given the HTML content of the webpage and the title of the manga.\nYour task is to identify and extract the latest chapter number from the HTML content.\n\nManga Title: {{{mangaTitle}}}\nWebpage Content: {{{webpageContent}}}\n\nConsider various patterns for chapter numbers, such as Chapter X, Episode X, or simply X, where X is the chapter number. Return only the latest chapter number. If no chapter number can be found return "".`,
});

const extractLatestChapterFlow = ai.defineFlow<
  typeof ExtractLatestChapterInputSchema,
  typeof ExtractLatestChapterOutputSchema
>({
  name: 'extractLatestChapterFlow',
  inputSchema: ExtractLatestChapterInputSchema,
  outputSchema: ExtractLatestChapterOutputSchema,
}, async input => {
  const {output} = await extractLatestChapterPrompt(input);
  return output!;
});
