import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, ExternalLink, MapPin, Search, X } from 'lucide-react';
import { usePublicProfiles } from '../data/DataProvider';
import { SAMPLE_CANDIDATES } from '../data/seed';
import { locationKey, skillKey } from '../lib/skills';
import { AVAILABILITY_LABELS, type PublicProfile } from '../lib/types';
import { safeUrl } from '../lib/validation';
import { Avatar } from './ui';

/* ---------- projection (lon/lat → SVG units) ---------- */
const W = 580;
const H = 600;
const px = (lon: number) => (lon - 29.4) * 100;
const py = (lat: number) => (4.4 - lat) * 100;
const toPath = (pts: [number, number][]) =>
  pts.map(([lon, lat], i) => `${i ? 'L' : 'M'}${px(lon).toFixed(1)},${py(lat).toFixed(1)}`).join(' ') + ' Z';

// Simplified national border (Natural Earth 1:110m) and the Ugandan part of Lake Victoria.
const BORDER = toPath([
  [33.9, -0.95], [31.87, -1.03], [30.77, -1.01], [30.42, -1.13], [29.82, -1.44], [29.58, -1.34], [29.59, -0.59],
  [29.82, -0.21], [29.88, 0.6], [30.09, 1.06], [30.47, 1.58], [30.85, 1.85], [31.17, 2.2], [30.77, 2.34],
  [30.83, 3.51], [31.25, 3.78], [31.88, 3.56], [32.69, 3.79], [33.39, 3.79], [34.01, 4.25], [34.48, 3.56],
  [34.6, 3.05], [35.04, 1.91], [34.67, 1.18], [34.18, 0.52], [33.89, 0.11],
]);
const LAKE = toPath([
  [31.79, -1.0], [31.75, -0.55], [31.83, -0.2], [32.1, 0.05], [32.45, 0.03], [32.7, 0.18], [33.0, 0.12],
  [33.2, 0.38], [33.55, 0.22], [33.9, 0.05], [33.9, -0.98],
]);

// Towns around Kampala are nudged apart slightly so their people stay readable.
const TOWNS: Record<string, [number, number]> = {
  Kampala: [32.58, 0.35],
  Wakiso: [32.15, 0.72],
  Entebbe: [32.42, -0.12],
  Mukono: [32.9, 0.75],
  Jinja: [33.2, 0.44],
  Mbarara: [30.66, -0.61],
  Gulu: [32.3, 2.78],
  Lira: [32.9, 2.25],
  Mbale: [34.18, 1.08],
  'Fort Portal': [30.27, 0.67],
  Masaka: [31.73, -0.33],
  Arua: [30.91, 3.02],
};
const PRIMARY = ['Kampala', 'Wakiso', 'Entebbe', 'Jinja', 'Gulu', 'Mbarara'];
const COUNTRY_CENTER: [number, number] = [32.3, 1.35];
// Only label the Kampala-area towns when selected; their labels would overlap otherwise.
const CENTRAL = new Set(['Kampala', 'Wakiso', 'Entebbe', 'Mukono']);

/** "kampala, uganda" → "Kampala"; null when the town isn't on the map. */
const townOf = (raw: string) => Object.keys(TOWNS).find((t) => t.toLowerCase() === locationKey(raw)) ?? null;

type Person = Pick<PublicProfile, 'id' | 'name' | 'headline' | 'location' | 'skills' | 'experienceYears' | 'experienceSummary' | 'availability' | 'portfolioUrl'>;
type Marker = Person & { town: string | null; x: number; y: number };

// Spread people who share a town around its point so avatars don't stack.
function placeMarkers(people: Person[]): Marker[] {
  const byTown = new Map<string, Person[]>();
  for (const c of people) {
    const t = townOf(c.location) ?? '';
    byTown.set(t, [...(byTown.get(t) ?? []), c]);
  }
  const out: Marker[] = [];
  for (const [t, group] of byTown) {
    const [lon, lat] = TOWNS[t] ?? COUNTRY_CENTER;
    group.forEach((c, i) => {
      const r = group.length > 1 ? 22 + group.length * 2 : 0;
      const a = (i / group.length) * Math.PI * 2 - Math.PI / 2;
      out.push({ ...c, town: t || null, x: px(lon) + Math.cos(a) * r, y: py(lat) + Math.sin(a) * r });
    });
  }
  return out;
}

