'use server';

import fs from 'fs/promises'; // Node.js file system module
import path from 'path'; // Node.js path module
import fetch from 'node-fetch';

// --- Data Structure for Storage ---
interface StoredMangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
}

// --- File Path Configuration ---
// Assume a 'data' directory in the project root
const dataDir = path.resolve(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'manga-data.json');

// --- Helper Functions for File I/O ---

// Ensures the data directory exists
async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory does not exist, create it
      console.log(`Data directory not found at ${dataDir}. Creating...`);
      await fs.mkdir(dataDir, { recursive: true });
    } else {
      // Other error accessing directory
      console.error(`Error accessing data directory ${dataDir}:`, error);
      throw error; // Re-throw other errors
    }
  }
}

// Reads the manga list from the JSON file
async function readMangaData(): Promise<StoredMangaInfo[]> {
  await ensureDataDirExists(); // Make sure directory exists before reading
  try {
    // Check if file exists before trying to read
    await fs.access(dataFilePath);
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(fileContent) as StoredMangaInfo[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File does not exist, return empty array (first run)
      console.log(`Data file not found at ${dataFilePath}. Returning empty list.`);
      return [];
    } else if (error instanceof SyntaxError) {
      console.error(`Error parsing JSON from ${dataFilePath}. Returning empty list.`, error);
      // Consider backing up the corrupted file here if needed
      return []; // Return empty list if JSON is corrupted
    } else {
      // Other errors (permissions, etc.)
      console.error(`Error reading manga data file ${dataFilePath}:`, error);
      // Depending on the error, you might want to return [] or throw
      return []; // Return empty list on other read errors for simplicity
    }
  }
}

// Writes the manga list to the JSON file
async function writeMangaData(mangaList: StoredMangaInfo[]): Promise<boolean> {
  await ensureDataDirExists(); // Make sure directory exists before writing
  try {
    const dataString = JSON.stringify(mangaList, null, 2); // Pretty print JSON
    await fs.writeFile(dataFilePath, dataString, 'utf-8');
    console.log(`Manga data successfully saved to ${dataFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing manga data file ${dataFilePath}:`, error);
    return false;
  }
}

// --- Server Actions ---

// Action to load the initial list
export async function loadMangaListAction(): Promise<StoredMangaInfo[]> {
  return await readMangaData();
}

// Action to save the entire list (used for add, update user chapter, delete)
export async function saveMangaListAction(mangaList: StoredMangaInfo[]): Promise<{ success: boolean }> {
  const success = await writeMangaData(mangaList);
  return { success };
}


// --- Web Scraping Logic (Adapted from previous correct version) ---
// Interface for the result of the web scraping part
interface MangaScrapeResult {
  title: string;
  latestChapter: string | null;
  error?: string;
}

// Initialize DOMParser (handles server/client environment)
let DOMParserImplementation: typeof DOMParser;
try {
  if (typeof DOMParser === 'undefined') {
    const { JSDOM } = await import('jsdom');
    DOMParserImplementation = new JSDOM('').window.DOMParser;
    console.log('Using JSDOM for parsing.');
  } else {
    DOMParserImplementation = DOMParser;
    console.log('Using native DOMParser.');
  }
} catch (domError: any) {
  console.error(`Failed to initialize DOMParser: ${domError.message}`);
  throw new Error("DOMParser could not be initialized.");
}

