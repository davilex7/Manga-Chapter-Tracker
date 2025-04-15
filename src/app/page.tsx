'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Trash } from "lucide-react";
import {
  loadMangaListAction,
  saveMangaListAction,
  updateLatestChaptersAction
} from '@/app/actions'; // Import all actions

// Interface for the state managed in the frontend
interface MangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
  // Transient states for UI feedback
  loadingUpdate?: boolean; // For individual manga loading state if needed (optional)
  errorUpdate?: string;    // For individual manga error state if needed (optional)
}

// Interface matching the data structure stored in the file/actions
interface StoredMangaInfo {
  title: string;
  latestChapter: string | null;
  userChapter: string;
}

export default function Home() {
  const [mangaList, setMangaList] = useState<MangaInfo[]>([]);
  const [newMangaTitle, setNewMangaTitle] = useState<string>('');
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true); // Loading state for initial load
  const [isUpdatingAll, setIsUpdatingAll] = useState<boolean>(false); // Loading state for updating all chapters
  const { toast } = useToast();

  // --- Data Loading ---
  const loadMangaList = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const storedList = await loadMangaListAction();
      // Map StoredMangaInfo to MangaInfo for frontend state
      setMangaList(storedList.map(m => ({ ...m, loadingUpdate: false, errorUpdate: undefined })));
    } catch (error: any) {
      toast({
        title: 'Error loading manga list',
        description: `Failed to load data from server: ${error.message}`,
        variant: 'destructive',
      });
      setMangaList([]); // Set to empty list on error
    } finally {
      setIsLoadingList(false);
    }
  }, [toast]); // Include toast in dependencies

  useEffect(() => {
    // Load manga list from server file on initial render
    loadMangaList();
  }, [loadMangaList]); // Run only once on mount

  // --- Data Saving Utility ---
  // Debounced save function to avoid saving too frequently on rapid changes
  const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): Promise<ReturnType<F>> =>
        new Promise((resolve) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(() => {
            timeoutId = null; // Clear timeoutId after execution
            resolve(func(...args));
          }, waitFor);
        });
  };


  // Saves the current state to the server file
  const saveMangaListToServer = useCallback(async (listToSave: MangaInfo[]) => {
    // Prepare data for saving (remove transient UI states)
    const storedList: StoredMangaInfo[] = listToSave.map(({ title, latestChapter, userChapter }) => ({
      title,
      latestChapter,
      userChapter,
    }));
    console.log("Calling saveMangaListAction with:", storedList);
    const result = await saveMangaListAction(storedList);
    if (!result.success) {
      toast({
        title: 'Error Saving List',
        description: 'Failed to save the manga list to the server.',
        variant: 'destructive',
      });
      // Optionally: Add logic to retry or revert optimistic update
    } else {
      console.log("List saved successfully.");
      toast({ // Optional success toast
        title: 'List Saved',
        description: 'Your manga list has been saved.',
      });
    }
  }, [toast]);

  // Debounced version of the save function
  const debouncedSave = useCallback(debounce(saveMangaListToServer, 1000), [saveMangaListToServer]);


  // --- CRUD Operations ---

  const addManga = () => {
    const trimmedTitle = newMangaTitle.trim();
    if (trimmedTitle === '') {
      toast({ title: "Error", description: "Manga title cannot be empty.", variant: "destructive" });
      return;
    }
    // Check if manga already exists (case-insensitive)
    if (mangaList.some(manga => manga.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      toast({ title: "Error", description: `Manga "${trimmedTitle}" already exists in the list.`, variant: "destructive" });
      return;
    }


    const newManga: MangaInfo = {
      title: trimmedTitle,
      latestChapter: null, // Will be fetched on update
      userChapter: '1',    // Default user chapter
      loadingUpdate: false,
      errorUpdate: undefined,
    };

    // Optimistic update of local state
    const updatedList = [...mangaList, newManga];
    setMangaList(updatedList);
    setNewMangaTitle(''); // Clear input field

    // Save the updated list to the server (debounced)
    debouncedSave(updatedList);
  };

  const updateChapter = (index: number, newUserChapter: string) => {
    // Basic validation for chapter number
    const chapterNum = parseInt(newUserChapter, 10);
    if (isNaN(chapterNum) && newUserChapter !== '') { // Allow empty string temporarily during typing
      toast({ title: "Invalid Chapter", description: "Please enter a valid number for the chapter.", variant: "warning" });
      return; // Or handle differently, e.g., allow typing but don't save invalid state
    }
    // Prevent negative numbers or zero if desired
    if (chapterNum <= 0 && newUserChapter !== '') {
      toast({ title: "Invalid Chapter", description: "Chapter number must be positive.", variant: "warning" });
      // Optionally reset to previous value or '1'
      return;
    }


    // Optimistic update
    const updatedList = mangaList.map((manga, i) =>
        i === index ? { ...manga, userChapter: newUserChapter } : manga
    );
    setMangaList(updatedList);

    // Save the updated list (debounced)
    debouncedSave(updatedList);
  };

  const deleteManga = (index: number) => {
    // Optimistic update
    const mangaToDelete = mangaList[index]; // Get title for confirmation toast
    const updatedList = mangaList.filter((_, i) => i !== index);
    setMangaList(updatedList);

    toast({
      title: 'Manga Deleted',
      description: `"${mangaToDelete.title}" has been removed from your list.`,
    });


    // Save the updated list (debounced)
    debouncedSave(updatedList);
  };

  // --- Update Latest Chapters ---
  const handleUpdateLatestChapters = async () => {
    if (mangaList.length === 0) {
      toast({ title: "Info", description: "No manga in the list to update." });
      return;
    }
    setIsUpdatingAll(true);
    setMangaList(prevList => prevList.map(m => ({ ...m, loadingUpdate: true, errorUpdate: undefined }))); // Indicate loading visually

    try {
      const { updatedList: serverUpdatedList, errors } = await updateLatestChaptersAction();

      // Update local state with the results from the server
      setMangaList(serverUpdatedList.map(m => ({ ...m, loadingUpdate: false, errorUpdate: undefined }))); // Reset loading/error

      if (errors.length > 0) {
        toast({
          title: `Update partially failed (${errors.length} manga)`,
          description: `Could not fetch latest chapters for: ${errors.map(e => e.title).join(', ')}. Check console for details.`,
          variant: 'warning', // Use warning variant
        });
        // Optionally mark specific manga with errors in the UI
        setMangaList(prevList => prevList.map(manga => {
          const errorInfo = errors.find(e => e.title === manga.title);
          return errorInfo ? { ...manga, errorUpdate: errorInfo.error } : manga;
        }));

      } else {
        toast({
          title: 'Update Complete',
          description: 'Latest chapters fetched successfully for all manga.',
        });
      }

    } catch (error: any) {
      toast({
        title: 'Error Updating Chapters',
        description: `An unexpected error occurred: ${error.message}`,
        variant: 'destructive',
      });
      // Reset loading state on general error
      setMangaList(prevList => prevList.map(m => ({ ...m, loadingUpdate: false })));
    } finally {
      setIsUpdatingAll(false);
    }
  };


  // --- Render Logic ---
  if (isLoadingList) {
    return (
        <div className="container mx-auto p-4 text-center">
          <p>Loading manga list...</p>
          {/* Optional: Add a spinner */}
        </div>
    );
  }


  return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Manga Chapter Tracker</h1>

        {/* Input for adding new manga */}
        <div className="mb-4 flex space-x-2">
          <Input
              type="text"
              placeholder="Enter manga title"
              value={newMangaTitle}
              onChange={(e) => setNewMangaTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addManga(); }} // Add manga on Enter key
          />
          <Button onClick={addManga} disabled={newMangaTitle.trim() === ''}>Add Manga</Button>
        </div>

        {/* Button to update all latest chapters */}
        <Button onClick={handleUpdateLatestChapters} disabled={isUpdatingAll || mangaList.length === 0}>
          {isUpdatingAll ? 'Updating...' : 'Update Latest Chapters'}
        </Button>

        {/* Display Manga List */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mangaList.length === 0 && !isLoadingList && (
              <p className="col-span-full text-center text-muted-foreground">Your manga list is empty. Add some manga to get started!</p>
          )}
          {mangaList.map((manga, index) => (
              <Card key={manga.title} className={`relative ${manga.loadingUpdate ? 'opacity-70' : ''}`}> {/* Use title as key if unique */}
                {manga.loadingUpdate && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 rounded-lg">
                      {/* Simple spinner or skeleton */}
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                )}
                <CardHeader>
                  <CardTitle>{manga.title}</CardTitle>
                  <CardDescription>
                    {manga.errorUpdate ? (
                        <span className="text-destructive font-semibold">Error updating: {manga.errorUpdate}</span>
                    ) : (
                        <>
                          Latest Chapter:{' '}
                          <span className="text-accent font-semibold">{manga.latestChapter || 'N/A'}</span>
                        </>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label htmlFor={`user-chapter-${index}`} className="text-sm font-medium">Your Chapter:</Label>
                    <Input
                        type="number" // Use number type for better mobile input
                        min="1" // Set minimum chapter number
                        id={`user-chapter-${index}`}
                        value={manga.userChapter}
                        onChange={(e) => updateChapter(index, e.target.value)}
                        className="mt-1"
                        placeholder="e.g., 1"
                    />
                  </div>
                  <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 text-destructive hover:bg-destructive/10" // Position delete button
                      onClick={() => deleteManga(index)}
                      aria-label={`Delete ${manga.title}`} // Accessibility
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
