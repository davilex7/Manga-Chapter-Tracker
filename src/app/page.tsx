'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash, Star, Search, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select" // Import Select component
// Import the newly created StarRating component
import { StarRating } from '@/components/ui/star-rating';
import {
  loadMangaListAction,
  saveMangaListAction,
  updateLatestChaptersAction
} from '@/app/actions';

// --- Interfaces ---
interface MangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
  rating: number; // Added rating
  // Transient states for UI feedback
  loadingUpdate?: boolean;
  errorUpdate?: string;
}

interface StoredMangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
  rating: number; // Added rating
}

// --- Sorting Types ---
type SortKey = 'default' | 'title' | 'rating';
type SortOrder = 'asc' | 'desc';
interface SortOption {
  value: string; // e.g., "title-asc"
  label: string; // e.g., "Título (A-Z)"
}

// --- Star Rating Component (Removed from here) ---


// --- Main Component ---
export default function Home() {
  const [mangaList, setMangaList] = useState<MangaInfo[]>([]);
  const [newMangaTitle, setNewMangaTitle] = useState<string>('');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isUpdatingAll, setIsUpdatingAll] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>(''); // State for search term
  const [sortCriteria, setSortCriteria] = useState<string>('default'); // State for sorting e.g., "title-asc"
  const { toast } = useToast();

  // --- Sorting Options ---
  const sortOptions: SortOption[] = [
    { value: 'default', label: 'Por defecto' },
    { value: 'title-asc', label: 'Título (A-Z)' },
    { value: 'title-desc', label: 'Título (Z-A)' },
    { value: 'rating-desc', label: 'Puntuación (Mayor a Menor)' },
    { value: 'rating-asc', label: 'Puntuación (Menor a Mayor)' },
  ];


  // --- Data Loading ---
  const loadMangaList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const storedList = await loadMangaListAction();
      setMangaList(storedList.map(m => ({ ...m, loadingUpdate: false, errorUpdate: undefined })));
    } catch (error: any) {
      toast({
        title: 'Error loading manga list',
        description: `Failed to load data from server: ${error.message}`,
        variant: 'destructive',
      });
      setMangaList([]);
    } finally {
      setIsLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMangaList();
  }, [loadMangaList]);

  // --- Data Saving Utility (Debounced) ---
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            timeoutId = null;
            resolve(func(...args));
          }, waitFor);
        });
  };

  const saveMangaListToServer = useCallback(async (listToSave: MangaInfo[]) => {
    const storedList: StoredMangaInfo[] = listToSave.map(({ title, latestChapter, userChapter, rating }) => ({
      title,
      latestChapter,
      userChapter,
      rating: rating ?? 0, // Ensure rating is saved, default to 0 if somehow undefined
    }));
    console.log("Calling saveMangaListAction with:", storedList);
    const result = await saveMangaListAction(storedList);
    if (!result.success) {
      toast({
        title: 'Error Saving List',
        description: 'Failed to save the manga list to the server.',
        variant: 'destructive',
      });
    } else {
      console.log("List saved successfully.");
      // Optional: Remove success toast for less noise on frequent saves
      // toast({ title: 'List Saved', description: 'Your manga list has been saved.' });
    }
  }, [toast]);

  const debouncedSave = useCallback(debounce(saveMangaListToServer, 1200), [saveMangaListToServer]); // Increased debounce time slightly

  // --- CRUD Operations ---
  const addManga = () => {
    const trimmedTitle = newMangaTitle.trim();
    if (trimmedTitle === '') {
      toast({ title: "Error", description: "Manga title cannot be empty.", variant: "destructive" });
      return;
    }
    if (mangaList.some(manga => manga.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      toast({ title: "Error", description: `Manga "${trimmedTitle}" already exists.`, variant: "destructive" });
      return;
    }

    const newManga: MangaInfo = {
      title: trimmedTitle,
      latestChapter: null,
      userChapter: '1',
      rating: 0, // Default rating
      loadingUpdate: false,
      errorUpdate: undefined,
    };

    const updatedList = [...mangaList, newManga];
    setMangaList(updatedList);
    setNewMangaTitle('');
    debouncedSave(updatedList);
  };

  const updateChapter = (index: number, newUserChapter: string) => {
    const chapterNum = parseInt(newUserChapter, 10);
    if (isNaN(chapterNum) && newUserChapter !== '') return;
    if (chapterNum <= 0 && newUserChapter !== '') return;

    const updatedList = mangaList.map((manga, i) =>
        i === index ? { ...manga, userChapter: newUserChapter || '1' } : manga // Default to '1' if empty
    );
    setMangaList(updatedList);
    debouncedSave(updatedList);
  };

  // --- Update Rating ---
  const updateRating = (index: number, newRating: number) => {
    const updatedList = mangaList.map((manga, i) =>
        i === index ? { ...manga, rating: newRating } : manga
    );
    setMangaList(updatedList);
    debouncedSave(updatedList); // Save after rating change
  };


  const deleteManga = (titleToDelete: string) => { // Find by title for safety after filtering/sorting
    const updatedList = mangaList.filter((manga) => manga.title !== titleToDelete);
    setMangaList(updatedList);
    toast({
      title: 'Manga Deleted',
      description: `"${titleToDelete}" has been removed.`,
    });
    debouncedSave(updatedList);
  };

  // --- Update Latest Chapters ---
  const handleUpdateLatestChapters = async () => {
    if (mangaList.length === 0) {
      toast({ title: "Info", description: "No manga in the list to update." });
      return;
    }
    setIsUpdatingAll(true);
    setMangaList(prevList => prevList.map(m => ({ ...m, loadingUpdate: true, errorUpdate: undefined })));

    try {
      const { updatedList: serverUpdatedList, errors } = await updateLatestChaptersAction();
      setMangaList(serverUpdatedList.map(m => ({ ...m, loadingUpdate: false, errorUpdate: undefined })));

      if (errors.length > 0) {
        toast({
          title: `Update partially failed (${errors.length} manga)`,
          description: `Errors for: ${errors.map(e => e.title).join(', ')}.`,
          variant: 'warning',
        });
        setMangaList(prevList => prevList.map(manga => {
          const errorInfo = errors.find(e => e.title === manga.title);
          return errorInfo ? { ...manga, errorUpdate: errorInfo.error } : manga;
        }));
      } else {
        toast({
          title: 'Update Complete',
          description: 'Latest chapters fetched successfully.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error Updating Chapters',
        description: `An unexpected error occurred: ${error.message}`,
        variant: 'destructive',
      });
      setMangaList(prevList => prevList.map(m => ({ ...m, loadingUpdate: false })));
    } finally {
      setIsUpdatingAll(false);
    }
  };

  // --- Filtering and Sorting Logic ---
  const filteredAndSortedMangaList = useMemo(() => {
    let filteredList = mangaList;

    // Filtering
    if (searchTerm.trim() !== '') {
      filteredList = mangaList.filter(manga =>
          manga.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sorting
    const [key, order] = sortCriteria.split('-') as [SortKey | 'default', SortOrder | undefined];

    if (key === 'default' || !order) {
      // When default, sort by title ascending as a sensible default
      return [...filteredList].sort((a, b) => a.title.localeCompare(b.title));
      // return filteredList; // Or return in insertion order if preferred
    }


    return [...filteredList].sort((a, b) => { // Create a copy before sorting
      let comparison = 0;
      if (key === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (key === 'rating') {
        comparison = (a.rating ?? 0) - (b.rating ?? 0); // Treat null/undefined rating as 0
      }

      return order === 'asc' ? comparison : -comparison;
    });
  }, [mangaList, searchTerm, sortCriteria]);


  // --- Render Logic ---
  if (isLoadingList) {
    return <div className="container mx-auto p-4 text-center"><p>Loading manga list...</p></div>;
  }

  return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6 text-center">Manga Tracker</h1>

        {/* --- Controls Row --- */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center">
          {/* Add Manga */}
          <div className="flex w-full sm:w-auto flex-grow">
            <Input
                type="text"
                placeholder="Añadir nuevo manga..."
                value={newMangaTitle}
                onChange={(e) => setNewMangaTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addManga(); }}
                className="rounded-r-none"
            />
            <Button onClick={addManga} disabled={newMangaTitle.trim() === ''} className="rounded-l-none">Añadir</Button>
          </div>

          {/* Search Manga */}
          <div className="relative w-full sm:w-auto sm:flex-grow-[0.5]">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                type="text"
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8" // Padding left for the icon
            />
          </div>

          {/* Sort Manga */}
          <div className="w-full sm:w-auto">
            <Select value={sortCriteria} onValueChange={setSortCriteria}>
              <SelectTrigger className="w-full sm:w-[240px]">
                <ArrowUpDown className="inline-block h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por..." />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Update Button */}
          <Button onClick={handleUpdateLatestChapters} disabled={isUpdatingAll || mangaList.length === 0} className="w-full sm:w-auto">
            {isUpdatingAll ? 'Actualizando...' : 'Actualizar Capítulos'}
          </Button>
        </div>


        {/* --- Display Manga List --- */}
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"> {/* Added xl breakpoint */}
          {filteredAndSortedMangaList.length === 0 && !isLoadingList && (
              <p className="col-span-full text-center text-muted-foreground py-10">
                {searchTerm ? `No se encontraron mangas para "${searchTerm}".` : 'Tu lista está vacía. ¡Añade algún manga!'}
              </p>
          )}
          {/* Use filteredAndSortedMangaList for rendering */}
          {filteredAndSortedMangaList.map((manga) => ( // Removed index from map if not needed
              <Card key={manga.title} className={`relative overflow-hidden transition-opacity duration-300 ${manga.loadingUpdate ? 'opacity-60' : ''}`}>
                {manga.loadingUpdate && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10 rounded-lg">
                      <Skeleton className="h-8 w-8 rounded-full animate-spin" /> {/* Spinner */}
                    </div>
                )}
                <CardHeader className="pb-2">
                  {/* Use manga.title as the key for stability if titles are unique */}
                  <CardTitle className="text-lg truncate">{manga.title}</CardTitle>
                  <CardDescription>
                    {manga.errorUpdate ? (
                        <span className="text-red-600 font-semibold">Error: {manga.errorUpdate}</span>
                    ) : (
                        <>
                          Último Cap: <span className="font-semibold text-primary">{manga.latestChapter || 'N/A'}</span>
                        </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {/* Rating */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Puntuación:</Label>
                    <StarRating // Use the imported component
                        rating={manga.rating}
                        onRatingChange={(newRating) => {
                          // Find index in the original list based on title
                          const originalIndex = mangaList.findIndex(m => m.title === manga.title);
                          if (originalIndex !== -1) {
                            updateRating(originalIndex, newRating);
                          }
                        }}
                    />
                  </div>
                  {/* User Chapter Input */}
                  <div>
                    <Label htmlFor={`user-chapter-${manga.title}`} className="text-sm font-medium">Tu Capítulo:</Label>
                    <Input
                        type="number"
                        min="0" // Allow 0 if needed, or 1
                        id={`user-chapter-${manga.title}`}
                        value={manga.userChapter}
                        onChange={(e) => {
                          const originalIndex = mangaList.findIndex(m => m.title === manga.title);
                          if (originalIndex !== -1) {
                            updateChapter(originalIndex, e.target.value);
                          }
                        }}
                        className="mt-1 h-9" // Slightly smaller input
                        placeholder="e.g., 1"
                    />
                  </div>
                  {/* Delete Button */}
                  <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteManga(manga.title)} // Use title to delete
                      aria-label={`Delete ${manga.title}`}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
          ))}
        </div>

      </div>
  );
}
