import {getFileDetails, searchWikimedia} from '../api/wikimedia';
import type {WikimediaActionResponse, WikimediaFileResponse} from '../types';

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response;
}

describe('searchWikimedia', () => {
  const fakeApiResponse: WikimediaActionResponse = {
    continue: {gsroffset: 40},
    query: {
      pages: {
        '100': {
          pageid: 100,
          title: 'File:Cat.jpg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/cat_full.jpg',
              thumburl: 'https://upload.wikimedia.org/cat_320.jpg',
              thumbwidth: 320,
              thumbheight: 240,
              mime: 'image/jpeg',
              width: 3000,
              height: 2000,
            },
          ],
        },
      },
    },
  };

  it('calls the Action API with correct params', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeApiResponse));

    await searchWikimedia('flamingo', 10, 0);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('api.php?');
    expect(url).toContain('action=query');
    expect(url).toContain('generator=search');
    expect(url).toContain('gsrsearch=flamingo');
    expect(url).toContain('gsrnamespace=6');
    expect(url).toContain('gsrlimit=10');
    expect(url).not.toContain('gsroffset');
    expect(options.headers['Api-User-Agent']).toContain('sanity-plugin-wikimedia-image-search');
  });

  it('includes gsroffset when offset > 0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeApiResponse));

    await searchWikimedia('bird', 40, 80);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('gsroffset=80');
  });

  it('does not include gsroffset when offset is 0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeApiResponse));

    await searchWikimedia('bird', 40, 0);

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('gsroffset');
  });

  it('returns normalized results with nextOffset', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeApiResponse));

    const result = await searchWikimedia('cat');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].pageid).toBe(100);
    expect(result.results[0].title).toBe('File:Cat.jpg');
    expect(result.results[0].thumburl).toBe('https://upload.wikimedia.org/cat_320.jpg');
    expect(result.results[0].mime).toBe('image/jpeg');
    expect(result.nextOffset).toBe(40);
  });

  it('returns nextOffset=null when no continue', async () => {
    const noContinue: WikimediaActionResponse = {
      query: fakeApiResponse.query,
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(noContinue));

    const result = await searchWikimedia('cat');
    expect(result.nextOffset).toBeNull();
  });

  it('filters out non-image mimetypes', async () => {
    const mixed: WikimediaActionResponse = {
      query: {
        pages: {
          '1': {
            pageid: 1,
            title: 'File:Photo.jpg',
            imageinfo: [
              {
                url: '',
                thumburl: '',
                thumbwidth: 320,
                thumbheight: 240,
                mime: 'image/jpeg',
                width: 100,
                height: 100,
              },
            ],
          },
          '2': {
            pageid: 2,
            title: 'File:Doc.pdf',
            imageinfo: [
              {
                url: '',
                thumburl: '',
                thumbwidth: 320,
                thumbheight: 240,
                mime: 'application/pdf',
                width: 100,
                height: 100,
              },
            ],
          },
          '3': {
            pageid: 3,
            title: 'File:Audio.ogg',
            imageinfo: [
              {
                url: '',
                thumburl: '',
                thumbwidth: 0,
                thumbheight: 0,
                mime: 'audio/ogg',
                width: 0,
                height: 0,
              },
            ],
          },
        },
      },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(mixed));

    const result = await searchWikimedia('test');
    expect(result.results).toHaveLength(1);
    expect(result.results[0].title).toBe('File:Photo.jpg');
  });

  it('handles empty query response', async () => {
    const empty: WikimediaActionResponse = {};
    mockFetch.mockResolvedValueOnce(jsonResponse(empty));

    const result = await searchWikimedia('noresults');
    expect(result.results).toHaveLength(0);
    expect(result.nextOffset).toBeNull();
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 500));

    await expect(searchWikimedia('fail')).rejects.toThrow('Wikimedia search failed: 500');
  });
});

describe('getFileDetails', () => {
  const fakeFileResponse: WikimediaFileResponse = {
    title: 'File:Cat.jpg',
    file_description_url: '//commons.wikimedia.org/wiki/File:Cat.jpg',
    preferred: {
      mediatype: 'BITMAP',
      size: 123456,
      width: 1920,
      height: 1080,
      url: 'https://upload.wikimedia.org/cat_full.jpg',
    },
  };

  it('encodes the title in the URL', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeFileResponse));

    await getFileDetails('File:Cat (example).jpg');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/file/File%3ACat%20(example).jpg');
  });

  it('returns parsed file details on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeFileResponse));

    const result = await getFileDetails('File:Cat.jpg');
    expect(result.preferred.url).toBe('https://upload.wikimedia.org/cat_full.jpg');
    expect(result.file_description_url).toBe('//commons.wikimedia.org/wiki/File:Cat.jpg');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 404));

    await expect(getFileDetails('File:Missing.jpg')).rejects.toThrow(
      'Wikimedia file fetch failed: 404',
    );
  });
});
