# web

Web surfaces for the viral loop. Built from **P8**.

- **Teaser page** — `palmly.app/i/{token}`: SSR HTML (<50KB) with per-invite OG tags, deep-link
  CTA (clipboard/referrer arming), store redirects, human-readable fallback code, WeChat
  open-in-browser overlay. Served by a Supabase Edge Function on the custom domain (Backend §8.2,
  D6), CDN-cached. Static assets / templates for it live here.

See `Planning/UIUX-specs.md` §2.10 and `Planning/Backend-specs.md` §8.
