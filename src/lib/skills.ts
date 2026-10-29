/**
 * Skill normalisation. Matching compares *canonical* skill keys so that
 * "ReactJS", "react.js" and "React" all count as the same skill.
 * The alias table is deliberately small and visible — extend it as needed.
 */
const ALIASES: Record<string, string> = {
  js: 'javascript',
  'java script': 'javascript',
  ts: 'typescript',
  reactjs: 'react',
  'react.js': 'react',
  'react js': 'react',
  'node.js': 'node',
  nodejs: 'node',
  'node js': 'node',
  'vue.js': 'vue',
  vuejs: 'vue',
  py: 'python',
  'ms excel': 'excel',
  'microsoft excel': 'excel',
  'ms word': 'word',
  'customer care': 'customer service',
  'social media': 'social media marketing',
  smm: 'social media marketing',
  'ui/ux': 'ux design',
  'ui design': 'ux design',
  ux: 'ux design',
  'graphic designer': 'graphic design',
  photography: 'photography',
  'data analysis': 'data analysis',
  'data analytics': 'data analysis',
  'driving permit': 'driving',
  'boda boda': 'motorcycle riding',
  'mobile money': 'mobile money',
  accounting: 'bookkeeping',
  quickbooks: 'quickbooks',
  firestore: 'firebase',
  'google firebase': 'firebase',
  'flutter dev': 'flutter',
  electrical: 'electrical installation',
  wiring: 'electrical installation',
  plumbing: 'plumbing',
  'event planning': 'event management',
};

export function skillKey(raw: string): string {
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[k] ?? k;
}

/** Title-case for display while keeping well-known acronyms upright. */
const DISPLAY_OVERRIDES: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  'ux design': 'UX Design',
  sql: 'SQL',
  css: 'CSS',
  html: 'HTML',
  seo: 'SEO',
  quickbooks: 'QuickBooks',
  node: 'Node.js',
  api: 'API',
  'rest api': 'REST API',
  aws: 'AWS',
  'power bi': 'Power BI',
  cctv: 'CCTV',
  'electrical installation': 'Electrical installation',
};

export function skillLabel(key: string): string {
  const k = skillKey(key);
  if (DISPLAY_OVERRIDES[k]) return DISPLAY_OVERRIDES[k];
  return k.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Split a comma/semicolon separated string into unique cleaned skills. */
export function parseSkillList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,;\n]/)) {
    const t = part.trim();
    if (!t) continue;
    const k = skillKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function uniqueSkills(list: string[]): string[] {
  const seen = new Set<string>();
  return list.filter((s) => {
    const k = skillKey(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export const SUGGESTED_SKILLS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Firebase', 'Python', 'SQL', 'Flutter',
  'UX Design', 'Graphic Design', 'Figma', 'Photography', 'Video Editing', 'Copywriting',
  'Social Media Marketing', 'Customer Service', 'Sales', 'Bookkeeping', 'Excel', 'Data Analysis',
  'Driving', 'Motorcycle Riding', 'Electrical installation', 'Plumbing', 'Carpentry', 'Welding',
  'Event Management', 'Catering', 'Luganda', 'Swahili', 'English', 'Project Management',
];

export const KNOWN_LOCATIONS = [
  'Kampala', 'Entebbe', 'Wakiso', 'Mukono', 'Jinja', 'Mbarara', 'Gulu', 'Mbale', 'Fort Portal', 'Lira', 'Masaka', 'Arua',
];

export function locationKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ').replace(/,.*$/, '');
}
