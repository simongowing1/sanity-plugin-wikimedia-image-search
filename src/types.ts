export interface WikimediaSearchResponse {
  pages: WikimediaSearchResult[];
}

export interface WikimediaSearchResult {
  id: number;
  key: string;
  title: string;
  excerpt?: string;
  matched_title?: string;
  description?: string;
  thumbnail?: WikimediaThumbnail;
}

export interface WikimediaThumbnail {
  mimetype: string;
  width: number;
  height: number;
  duration?: number;
  url: string;
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
