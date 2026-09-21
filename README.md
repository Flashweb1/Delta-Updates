# Delta Update

> Premium news publication — politics, business, technology, and more from Nigeria and around the world.
> Built with React 18, TypeScript, Vite, and Supabase.

![Delta Update preview](./preview-desktop.png)

## Highlights

- Premium editorial design system (light + dark)
- Firebase Auth (admin-only gated routes) + Firestore-backed articles
- SEO-ready: per-page canonical, Open Graph, Twitter card, JSON-LD `NewsMediaOrganization`
- Lazy-loaded routes, skeleton loaders, code-split vendor chunks
- Cookie consent, reduced-motion, secure-by-default HTTP headers
- Accessible: keyboard-friendly nav, focus rings, ARIA labels, `prefers-reduced-motion`
- 404 page, error boundary, and global error logger
- SPA deploy ready for Vercel and Netlify

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Routing:** react-router-dom v6
- **Backend:** Firebase (Auth + Firestore)
- **Icons:** lucide-react
- **SEO:** react-helmet-async
- **Testing:** Vitest + Testing Library

## Getting started

### Requirements

- Node.js **>= 20** (see `.nvmrc`)
- npm **>= 10**

### Setup

```bash
nvm use            # or: nvm install
npm install
cp .env.example .env
# Fill in the Firebase keys and any optional analytics values
npm run dev
```

Open http://localhost:5173.

### Scripts

| Script                 | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR                      |
| `npm run build`        | Type-check + production build to `dist/`      |
| `npm run preview`      | Preview the production build                  |
| `npm run typecheck`    | TypeScript only                               |
| `npm run typecheck:all`| Type-check app + node configs                 |
| `npm run test`         | Run unit tests (Vitest)                       |
| `npm run test:watch`   | Vitest in watch mode                          |
| `npm run test:ui`      | Vitest with the interactive UI                |
| `npm run coverage`     | Generate test coverage report                 |
| `npm run audit:deps`   | List outdated dependencies                    |
| `npm run deploy:vercel` | Build + deploy to Vercel                     |
| `npm run deploy:netlify` | Build + deploy to Netlify                   |

## Environment variables

All `VITE_`-prefixed variables are exposed to the client bundle. Only put public values here.
See [`.env.example`](./.env.example) for the full list.

| Key                          | Required | Description                                |
| ---------------------------- | -------- | ------------------------------------------ |
| `VITE_FIREBASE_*`            | yes      | Firebase web SDK config                    |
| `VITE_ADMIN_EMAILS`          | yes      | Comma-separated admin emails               |
| `VITE_SITE_URL`              | no       | Public site URL (canonical, OG, sitemap)   |
| `VITE_SITE_NAME`             | no       | Display name                               |
| `VITE_SITE_DESCRIPTION`      | no       | Default meta description                   |
| `VITE_PLAUSIBLE_DOMAIN`      | no       | Enable Plausible analytics                 |
| `VITE_GA_MEASUREMENT_ID`     | no       | Enable GA4                                 |
| `VITE_SENTRY_DSN`            | no       | Enable Sentry error monitoring             |

## Project structure

```
src/
├── App.tsx                 # Top-level layout, routing, SEO <Helmet>
├── main.tsx                # Providers (Helmet, Router, Theme, Auth, Bookmarks, ErrorBoundary)
├── components/
│   ├── article/            # ArticleCard, ArticleDetail, CategoryIndex, FeatureHero
│   ├── common/             # AppErrorBoundary, CookieConsent, SkeletonLoader
│   ├── layout/             # Masthead, Nav, Ticker, Footer, ReadingProgress
│   └── ui/                 # (shared UI primitives)
├── contexts/               # Auth, Bookmarks, Theme
├── data/                   # Static article fixtures + types
├── firebase/               # init.ts, auth.ts, articles.ts
├── pages/                  # HomePage, ArticlePage, CategoryPage, SearchPage, BookmarksPage, NotFoundPage, PrivacyPage, TermsPage
│   └── admin/              # AdminLogin, AdminDashboard, ArticleEditor
└── utils/                  # security.ts (validation, canonical URL, site config), logger.ts
```

## Routing

| Path                       | Page                | Notes                              |
| -------------------------- | ------------------- | ---------------------------------- |
| `/`                        | `HomePage`          | Hero + latest + categories         |
| `/article/:slug`           | `ArticlePage`       | Validates slug before render       |
| `/category/:slug`          | `CategoryPage`      | Validates category before render   |
| `/search`                  | `SearchPage`        | Query-driven                       |
| `/bookmarks`               | `BookmarksPage`     | Local bookmarks                    |
| `/admin/login`             | `AdminLogin`        | Public                             |
| `/admin`                   | `AdminDashboard`    | Admin only (`RequireAdmin`)        |
| `/admin/editor`            | `ArticleEditor`     | Create new article                 |
| `/admin/editor/:articleId` | `ArticleEditor`     | Edit existing                      |
| `/privacy`                 | `PrivacyPage`       |                                    |
| `/terms`                   | `TermsPage`         |                                    |
| `*`                        | `NotFoundPage`      | Friendly 404                       |

## Firestore schema

Collection: `articles` (status-gated by `published` for public reads)

```ts
interface Article {
  id: string
  title: string
  dek: string                    // Subhead
  body: string[]                 // Paragraphs
  category: string               // Category slug
  tags: string[]
  author: string
  authorRole: string
  publishedAt: string            // Human-readable, e.g. "Aug 25, 2026"
  image: string
  slug: string                   // URL-safe, unique
  readTime: number               // minutes
  featured?: boolean
  status: 'published' | 'draft' | 'review' | 'archived'
  createdAt?: Timestamp
  updatedAt?: Timestamp
}
```

## Testing

```bash
npm run test           # one-shot
npm run test:watch     # watch mode
npm run test:ui        # interactive UI
```

Tests live next to the code as `*.test.ts` / `*.test.tsx` and focus on security/validation helpers and pure utilities. The Firebase SDK is mocked in tests.

## Deployment

### Vercel

`vercel.json` is configured with SPA rewrites. Set environment variables in the Vercel dashboard, then:

```bash
npm run deploy:vercel
```

### Netlify

`netlify.toml` is configured. Set environment variables in the Netlify dashboard, then:

```bash
npm run deploy:netlify
```

## Security & compliance

- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `Strict-Transport-Security` are set in both Vite dev/preview and `index.html`.
- All Firebase config in this repo is **public** by design (it's the Firebase web SDK). Real security is enforced by **Firestore Security Rules** and the **admin allow-list** (`VITE_ADMIN_EMAILS`).
- Inputs (slugs, categories, emails, tags) are validated before they reach Firestore.
- Logs are scrubbed for tokens, JWTs, and `sk-*` API keys before output.

## License

Proprietary. © Delta Update. All rights reserved.
