import { SearchIcon } from '@sanity/icons';
import {
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Grid,
  Inline,
  Spinner,
  Stack,
  Text,
  TextInput,
} from '@sanity/ui';
import { type ChangeEvent, RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { AssetFromSource, AssetSourceComponentProps } from 'sanity';

import { getFileDetails, resizeThumbnailUrl, searchWikimedia } from '../api/wikimedia';
import type { WikimediaSearchResult } from '../types';

const RESULTS_PER_PAGE = 40;
const ALLOWED_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/tiff',
]);

export default function WikimediaAssetSource(props: AssetSourceComponentProps) {
  const { onSelect, onClose, selectionType } = props;
  const isMulti = (selectionType as string) !== 'single';

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikimediaSearchResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchIdRef: RefObject<number> = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = useCallback(
    async (searchQuery: string, pageNum: number) => {
      if (!searchQuery.trim()) return;
      const currentSearchId = ++searchIdRef.current;
      setIsSearching(true);
      try {
        const offset = pageNum * RESULTS_PER_PAGE;
        const data = await searchWikimedia(searchQuery, RESULTS_PER_PAGE, offset);
        if (searchIdRef.current !== currentSearchId) return;
        const fileResults = data.pages.filter(
          (p) =>
            p.title.startsWith('File:') &&
            p.thumbnail &&
            ALLOWED_MIMETYPES.has(p.thumbnail.mimetype),
        );
        setResults(pageNum === 0 ? fileResults : (prev) => [...prev, ...fileResults]);
        setHasMore(data.pages.length === RESULTS_PER_PAGE);
        setHasSearched(true);
      } catch (err) {
        if (searchIdRef.current !== currentSearchId) return;
        console.error('Wikimedia search error:', err);
      } finally {
        if (searchIdRef.current === currentSearchId) {
          setIsSearching(false);
        }
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    (e: { preventDefault(): void }) => {
      e.preventDefault();
      setResults([]);
      setSelected(new Set());
      setPage(0);
      doSearch(query, 0);
    },
    [query, doSearch],
  );

  const handleLoadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    doSearch(query, nextPage);
  }, [page, query, doSearch]);

  const handleToggleSelect = useCallback(
    (result: WikimediaSearchResult) => {
      if (!isMulti) {
        setSelected(new Set([result.title]));
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(result.title)) {
          next.delete(result.title);
        } else {
          next.add(result.title);
        }
        return next;
      });
    },
    [isMulti],
  );

  const handleInsert = useCallback(async () => {
    if (selected.size === 0) return;
    setIsInserting(true);

    try {
      const selectedResults = results.filter((r) => selected.has(r.title));
      const assets: AssetFromSource[] = [];

      for (const result of selectedResults) {
        try {
          const fileData = await getFileDetails(result.title);
          assets.push({
            kind: 'url',
            value: fileData.preferred.url,
            assetDocumentProps: {
              _type: 'sanity.imageAsset',
              source: {
                name: 'wikimedia-commons',
                id: result.title,
                url: 'https:' + fileData.file_description_url,
              },
              description: result.description || result.title,
              creditLine: 'Wikimedia Commons',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
        } catch (err) {
          console.error(`Failed to fetch file details for ${result.title}:`, err);
        }
      }

      if (assets.length > 0) {
        onSelect(assets);
      }
    } catch (err) {
      console.error('Insert error:', err);
    } finally {
      setIsInserting(false);
    }
  }, [selected, results, onSelect]);

  const handleDoubleClick = useCallback(
    async (result: WikimediaSearchResult) => {
      setIsInserting(true);
      try {
        const fileData = await getFileDetails(result.title);
        onSelect([
          {
            kind: 'url',
            value: fileData.preferred.url,
            assetDocumentProps: {
              _type: 'sanity.imageAsset',
              source: {
                name: 'wikimedia-commons',
                id: result.title,
                url: 'https:' + fileData.file_description_url,
              },
              description: result.description || result.title,
              creditLine: 'Wikimedia Commons',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ]);
      } catch (err) {
        console.error('Double-click insert error:', err);
      } finally {
        setIsInserting(false);
      }
    },
    [onSelect],
  );

  return (
    <Dialog
      id="wikimedia-asset-source"
      header="Select from Wikimedia Commons"
      onClose={onClose}
      width={4}
      open
    >
      <Box padding={4}>
        <Stack space={4}>
          <form onSubmit={handleSubmit}>
            <Flex gap={2}>
              <Box flex={1}>
                <TextInput
                  ref={inputRef}
                  icon={SearchIcon}
                  placeholder="Search Wikimedia Commons..."
                  value={query}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setQuery(e.currentTarget.value)
                  }
                />
              </Box>
              <Button
                text="Search"
                tone="primary"
                type="submit"
                disabled={!query.trim() || isSearching}
              />
            </Flex>
          </form>

          {isSearching && results.length === 0 && (
            <Flex justify="center" padding={5}>
              <Spinner muted />
            </Flex>
          )}

          {hasSearched && results.length === 0 && !isSearching && (
            <Card padding={4} tone="caution" radius={2}>
              <Text align="center" muted size={1}>
                No images found. Try a different search term.
              </Text>
            </Card>
          )}

          {results.length > 0 && (
            <>
              <Grid columns={[2, 3, 4, 5]} gap={2}>
                {results.map((result) => {
                  const isSelected = selected.has(result.title);
                  return (
                    <Card
                      key={result.id}
                      radius={2}
                      shadow={isSelected ? 2 : 0}
                      tone={isSelected ? 'primary' : 'default'}
                      style={{
                        cursor: 'pointer',
                        outline: isSelected ? '2px solid var(--card-focus-ring-color)' : 'none',
                        overflow: 'hidden',
                      }}
                      onClick={() => handleToggleSelect(result)}
                      onDoubleClick={() => handleDoubleClick(result)}
                    >
                      <Box style={{ position: 'relative', paddingBottom: '100%' }}>
                        {result.thumbnail && (
                          <img
                            src={resizeThumbnailUrl(result.thumbnail.url, 200)}
                            alt={result.description || result.title}
                            loading="lazy"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        )}
                      </Box>
                      <Box padding={2}>
                        <Text size={0} muted textOverflow="ellipsis">
                          {result.title.replace(/^File:/, '')}
                        </Text>
                      </Box>
                    </Card>
                  );
                })}
              </Grid>

              <Flex justify="center" gap={3} align="center">
                {hasMore && (
                  <Button
                    text={isSearching ? 'Loading...' : 'Load more'}
                    mode="ghost"
                    onClick={handleLoadMore}
                    disabled={isSearching}
                  />
                )}
              </Flex>

              {selected.size > 0 && (
                <Card padding={3} radius={2} tone="positive">
                  <Flex justify="space-between" align="center">
                    <Inline space={2}>
                      <Text size={1} weight="medium">
                        {selected.size} image{selected.size !== 1 ? 's' : ''} selected
                      </Text>
                    </Inline>
                    <Button
                      text={isInserting ? 'Inserting...' : 'Insert'}
                      tone="positive"
                      onClick={handleInsert}
                      disabled={isInserting}
                    />
                  </Flex>
                </Card>
              )}
            </>
          )}
        </Stack>
      </Box>
    </Dialog>
  );
}
