# KaziMatch: Talent & Gig Matching

A hackathon prototype that connects employers with job seekers and gig workers. It has two connected views:

- **Employer view.** Post a job or gig, see a ranked list of matching candidates with a plain-language reason for each one, open a profile, add people to a shortlist, and see whether each shortlisted person has expressed interest.
- **Candidate view.** Create a profile (skills, experience, location, availability), see opportunities ranked for you with reasons, and tap "I'm interested".

Stack: **React 18 + TypeScript + Vite**, **Firebase Authentication** (Google, Microsoft, GitHub, email/password and guest sign-in) and **Cloud Firestore** with real-time listeners. When a candidate expresses interest, the employer's shortlist updates live.

> Everything shown in demos is fictional. Sample profiles use made-up names, `example.com` emails and placeholder phone numbers. Sample opportunities are labelled "SAMPLE — not a real vacancy". Match scores support human review; they are not a judgement of anyone's suitability.

---

## 1. Quick start (no Firebase needed)

```bash
npm install
npm run dev          # http://localhost:5173
```

If no Firebase config is present, the app runs in **local demo mode**. Sign-in is simulated and the data lives in this browser's `localStorage`, synced across tabs. Use this to try the app straight away.

```bash
npm test             # unit tests for the matching rules, search parser and validation
npm run build        # production build to dist/
```

## 2. Going live with Firebase (about 10 minutes)

1. **Create a project.** Go to <https://console.firebase.google.com> and choose *Add project*. Google Analytics is optional.
2. **Add a web app.** Open *Project settings → General → Your apps → Web (`</>`)*. Copy the config values into a new file called `.env.local`, using `.env.example` as the template:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. **Create the database.** Go to *Build → Firestore Database → Create database*, choose production mode and pick a nearby region.
4. **Turn on sign-in methods.** Go to *Build → Authentication → Get started → Sign-in method* and enable:
   | Provider | What to do |
   |---|---|
   | **Google** | Toggle it on and choose a support email. One click. |
   | **Email/Password** | Toggle it on. |
   | **Anonymous** | Toggle it on. This powers "Try the demo as a guest". |
   | **GitHub** | Create an OAuth app at <https://github.com/settings/developers>. Set the *Authorization callback URL* to `https://<your-project>.firebaseapp.com/__/auth/handler`, then paste the Client ID and Secret into Firebase. |
   | **Microsoft** | Register an app in Azure Portal → *App registrations*. Use account type "Accounts in any organizational directory and personal Microsoft accounts" and set the redirect URI (Web) to the same `__/auth/handler` URL. Create a client secret and paste the Application ID and secret into Firebase. |

   Any provider you skip shows a clear "This sign-in method is not enabled yet" message when someone clicks it. Google, email and guest are enough for a demo.
5. **Deploy the security rules.** The rules include server-side checks on required fields:
   ```bash
   npx firebase-tools login
   cp .firebaserc.example .firebaserc     # then put your project id in it
   npm run deploy:rules
   ```
6. **Restart the app.** Run `npm run dev` again. The badge in the top bar should now say **Live · Firebase**.
7. **(Optional) Host it.** Run `npm run deploy` to build and deploy to `https://<your-project>.web.app`. The hosting domain is authorised for sign-in automatically. For any other domain, add it under *Authentication → Settings → Authorised domains*.

**Load the sample data.** Sign in, go to the Employer view and click **Load samples**. This writes 12 fictional candidates and 4 fictional opportunities. Sample personas are shared, so any signed-in teammate can "act as" a sample candidate during the demo.

## 3. Demo script (about 3 minutes)

1. **Sign in** with Google, or as a guest. Choose **I'm hiring**, then click **Load samples**.
2. **(Optional) Show the natural-language search.** Type `Find me a React developer in Kampala, part-time`. The app picks out the skill, town and availability with simple rules, not AI.
3. **Post a fictional gig.** Click *Post a job or gig* and press *Post opportunity* with the form empty to show the required-field checks. Then fill it in:
   - Title: *Frontend developer for a mobile-money dashboard*
   - Employer: *Demo Payments Ltd (fictional)*
   - Required skills: React, TypeScript. Nice-to-have: Figma.
   - Location: Kampala. Work mode: Hybrid. Availability: Short-term gig. Minimum experience: 2.

   The live counter at the bottom shows how many candidates match while you type.
4. **Explain the match.** **Amara Nakato** is a *Strong match* at 100%. Her row is already expanded and shows each rule with points: she has 2 of 2 required skills, her gig availability fits, she is based in Kampala, she has 4 years of experience (the minimum is 2), and she has the nice-to-have Figma. **Brian Okello** scores lower: he is missing TypeScript and is based in Gulu, but would relocate.
5. **Shortlist her.** Click the bookmark icon, or open her profile (↗) and click *Add to shortlist*.
6. **Switch to her view.** Click **Candidate** in the top bar and pick *Amara Nakato (sample)*. The gig appears under *Recommended for you*. Open it, read *Your fit*, add a note and press **I'm interested**.
7. **Return to the employer.** Click **Employer**, open the gig and go to the **Shortlist** tab. Amara now shows *Interested · just now*. With Firebase this also updates in real time in a second browser window.
8. **Show a no-match result.** Click *Edit requirements*, add Kubernetes, Go and Rust as required skills, set availability to *Weekends only* and save. The **empty state** then:
   - says no profile meets the must-haves,
   - names the skills nobody in the pool has,
   - suggests specific relaxations with a count ("Make … nice-to-have + accept short-term gig, +2 matches") and an **Apply** button,
   - lists the closest profiles and why each one missed.