/* ---------- search: every meaningful word must hit a skill, headline, name or town ---------- */
const GENERIC = new Set([
  'a', 'an', 'the', 'and', 'or', 'in', 'at', 'for', 'with', 'who', 'can', 'near', 'from',
  'developer', 'developers', 'dev', 'engineer', 'programmer', 'specialist', 'expert', 'freelancer', 'worker', 'someone', 'person',
]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);

function tokenHits(token: string, p: Marker): boolean {
  const key = skillKey(token);
  if (p.skills.some((sk) => skillKey(sk) === key)) return true;
  const ws = [p.name, p.headline, p.location, ...p.skills].flatMap(words);
  // Short words ("go", "js") must match a whole word so "go" doesn't hit "Google".
  return ws.some((w) => w === token || w === key || (token.length >= 3 && w.startsWith(token)));
}

function parseQuery(q: string) {
  const tokens = words(q);
  const town = Object.keys(TOWNS).find((t) => locationKey(q).includes(t.toLowerCase())) ?? null;
  const townWords = new Set(town ? words(town) : []);
  const rest = tokens.filter((t) => !townWords.has(t));
  const specific = rest.filter((t) => !GENERIC.has(t));
  return { town, terms: specific.length ? specific : rest };
}

const norm = (s: string) => s.toLowerCase().trim();

