import {searchWikimedia} from '../api/wikimedia';
import type {WikimediaSearchResponse, WikimediaSearchResult} from '../types';

jest.mock('../api/wikimedia');

const mockSearch = searchWikimedia as jest.MockedFunction<typeof searchWikimedia>;

function makeSearchResponse(query: string, count: number): WikimediaSearchResponse {
  return {
    results: Array.from({length: count}, (_, i) => ({
      pageid: i + 1,
      title: `File:${query}_${i}.jpg`,
      thumburl: `https://example.com/${query}_${i}_320.jpg`,
      thumbwidth: 320,
      thumbheight: 240,
      mime: 'image/jpeg',
      url: `https://example.com/${query}_${i}.jpg`,
    })),
    nextOffset: count > 0 ? count : null,
  };
}

/**
 * Simulates the component's doSearch logic with the searchIdRef guard.
 * Mirrors the pattern in WikimediaAssetSource.tsx.
 */
function createSearchController() {
  let searchId = 0;
  let currentResults: WikimediaSearchResult[] = [];
  let isSearching = false;

  async function doSearch(query: string, offset: number) {
    if (!query.trim()) return;
    const thisSearchId = ++searchId;
    isSearching = true;

    try {
      const data = await searchWikimedia(query, 40, offset);
      if (searchId !== thisSearchId) return;
      currentResults = offset === 0 ? data.results : [...currentResults, ...data.results];
    } catch {
      if (searchId !== thisSearchId) return;
    } finally {
      if (searchId === thisSearchId) {
        isSearching = false;
      }
    }
  }

  return {
    doSearch,
    getResults: () => currentResults,
    getIsSearching: () => isSearching,
    getSearchId: () => searchId,
  };
}

describe('Race condition: rapid consecutive searches', () => {
  beforeEach(() => {
    mockSearch.mockReset();
  });

  it('only applies results from the latest search when earlier search resolves last', async () => {
    const controller = createSearchController();

    let resolveFirst!: (value: WikimediaSearchResponse) => void;
    let resolveSecond!: (value: WikimediaSearchResponse) => void;

    mockSearch
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveFirst = r)),
      )
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveSecond = r)),
      );

    const search1 = controller.doSearch('cat', 0);
    const search2 = controller.doSearch('dog', 0);

    resolveSecond(makeSearchResponse('dog', 3));
    await search2;

    expect(controller.getResults()).toHaveLength(3);
    expect(controller.getResults()[0].title).toBe('File:dog_0.jpg');
    expect(controller.getIsSearching()).toBe(false);

    resolveFirst(makeSearchResponse('cat', 5));
    await search1;

    expect(controller.getResults()).toHaveLength(3);
    expect(controller.getResults()[0].title).toBe('File:dog_0.jpg');
  });

  it('discards stale results when earlier search resolves first', async () => {
    const controller = createSearchController();

    let resolveFirst!: (value: WikimediaSearchResponse) => void;
    let resolveSecond!: (value: WikimediaSearchResponse) => void;

    mockSearch
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveFirst = r)),
      )
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveSecond = r)),
      );

    const search1 = controller.doSearch('cat', 0);
    const search2 = controller.doSearch('dog', 0);

    resolveFirst(makeSearchResponse('cat', 5));
    await search1;

    expect(controller.getResults()).toHaveLength(0);
    expect(controller.getIsSearching()).toBe(true);

    resolveSecond(makeSearchResponse('dog', 3));
    await search2;

    expect(controller.getResults()).toHaveLength(3);
    expect(controller.getResults()[0].title).toBe('File:dog_0.jpg');
    expect(controller.getIsSearching()).toBe(false);
  });

  it('handles three rapid searches, only the last one wins', async () => {
    const controller = createSearchController();

    const resolvers: Array<(value: WikimediaSearchResponse) => void> = [];

    mockSearch.mockImplementation(
      () =>
        new Promise<WikimediaSearchResponse>((r) => {
          resolvers.push(r);
        }),
    );

    const s1 = controller.doSearch('cat', 0);
    const s2 = controller.doSearch('dog', 0);
    const s3 = controller.doSearch('bird', 0);

    expect(controller.getSearchId()).toBe(3);

    resolvers[2](makeSearchResponse('bird', 2));
    await s3;
    expect(controller.getResults()).toHaveLength(2);
    expect(controller.getResults()[0].title).toBe('File:bird_0.jpg');

    resolvers[1](makeSearchResponse('dog', 4));
    await s2;
    expect(controller.getResults()).toHaveLength(2);
    expect(controller.getResults()[0].title).toBe('File:bird_0.jpg');

    resolvers[0](makeSearchResponse('cat', 6));
    await s1;
    expect(controller.getResults()).toHaveLength(2);
    expect(controller.getResults()[0].title).toBe('File:bird_0.jpg');
  });

  it('does not set isSearching=false when a stale search completes', async () => {
    const controller = createSearchController();

    let resolveFirst!: (value: WikimediaSearchResponse) => void;
    let resolveSecond!: (value: WikimediaSearchResponse) => void;

    mockSearch
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveFirst = r)),
      )
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveSecond = r)),
      );

    const search1 = controller.doSearch('cat', 0);
    controller.doSearch('dog', 0);

    expect(controller.getIsSearching()).toBe(true);

    resolveFirst(makeSearchResponse('cat', 5));
    await search1;

    expect(controller.getIsSearching()).toBe(true);
  });

  it('handles a stale search that rejects without affecting current state', async () => {
    const controller = createSearchController();

    let rejectFirst!: (err: Error) => void;
    let resolveSecond!: (value: WikimediaSearchResponse) => void;

    mockSearch
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((_, rej) => (rejectFirst = rej)),
      )
      .mockImplementationOnce(
        () => new Promise<WikimediaSearchResponse>((r) => (resolveSecond = r)),
      );

    const search1 = controller.doSearch('cat', 0);
    const search2 = controller.doSearch('dog', 0);

    rejectFirst(new Error('Network error'));
    await search1;

    expect(controller.getIsSearching()).toBe(true);
    expect(controller.getResults()).toHaveLength(0);

    resolveSecond(makeSearchResponse('dog', 3));
    await search2;

    expect(controller.getResults()).toHaveLength(3);
    expect(controller.getIsSearching()).toBe(false);
  });

  it('single search works normally without race condition', async () => {
    const controller = createSearchController();

    mockSearch.mockResolvedValueOnce(makeSearchResponse('cat', 5));

    await controller.doSearch('cat', 0);

    expect(controller.getResults()).toHaveLength(5);
    expect(controller.getResults()[0].title).toBe('File:cat_0.jpg');
    expect(controller.getIsSearching()).toBe(false);
  });
});
