import type {
  WikimediaActionResponse,
  WikimediaFileResponse,
  WikimediaSearchResponse,
} from '../types';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_REST = 'https://commons.wikimedia.org/w/rest.php/v1';
const THUMB_WIDTH = 320;
const USER_AGENT =
  'sanity-plugin-wikimedia-image-search/1.0 (https://github.com/simongowing1/sanity-plugin-wikimedia-image-search)';

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
]);

export async function searchWikimedia(
  query: string,
  limit = 40,
  offset = 0,
): Promise<WikimediaSearchResponse> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(limit),
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: String(THUMB_WIDTH),
    format: 'json',
    origin: '*',
  });
  if (offset > 0) {
    params.set('gsroffset', String(offset));
  }

  const response = await fetch(`${COMMONS_API}?${params}`, {
    headers: {'Api-User-Agent': USER_AGENT},
  });

  if (!response.ok) {
    throw new Error(`Wikimedia search failed: ${response.status} ${response.statusText}`);
  }

  const data: WikimediaActionResponse = await response.json();

  const pages = data.query?.pages ?? {};
  const results = Object.values(pages)
    .filter((p) => {
      const info = p.imageinfo?.[0];
      return info && ALLOWED_MIMES.has(info.mime);
    })
    .map((p) => {
      const info = p.imageinfo![0];
      return {
        pageid: p.pageid,
        title: p.title,
        thumburl: info.thumburl,
        thumbwidth: info.thumbwidth,
        thumbheight: info.thumbheight,
        mime: info.mime,
        url: info.url,
        descriptionurl: info.descriptionurl,
      };
    });

  return {
    results,
    nextOffset: data.continue?.gsroffset ?? null,
  };
}

export async function getFileDetails(title: string): Promise<WikimediaFileResponse> {
  const encoded = encodeURIComponent(title);
  const response = await fetch(`${COMMONS_REST}/file/${encoded}`, {
    headers: {'User-Agent': USER_AGENT},
  });

  if (!response.ok) {
    throw new Error(`Wikimedia file fetch failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
