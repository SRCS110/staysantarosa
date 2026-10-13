# CONTENT-TODO

Open items that need client-supplied content or a client decision before this
build is considered finished. Nothing in this list has been invented to fill a
gap; where source material is missing the item is recorded here instead.

## 1. Copy provenance (needs sign-off)

The system rule is that real copy traces to the client's own host domain or to
supplied documents. The following was written for this project rather than
pulled from `arthousesantarosa.com` or `hotelesantarosa.com`, so it needs an
explicit review and sign-off before launch:

- `dining.html`, `wine-country.html`, `attractions.html` editorial bodies and
  their FAQ answers
- `dining-list.html`, `wine-country-list.html`, `attractions-list.html` card
  descriptions
- The six `blog-*.html` article bodies
- `privacy.html`, `terms.html`, `accessibility.html`, `contact.html`

Business names, addresses, hours, ratings and review counts on the three map
guides were taken from each business's own Google Business Profile and are
attributable to that source.

No invented statistics, testimonials, credentials or pricing appear anywhere in
the build. The stat tiles use only counts of items that exist in the build
itself (restaurants mapped, appellations, hotels).

## 2. Third-party image hosting

128 image references still point at domains outside the client's control
(Google user content, TripAdvisor CDN, SimpleView, individual business sites,
Wikimedia). These cannot be resized, given `srcset`, or served from Cloudflare
while they stay remote, and any of them can disappear without notice.

Needed from the client:
- Licensed or first-party replacements for each, or written permission to host
  copies
- Once supplied, each will be converted to WebP, resized to its rendered width,
  given `srcset`, `sizes`, explicit dimensions and real alt text

Affected: all `brewery-card`, `attr-card`, `lp-card` and `post-row` imagery, and
the six article cover images.

## 3. Background video excerpt

`assets/opt/art-house-loop.*` and `assets/opt/hotel-e-loop.*` are the first 15
seconds of the supplied films, muted, capped at 720p (the source resolution).
The system caps a background loop at roughly 2MB, which a 75-second cut cannot
meet at acceptable quality, so the loop was shortened rather than the bitrate
raised.

Needed from the client: confirmation that the opening 15 seconds is the right
excerpt, or a chosen in-point and out-point.

Posters are frames pulled from the films themselves.

## 4. Article metadata

Article `datePublished` values come from the dates that were already on the
cards. Author attribution is currently the property name rather than a named
writer. Confirm whether a byline should be used.

## 5. Deliberate deviations from the system

Recorded so they are choices, not drift:

- `html { font-size: 110% }` is kept from the existing build, so the golden
  ratio type scale renders about 10 percent larger than the reference. Changing
  it to 100 percent would shrink every existing component; flagged for a
  decision rather than changed silently.
- The showcase mode is Refined (Bagberry). There is no storefront, so product
  grids, badges and price rows do not apply; the mode governs card treatment,
  hairline separators and section header pairs instead.
- Roughly 105 colour and radius values remain hard-coded inside `style.css`
  components that predate the token layer. The palette itself is now defined
  once in `css/tokens.css`; the remaining literals are a follow-up sweep.
- `.post-row` images have no explicit `width`/`height` because they are still
  remote (see item 2). They will get dimensions when they are localized.

## 6. Empty asset folders

`assets/attractions/`, `assets/breweries/`, `assets/dining/` and
`assets/wineries/` are empty on disk. They are presumably placeholders for the
localized imagery in item 2.
