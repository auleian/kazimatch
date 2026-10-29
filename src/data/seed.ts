import type { CandidateInput, OpportunityInput } from '../lib/types';

/**
 * FICTIONAL sample data for demos. These are not real people and not real
 * vacancies. Emails use the reserved example.com domain; phone numbers are
 * placeholders.
 */
type SampleCandidate = Omit<CandidateInput, 'ownerId'> & { id: string };
type SampleOpportunity = Omit<OpportunityInput, 'employerId'> & { id: string };

export const SAMPLE_CANDIDATES: SampleCandidate[] = [
  {
    id: 'sample-c01', sample: true, name: 'Amara Nakato', headline: 'Frontend developer',
    email: 'amara.nakato@example.com', phone: '+256 700 000 101', location: 'Kampala', willingToRelocate: false,
    skills: ['React', 'TypeScript', 'Firebase', 'CSS', 'Figma'], experienceYears: 4,
    experienceSummary: 'Built customer dashboards and mobile-money checkout flows for two fictional fintech start-ups. Comfortable owning a feature from Figma to production.',
    availability: ['part-time', 'gig'],
  },
  {
    id: 'sample-c02', sample: true, name: 'Brian Okello', headline: 'Full-stack JavaScript developer',
    email: 'brian.okello@example.com', phone: '+256 700 000 102', location: 'Gulu', willingToRelocate: true,
    skills: ['JavaScript', 'Node.js', 'React', 'SQL', 'Firebase'], experienceYears: 6,
    experienceSummary: 'Six years building APIs and admin portals for NGOs and logistics teams. Led a small team migrating a records system to the cloud.',
    availability: ['full-time', 'gig'],
  },
  {
    id: 'sample-c03', sample: true, name: 'Grace Atim', headline: 'Product & UX designer',
    email: 'grace.atim@example.com', phone: '+256 700 000 103', location: 'Kampala', willingToRelocate: false,
    skills: ['UX Design', 'Figma', 'Graphic Design', 'User Research'], experienceYears: 3,
    experienceSummary: 'Designs simple, low-bandwidth interfaces. Ran user interviews with market vendors for a fictional savings app.',
    availability: ['part-time', 'gig', 'weekends'],
  },
  {
    id: 'sample-c04', sample: true, name: 'Daniel Mugisha', headline: 'Data analyst',
    email: 'daniel.mugisha@example.com', phone: '+256 700 000 104', location: 'Mbarara', willingToRelocate: false,
    skills: ['Python', 'SQL', 'Excel', 'Power BI', 'Data Analysis'], experienceYears: 5,
    experienceSummary: 'Turns messy spreadsheets into dashboards. Five years of reporting for agriculture co-operatives and a regional SACCO.',
    availability: ['full-time'],
  },
  {
    id: 'sample-c05', sample: true, name: 'Sharon Achieng', headline: 'Social media & content creator',
    email: 'sharon.achieng@example.com', phone: '+256 700 000 105', location: 'Kampala', willingToRelocate: false,
    skills: ['Social Media Marketing', 'Copywriting', 'Canva', 'Photography'], experienceYears: 2,
    experienceSummary: 'Runs Instagram and TikTok pages for small food and fashion businesses; grew one page from 300 to 12,000 followers.',
    availability: ['part-time', 'weekends', 'gig'],
  },
  {
    id: 'sample-c06', sample: true, name: 'Joseph Ssempala', headline: 'Electrician & solar technician',
    email: 'joseph.ssempala@example.com', phone: '+256 700 000 106', location: 'Wakiso', willingToRelocate: false,
    skills: ['Electrical installation', 'Solar Installation', 'CCTV'], experienceYears: 8,
    experienceSummary: 'Eight years wiring homes and shops and installing rooftop solar systems. Certified for domestic installations (fictional profile).',
    availability: ['full-time', 'gig', 'weekends'],
  },
  {
    id: 'sample-c07', sample: true, name: 'Patience Namutebi', headline: 'Bookkeeper',
    email: 'patience.namutebi@example.com', phone: '+256 700 000 107', location: 'Entebbe', willingToRelocate: false,
    skills: ['Bookkeeping', 'QuickBooks', 'Excel', 'Mobile Money'], experienceYears: 4,
    experienceSummary: 'Keeps the books for three small hospitality businesses: reconciliations, payroll and monthly reports.',
    availability: ['part-time', 'full-time'],
  },
  {
    id: 'sample-c08', sample: true, name: 'Ivan Kato', headline: 'Delivery rider',
    email: 'ivan.kato@example.com', phone: '+256 700 000 108', location: 'Kampala', willingToRelocate: false,
    skills: ['Motorcycle Riding', 'Driving', 'Customer Service', 'Luganda'], experienceYears: 3,
    experienceSummary: 'Three years delivering parcels and food across Kampala. Knows the city well and keeps a clean safety record.',
    availability: ['gig', 'weekends', 'part-time'],
  },
  {
    id: 'sample-c09', sample: true, name: 'Ruth Akello', headline: 'Event coordinator',
    email: 'ruth.akello@example.com', phone: '+256 700 000 109', location: 'Jinja', willingToRelocate: true,
    skills: ['Event Management', 'Catering', 'Customer Service', 'Project Management'], experienceYears: 5,
    experienceSummary: 'Coordinated weddings, conferences and product launches for up to 400 guests; manages vendors and budgets.',
    availability: ['gig', 'weekends'],
  },
  {
    id: 'sample-c10', sample: true, name: 'Moses Tumwine', headline: 'Junior mobile developer',
    email: 'moses.tumwine@example.com', phone: '+256 700 000 110', location: 'Kampala', willingToRelocate: false,
    skills: ['Flutter', 'Dart', 'Firebase', 'REST API'], experienceYears: 2,
    experienceSummary: 'Recent graduate who has shipped two Flutter apps backed by Firebase, including an offline-first stock tracker.',
    availability: ['full-time', 'part-time'],
  },
  {
    id: 'sample-c11', sample: true, name: 'Esther Nabirye', headline: 'Photographer & videographer',
    email: 'esther.nabirye@example.com', phone: '+256 700 000 111', location: 'Mukono', willingToRelocate: true,
    skills: ['Photography', 'Video Editing', 'Drone Operation'], experienceYears: 6,
    experienceSummary: 'Covers weddings, corporate events and product shoots; edits same-day highlight reels.',
    availability: ['gig', 'weekends'],
  },
  {
    id: 'sample-c12', sample: true, name: 'Samuel Opio', headline: 'Customer support specialist',
    email: 'samuel.opio@example.com', phone: '+256 700 000 112', location: 'Lira', willingToRelocate: true,
    skills: ['Customer Service', 'English', 'Swahili', 'Luganda', 'Excel'], experienceYears: 1,
    experienceSummary: 'One year handling calls and WhatsApp support for a fictional solar-lamp distributor; speaks three languages.',
    availability: ['full-time', 'part-time'],
  },
];

