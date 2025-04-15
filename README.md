# Manga Chapter Tracker

## Overview

Manga Chapter Tracker is a NextJS application that helps you track the latest chapter of your favorite manga series. The app allows you to maintain a personal list of manga titles, record which chapter you're currently reading, and automatically check for the latest available chapters online.

## Features

- **Add Manga**: Add manga titles to your personal tracking list
- **Track Progress**: Set and update the chapter number you're currently reading
- **Auto-Update**: Fetch the latest available chapter for each manga from [MangaRead.org](https://www.mangaread.org/)
- **Manage Collection**: Easily delete manga titles from your list when needed
- **Persistent Storage**: Your manga list and reading progress are saved between sessions

## Technical Stack

- **Framework**: Next.js with React
- **Styling**: Tailwind CSS with ShadCN UI components
- **Data Storage**: Server-side file storage for persistence
- **Web Scraping**: JSDOM for parsing manga website content

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/manga-chapter-tracker.git
   cd manga-chapter-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

### Adding Manga

1. Enter the manga title in the input field at the top of the page
2. Click "Add Manga" or press Enter
3. The manga will be added to your list with a default "Your Chapter" set to 1

### Tracking Your Progress

1. Update the "Your Chapter" input field to the chapter you're currently reading
2. Changes are automatically saved

### Updating Latest Chapters

1. Click the "Update Latest Chapters" button
2. The app will check MangaRead.org for each manga's latest available chapter
3. Latest chapters will be displayed next to your current reading progress

### Removing Manga

- Click the trash icon on any manga card to remove it from your list

## Project Structure

- `src/app/page.tsx` - Main UI component and application logic
- `src/app/actions.ts` - Server actions for data persistence and web scraping
- `src/components/ui` - UI components from ShadCN UI
- `src/hooks` - Custom React hooks for toast notifications and mobile detection

## License

[MIT](LICENSE)