async function fetchLatestChapter(title: string, parser: DOMParser): Promise<MangaScrapeResult> {
  let latestChapter: string | null = null;
  let error: string | undefined = undefined;
  let mangaPageUrl: string | null = null;

  console.log(`Scraping for: ${title}`);

  try {
    const searchUrl = `https://www.mangaread.org/?s=${encodeURIComponent(title)}&post_type=wp-manga`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Referer': 'https://www.mangaread.org/'
      }
    });

    if (!searchResponse.ok) throw new Error(`Search fetch failed with status: ${searchResponse.status}`);
    const searchResultsPageContent = await searchResponse.text();
    if (!searchResultsPageContent) throw new Error(`No content returned from search`);

    const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');
    if (!searchResultsPage) throw new Error(`Failed to parse search results`);

    const mangaLinkElement = searchResultsPage.querySelector('.c-tabs-item .tab-summary .post-title h3 a');
    const alternativeLink = searchResultsPage.querySelector('.tab-thumb a');

    if (mangaLinkElement && mangaLinkElement.hasAttribute('href')) {
      mangaPageUrl = mangaLinkElement.getAttribute('href');
    } else if (alternativeLink && alternativeLink.hasAttribute('href')) {
      mangaPageUrl = alternativeLink.getAttribute('href');
      console.log(`Used alternative selector for manga link: ${title}`);
    } else {
      throw new Error(`Could not find manga page link in search results`);
    }

    if (!mangaPageUrl) throw new Error(`Failed to extract manga page URL`);

    const mangaPageResponse = await fetch(mangaPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
        'Referer': searchUrl
      }
    });

    if (!mangaPageResponse.ok) throw new Error(`Manga page fetch failed with status: ${mangaPageResponse.status}`);
    const mangaPageContent = await mangaPageResponse.text();
    if (!mangaPageContent) throw new Error(`No content returned from manga page`);

    const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');
    if (!mangaPage) throw new Error(`Failed to parse manga page`);

    const latestChapterElement = mangaPage.querySelector('ul.main.version-chap li.wp-manga-chapter a');
    const altChapterElement = mangaPage.querySelector('.listing-chapters_wrap .wp-manga-chapter a');

    if (latestChapterElement) {
      latestChapter = latestChapterElement.textContent?.trim() || 'N/A';
    } else if (altChapterElement) {
      latestChapter = altChapterElement.textContent?.trim() || 'N/A';
      console.log(`Used alternative selector for chapter: ${title}`);
    } else {
      throw new Error(`Could not find latest chapter element on manga page`);
    }

    console.log(`Successfully scraped: ${title} - Chapter: ${latestChapter}`);
    return { title, latestChapter, error: undefined };

  } catch (err: any) {
    error = `Failed to process ${title}: ${err.message}`;
    console.error(error, err.stack);
    return { title, latestChapter: null, error };
  }
}

// Action to update latest chapters for all stored manga
export async function updateLatestChaptersAction(): Promise<{ updatedList: StoredMangaInfo[], errors: { title: string, error: string }[] }> {
  console.log("Starting updateLatestChaptersAction...");
  const currentMangaList = await readMangaData();
  if (currentMangaList.length === 0) {
    console.log("No manga in the list to update.");
    return { updatedList: [], errors: [] };
  }

  const mangaTitles = currentMangaList.map(m => m.title);
  const parser = new DOMParserImplementation();
  const scrapePromises: Promise<MangaScrapeResult>[] = [];

  // Create scrape promises with delay
  for (let i = 0; i < mangaTitles.length; i++) {
    const title = mangaTitles[i];
    const promise = new Promise<MangaScrapeResult>(resolve => {
      // Introduce delay before starting each fetchLatestChapter call
      setTimeout(async () => {
        const result = await fetchLatestChapter(title, parser);
        resolve(result);
      }, i * 500); // Stagger requests by 500ms
    });
    scrapePromises.push(promise);
  }


  // Wait for all scraping operations to complete
  const scrapeResults = await Promise.all(scrapePromises);

  const updateErrors: { title: string, error: string }[] = [];
  const newUpdatedList: StoredMangaInfo[] = currentMangaList.map(storedManga => {
    const result = scrapeResults.find(r => r.title === storedManga.title);
    if (result) {
      if (result.error) {
        updateErrors.push({ title: storedManga.title, error: result.error });
      }
      // Update latestChapter only if scraping was successful (even if chapter is null/N/A)
      // Keep the existing userChapter
      return {
        ...storedManga, // Keep existing userChapter
        latestChapter: result.error ? storedManga.latestChapter : result.latestChapter, // Keep old chapter on error
      };
    }
    // Should not happen if scrapeResults contains all titles, but as fallback:
    return storedManga;
  });

  // Save the newly updated list back to the file
  await writeMangaData(newUpdatedList);

  console.log("updateLatestChaptersAction finished.");
  return { updatedList: newUpdatedList, errors: updateErrors };
}
