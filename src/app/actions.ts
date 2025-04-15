'use server';

import fs from 'fs/promises'; // Node.js file system module
import path from 'path'; // Node.js path module
import fetch from 'node-fetch';

// --- Data Structure for Storage (Now includes rating) ---
interface StoredMangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
  rating: number; // Added rating field (0-5)
}

// --- File Path Configuration ---
const dataDir = path.resolve(process.cwd(), 'data');
const dataFilePath = path.join(dataDir, 'manga-data.json');

// --- Helper Functions for File I/O ---

async function ensureDataDirExists() {
  try {
    await fs.access(dataDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Data directory not found at ${dataDir}. Creating...`);
      await fs.mkdir(dataDir, { recursive: true });
    } else {
      console.error(`Error accessing data directory ${dataDir}:`, error);
      throw error;
    }
  }
}

// Reads the manga list from the JSON file
async function readMangaData(): Promise<StoredMangaInfo[]> {
  await ensureDataDirExists();
  try {
    await fs.access(dataFilePath);
    const fileContent = await fs.readFile(dataFilePath, 'utf-8');
    const parsedData = JSON.parse(fileContent) as any[]; // Parse as any[] first for migration

    // Ensure backward compatibility: add rating field if missing
    return parsedData.map(manga => ({
      title: manga.title || 'Untitled', // Basic validation
      latestChapter: manga.latestChapter !== undefined ? manga.latestChapter : null,
      userChapter: manga.userChapter || '1',
      rating: typeof manga.rating === 'number' && manga.rating >= 0 && manga.rating <= 5 ? manga.rating : 0, // Default to 0 if missing/invalid
    }));

  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`Data file not found at ${dataFilePath}. Returning empty list.`);
      return [];
    } else if (error instanceof SyntaxError) {
      console.error(`Error parsing JSON from ${dataFilePath}. Returning empty list.`, error);
      return [];
    } else {
      console.error(`Error reading manga data file ${dataFilePath}:`, error);
      return [];
    }
  }
}

// Writes the manga list to the JSON file
async function writeMangaData(mangaList: StoredMangaInfo[]): Promise<boolean> {
  await ensureDataDirExists();
  try {
    // Ensure all items have the rating field before saving
    const listToWrite = mangaList.map(manga => ({
      title: manga.title,
      latestChapter: manga.latestChapter,
      userChapter: manga.userChapter,
      rating: typeof manga.rating === 'number' ? manga.rating : 0, // Ensure rating is always a number
    }));
    const dataString = JSON.stringify(listToWrite, null, 2);
    await fs.writeFile(dataFilePath, dataString, 'utf-8');
    console.log(`Manga data successfully saved to ${dataFilePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing manga data file ${dataFilePath}:`, error);
    return false;
  }
}

// --- Server Actions ---

export async function loadMangaListAction(): Promise<StoredMangaInfo[]> {
  return await readMangaData();
}

export async function saveMangaListAction(mangaList: StoredMangaInfo[]): Promise<{ success: boolean }> {
  const success = await writeMangaData(mangaList);
  return { success };
}


// --- Web Scraping Logic (Remains the same, only data structure changes) ---
interface MangaScrapeResult {
  title: string;
  latestChapter: string | null;
  error?: string;
}

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
  // ... (Keep the existing fetchLatestChapter implementation - no changes needed here)
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
  const currentMangaList = await readMangaData(); // Reads data including rating
  if (currentMangaList.length === 0) {
    console.log("No manga in the list to update.");
    return { updatedList: [], errors: [] };
  }

  const mangaTitles = currentMangaList.map(m => m.title);
  const parser = new DOMParserImplementation();
  const scrapePromises: Promise<MangaScrapeResult>[] = [];

  for (let i = 0; i < mangaTitles.length; i++) {
    const title = mangaTitles[i];
    const promise = new Promise<MangaScrapeResult>(resolve => {
      setTimeout(async () => {
        const result = await fetchLatestChapter(title, parser);
        resolve(result);
      }, i * 500);
    });
    scrapePromises.push(promise);
  }

  const scrapeResults = await Promise.all(scrapePromises);

  const updateErrors: { title: string, error: string }[] = [];
  const newUpdatedList: StoredMangaInfo[] = currentMangaList.map(storedManga => {
    const result = scrapeResults.find(r => r.title === storedManga.title);
    if (result) {
      if (result.error) {
        updateErrors.push({ title: storedManga.title, error: result.error });
      }
      // Update latestChapter, keep existing userChapter and rating
      return {
        ...storedManga, // Keep existing userChapter and rating
        latestChapter: result.error ? storedManga.latestChapter : result.latestChapter,
      };
    }
    return storedManga;
  });

  // Save the newly updated list (including ratings) back to the file
  await writeMangaData(newUpdatedList);

  console.log("updateLatestChaptersAction finished.");
  return { updatedList: newUpdatedList, errors: updateErrors };
}
