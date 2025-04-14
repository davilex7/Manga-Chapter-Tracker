'use server';
import fetch from 'node-fetch';

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

      const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');

      if (!searchResultsPage) {
        error = `Failed to parse search results for ${title}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

     // Step 3: Extract the latest chapter from the manga's page
      const latestChapterElement = searchResultsPage.querySelector('ul.main.version-chap.no-volumn.active li a');

      if (!latestChapterElement) {
        error = `Could not find latest chapter element for ${title}`;
        console.warn(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      latestChapter = latestChapterElement.textContent?.trim() || 'N/A';

      newMangaInfoList.push({ title, chapter: latestChapter, loading: false, error: undefined });

    } catch (err: any) {
      error = `Failed to process ${title}: ${err.message}`;
      console.error(error);
      newMangaInfoList.push({ title, chapter: null, loading: false, error });
    }
  }

  return newMangaInfoList;
}
