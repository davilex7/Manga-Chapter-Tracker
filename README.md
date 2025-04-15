{# Manga Chapter Tracker

## Description

This is a NextJS application that helps you track the latest chapter of your favorite mangas.
It allows you to add mangas to a list, manually set the chapter you're currently on, and automatically check for the latest available chapter online.

## Features

-   **Add Manga**: Add manga titles to your personal tracking list.
-   **Set Current Chapter**: Manually set the chapter number you're currently reading for each manga.
-   **Update Manga List**: Automatically fetch the latest chapter number for each manga in your list from a designated website.
-   **Delete Manga**: Remove mangas from your tracking list.
-   **Persistent Storage**: Manga list and chapter progress are saved in local storage, so your data persists between sessions.

## Usage

### Adding a Manga

1.  Enter the title of the manga in the "Enter manga title" input field.
2.  Click the "Add Manga" button.
3.  The manga will be added to your list with a default "Your Chapter" set to 1.

### Setting Your Current Chapter

1.  Find the manga in your list.
2.  In the input field labeled "Your Chapter:", enter the chapter number you are currently reading.
3.  The chapter number will be automatically saved.

### Updating the Manga List

1.  Click the "Update Manga List" button.
2.  The application will fetch the latest chapter number for each manga from the website and display it.
    *   If an error occurs, an error message will be displayed.
    *   While updating, a loading indicator will be shown.

### Deleting a Manga

1.  Find the manga you wish to delete in your list.
2.  Click the "Delete" button on the manga's card.
3.  The manga will be removed from your list.

## Modules and Functionalities

### 1. UI Components (`src/components/ui`)

*   Uses Shadcn/UI components for a modern and consistent look and feel.
*   Includes components such as:
    *   Buttons
    *   Cards
    *   Inputs
    *   Skeletons (for loading states)
    *   etc.

### 2. Actions (`src/app/actions.ts`)

*   **`processMangaListAction(mangaTitles: string[])`**: This server action takes an array of manga titles, fetches the latest chapter for each manga from `mangaread.org`, and returns an array of manga information objects.
*   It handles:
    *   Fetching the search results page for each manga.
    *   Parsing the HTML content.
    *   Extracting the manga link from the search results.
    *   Fetching the manga page.
    *   Extracting the latest chapter number.
    *   Error handling for various scenarios (e.g., fetch errors, parsing errors, missing elements).

### 3. Services (`src/services/web-page-fetcher.ts`)

*  **fetchWebPage(url: string)**: Handles fetching the content of a web page, in this case, it just returns the response as text

### 4. Hooks (`src/hooks`)

*   **`use-toast.ts`**: Provides a custom hook for displaying toast notifications (temporary messages) to the user.

### 5. Data Persistence

*   The app uses `localStorage` to persist the manga list and user's current chapter. This ensures that the data is saved between sessions.

### 6. Styling (`src/app/globals.css`)

*   Uses Tailwind CSS for styling.
*   Defines custom CSS variables for colors to maintain a consistent theme.

### 7. Configuration (`tailwind.config.ts`)

*   Configures Tailwind CSS, including dark mode and custom theme extensions.

### 8. Page Component (`src/app/page.tsx`)

*   Manages the UI state, including the manga list, input values, and loading states.
*   Handles user interactions such as adding, updating, and deleting mangas.
*   Calls the `processMangaListAction` server action to update the manga list.

### 9. Ai / Genkit (`src/ai/*`)

*   There are not Genkit Features
