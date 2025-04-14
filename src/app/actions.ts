'use server';
import fetch from 'node-fetch';
// Import jsdom only if DOMParser is not available globally (e.g., in Node.js)
let DOMParserImplementation: typeof DOMParser;
try {
  if (typeof DOMParser === 'undefined') {
    // Dynamically import jsdom only when needed
    const { JSDOM } = await import('jsdom');
    DOMParserImplementation = new JSDOM('').window.DOMParser;
    console.log('Using JSDOM for parsing.');
  } else {
    DOMParserImplementation = DOMParser;
    console.log('Using native DOMParser.');
  }
} catch (domError: any) {
  console.error(`Failed to initialize DOMParser: ${domError.message}`);
  // Handle the error appropriately, maybe throw or set a fallback
  throw new Error("DOMParser could not be initialized.");
}


interface MangaInfo {
  title: string;
  chapter: string | null;
  loading: boolean;
  error?: string;
}

export async function processMangaListAction(mangaTitles: string[]): Promise<MangaInfo[]> {
  const newMangaInfoList: MangaInfo[] = [];
  const parser = new DOMParserImplementation(); // Create one parser instance

  for (const title of mangaTitles) {
    let latestChapter: string | null = null;
    let error: string | undefined = undefined;
    let mangaPageUrl: string | null = null;

    console.log(`Processing: ${title}`);

    try {
      // Step 1: Fetch the HTML content of the search results page
      // Use the correct search URL format for mangaread.org
      const searchUrl = `https://www.mangaread.org/?s=${encodeURIComponent(title)}&post_type=wp-manga`;
      console.log(`Fetching search URL: ${searchUrl}`);
      const searchResponse = await fetch(searchUrl, {
        headers: {
          // Use a realistic User-Agent
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
          'Referer': 'https://www.mangaread.org/'
        }
      });

      if (!searchResponse.ok) {
        error = `Failed to fetch search results for ${title}. Status: ${searchResponse.status}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      const searchResultsPageContent = await searchResponse.text();

      if (!searchResultsPageContent) {
        error = `Failed to fetch search results for ${title}: No content returned`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Step 2: Parse the search results HTML to find the link to the manga page
      const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');

      if (!searchResultsPage) {
        error = `Failed to parse search results for ${title}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue; // Skip to the next manga title
      }

      // Find the first search result link - adjust selector if needed based on actual search page structure
      // This selector targets the link within the title of the first search result item.
      const mangaLinkElement = searchResultsPage.querySelector('.c-tabs-item .tab-summary .post-title h3 a');

      if (mangaLinkElement && mangaLinkElement.hasAttribute('href')) {
        mangaPageUrl = mangaLinkElement.getAttribute('href');
        console.log(`Found manga page URL for ${title}: ${mangaPageUrl}`);
      } else {
        error = `Could not find manga page link for ${title} in search results.`;
        console.warn(error);
        // Optional: Try alternative selectors if the first one fails
        const alternativeLink = searchResultsPage.querySelector('.tab-thumb a'); // Example alternative
        if (alternativeLink && alternativeLink.hasAttribute('href')) {
          mangaPageUrl = alternativeLink.getAttribute('href');
          console.log(`Found manga page URL using alternative selector for ${title}: ${mangaPageUrl}`);
          error = undefined; // Clear error if alternative worked
        } else {
          newMangaInfoList.push({ title, chapter: null, loading: false, error });
          continue;
        }
      }

      if (!mangaPageUrl) {
        // This should technically not be reached if the logic above is correct, but serves as a safeguard.
        error = `Failed to extract manga page URL for ${title}.`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }


      // Step 3: Fetch the HTML content of the manga's specific page
      console.log(`Fetching manga page: ${mangaPageUrl}`);
      const mangaPageResponse = await fetch(mangaPageUrl, {
        headers: { // Use similar headers
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
          'Referer': searchUrl // Referer should be the search results page
        }
      });

      if (!mangaPageResponse.ok) {
        error = `Failed to fetch manga page for ${title}. Status: ${mangaPageResponse.status}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      const mangaPageContent = await mangaPageResponse.text();

      if (!mangaPageContent) {
        error = `Failed to fetch manga page content for ${title}: No content returned`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      // Step 4: Parse the manga page HTML
      const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');

      if (!mangaPage) {
        error = `Failed to parse manga page for ${title}`;
        console.error(error);
        newMangaInfoList.push({ title, chapter: null, loading: false, error });
        continue;
      }

      // Step 5: Extract the latest chapter from the manga's page
      // The latest chapter is usually the first one in the list
      const latestChapterElement = mangaPage.querySelector('ul.main.version-chap li.wp-manga-chapter a'); // Corrected selector

      if (!latestChapterElement) {
        error = `Could not find latest chapter element on manga page for ${title}`;
        console.warn(error);
        // Attempt alternative selector if needed
        const altChapterElement = mangaPage.querySelector('.listing-chapters_wrap .wp-manga-chapter a');
        if (altChapterElement) {
          latestChapter = altChapterElement.textContent?.trim() || 'N/A';
          console.log(`Found chapter using alternative selector for ${title}: ${latestChapter}`);
          error = undefined; // Clear error
        } else {
          newMangaInfoList.push({ title, chapter: null, loading: false, error });
          continue;
        }

      } else {
        latestChapter = latestChapterElement.textContent?.trim() || 'N/A';
        console.log(`Found latest chapter for ${title}: ${latestChapter}`);
      }


      newMangaInfoList.push({ title, chapter: latestChapter, loading: false, error: undefined });
      console.log(`Successfully processed: ${title}`);

    } catch (err: any) {
      error = `Failed to process ${title}: ${err.message}`;
      console.error(error, err.stack); // Log stack trace for better debugging
      newMangaInfoList.push({ title, chapter: null, loading: false, error });
    }

    // Add a small delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay

  } // End of loop

  console.log("Processing complete.");
  return newMangaInfoList;
}
