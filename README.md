# sanity-plugin-wikimedia-image-search

> This is a **Sanity Studio v3** plugin.

Search [Wikimedia Commons](https://commons.wikimedia.org/) for freely-licensed images and insert them directly into your Sanity Studio.

## Features

- Search 60M+ freely-licensed images from Wikimedia Commons by keyword
- Browse paginated thumbnails and select one or more images
- Images are automatically uploaded to your Sanity dataset
- Attribution metadata (credit line, source URL, description) stored on the asset document

## Installation

```sh
npm install sanity-plugin-wikimedia-image-search
```

## Usage

Add the plugin to your Sanity configuration:

```ts
// sanity.config.ts
import {defineConfig} from 'sanity'
import {wikimediaImageSearch} from 'sanity-plugin-wikimedia-image-search'

export default defineConfig({
  // ...
  plugins: [wikimediaImageSearch()],
})
```

The plugin registers as an **image asset source**. When you open any image field, you'll see "Wikimedia Commons" as an option in the asset source dropdown.

### Use as the only image source

To replace the default upload option entirely:

```ts
import {defineConfig} from 'sanity'
import {wikimediaAssetSource} from 'sanity-plugin-wikimedia-image-search'

export default defineConfig({
  // ...
  form: {
    image: {
      assetSources: () => [wikimediaAssetSource],
      directUploads: false,
    },
  },
})
```

### Use on a single field

```ts
import {wikimediaAssetSource} from 'sanity-plugin-wikimedia-image-search'

{
  name: 'photo',
  title: 'Photo',
  type: 'image',
  options: {
    sources: [wikimediaAssetSource],
  },
}
```

## How It Works

1. Open an image field and select **Wikimedia Commons** from the asset source dropdown
2. Search by keyword — results come from the [Wikimedia Commons REST API](https://www.mediawiki.org/wiki/API:REST_API)
3. Browse paginated thumbnails and select images
4. Selected images are downloaded from Wikimedia and uploaded to your Sanity dataset
5. Attribution is stored on the asset document (`creditLine`, `source`, `description`)

No API key is required — the Wikimedia Commons API is free and public.

## Attribution

All images from Wikimedia Commons are freely licensed. The plugin stores attribution metadata on each asset document, including:

- **`source.name`**: `"wikimedia-commons"`
- **`source.url`**: Link to the file's Wikimedia Commons page (with full license and creator info)
- **`creditLine`**: `"Wikimedia Commons"`

You can use this metadata to display proper attribution on your site.

## Requirements

- Sanity Studio v3
- React 18+

## Develop & test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit) with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio) on how to run this plugin with hotreload in the studio.

### Useful commands

```sh
npm run build    # Build the plugin
npm run watch    # Watch for changes and rebuild
npm run lint     # Lint the codebase
npm run format   # Format with Prettier
```

## License

[MIT](LICENSE) © Simon Gowing
