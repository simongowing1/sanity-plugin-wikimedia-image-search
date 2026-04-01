# sanity-plugin-wikimedia-image-search

> This is a **Sanity Studio v5** plugin.

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
import {defineConfig} from 'sanity';
import {wikimediaImageSearch} from 'sanity-plugin-wikimedia-image-search';

export default defineConfig({
  // ...
  plugins: [wikimediaImageSearch()],
});
```

The plugin registers as an **image asset source**. When you open any image field, you'll see "Wikimedia Commons" as an option in the asset source dropdown.

### Use as the only image source

To replace the default upload option entirely:

```ts
import {defineConfig} from 'sanity';
import {wikimediaAssetSource} from 'sanity-plugin-wikimedia-image-search';

export default defineConfig({
  // ...
  form: {
    image: {
      assetSources: () => [wikimediaAssetSource],
      directUploads: false,
    },
  },
});
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
2. Search by keyword — results come from the Wikimedia Commons MediaWiki API (`action=query` with `generator=search`)
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

- Sanity Studio v5
- React 19.2+

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

## Release

This repo uses semantic-release in the `CI & Release` workflow.

### Commit types and version bumps

Release behavior follows `@semantic-release/commit-analyzer` default rules:

- `feat:` => **minor** release
- `fix:` => **patch** release
- `perf:` => **patch** release
- `BREAKING CHANGE:` footer => **major** release
- `chore:`, `docs:`, `style:`, `test:`, and other unmatched commit types => **no release**

Reference: [semantic-release/commit-analyzer](https://github.com/semantic-release/commit-analyzer)

### Triggering a release

Run the [CI & Release workflow](https://github.com/simongowing1/sanity-plugin-wikimedia-image-search/actions/workflows/main.yml) on `main` with **Release new version** enabled.

If there are no releasable commits since the latest tag, semantic-release will skip publishing.

## License & Content Rights

- The plugin source code in this repository is licensed under [MIT](LICENSE).
- Images imported from Wikimedia Commons are **not** covered by this MIT license.
- Each imported asset keeps its own upstream license terms (for example, CC BY, CC BY-SA, Public Domain), which are shown on the file description page.
- You are responsible for complying with the license terms of each imported image, including attribution and share-alike requirements where applicable.
- The plugin stores attribution metadata (`source`, `creditLine`, and `description`) to help you render proper credit in your project.

[MIT](LICENSE) © Simon Gowing