export const SAMPLE_OPPORTUNITIES: SampleOpportunity[] = [
  {
    id: 'sample-o01', sample: true, type: 'gig', employerName: 'Kivu Bytes Studio (fictional)',
    title: 'React developer for a 3-week dashboard build',
    description: 'SAMPLE: not a real vacancy. Help a small studio build an internal sales dashboard: React front end, Firebase backend, charts and a login screen. Three weeks, flexible hours.',
    requiredSkills: ['React', 'TypeScript', 'Firebase'], niceToHaveSkills: ['Figma'],
    location: 'Kampala', workMode: 'hybrid', availability: 'gig', minExperienceYears: 2,
    pay: 'UGX 2,400,000 fixed', status: 'open',
  },
  {
    id: 'sample-o02', sample: true, type: 'gig', employerName: 'Lakeview Events (fictional)',
    title: 'Weekend event photographer',
    description: 'SAMPLE: not a real vacancy. Photograph two Saturday corporate events and deliver an edited gallery plus a 60-second highlight video within 48 hours.',
    requiredSkills: ['Photography', 'Video Editing'], niceToHaveSkills: ['Drone Operation'],
    location: 'Kampala', workMode: 'on-site', availability: 'weekends', minExperienceYears: 1,
    pay: 'UGX 350,000 per event', status: 'open',
  },
  {
    id: 'sample-o03', sample: true, type: 'job', employerName: 'Mpola Solar (fictional)',
    title: 'Solar installation technician',
    description: 'SAMPLE: not a real vacancy. Install and maintain rooftop solar systems for homes and shops around Wakiso and Kampala. Company transport provided.',
    requiredSkills: ['Electrical installation', 'Solar Installation'], niceToHaveSkills: ['CCTV'],
    location: 'Wakiso', workMode: 'on-site', availability: 'full-time', minExperienceYears: 3,
    pay: 'UGX 1,200,000 / month', status: 'open',
  },
  {
    id: 'sample-o04', sample: true, type: 'job', employerName: 'Nile Bean Coffee Co. (fictional)',
    title: 'Part-time bookkeeper',
    description: 'SAMPLE: not a real vacancy. Keep the books for a two-branch coffee shop: daily sales reconciliation, mobile-money payouts and a monthly report.',
    requiredSkills: ['Bookkeeping', 'Excel'], niceToHaveSkills: ['QuickBooks', 'Mobile Money'],
    location: 'Entebbe', workMode: 'hybrid', availability: 'part-time', minExperienceYears: 2,
    pay: 'UGX 600,000 / month', status: 'open',
  },
];
