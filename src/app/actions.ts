'use server';
import {fetchWebPage} from '@/services/web-page-fetcher';

interface MangaInfo {
  title: string;
  chapter: string | null;
  loading: boolean;
  error?: string;
}

export async function processMangaListAction(mangaTitles: string[]): Promise<MangaInfo[]> {
  const newMangaInfoList: MangaInfo[] = [];

  for (const title of mangaTitles) {
    let latestChapter: string | null = null;
    let error: string | undefined = undefined;

    try {
      // Step 1: Construct the manga URL directly (assuming a consistent URL structure)
      const mangaUrl = `https://www.mangaread.org/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      // Step 2: Fetch the HTML content of the manga's page
      const mangaPageContent = await fetchWebPage(mangaUrl);

      if (!mangaPageContent) {
        error = `Failed to fetch manga page for ${title} at ${mangaUrl}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      // Step 3: Parse the HTML content of the manga's page
      let DOMParserImplementation: typeof DOMParser;

      if (typeof DOMParser === 'undefined') {
          try {
              const { JSDOM } = await import('jsdom');
              DOMParserImplementation = new JSDOM('').window.DOMParser;
          } catch (domError: any) {
              error = `Failed to create DOMParser: ${domError.message}`;
              console.error(error);
              newMangaInfoList.push({title, chapter: null, loading: false, error});
              continue;
          }
      } else {
          DOMParserImplementation = DOMParser;
      }

      const parser = new DOMParserImplementation();
      const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');

      if (!mangaPage) {
        error = `Failed to parse manga page for ${title} from ${mangaUrl}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      // Step 4: Extract the latest chapter from the manga's page
      const latestChapterElement = mangaPage.querySelector('ul.main.version-chap.no-volumn.active li a');

      if (!latestChapterElement) {
        error = `Could not find latest chapter element for ${title} at ${mangaUrl}`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      latestChapter = latestChapterElement.textContent?.trim() || 'N/A';

      if (!latestChapter) {
        error = `Could not extract chapter text for ${title} at ${mangaUrl}`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
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
