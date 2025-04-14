'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useToast} from '@/hooks/use-toast';

interface MangaInfo {
  title: string;
  chapter: string | null;
  loading: boolean;
  error?: string;
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
    } catch (error: any) {
      console.error('Error reading file:', error.message);
      toast({
        title: 'Error reading file',
        description: 'Failed to read the contents of the file.',
        variant: 'destructive',
      });
    }
  };

  const processMangaList = async () => {
    try {
      const mangaTitles = mangaListText.split('\n').map(line => line.trim()).filter(Boolean);

      // Initialize manga info list with loading state
      setMangaInfoList(mangaTitles.map(title => ({title, chapter: null, loading: true})));

      // Simulate processing each manga title
      const updatedMangaInfoList = mangaTitles.map(title => {
        try {
          // Simulate fetching chapter (replace with actual logic if needed)
          const latestChapter = Math.floor(Math.random() * 100).toString(); // Example: random chapter number

          return {title, chapter: latestChapter, loading: false};
        } catch (error: any) {
          console.error(`Error processing manga "${title}":`, error.message);
          return {title, chapter: null, loading: false, error: error.message};
        }
      });

      setMangaInfoList(updatedMangaInfoList);
    } catch (error: any) {
      console.error('Error processing manga list:', error.message);
      toast({
        title: 'Error processing manga list',
        description: 'Failed to process the manga list.',
        variant: 'destructive',
      });
      // Reset manga info list to indicate a general error
      setMangaInfoList([]);
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

    const outputText = mangaInfoList.map(item => `${item.title}: ${item.chapter || 'N/A'}`).join('\n');
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
                ) : manga.error ? (
                  <span className="text-destructive">Error: {manga.error}</span>
                ) : (
                  <>
                    Latest Chapter:{' '}
                    {manga.chapter !== null ? (
                      <span className="text-accent">{manga.chapter}</span>
                    ) : (
                      <span>N/A</span>
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
