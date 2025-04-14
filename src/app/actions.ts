'use server';
import { fetchWebPage } from '@/services/web-page-fetcher';
import fetch from 'node-fetch'; // Import node-fetch

interface MangaInfo {
  title: string;
  chapter: string | null;
  loading: boolean;
  error?: string;
}

export async function processMangaListAction(mangaTitles: string[]): Promise<MangaInfo[]> {
  const newMangaInfoList: MangaInfo[] = [];

  for (const title of mangaTitles) {
    let mangaLink: string | undefined;
    let latestChapter: string | null = null;
    let error: string | undefined = undefined;

    try {
      // Step 1: Fetch the HTML content of the search results page
      const searchUrl = `https://www.mangaread.org/search?name=${encodeURIComponent(title)}`;
      const searchResultsPageContent = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://www.mangaread.org/' // Add a referer header
        }
      }).then(res => res.text());

      if (!searchResultsPageContent) {
        error = `Failed to fetch search results for ${title}: No content returned`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Step 2: Parse the HTML content to extract the manga link
      const parser = new DOMParser();
      const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');

      if (!searchResultsPage) {
        error = `Failed to parse search results for ${title}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Step 3: Find the first manga item in the search results
      const firstMangaItem = searchResultsPage.querySelector('.c-tabs-item');

      if (!firstMangaItem) {
        error = `No search results found for ${title}: Check manga title or web site change`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Step 4: Extract the link to the manga's page
      mangaLink = firstMangaItem.querySelector('a')?.href;

      if (!mangaLink) {
        error = `Could not extract manga link for ${title}: check if the web site change`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Step 5: Fetch the HTML content of the manga's page
      const mangaPageContent = await fetchWebPage(mangaLink);

      if (!mangaPageContent) {
        error = `Failed to fetch manga page for ${title} :  ${mangaLink}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');

      // Step 6: Extract the latest chapter from the manga's page
      const latestChapterElement = mangaPage.querySelector('ul.main.version-chap.no-volumn.active li a');

      if (!latestChapterElement) {
        error = `Could not find latest chapter element for ${title}`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      latestChapter = latestChapterElement.textContent?.trim() || 'N/A';

      if (!latestChapter) {
        error = `Could not extract chapter text for ${title}`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      newMangaInfoList.push({ title, chapter: latestChapter, loading: false, error: undefined });

    } catch (err: any) {
      error = `Failed to process ${title}: ${err.message}`;
      console.error(error);
      newMangaInfoList.push({ title, chapter: null, loading: false, error });

    }
  }

  return newMangaInfoList;
}
