'use server';
import {fetchWebPage} from '@/services/web-page-fetcher';
import fetch from 'node-fetch';

interface MangaInfo {
    title: string;
    chapter: string | null;
    loading: boolean;
}
export async function processMangaListAction(mangaTitles: string[]): Promise<MangaInfo[]> {
    const newMangaInfoList: MangaInfo[] = [];

    for (const title of mangaTitles) {
        let mangaLink: string | undefined;
        try {
            // Fetch the HTML content of the search results page
            const searchResultsPageContent = await fetchWebPage(`https://www.mangaread.org/search?name=${encodeURIComponent(title)}`);
            if (!searchResultsPageContent) {
                console.error(`Failed to fetch search results for ${title}: No content returned`);
                newMangaInfoList.push({ title, chapter: 'Fetch Search Error', loading: false });
                continue;
            }

            // Parse the HTML content to extract the manga link
            const parser = new DOMParser();
            const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');
            if (!searchResultsPage) {
                console.error(`Failed to parse search results for ${title}`);
                newMangaInfoList.push({ title, chapter: 'Parse Search Error', loading: false });
                continue;
            }

            // Find the first manga item in the search results
            const firstMangaItem = searchResultsPage.querySelector('.c-tabs-item');

            if (!firstMangaItem) {
                console.warn(`No search results found for ${title}: Check manga title or web site change`);
                newMangaInfoList.push({ title, chapter: 'Not Found', loading: false });
                continue;
            }

            // Extract the link to the manga's page
            mangaLink = firstMangaItem.querySelector('a')?.href;

            if (!mangaLink) {
                console.warn(`Could not extract manga link for ${title}: check if the web site change`);
                newMangaInfoList.push({ title, chapter: 'Link Not Found', loading: false });
                continue;
            }

            // Fetch the HTML content of the manga's page
            const mangaPageContent = await fetchWebPage(mangaLink);
            if (!mangaPageContent) {
                console.error(`Failed to fetch manga page for ${title} :  ${mangaLink}`);
                newMangaInfoList.push({ title, chapter: 'Fetch Manga Error', loading: false });
                continue;
            }
            const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');

            // Extract the latest chapter from the manga's page
            const latestChapterElement = mangaPage.querySelector('ul.main.version-chap.no-volumn.active li a');
            if (!latestChapterElement) {
                console.warn(`Could not find latest chapter for ${title}`);
                newMangaInfoList.push({ title, chapter: 'Chapter Not Found', loading: false });
                continue;
            }

            const latestChapter = latestChapterElement.textContent?.trim() || 'N/A';
            newMangaInfoList.push({ title, chapter: latestChapter, loading: false });

        } catch (error: any) {
            console.error(`Failed to process ${title}: ${error.message}`);
            newMangaInfoList.push({ title, chapter: 'Error', loading: false });
        }
    }

    return newMangaInfoList;
}
