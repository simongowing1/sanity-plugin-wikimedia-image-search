import type {WikimediaFileResponse, WikimediaSearchResponse} from '../types';

const BASE_URL = 'https://commons.wikimedia.org/w/rest.php/v1';
const HEADERS = {
  'User-Agent':
    'sanity-plugin-wikimedia-image-search/1.0 (https://github.com/simongowing1/sanity-plugin-wikimedia-image-search)',
};

export async function searchWikimedia(
  query: string,
  limit = 40,
  offset = 0,
): Promise<WikimediaSearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  if (offset > 0) {
    params.set('offset', String(offset));
  }

  const response = await fetch(`${BASE_URL}/search/page?${params}`, {headers: HEADERS});

  if (!response.ok) {
    throw new Error(`Wikimedia search failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getFileDetails(title: string): Promise<WikimediaFileResponse> {
  const encoded = encodeURIComponent(title);
  const response = await fetch(`${BASE_URL}/file/${encoded}`, {headers: HEADERS});

  if (!response.ok) {
    throw new Error(`Wikimedia file fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
