import {searchWikimedia, getFileDetails} from '../api/wikimedia';
import type {WikimediaSearchResponse, WikimediaFileResponse} from '../types';

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
  const fakeResponse: WikimediaSearchResponse = {
    pages: [
      {
        id: 1,
        key: 'File:Cat.jpg',
        title: 'File:Cat.jpg',
        description: 'A cat',
        thumbnail: {mimetype: 'image/jpeg', width: 200, height: 150, url: '//example.com/cat.jpg'},
      },
    ],
  };

  it('sends correct query params and User-Agent header', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeResponse));

    await searchWikimedia('flamingo', 10, 0);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/search/page?');
    expect(url).toContain('q=flamingo');
    expect(url).toContain('limit=10');
    expect(url).not.toContain('offset');
    expect(options.headers['User-Agent']).toContain('sanity-plugin-wikimedia-image-search');
  });

  it('includes offset param when offset > 0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeResponse));

    await searchWikimedia('bird', 40, 80);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('offset=80');
  });

  it('does not include offset when offset is 0', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeResponse));

    await searchWikimedia('bird', 40, 0);

    const [url] = mockFetch.mock.calls[0];
    expect(url).not.toContain('offset');
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(fakeResponse));

    const result = await searchWikimedia('cat');
    expect(result).toEqual(fakeResponse);
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