export function TalentMap() {
  const [town, setTown] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [visible, setVisible] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);
  const live = usePublicProfiles();

  // Real profiles first, then the fictional samples.
  const markers = useMemo(() => {
    const ids = new Set(live.map((p) => p.id));
    return placeMarkers([...live, ...SAMPLE_CANDIDATES.filter((c) => !ids.has(c.id))]);
  }, [live]);
  const more = useMemo(
    () => Object.keys(TOWNS).filter((t) => !PRIMARY.includes(t) && markers.some((m) => m.town === t)),
    [markers],
  );

  // Reveal the rings and people once the section scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return setVisible(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setVisible(true), io.disconnect()), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onQuery = (v: string) => {
    setQuery(v);
    const hit = parseQuery(v).town;
    if (hit) setTown(hit);
  };

  const pickTown = (t: string | null) => {
    setTown(t);
    if (query && Object.keys(TOWNS).some((k) => norm(k) === norm(query))) setQuery('');
  };

  const { terms } = useMemo(() => parseQuery(query), [query]);
  const matches = useMemo(
    () =>
      new Set(
        markers
          .filter((m) => (!town || m.town === town) && terms.every((t) => tokenHits(t, m)))
          .map((m) => m.id),
      ),
    [markers, town, terms],
  );

  const [cx, cy] = town ? [px(TOWNS[town][0]), py(TOWNS[town][1])] : [px(COUNTRY_CENTER[0]), py(COUNTRY_CENTER[1])];
  const [rIn, rOut] = town ? [70, 130] : [190, 290];
  const found = markers.filter((m) => matches.has(m.id));
  const label = terms.length ? `matching “${terms.join(' ')}”` : '';
  const toggle = (id: string) => setSelected((s) => (s === id ? null : id));

  return (
    <section className={`tmap ${visible ? 'in' : ''}`} ref={ref} id="map">
      <h2>Find talent anywhere in Uganda</h2>
      <p className="muted">Pick a town or search a skill to see who&rsquo;s nearby. These are fictional sample profiles.</p>

      <div className="tmap-panel glass">
        <div className="tmap-bar">
          <div className="tmap-pills" role="tablist" aria-label="Filter by town">
            <button className={!town ? 'on' : ''} onClick={() => pickTown(null)}>All</button>
            {[...PRIMARY, ...(showMore ? more : [])].map((t) => (
              <button key={t} className={town === t ? 'on' : ''} onClick={() => pickTown(t)}>{t}</button>
            ))}
            {!showMore && more.length > 0 && <button onClick={() => setShowMore(true)}>+ more</button>}
          </div>
          <label className="tmap-search">
            <Search size={14} />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search a skill, name or town" />
          </label>
        </div>

        <div className="tmap-body">
        <div className="tmap-stage">
          <div className="tmap-map">
            <svg viewBox={`0 0 ${W} ${H}`} aria-hidden>
              <defs>
                <radialGradient id="tmap-glow">
                  <stop offset="0%" stopColor="#7c95ff" stopOpacity="0.45" />
                  <stop offset="55%" stopColor="#b9c8ff" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path d={BORDER} className="tmap-land" />
              <path d={LAKE} className="tmap-lake" />
              <g className="tmap-focus" style={{ transform: `translate(${cx}px, ${cy}px)` }}>
                <circle r={rOut * 1.05} fill="url(#tmap-glow)" />
                <circle r={rIn} className="tmap-inner" />
                <circle r={rOut} className="tmap-ring outer" />
                <circle r={rIn} className="tmap-ring inner" />
              </g>
              {Object.entries(TOWNS)
                .filter(([t]) => !CENTRAL.has(t) || town === t)
                .map(([t, [lon, lat]]) => (
                  <text key={t} x={px(lon)} y={py(lat) - (t === 'Kampala' ? 50 : 26)} textAnchor="middle" className={`tmap-town ${town === t ? 'on' : ''}`}>{t}</text>
                ))}
            </svg>

            {town && (
              <span className="tmap-pin" style={{ left: `${(cx / W) * 100}%`, top: `${(cy / H) * 100}%` }} aria-hidden />
            )}
            {markers.map((m, i) => (
              <div
                key={m.id}
                className={`tmap-person ${matches.has(m.id) ? '' : 'dim'} ${selected === m.id ? 'sel' : ''}`}
                style={{ left: `${(m.x / W) * 100}%`, top: `${(m.y / H) * 100}%`, transitionDelay: `${i * 40}ms` }}
                onClick={() => toggle(m.id)}
              >
                <Avatar name={m.name} size={26} />
                <div className="tmap-card glass-strong">
                  <b>{m.name}</b>
                  <span>{m.headline} · {m.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="tmap-list">
          <div className="tmap-list-head">
            <b>{found.length} {found.length === 1 ? 'person' : 'people'}</b> {label} {town ? `in ${town}` : 'across Uganda'}
          </div>
          {found.length === 0 && (
            <p className="muted small tmap-empty">No one matches yet. Try another skill or pick &ldquo;All&rdquo;.</p>
          )}
          {found.map((m) => {
            const open = selected === m.id;
            return (
              <div key={m.id} className={`tmap-item ${open ? 'open' : ''}`}>
                <button className="tmap-item-head" onClick={() => toggle(m.id)} aria-expanded={open}>
                  <Avatar name={m.name} size={36} />
                  <span className="tmap-item-id">
                    <b>{m.name}</b>
                    <span>{m.headline}</span>
                  </span>
                  {open && <X size={14} className="muted" />}
                </button>
                <div className="tmap-meta">
                  <span><MapPin size={11} /> {m.location}</span>
                  <span><Briefcase size={11} /> {m.experienceYears} yrs</span>
                </div>
                <div className="tmap-skills">
                  {m.skills.slice(0, open ? undefined : 3).map((s) => <span key={s} className="badge">{s}</span>)}
                  {!open && m.skills.length > 3 && <span className="badge">+{m.skills.length - 3}</span>}
                </div>
                {open && (
                  <div className="tmap-detail">
                    <p>{m.experienceSummary}</p>
                    <p className="muted">Open to: {m.availability.map((a) => AVAILABILITY_LABELS[a]).join(', ')}</p>
                    {safeUrl(m.portfolioUrl) && (
                      <a className="link-out" href={safeUrl(m.portfolioUrl)!} target="_blank" rel="noopener noreferrer">
                        View portfolio <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </aside>
        </div>
      </div>
    </section>
  );
}