## 4. Matching rules

Matching lives in [`src/lib/matching.ts`](src/lib/matching.ts). It is fully rule-based and covered by unit tests.

**Normalising skills.** Skills are compared case-insensitively, with a small alias table. For example `ReactJS`, `react.js` and `React` count as the same skill, as do `JS` and `JavaScript`. The table is in [`src/lib/skills.ts`](src/lib/skills.ts).

**Scoring.** Each criterion earns points out of a fixed weight. The score is the share of available points earned, from 0 to 100:

| Criterion | Weight | How points are earned |
|---|---|---|
| Required skills | 50 | Share of the required skills the candidate lists |
| Availability | 20 | Full points if the candidate is open to the opportunity's type (full-time, part-time, gig, weekends), otherwise 0 |
| Location | 15 | Full points for a remote role or the same town. Half points if the candidate is in another town but willing to relocate |
| Experience | 10 | Full points if they meet the minimum years. Half points if they are 1 year short |
| Nice-to-have skills | 5 | Share of the optional skills they have. Only counted when the employer lists some |

**Must-haves.** A candidate is listed as a match only if all of these hold:
- they have **at least half** of the required skills,
- their **availability fits**,
- their **location is workable** (same town, remote role, or willing to relocate).

Experience and nice-to-have skills never hide anyone. They only change the ranking.

**Tiers.** *Strong match* means 80 or above, *Good match* 60–79, and *Possible match* below 60 (while still meeting the must-haves).

**Explanations.** Every criterion produces a plain-language sentence, written for the employer or for the candidate, plus a one-line summary. For example: "Strong match: Amara has 2 of 2 required skills, is available for short-term gig / project work and is based in Kampala."

**Empty state.** When nobody matches, the app tries relaxing one requirement at a time, then pairs of requirements if no single change helps. It reports how many candidates each change would bring in, and the employer can apply it with one click.

**Talent search.** "Find me a …" picks out known skill names, towns, availability words ("part-time", "weekends", "gig") and "N years" from the sentence. It then runs the same rules on the result ([`src/lib/search.ts`](src/lib/search.ts)).

## 5. Limitations (be upfront about these)

- **Keyword matching only.** "Photographer" will not match "photography" unless it is in the alias table. There is no understanding of similar skills (for example Vue vs React) and no levels of proficiency.
- **Experience is just a number of years.** There is no check of quality, references or verification. Profiles are self-reported.
- **Location is an exact town-name match.** There is no distance or travel time, so "Wakiso" and "Kampala" count as different places.
- **Availability is a category.** It does not cover hours, start dates or rates.
- **Fixed weights.** They are reasonable defaults, not tuned on real hiring outcomes. Scores are for ranking and discussion, not decisions.
- **Bias risk.** Rules can still disadvantage people, for example those who describe skills differently or can't relocate. A human must review every shortlist.
- **Prototype security.** All signed-in users can read every profile, so contact details are visible to all signed-in users. Sample personas are writable by any signed-in user so the demo can switch between them. A production version would restrict contact details until a candidate expresses interest and would remove the shared personas. The Firestore rules were reviewed by hand but not run against the emulator during the hackathon.
- **Scale.** Each client listens to whole collections, which is fine for a demo but would need queries, pagination and server-side matching for real data volumes.
- **No messaging, notifications or applications workflow.** Only shortlist plus expression of interest.

## 6. Data model (Firestore)

| Collection | Doc id | Key fields |
|---|---|---|
| `candidates` | user's `uid`, or `sample-cNN` | `ownerId, name, headline, skills[], experienceYears, experienceSummary, location, willingToRelocate, availability[], email?, phone?, sample?` |
| `opportunities` | auto id, or `sample-oNN` | `employerId, employerName, type (job/gig), title, description, requiredSkills[], niceToHaveSkills[], location, workMode, availability, minExperienceYears, pay?, status, sample?` |
| `shortlists` | `{opportunityId}__{candidateId}` | `opportunityId, candidateId, employerId, createdAt` |
| `interests` | `{opportunityId}__{candidateId}` | `opportunityId, candidateId, candidateOwnerId, message, createdAt` |

The rules ([`firestore.rules`](firestore.rules)) enforce three things. Only the owner writes their profile. Only the employer who posted an opportunity shortlists for it. Only the candidate expresses interest. The rules also validate required fields and value ranges on every write.

## 7. Sample data (fictional)

There are 12 candidates in [`src/data/seed.ts`](src/data/seed.ts): frontend, full-stack and mobile developers, a UX designer, a data analyst, a social media creator, an electrician/solar technician, a bookkeeper, a delivery rider, an event coordinator, a photographer and a customer support specialist. They are spread across Kampala, Gulu, Mbarara, Wakiso, Entebbe, Jinja, Mukono and Lira.

There are 4 opportunities:
- React dashboard gig (Kampala, hybrid)
- Weekend event photographer (Kampala)
- Solar installation technician (Wakiso, full-time)
- Part-time bookkeeper (Entebbe, hybrid)

## 8. Project structure

```
src/
  lib/            matching.ts (rules), search.ts (NL search), skills.ts, validation.ts, types.ts, matching.test.ts
  data/           firebase.ts (init), store.ts (interface), firestoreStore.ts, localStore.ts, seed.ts, DataProvider.tsx
  auth/           AuthProvider.tsx (Google / Microsoft / GitHub / email / guest)
  components/     Header, CandidateTable, ui (score ring, chips, explanations, form fields, toasts)
  pages/          Landing, Welcome, employer/*, candidate/*
firestore.rules   security rules with field validation
firebase.json     hosting + rules + emulator config
```
