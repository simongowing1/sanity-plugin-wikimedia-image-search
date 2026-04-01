export interface WikimediaImageInfo {
  url: string;
  thumburl: string;
  thumbwidth: number;
  thumbheight: number;
  mime: string;
  width: number;
  height: number;
  descriptionurl?: string;
}

export interface WikimediaPage {
  pageid: number;
  title: string;
  imageinfo?: WikimediaImageInfo[];
}

export interface WikimediaActionResponse {
  continue?: {gsroffset: number; [key: string]: unknown};
  query?: {
    pages: Record<string, WikimediaPage>;
  };
}

export interface WikimediaSearchResult {
  pageid: number;
  title: string;
  thumburl: string;
  thumbwidth: number;
  thumbheight: number;
  mime: string;
  url: string;
  descriptionurl?: string;
}

export interface WikimediaSearchResponse {
  results: WikimediaSearchResult[];
  nextOffset: number | null;
}

export interface WikimediaFileResponse {
  title: string;
  file_description_url: string;
  latest?: {
    timestamp: string;
    user: {name: string};
  };
  preferred: {
    mediatype: string;
    size: number | null;
    width: number;
    height: number;
    duration?: number;
    url: string;
  };
  original?: {
    mediatype: string;
    size: number;
    width: number;
    height: number;
    url: string;
  };
}
