# Self-hosted webfonts

Served from our own origin instead of Google's, so first paint is not waiting on a
third-party DNS lookup, TLS handshake and round-trip.

Only the weights the app uses, and only the Latin and Cyrillic subsets — Greek and
Vietnamese are dead weight here. `unicode-range` on each `@font-face` means a browser
downloads a subset only if the page actually renders a glyph from it, so an English or
Russian page pulls two files, not nine.

| Family | Weights | Used for |
|--------|---------|----------|
| Inter | 400, 500, 600 | body text |
| Oswald | 500, 600 | `.display`, `.label`, `.btn` |
| UnifrakturMaguntia | 400 | `.gothic` headings and the wordmark |

Regenerate after changing weights:

```bash
node scripts/fetch-fonts.mjs     # rewrites this folder and src/fonts.css
```

## Licences

All three are under the SIL Open Font License 1.1, which permits redistribution and
self-hosting. Upstream sources:

- Inter — https://fonts.google.com/specimen/Inter
- Oswald — https://fonts.google.com/specimen/Oswald
- UnifrakturMaguntia — https://fonts.google.com/specimen/UnifrakturMaguntia
