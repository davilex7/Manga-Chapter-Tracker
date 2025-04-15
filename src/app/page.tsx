'use client';

import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {useToast} from '@/hooks/use-toast';
import {processMangaListAction} from '@/app/actions';
import { Trash } from "lucide-react";

interface MangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
  loading: boolean;
  error?: string;
}

export default function Home() {
  const [mangaList, setMangaList] = useState<MangaInfo[]>([]);
  const [newMangaTitle, setNewMangaTitle] = useState<string>('');
  const {toast} = useToast();

  useEffect(() => {
    // Load manga list from local storage on initial render
    const storedMangaList = localStorage.getItem('mangaList');
    if (storedMangaList) {
      setMangaList(JSON.parse(storedMangaList));
    }
  }, []);

  useEffect(() => {
    // Save manga list to local storage whenever it changes
    localStorage.setItem('mangaList', JSON.stringify(mangaList));
  }, [mangaList]);

  const addManga = () => {
    if (newMangaTitle.trim() !== '') {
      setMangaList([...mangaList, {
        title: newMangaTitle,
        latestChapter: null,
        userChapter: '1',
        loading: false,
        error: undefined,
      }]);
      setNewMangaTitle('');
    }
  };

  const updateChapter = (index: number, newChapter: string) => {
    const updatedList = [...mangaList];
    updatedList[index].userChapter = newChapter;
    setMangaList(updatedList);
  };

  const updateMangaList = async () => {
    // Get just the titles for processing
    const mangaTitles = mangaList.map(manga => manga.title);
    // Set loading to true for all manga
    const updatedList = mangaList.map(manga => ({ ...manga, loading: true, latestChapter: null, error: undefined }));
    setMangaList(updatedList);

    const results = await processMangaListAction(mangaTitles);

    // Merge the results
    const mergedList = mangaList.map(manga => {
      const result = results.find(r => r.title === manga.title);
      return {
        ...manga,
        latestChapter: result?.latestChapter || null,
        loading: false,
        error: result?.error
      }
    });
    setMangaList(mergedList);

  };
  const deleteManga = (index: number) => {
    const updatedList = [...mangaList];
    updatedList.splice(index, 1);
    setMangaList(updatedList);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Manga Chapter Tracker</h1>

      <div className="mb-4 flex space-x-2">
        <Input
          type="text"
          placeholder="Enter manga title"
          value={newMangaTitle}
          onChange={(e) => setNewMangaTitle(e.target.value)}
        />
        <Button onClick={addManga}>Add Manga</Button>
      </div>

      <Button onClick={updateMangaList}>
        Update Manga List
      </Button>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mangaList.map((manga, index) => (
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
                    <span className="text-accent">{manga.latestChapter || 'N/A'}</span>
                    <br/>
                    <Label htmlFor={`user-chapter-${index}`}>Your Chapter:</Label>
                    <Input
                      type="number"
                      id={`user-chapter-${index}`}
                      value={manga.userChapter}
                      onChange={(e) => updateChapter(index, e.target.value)}
                    />
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent></CardContent>
             <Button variant="destructive" size="sm" onClick={() => deleteManga(index)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </Button>
          </Card>
        ))}
      </div>

    </div>
  );
}
