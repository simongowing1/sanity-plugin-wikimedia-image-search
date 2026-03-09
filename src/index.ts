import type {AssetSource} from 'sanity';
import {definePlugin} from 'sanity';

import WikimediaAssetSource from './components/WikimediaAssetSource';
import {WikimediaIcon} from './components/WikimediaIcon';

export type {WikimediaFileResponse, WikimediaSearchResponse, WikimediaSearchResult} from './types';

export const wikimediaAssetSource: AssetSource = {
  name: 'wikimedia-commons',
  title: 'Wikimedia Commons',
  component: WikimediaAssetSource,
  icon: WikimediaIcon,
};

export const wikimediaImageSearch = definePlugin(() => {
  return {
    name: 'sanity-plugin-wikimedia-image-search',
    form: {
      image: {
        assetSources: (prev) => {
          return [...prev, wikimediaAssetSource];
        },
      },
    },
  };
});
