'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useToast} from '@/hooks/use-toast';
import {fetchWebPage} from '@/services/web-page-fetcher';
import fetch from 'node-fetch';

interface MangaInfo {
  title: string;
  chapter: string | null;
  loading: boolean;
}

export default function Home() {
  const [mangaListText, setMangaListText] = useState<string>('');
  const [mangaInfoList, setMangaInfoList] = useState<MangaInfo[]>([]);
  const {toast} = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setMangaListText(text);
    } catch (error) {
      toast({
        title: 'Error reading file',
        description: 'Failed to read the contents of the file.',
        variant: 'destructive',
      });
    }
  };

  const processMangaList = async () => {
    const mangaTitles = mangaListText.split('\n').map(line => line.trim()).filter(Boolean);

    setMangaInfoList(mangaTitles.map(title => ({title, chapter: null, loading: true})));

    const newMangaInfoList: MangaInfo[] = [];

    for (const title of mangaTitles) {
      let mangaLink: string | undefined;
      try {
        // Fetch the HTML content of the search results page
        const searchResultsPageContent = await fetchWebPage(`https://www.mangaread.org/search?name=${encodeURIComponent(title)}`);
        if(!searchResultsPageContent){
          console.error(`Failed to fetch search results for ${title}: No content returned`);
          newMangaInfoList.push({title, chapter: 'Fetch Search Error', loading: false});
          continue;
        }

        // Parse the HTML content to extract the manga link
        const parser = new DOMParser();
        const searchResultsPage = parser.parseFromString(searchResultsPageContent, 'text/html');
        if(!searchResultsPage){
          console.error(`Failed to parse search results for ${title}`);
          newMangaInfoList.push({title, chapter: 'Parse Search Error', loading: false});
          continue;
        }

        // Find the first manga item in the search results
        const firstMangaItem = searchResultsPage.querySelector('.c-tabs-item');

        if (!firstMangaItem) {
          console.warn(`No search results found for ${title}: Check manga title or web site change`);
          newMangaInfoList.push({title, chapter: 'Not Found', loading: false});
          continue;
        }

        // Extract the link to the manga's page
        mangaLink = firstMangaItem.querySelector('a')?.href;

        if (!mangaLink) {
          console.warn(`Could not extract manga link for ${title}: check if the web site change`);
          newMangaInfoList.push({title, chapter: 'Link Not Found', loading: false});
          continue;
        }

        // Fetch the HTML content of the manga's page
        const mangaPageContent = await fetchWebPage(mangaLink);
        if(!mangaPageContent){
          console.error(`Failed to fetch manga page for ${title} :  ${mangaLink}`);
          newMangaInfoList.push({title, chapter: 'Fetch Manga Error', loading: false});
          continue;
        }
        const mangaPage = parser.parseFromString(mangaPageContent, 'text/html');

        // Extract the latest chapter from the manga's page
        const latestChapterElement = mangaPage.querySelector('ul.main.version-chap.no-volumn.active li a');
        if (!latestChapterElement) {
          console.warn(`Could not find latest chapter for ${title}`);
          newMangaInfoList.push({title, chapter: 'Chapter Not Found', loading: false});
          continue;
        }

        const latestChapter = latestChapterElement.textContent?.trim() || 'N/A';
        newMangaInfoList.push({title, chapter: latestChapter, loading: false});

      } catch (error: any) {
        
        console.error(`Failed to process ${title}: ${error.message}`);
        toast({
          title: 'Error processing manga',
          description: `Failed to process ${title}.`,
          variant: 'destructive',
        });
        newMangaInfoList.push({title, chapter: 'Error', loading: false});
      } finally {
        setMangaInfoList(prev => {
          return prev.map(item => {
            if (item.title === title) {
              const found = newMangaInfoList.find(newItem => newItem.title === title);
              return found ? found : {...item, loading: false};
            }
            return item;
          });
        });
      }
    }
  };

  const handleSaveOutput = () => {
    if (mangaInfoList.length === 0) {
      toast({
        title: 'No data to save',
        description: 'Please process the manga list first.',
      });
      return;
    }

    const outputText = mangaInfoList.map(item => `${item.title}: ${item.chapter}`).join('\n');
    const blob = new Blob([outputText], {type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manga_chapters.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'File saved',
      description: 'Manga chapters saved to manga_chapters.txt',
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manga Chapter Tracker</h1>

      <div className="mb-4">
        <input type="file" id="file-upload" className="sr-only" onChange={handleFileChange}/>
        <label htmlFor="file-upload">
          <Button asChild>
            <span className="mr-2">Upload Manga List</span>
          </Button>
        </label>
      </div>

      <div className="mb-4">
        <Textarea
          placeholder="Enter manga list (one manga per line)"
          value={mangaListText}
          onChange={(e) => setMangaListText(e.target.value)}
        />
      </div>

      <Button onClick={processMangaList} disabled={!mangaListText}>
        Process Manga List
      </Button>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mangaInfoList.map((manga, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle>{manga.title}</CardTitle>
              <CardDescription>
                {manga.loading ? (
                  <Skeleton>Loading...</Skeleton>
                ) : (
                  <>
                    Latest Chapter:{' '}
                    {manga.chapter === 'Error' ? (
                      <span className="text-destructive">Error</span>
                    ) : (
                      <span className="text-accent">{manga.chapter || 'N/A'}</span>
                    )}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent></CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <Button onClick={handleSaveOutput} disabled={mangaInfoList.length === 0}>
          Save Output to File
        </Button>
      </div>
    </div>
  );
}
