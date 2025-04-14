'use server';

import {Headers} from 'node-fetch';
const fetch = require('node-fetch');

/**
 * Asynchronously fetches the HTML content of a web page, simulating browser behavior.
 *
 * @param url The URL of the web page to fetch.
 * @returns A promise that resolves to the HTML content of the page as a string.
 */
export async function fetchWebPage(url: string): Promise<string> {
  try {
    const headers = new Headers({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
      redirect: 'follow', // Follow redirects
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      throw new Error(`Expected HTML but received: ${contentType}`);
    }

    return await response.text();
  } catch (error: any) {
    console.error(`Failed to fetch ${url}: ${error.message}`);
    throw error;
  }
}
