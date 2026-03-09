import {searchWikimedia} from '../api/wikimedia';
import type {WikimediaSearchResponse} from '../types';

jest.mock('../api/wikimedia');

const mockSearch = searchWikimedia as jest.MockedFunction<typeof searchWikimedia>;

function makeSearchResponse(query: string, count: number): WikimediaSearchResponse {
  return {
    pages: Array.from({length: count}, (_, i) => ({
      id: i + 1,
      key: `File:${query}_${i}.jpg`,
      title: `File:${query}_${i}.jpg`,
      description: `${query} image ${i}`,
      thumbnail: {
        mimetype: 'image/jpeg',
        width: 200,
        height: 150,
        url: `//example.com/${query}_${i}.jpg`,
      },
    })),
  };
}

/**
 * Simulates the component's doSearch logic with the searchIdRef guard.
 * This mirrors the pattern in WikimediaAssetSource.tsx.
 */
function createSearchController() {
  let searchId = 0;
  let currentResults: WikimediaSearchResponse['pages'] = [];
  let isSearching = false;

  async function doSearch(query: string, pageNum: number) {
    if (!query.trim()) return;
    const thisSearchId = ++searchId;
    isSearching = true;

    try {
      const data = await searchWikimedia(query, 40, pageNum * 40);
      if (searchId !== thisSearchId) return;
      const fileResults = data.pages.filter((p) => p.title.startsWith('File:') && p.thumbnail);
      currentResults = pageNum === 0 ? fileResults : [...currentResults, ...fileResults];
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

    // "dog" resolves first
    resolveSecond(makeSearchResponse('dog', 3));
    await search2;

    expect(controller.getResults()).toHaveLength(3);
    expect(controller.getResults()[0].title).toBe('File:dog_0.jpg');
    expect(controller.getIsSearching()).toBe(false);

    // "cat" resolves after — stale, should be discarded
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

    // "cat" resolves first — but it's stale because "dog" was triggered after
    resolveFirst(makeSearchResponse('cat', 5));
    await search1;

    // Results should still be empty (stale search was discarded)
    expect(controller.getResults()).toHaveLength(0);
    // isSearching should still be true (the active search hasn't resolved)
    expect(controller.getIsSearching()).toBe(true);

    // "dog" resolves — this is the current search
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

    // Resolve in reverse order: bird, dog, cat
    resolvers[2](makeSearchResponse('bird', 2));
    await s3;
    expect(controller.getResults()).toHaveLength(2);
    expect(controller.getResults()[0].title).toBe('File:bird_0.jpg');

    resolvers[1](makeSearchResponse('dog', 4));
    await s2;
    // Dog results discarded — bird was the latest
    expect(controller.getResults()).toHaveLength(2);
    expect(controller.getResults()[0].title).toBe('File:bird_0.jpg');

    resolvers[0](makeSearchResponse('cat', 6));
    await s1;
    // Cat results also discarded
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

    // Stale search resolves — should NOT flip isSearching to false
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

    // First search fails — but it's stale, error should be silently ignored
    rejectFirst(new Error('Network error'));
    await search1;

    expect(controller.getIsSearching()).toBe(true);
    expect(controller.getResults()).toHaveLength(0);

    // Second search succeeds
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
