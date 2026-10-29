#!/usr/bin/env python3
"""Stay Santa Rosa SEO build.
Regenerates JSON-LD structured data, visible breadcrumbs, image labels,
the prerendered directory, sitemap.xml, llms.txt and llms-full.txt. Safe to re-run after content edits:
  python3 scripts/build-seo.py
Reads js/directory-data.js as the single source of truth for businesses."""
import re, json, os, html, datetime, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
BASE = 'https://staysantarosa.com/'
TODAY = datetime.date.today().isoformat()
ORG_ID = BASE + '#organization'
SITE_ID = BASE + '#website'
CITY_ID = BASE + '#santa-rosa'

# ── directory data ──────────────────────────────────────────
raw = open('js/directory-data.js', encoding='utf-8').read()
DATA = json.loads(raw[raw.index('['):raw.rindex(']') + 1])
BY_ID = {p['id']: p for p in DATA}

def norm(s):
    s = html.unescape(s or '').lower()
    s = re.sub(r"[’'`]", '', s).replace('&', 'and')
    s = re.sub(r'\b(the|co|company|winery|vineyards?|and|state|reserve|park|brewing)\b', ' ', s)
    return re.sub(r'[^a-z0-9]+', '', s)
BY_NAME = {norm(p['name']): p for p in DATA}

def find_business(name):
    n = norm(name)
    if n in BY_NAME: return BY_NAME[n]
    for k, p in BY_NAME.items():
        if n and (n in k or k in n) and min(len(n), len(k)) > 4: return p
    return None

TOWNS = ['Santa Rosa', 'Healdsburg', 'Windsor', 'Kenwood', 'Forestville', 'Sebastopol',
         'Petaluma', 'Guerneville', 'Sonoma', 'Glen Ellen', 'Geyserville', 'Bodega Bay']

def address(p):
    a = (p.get('address') or '').strip()
    out = {'@type': 'PostalAddress', 'addressRegion': 'CA', 'addressCountry': 'US'}
    parts = [x.strip() for x in a.split(',') if x.strip()]
    if len(parts) >= 3 and re.match(r'^CA\b', parts[-1]):
        out['streetAddress'] = ', '.join(parts[:-2])
        out['addressLocality'] = parts[-2]
        z = re.search(r'\d{5}', parts[-1])
        if z: out['postalCode'] = z.group(0)
        return out
    if len(parts) == 2 and parts[1] in TOWNS:
        out['streetAddress'], out['addressLocality'] = parts
        return out
    if len(parts) == 1 and parts[0] in TOWNS:
        out['addressLocality'] = parts[0]; return out
    if parts and re.search(r'\d', parts[0]):
        out['streetAddress'] = parts[0]; out['addressLocality'] = 'Santa Rosa'; return out
    blob = ' · '.join([a, p.get('area') or '', p.get('group') or ''])
    segs = [x.strip() for x in re.split(r'[·,]', blob) if x.strip()]
    for t in TOWNS:
        if t in segs: out['addressLocality'] = t; break
    if 'Carneros' in blob and 'addressLocality' not in out: out['addressLocality'] = 'Sonoma'
    if 'addressLocality' not in out and p['cat'] == 'attractions' and 'Coast' in blob:
        out['addressLocality'] = 'Bodega Bay'
    return out

def to24(t, mer_fallback=None):
    m = re.search(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?', t, re.I)
    if not m: return None
    h = int(m.group(1)) % 12; mi = int(m.group(2) or 0)
    mer = (m.group(3) or mer_fallback or '').upper()
    if mer == 'PM': h += 12
    return '%02d:%02d' % (h, mi)

def hours_spec(p):
    hrs = p.get('hours') or {}
    groups = {}
    for day, val in hrs.items():
        if not val or re.search(r'closed', val, re.I): continue
        if re.search(r'24 hours', val, re.I):
            rngs = [('00:00', '23:59')]
        else:
            rngs = []
            for part in val.split(','):
                bits = re.split(r'\s*[–-]\s*', part.strip())
                if len(bits) < 2: continue
                endmer = (re.search(r'(AM|PM)', bits[1], re.I) or [None, None])[1]
                o, c = to24(bits[0], endmer), to24(bits[1])
                if o and c: rngs.append((o, c))
        for r in rngs: groups.setdefault(r, []).append(day)
    return [{'@type': 'OpeningHoursSpecification', 'dayOfWeek': days, 'opens': o, 'closes': c}
            for (o, c), days in groups.items()]

def btype(p):
    c = p['cat']; t = (p.get('type') or '').lower()
    if c == 'hotels': return 'Hotel'
    if c == 'wine': return 'Brewery' if 'brew' in t else 'Winery'
    if c == 'dining':
        if 'coffee' in t or 'café' in t or 'cafe' in t and 'brunch' not in t: return 'CafeOrCoffeeShop'
        if any(k in t for k in ['cocktail', 'lounge', 'sports bar', 'british pub']): return 'BarOrPub'
        return 'Restaurant'
    m = {'museum': 'Museum', 'performing arts': 'PerformingArtsTheater', 'historic site': 'LandmarksOrHistoricalBuildings',
         'wildlife': 'Zoo', 'state park': 'Park', 'regional park': 'Park', 'state reserve': 'Park',
         'coastal': 'Beach', 'river': 'BodyOfWater'}
    for k, v in m.items():
        if k in t: return ['TouristAttraction', v]
    return 'TouristAttraction'

def cuisine(p):
    if btype(p) not in ('Restaurant', 'CafeOrCoffeeShop', 'BarOrPub'): return None
    skip = {'breakfast', 'brunch', 'bar', 'cocktails', 'taproom', 'lounge', 'sports bar', 'bistro', 'deli',
            'small plates', 'wood oven', 'comfort food', 'coffee shop', 'wine bar', 'tequileria', 'diner'}
    parts = [x.strip() for x in re.split(r'[/&+,]', p.get('type') or '') if x.strip()]
    out = [x for x in parts if x.lower() not in skip]
    return out or None

def business(p, page_url=None):
    n = {'@type': btype(p), '@id': BASE + 'directory#' + p['id'], 'name': p['name']}
    if p.get('desc'): n['description'] = p['desc']
    if p.get('website'): n['url'] = p['website']
    same = [x for x in [p.get('maps')] if x]
    if p.get('page'): same.append(BASE + p['page'].replace('.html', '').lstrip('/'))
    if same: n['sameAs'] = same
    if p.get('maps'): n['hasMap'] = p['maps']
    if p.get('phone'): n['telephone'] = '+1-' + re.sub(r'\D', '', p['phone'])[-10:-7] + '-' + re.sub(r'\D', '', p['phone'])[-7:-4] + '-' + re.sub(r'\D', '', p['phone'])[-4:]
    n['address'] = address(p)
    oh = hours_spec(p)
    if oh: n['openingHoursSpecification'] = oh
    price = [t for t in (p.get('tags') or []) if re.fullmatch(r'\$+', t)]
    if price: n['priceRange'] = price[0]
    cz = cuisine(p)
    if cz: n['servesCuisine'] = cz
    n['containedInPlace'] = {'@id': CITY_ID} if n['address'].get('addressLocality', 'Santa Rosa') == 'Santa Rosa' else {'@type': 'AdministrativeArea', 'name': 'Sonoma County, California'}
    if page_url: n['subjectOf'] = {'@id': page_url}
    return n

# ── shared graph nodes ─────────────────────────────────────
ORG = {'@type': 'Organization', '@id': ORG_ID, 'name': 'Stay Santa Rosa', 'url': BASE,
       'logo': {'@type': 'ImageObject', 'url': BASE + 'assets/brand/favicon-512.png', 'width': 512, 'height': 512},
       'image': BASE + 'assets/brand/og-home.png',
       'email': 'hello@staysantarosa.com',
       'description': 'Stay Santa Rosa is a general travel guide to downtown Santa Rosa and Sonoma County, California, created and operated by Hotel E and Art House Santa Rosa, covering the two hotels, restaurants, wineries, breweries and attractions.',
       'founder': [{'@type': 'Hotel', '@id': BASE + 'directory#hotel-e', 'name': 'Hotel E', 'url': 'https://hotelesantarosa.com/'},
                   {'@type': 'Hotel', '@id': BASE + 'directory#art-house-santa-rosa', 'name': 'Art House Santa Rosa', 'url': 'https://arthousesantarosa.com/'}],
       'parentOrganization': [{'@id': BASE + 'directory#hotel-e'}, {'@id': BASE + 'directory#art-house-santa-rosa'}],
       'areaServed': {'@id': CITY_ID},
       'knowsAbout': ['Santa Rosa, California travel', 'Sonoma County wine country', 'Downtown Santa Rosa restaurants',
                      'Russian River Valley wineries', 'Santa Rosa craft breweries', 'Things to do in Santa Rosa',
                      'Hotels in downtown Santa Rosa', 'Sonoma County events'],
       'contactPoint': {'@type': 'ContactPoint', 'contactType': 'customer support', 'email': 'hello@staysantarosa.com',
                        'areaServed': 'US', 'availableLanguage': 'English'}}
SITE = {'@type': 'WebSite', '@id': SITE_ID, 'url': BASE, 'name': 'Stay Santa Rosa',
        'alternateName': ['staysantarosa.com', 'Stay Santa Rosa Travel Guide'],
        'description': 'A general travel guide to Santa Rosa, California, created by Hotel E and Art House Santa Rosa: where to stay, eat, drink and explore in Sonoma County.',
        'publisher': {'@id': ORG_ID}, 'inLanguage': 'en-US',
        'potentialAction': {'@type': 'SearchAction',
                            'target': {'@type': 'EntryPoint', 'urlTemplate': BASE + 'directory?q={search_term_string}'},
                            'query-input': 'required name=search_term_string'}}
CITY = {'@type': ['TouristDestination', 'City'], '@id': CITY_ID, 'name': 'Santa Rosa, California',
        'description': 'The largest city in Sonoma County and the gateway to California wine country, with a walkable downtown around Old Courthouse Square and Historic Railroad Square.',
        'url': BASE,
        'geo': {'@type': 'GeoCoordinates', 'latitude': 38.4404, 'longitude': -122.7141},
        'containedInPlace': {'@type': 'AdministrativeArea', 'name': 'Sonoma County, California'},
        'touristType': ['Wine lovers', 'Food lovers', 'Families', 'Outdoor enthusiasts', 'Craft beer enthusiasts'],
        'sameAs': ['https://en.wikipedia.org/wiki/Santa_Rosa,_California']}

# ── page map: breadcrumb trail + page type ─────────────────
CRUMB = {
 'dining': [('Downtown Dining', None)],
 'dining-list': [('Downtown Dining', 'dining'), ('Restaurant List', None)],
 'wine-country': [('Wine & Beer', None)],
 'wine-country-list': [('Wine & Beer', 'wine-country'), ('Winery & Brewery List', None)],
 'attractions': [('Attractions', None)],
 'attractions-list': [('Attractions', 'attractions'), ('Attractions & Events List', None)],
 'directory': [('Directory', None)],
 'blog': [('Blog', None)],
 'art-house': [('Hotels', 'hotels'), ('Art House Santa Rosa', None)],
 'hotel-e': [('Hotels', 'hotels'), ('Hotel E Santa Rosa', None)],
 'hotels': [('Where to Stay', None)], 'deals': [('Deals', None)], 'contact': [('Contact', None)], 'privacy': [('Privacy Policy', None)],
 'terms': [('Terms of Use', None)], 'accessibility': [('Accessibility', None)], 'about': [('About', None)],
}
PTYPE = {'index': 'WebPage', 'directory': 'CollectionPage', 'dining': 'CollectionPage', 'wine-country': 'CollectionPage',
         'attractions': 'CollectionPage', 'dining-list': 'CollectionPage', 'wine-country-list': 'CollectionPage',
         'attractions-list': 'CollectionPage', 'blog': 'CollectionPage', 'contact': 'ContactPage',
         'art-house': 'WebPage', 'hotel-e': 'WebPage', 'accessibility': 'WebPage', 'privacy': 'WebPage', 'terms': 'WebPage', 'about': 'AboutPage', 'hotels': 'CollectionPage', 'deals': 'CollectionPage'}

def text(s): return ' '.join(html.unescape(re.sub(r'<[^>]+>', ' ', s or '')).split())

def meta(s, pat):
    m = re.search(pat, s); return html.unescape(m.group(1)) if m else ''

# ── hotels (partner pages) ─────────────────────────────────
HOTEL_EXTRA = {
 'art-house': {'id': 'art-house-santa-rosa', 'checkin': '16:00', 'checkout': '12:00', 'pets': True,
               'amen': ['Free breakfast', 'Indoor parking', 'Suites and studios with kitchens', 'Local art collection', 'Bike lending', 'EV charging', 'Pet friendly']},
 'hotel-e': {'id': 'hotel-e', 'checkin': '16:00', 'checkout': '12:00', 'pets': True,
             'amen': ['Continental breakfast', 'Valet parking', 'Enology wine lounge', 'Meeting and event space', 'Dog friendly', 'Historic 1906 landmark']},
}

def hotel_node(slug, s):
    x = HOTEL_EXTRA[slug]; p = BY_ID[x['id']]
    n = business(p)
    n['@type'] = 'Hotel'
    n['name'] = p['name'] if 'Santa Rosa' in p['name'] else p['name'] + ' Santa Rosa'
    n['description'] = meta(s, r'name="description" content="([^"]*)"') or p['desc']
    n['image'] = list(dict.fromkeys(BASE + i for i in re.findall(r'(assets/(?:opt|ext)/[a-z0-9-]+\.webp)', s)))[:6]
    n['checkinTime'] = x['checkin']; n['checkoutTime'] = x['checkout']; n['petsAllowed'] = x['pets']
    n['amenityFeature'] = [{'@type': 'LocationFeatureSpecification', 'name': a, 'value': True} for a in x['amen']]
    n['mainEntityOfPage'] = {'@id': BASE + slug + '#webpage'}
    return n

def faq_node(slug, s):
    qs = []
    for q, a in re.findall(r'faq-question-text">(.*?)</span>.*?faq-answer-inner">(.*?)</div></div>', s, re.S):
        qs.append((text(q), text(a)))
    if not qs:
        for blk in re.findall(r'<div class="seo-faq-item">(.*?)</div>', s, re.S):
            h = re.search(r'<h3[^>]*>(.*?)</h3>', blk, re.S); pp = re.search(r'<p[^>]*>(.*?)</p>', blk, re.S)
            if h and pp: qs.append((text(h.group(1)), text(pp.group(1))))
    if not qs: return None
    return {'@type': 'FAQPage', '@id': BASE + slug + '#faq', 'isPartOf': {'@id': BASE + slug + '#webpage'},
            'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in qs]}

def list_items(s, pattern):
    names = [text(n) for n in re.findall(pattern, s)]
    items, ents, seen = [], [], set()
    for nm in names:
        p = find_business(nm)
        if p and p['id'] in seen: continue
        if p:
            seen.add(p['id']); ents.append(business(p)); ref = BASE + 'directory#' + p['id']
        else:
            ref = None
        items.append((nm, ref))
    return items, ents

def itemlist(slug, name, items):
    return {'@type': 'ItemList', '@id': BASE + slug + '#list', 'name': name, 'numberOfItems': len(items),
            'itemListOrder': 'https://schema.org/ItemListUnordered',
            'itemListElement': [{'@type': 'ListItem', 'position': i + 1, **({'item': {'@id': ref}} if ref else {'name': nm})}
                                for i, (nm, ref) in enumerate(items)]}

# ── directory prerender ───────────────────────────────────
CAT_LABEL = {'dining': 'Restaurant', 'wine': 'Wine & Beer', 'hotels': 'Hotel', 'attractions': 'Attraction'}
ORDER = ['dining', 'wine', 'hotels', 'attractions']
def e(x): return html.escape(str(x or ''), quote=True)
def card(p):
    eyebrow = ' · '.join([x for x in [CAT_LABEL[p['cat']], p.get('type')] if x])
    where = []
    if p.get('area') and p['cat'] == 'wine': where.append(p['area'])
    elif p.get('group') and p['cat'] == 'hotels': where.append(p['group'])
    if p.get('walk'): where.append('%s min walk from Courthouse Square' % p['walk'])
    elif p.get('distance'): where.append(p['distance'])
    pr = [t for t in (p.get('tags') or []) if re.fullmatch(r'\$+', t)]
    if pr: where.append(pr[0])
    rows = []
    if p.get('address'):
        ml = p.get('maps') or ('https://www.google.com/maps/search/?api=1&query=' + __import__('urllib.parse').parse.quote(p['name'] + ', ' + p['address']))
        rows.append('<li><span class="dir-k">Address</span><a href="%s" target="_blank" rel="noopener">%s</a></li>' % (e(ml), e(p['address'])))
    if p.get('phone'): rows.append('<li><span class="dir-k">Phone</span><a href="tel:%s">%s</a></li>' % (re.sub(r'[^0-9+]', '', p['phone']), e(p['phone'])))
    if p.get('hoursNote'): rows.append('<li><span class="dir-k">Hours</span>%s</li>' % e(p['hoursNote']))
    links = []
    if p.get('page'): links.append('<a class="dir-link" href="%s">View hotel</a>' % e(p['page']))
    if p.get('website'):
        host = re.sub(r'^www\.', '', re.sub(r'^https?://', '', p['website']).split('/')[0])
        links.append('<a class="dir-link" href="%s" target="_blank" rel="noopener">%s &rarr;</a>' % (e(p['website']), e(host)))
    badge = '<span class="dir-badge">Hotel</span>' if p.get('featured') else ('<span class="dir-badge">Staff pick</span>' if p.get('staff') else ('<span class="dir-badge">%s</span>' % e(p['badge']) if p.get('badge') else ''))
    return ('<article class="dir-card%s" id="%s">%s<div class="dir-eyebrow">%s</div><h2 class="dir-name">%s</h2>%s%s%s%s</article>' % (
        ' is-featured' if p.get('featured') else '', e(p['id']), badge, e(eyebrow), e(p['name']),
        '<div class="dir-where">%s</div>' % e(' · '.join(where)) if where else '',
        '<p class="dir-desc">%s</p>' % e(p['desc']) if p.get('desc') else '',
        '<ul class="dir-facts">%s</ul>' % ''.join(rows) if rows else '',
        '<div class="dir-links">%s</div>' % ''.join(links) if links else ''))

def sorted_dir():
    return sorted(DATA, key=lambda p: (not p.get('featured'), ORDER.index(p['cat']), p['name'].lower()))

# ── visible breadcrumbs ───────────────────────────────────
def crumbs_html(trail):
    li = ['<li><a href="/">Home</a></li>']
    for name, href in trail:
        if href:
            h = '/' + href
            li.append('<li><a href="%s">%s</a></li>' % (e(h), e(name)))
        else: li.append('<li aria-current="page">%s</li>' % e(name))
    return '<div class="crumbs" role="navigation" aria-label="Breadcrumb"><ol>%s</ol></div>' % ''.join(li)

def element_end(s, start):
    """index just past the element that opens at s[start]"""
    tag = re.match(r'<(\w+)', s[start:]).group(1)
    depth = 0
    for m in re.finditer(r'<(/?)%s\b[^>]*>' % tag, s[start:]):
        depth += -1 if m.group(1) else 1
        if depth == 0: return start + m.end()
    raise ValueError('unbalanced')

def add_crumbs(s, trail):
    s = re.sub(r'\n?\s*<nav class="crumbs"[^>]*>.*?</nav>', '', s, flags=re.S)
    s = re.sub(r'\n?\s*<div class="crumbs"[^>]*><ol>.*?</ol></div>', '', s, flags=re.S)
    html_ = crumbs_html(trail)
    if '<div class="list-backbar">' in s:
        return re.sub(r'<div class="list-backbar">.*?</div>', '<div class="list-backbar">\n    ' + html_ + '\n  </div>', s, count=1, flags=re.S)
    pg = re.search(r'<div class="page active"[^>]*>\s*', s)
    first = pg.end()
    end = element_end(s, first)
    return s[:end] + '\n\n  ' + html_ + s[end:]

# ── image labels ──────────────────────────────────────────
def label_images(s, page_title):
    def fix(m):
        tag = m.group(0)
        if 'aria-label' in tag or 'aria-hidden' in tag: return tag
        if 'placeholder.svg' in tag: return tag.replace('<div', '<div aria-hidden="true"', 1)
        after = s[m.end(): m.end() + 2500]
        n = re.search(r'class="[a-z-]*(?:name|title)"[^>]*>(.*?)</', after, re.S) or re.search(r'<h[1-4][^>]*>(.*?)</h[1-4]>', after, re.S)
        name = text(n.group(1)) if n else page_title
        if re.search(r'hero-bg|split-img|ph-wine', tag):
            cap = re.search(r'lp-split-cap">(.*?)</div>', after, re.S)
            name = text(cap.group(1)) if cap and 'split-img' in tag else name
        lab = 'Photo: ' + name.replace('"', '')
        return re.sub(r'^<(\w+)', r'<\1 role="img" aria-label="%s"' % e(lab), tag, 1)
    return re.sub(r'<(?:div|section|span)\b[^>]*(?:data-bg="[^"]*"|style="[^"]*background-image:url\([^)]*\)[^"]*")[^>]*>', fix, s)

# ── main per-page build ───────────────────────────────────
# ── real content dates ────────────────────────────────────
# dateModified / sitemap lastmod come from the last git commit that changed a page's
# actual content. Build-generated noise (JSON-LD, asset ?v= hashes) is ignored, so
# re-running this script does not mark every page as changed today. Uncommitted
# content edits count as today.
_DATES = {}
def _strip(s):
    s = re.sub(r'<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
    return re.sub(r'\?v=\w+', '', s)
def _git(*a):
    return subprocess.run(['git'] + list(a), capture_output=True, text=True).stdout
def page_date(f):
    if f in _DATES: return _DATES[f]
    d = TODAY
    try:
        cur = open(f, encoding='utf-8').read()
        head = subprocess.run(['git', 'show', 'HEAD:' + f], capture_output=True, text=True)
        if head.returncode == 0 and _strip(head.stdout) == _strip(cur):
            for line in _git('log', '--format=%H %cs', '--', f).split('\n'):
                if not line: continue
                h, day = line.split()
                d = day
                parent = subprocess.run(['git', 'show', h + '^:' + f], capture_output=True, text=True)
                if parent.returncode or _strip(parent.stdout) != _strip(_git('show', h + ':' + f)): break
    except Exception:
        d = TODAY
    _DATES[f] = d
    return d

def build(f):
    slug = f[:-5]
    s = open(f, encoding='utf-8').read()
    title = meta(s, r'<title>(.*?)</title>')
    desc = meta(s, r'name="description" content="([^"]*)"')
    ogimg = meta(s, r'og:image" content="([^"]*)"')
    url = BASE if slug == 'index' else BASE + slug
    wp_id = url + ('#webpage' if slug != 'index' else '#webpage')
    # keep page-specific nodes we don't regenerate
    keep = []
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        j = json.loads(m)
        for n in j.get('@graph', [j]):
            t = n.get('@type'); t = t if isinstance(t, str) else '|'.join(t)
            if t in ('BlogPosting',): keep.append(n)
    graph = [ORG, SITE, CITY]
    if slug == '404':
        graph = [ORG, SITE]
    trail = CRUMB.get(slug)
    if slug.startswith('blog-'):
        trail = [('Blog', 'blog'), (meta(s, r'og:title" content="([^"]*)"'), None)]
    bc = None
    if trail:
        items = [{'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE}]
        for i, (nm, href) in enumerate(trail):
            li = {'@type': 'ListItem', 'position': i + 2, 'name': nm}
            li['item'] = (BASE + href) if href else url
            items.append(li)
        bc = {'@type': 'BreadcrumbList', '@id': url + '#breadcrumb', 'itemListElement': items}
    if slug != '404':
        wp = {'@type': PTYPE.get(slug, 'WebPage'), '@id': wp_id, 'url': url, 'name': title, 'description': desc,
              'isPartOf': {'@id': SITE_ID}, 'about': {'@id': CITY_ID}, 'publisher': {'@id': ORG_ID},
              'inLanguage': 'en-US', 'dateModified': page_date(f)}
        if ogimg: wp['primaryImageOfPage'] = {'@type': 'ImageObject', 'url': ogimg}
        if bc: wp['breadcrumb'] = {'@id': bc['@id']}
        graph.append(wp)
    if bc: graph.append(bc)
    extra = []
    if slug in HOTEL_EXTRA:
        h = hotel_node(slug, s); extra.append(h); graph[-2 if bc else -1]['mainEntity'] = {'@id': h['@id']}
    fq = faq_node(slug, s) if slug != 'index' else None
    if fq: extra.append(fq)
    if slug in ('index', 'hotels'):
        items = [('Art House Santa Rosa', BASE + 'art-house'), ('Hotel E Santa Rosa', BASE + 'hotel-e')]
        il = itemlist(slug, 'Boutique hotels in downtown Santa Rosa', items)
        extra += [il, business(BY_ID['art-house-santa-rosa']), business(BY_ID['hotel-e'])]
        if slug == 'hotels': graph[-2 if bc else -1]['mainEntity'] = {'@id': il['@id']}
    if slug in ('dining-list', 'wine-country-list', 'attractions-list', 'dining', 'wine-country', 'attractions'):
        pat = r'class="(?:brewery-card-name|attr-card-name|lp-card-title)"[^>]*>(.*?)</'
        items, ents = list_items(s, pat)
        names = {'dining-list': 'Restaurants in downtown Santa Rosa', 'dining': 'Where to eat in downtown Santa Rosa',
                 'wine-country-list': 'Wineries and breweries near Santa Rosa', 'wine-country': 'Wineries and tasting rooms near Santa Rosa',
                 'attractions-list': 'Attractions in Santa Rosa and Sonoma County', 'attractions': 'Things to do in Santa Rosa'}
        if items:
            il = itemlist(slug, names[slug], items); extra.append(il); extra += ents
            graph[-2 if bc else -1]['mainEntity'] = {'@id': il['@id']}
    if slug == 'directory':
        ents = [business(p) for p in sorted_dir()]
        il = itemlist('directory', 'Santa Rosa directory: restaurants, wineries, breweries, hotels and attractions',
                      [(p['name'], BASE + 'directory#' + p['id']) for p in sorted_dir()])
        graph[-2]['mainEntity'] = {'@id': il['@id']}
        extra += [il] + ents
        # prerender cards for crawlers (JS replaces on load)
        st = re.search(r'<(\w+)[^>]*data-dir-list[^>]*>', s)
        en = element_end(s, st.start())
        closing = re.search(r'</\w+>$', s[:en]).group(0)
        s = s[:st.end()] + ''.join(card(p) for p in sorted_dir()) + closing + s[en:]
    if slug == 'blog':
        posts = re.findall(r'<a class="post-row" href="/?([^"]+?)(?:\.html)?">.*?post-row__title">(.*?)</h2>', s, re.S)
        extra.append({'@type': 'Blog', '@id': BASE + 'blog#blog', 'name': 'Stay Santa Rosa Journal', 'url': BASE + 'blog',
                      'publisher': {'@id': ORG_ID}, 'inLanguage': 'en-US',
                      'blogPost': [{'@type': 'BlogPosting', '@id': BASE + h + '#article', 'headline': text(t), 'url': BASE + h} for h, t in posts]})
    for n in keep:
        n['@id'] = url + '#article'; n['isPartOf'] = {'@id': wp_id}; n['author'] = {'@id': ORG_ID}; n['publisher'] = {'@id': ORG_ID}
        n['about'] = {'@id': CITY_ID}; n['dateModified'] = page_date(f)
        graph[-2]['mainEntity'] = {'@id': n['@id']}
    graph += extra + keep
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, separators=(',', ':'))
    ld = ld.replace('</', '<\\/')
    s = re.sub(r'\s*<script type="application/ld\+json">.*?</script>', '', s, flags=re.S)
    s = s.replace('  <!-- /ssr:meta -->', '  <script type="application/ld+json">' + ld + '</script>\n  <!-- /ssr:meta -->', 1)
    if slug == '404':
        s = re.sub(r'<meta name="robots" content="[^"]*" />', '<meta name="robots" content="noindex, follow" />', s)
    if trail: s = add_crumbs(s, trail)
    s = label_images(s, re.sub(r'\s*\|.*', '', title))
    open(f, 'w', encoding='utf-8').write(s)
    return len(graph)

pages = sorted(x for x in os.listdir('.') if x.endswith('.html'))
for f in pages: page_date(f)
for f in pages: print(f, build(f))

# ── sitemap ───────────────────────────────────────────────
PRI = {'index': '1.0', 'directory': '0.9', 'dining': '0.9', 'wine-country': '0.9', 'attractions': '0.9',
       'art-house': '0.8', 'hotel-e': '0.8', 'hotels': '0.9', 'deals': '0.8', 'dining-list': '0.8', 'wine-country-list': '0.8', 'attractions-list': '0.8', 'blog': '0.7', 'about': '0.5'}
urls = []
for f in pages:
    slug = f[:-5]
    if slug == '404': continue
    loc = BASE if slug == 'index' else BASE + slug
    pr = PRI.get(slug, '0.7' if slug.startswith('blog-') else '0.3')
    cf = 'weekly' if pr >= '0.8' else 'monthly'
    urls.append('  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>' % (loc, page_date(f), cf, pr))
open('sitemap.xml', 'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + '\n'.join(urls) + '\n</urlset>\n')
print('sitemap', len(urls))

# ── llms.txt (AI assistant summary) ───────────────────────
def pmeta(f):
    s = open(f, encoding='utf-8').read()
    t = re.sub(r'\s*\|\s*Stay Santa Rosa$', '', meta(s, r'<title>(.*?)</title>'))
    return t, meta(s, r'name="description" content="([^"]*)"')
def link(slug):
    t, d = pmeta(slug + '.html')
    return '- [%s](%s%s): %s' % (t, BASE, '' if slug == 'index' else slug, d)
SECTIONS = [
 ('Plan a trip', ['index', 'directory', 'contact']),
 ('Where to stay: hotels', ['hotels', 'art-house', 'hotel-e', 'deals']),
 ('Eat and drink', ['dining', 'dining-list', 'wine-country', 'wine-country-list']),
 ('Things to do', ['attractions', 'attractions-list']),
 ('Journal', ['blog'] + sorted(x[:-5] for x in pages if x.startswith('blog-'))),
]
L = ['# Stay Santa Rosa', '',
     '> Stay Santa Rosa (staysantarosa.com) is a general travel guide to Santa Rosa, California, created and operated by Hotel E and Art House Santa Rosa. It covers Santa Rosa, the largest city in Sonoma County and the gateway to California wine country, and where to stay, eat, drink and explore: downtown restaurants, Sonoma County wineries and craft breweries, museums, parks, the coast, annual events and the two downtown hotels behind the site. Other businesses are listed at no charge.', '',
     'Key facts for travelers:',
     '- Downtown Santa Rosa is walkable and centers on Old Courthouse Square and Historic Railroad Square.',
     '- The Russian River Valley, Sonoma Valley (Kenwood), Dry Creek Valley and Alexander Valley wine regions are each roughly 20 to 30 minutes by car from downtown.',
     '- Santa Rosa is home to Russian River Brewing Co. (Pliny the Elder), the Charles M. Schulz Museum and Luther Burbank Home & Gardens.',
     '- Armstrong Redwoods (Guerneville) is about 35 minutes west and Bodega Bay on the Sonoma Coast is under an hour away.',
     '- Hotels: Art House Santa Rosa (620 7th St) and Hotel E (37 Old Courthouse Sq), both a short walk from Old Courthouse Square.',
     '- Listings requests and corrections: hello@staysantarosa.com', '',
     'Full text of every page, plus complete directory details (address, phone, hours, website), in one Markdown file: %sllms-full.txt' % BASE, '']
for title, slugs in SECTIONS:
    L += ['## ' + title, ''] + [link(sl) for sl in slugs if os.path.exists(sl + '.html')] + ['']
CATNAME = {'dining': 'Restaurants, cafés and bars', 'wine': 'Wineries and breweries', 'hotels': 'Hotels', 'attractions': 'Attractions'}
L += ['## Directory listings', '', 'Every business below has a card at %sdirectory#<id> with address, phone, hours and links.' % BASE, '']
for c in ORDER:
    L += ['### ' + CATNAME[c], '']
    for p in sorted([x for x in DATA if x['cat'] == c], key=lambda x: x['name'].lower()):
        bits = [p.get('type') or '']
        loc = p.get('address') or p.get('area') or ''
        if loc: bits.append(loc)
        L.append('- [%s](%sdirectory#%s): %s. %s' % (p['name'], BASE, p['id'], ' · '.join(b for b in bits if b), (p.get('desc') or '').strip()))
    L.append('')
L += ['## Optional', '', link('about'), link('privacy'), link('terms'), link('accessibility'), '']
open('llms.txt', 'w', encoding='utf-8').write('\n'.join(L))
print('llms.txt', len(L), 'lines')
# ── llms-full.txt (full page text as Markdown for AI assistants) ──
from html.parser import HTMLParser
from urllib.parse import urljoin

class MD(HTMLParser):
    """Minimal HTML → Markdown for page body copy. Skips site chrome (nav, menus, footer),
    scripts, icons, forms and anything hidden from assistive tech."""
    SKIP_TAGS = {'nav', 'footer', 'script', 'style', 'svg', 'noscript', 'template', 'form',
                 'button', 'iframe', 'select', 'textarea', 'head', 'dialog'}
    SKIP_CLASSES = {'mobile-menu', 'site-header', 'ssr-attribution', 'breadcrumbs', 'breadcrumb',
                    'sr-only', 'visually-hidden', 'skip-link', 'cookie-banner',
                    'home-trip-bar', 'trip-bar', 'trip-pill', 'hero-dots', 'tpc-header'}
    VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
    BLOCK = {'p', 'div', 'section', 'article', 'header', 'aside', 'figure', 'figcaption', 'blockquote',
             'ul', 'ol', 'table', 'tr', 'dl', 'dt', 'dd', 'address', 'details', 'summary'}

    def __init__(self, page_url):
        super().__init__(convert_charrefs=True)
        self.url, self.out, self.skip, self.stack = page_url, [], 0, []
        self.href, self.lists, self.amark, self.inh = None, [], None, False

    def nl(self, n=2):
        cur = ''.join(self.out[-3:])
        need = n - (len(cur) - len(cur.rstrip('\n')))
        if self.out and need > 0: self.out.append('\n' * need)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in self.VOID:
            if not self.skip and tag == 'br': self.out.append(' ' if self.inh else '\n')
            return
        hide = (tag in self.SKIP_TAGS or a.get('aria-hidden') == 'true' or 'hidden' in a
                or set((a.get('class') or '').split()) & self.SKIP_CLASSES)
        self.stack.append(bool(hide))
        if hide: self.skip += 1
        if self.skip: return
        if re.fullmatch(r'h[1-6]', tag):
            self.nl(); self.out.append('#' * int(tag[1]) + ' '); self.inh = True
        elif tag in ('ul', 'ol'):
            self.nl(1 if self.lists else 2); self.lists.append([tag, 0])
        elif tag == 'li':
            self.nl(1)
            if self.lists:
                l = self.lists[-1]; l[1] += 1
                self.out.append('  ' * (len(self.lists) - 1) + ('%d. ' % l[1] if l[0] == 'ol' else '- '))
            else:
                self.out.append('- ')
        elif tag in ('strong', 'b'): self.out.append('**')
        elif tag in ('em', 'i'): self.out.append('_')
        elif tag == 'a':
            h = (a.get('href') or '').strip()
            self.href = None if not h or h.startswith(('#', 'javascript:')) else urljoin(self.url, h)
            if self.href: self.out.append('['); self.amark = len(self.out) - 1
        elif tag == 'td' or tag == 'th': self.out.append(' | ')
        elif tag in self.BLOCK: self.nl()

    def handle_endtag(self, tag):
        if tag in self.VOID or not self.stack: return
        hidden = self.stack.pop()
        if hidden: self.skip -= 1; return
        if self.skip: return
        if re.fullmatch(r'h[1-6]', tag): self.inh = False; self.nl()
        elif tag in ('ul', 'ol'):
            if self.lists: self.lists.pop()
            self.nl(1 if self.lists else 2)
        elif tag in ('strong', 'b'): self.out.append('**')
        elif tag in ('em', 'i'): self.out.append('_')
        elif tag == 'a' and self.href:
            inner = ''.join(self.out[self.amark + 1:])
            if '\n' in inner.strip():          # card-style link wrapping blocks: list the URL after it
                self.out[self.amark] = ''
                self.nl(); self.out.append('Link: %s' % self.href); self.nl()
            else:
                self.out.append('](%s)' % self.href)
            self.href = None
        elif tag in self.BLOCK: self.nl()

    def handle_data(self, d):
        if self.skip: return
        d = re.sub(r'\s+', ' ', d)
        if d.strip() or (self.out and not self.out[-1].endswith(('\n', ' '))): self.out.append(d)

    def markdown(self):
        t = ''.join(self.out)
        t = re.sub(r'\*\*\s*\*\*|__', '', t)                 # empty emphasis
        t = re.sub(r'\[\s*\]\([^)]*\)', '', t)                # links with no text (icons)
        t = re.sub(r'\[\s+', '[', t); t = re.sub(r'\s+\]\(', '](', t)
        t = re.sub(r'[ \t]+\n', '\n', t); t = re.sub(r'\n[ \t]+(?![-\d])', '\n', t)
        t = re.sub(r'(?m)^(#+ |[-*] |\d+\. )\s*$', '', t)      # empty headings/bullets
        t = re.sub(r'\n{3,}', '\n\n', t)
        return t.strip()

def page_markdown(f):
    slug = f[:-5]
    url = BASE if slug == 'index' else BASE + slug
    s = open(f, encoding='utf-8').read()
    body = s[s.find('<body'):] if '<body' in s else s
    m = MD(url); m.feed(body); m.close()
    return url, m.markdown()

def hours_line(p):
    h = p.get('hours')
    if not h: return p.get('hoursNote') or ''
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    vals = [h.get(d, 'Closed') for d in days]
    if len(set(vals)) == 1: return 'Daily ' + vals[0]
    return '; '.join('%s %s' % (d[:3], v) for d, v in zip(days, vals))

F = ['# Stay Santa Rosa — full text', '',
     '> Complete text of every page on staysantarosa.com, a travel guide to Santa Rosa, California (Sonoma County wine country) created by Hotel E and Art House Santa Rosa, followed by full details for every business in the local directory. Summary and page index: %sllms.txt' % BASE, '',
     'Last generated: %s' % TODAY, '']
ORDER_PAGES = [sl for _, sls in SECTIONS for sl in sls] + ['about', 'accessibility', 'privacy', 'terms']
seen = set()
for sl in ORDER_PAGES:
    f = sl + '.html'
    if sl in seen or not os.path.exists(f) or sl == 'directory': continue
    seen.add(sl)
    t, d = pmeta(f)
    url, md = page_markdown(f)
    F += ['---', '', '# %s' % t, '', 'URL: %s' % url, 'Updated: %s' % page_date(f)] + (['Summary: ' + d] if d else []) + ['']
    md = re.sub(r'^# [^\n]*\n+', '', md, count=1) if md.startswith('# ') else md   # page H1 already used above
    F += [re.sub(r'(?m)^(#{1,5}) ', r'#\1 ', md), '']

F += ['---', '', '# Santa Rosa local directory', '', 'URL: %sdirectory' % BASE,
      'Every business below has a card at %sdirectory#<id>. Hours, ratings and review counts were taken from each business\'s Google Business Profile and may have changed; confirm before visiting.' % BASE, '']
for c in ORDER:
    F += ['## ' + CATNAME[c], '']
    for p in sorted([x for x in DATA if x['cat'] == c], key=lambda x: x['name'].lower()):
        F += ['### ' + p['name'], '']
        area = (p.get('area') or '').strip()
        if area and area.split(',')[0] in (p.get('address') or ''): area = ''
        rows = [('Type', p.get('type')), ('Area', area), ('Address', p.get('address')),
                ('Phone', p.get('phone')), ('Website', p.get('website')), ('Hours', hours_line(p)),
                ('Walk from downtown', '%s min' % p['walk'] if p.get('walk') else ''),
                ('Distance', p.get('distance')),
                ('Google rating', '%s (%s reviews)' % (p['rating'], p.get('reviews', '?')) if p.get('rating') else ''),
                ('Price', ' '.join(t for t in (p.get('tags') or []) if set(t) == {'$'})),
                ('Map', p.get('maps')), ('Listing', '%sdirectory#%s' % (BASE, p['id']))]
        F += ['- %s: %s' % (k, v) for k, v in rows if v]
        if (p.get('desc') or '').strip(): F += ['', p['desc'].strip()]
        F.append('')
open('llms-full.txt', 'w', encoding='utf-8').write('\n'.join(F).rstrip() + '\n')
print('llms-full.txt', len(F), 'lines')

# ── ASSET VERSIONING: bust browser/CDN caches when CSS or JS changes ──
import hashlib
VER = {}
for d in ('css', 'js'):
    for fn in os.listdir(d):
        if fn.endswith(('.css', '.js')):
            VER[d + '/' + fn] = hashlib.md5(open(os.path.join(d, fn), 'rb').read()).hexdigest()[:8]
for f in pages:
    s = open(f, encoding='utf-8').read(); o = s
    s = re.sub(r'((?:href|src)=")((?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[\w]+)?(")',
               lambda m: m.group(1) + m.group(2) + ('?v=' + VER[m.group(2)] if m.group(2) in VER else '') + m.group(3), s)
    if s != o: open(f, 'w', encoding='utf-8').write(s)
print('versioned', len(VER), 'files')
