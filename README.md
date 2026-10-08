# GitHub Roast & Rescue

> **Honest, data-backed recruiter feedback for your public GitHub profile.**  
> Give a messy GitHub profile the feedback it deserves: discover what recruiters notice in 30 seconds, understand your profile health score, and get an actionable rescue plan to fix it.

---

## 1. Chosen Challenge / Vertical

- **Challenge:** *"GitHub Roast and Rescue: Give a messy GitHub profile the honest feedback it deserves"*
- **Target Persona:** Software engineers, developers, and job seekers who want to know how their public GitHub profile appears to technical recruiters and hiring managers, and who need concrete, prioritized guidance on what to improve.

---

## 2. Problem

Technical recruiters and hiring managers typically spend only **30 to 60 seconds** skimming a developer's GitHub profile before deciding whether to advance them in the hiring funnel. 

Developers often struggle because:
- **Blind spots:** They don't know why their repositories fail to attract attention or interview calls.
- **Missing basics:** Undescribed repositories, blank profile headers, missing READMEs, and broken demo links create immediate evaluation friction.
- **Vague advice:** Generic portfolio advice rarely tells an engineer which specific repositories or metadata fields need urgent repair.

---

## 3. Solution

**GitHub Roast & Rescue** transforms public GitHub data into an explainable, data-grounded audit dashboard:
1. **The Roast:** A humorous, sharp reality check highlighting awkward profile quirks without being toxic.
2. **The Diagnose:** A factual breakdown backed by real metrics (e.g. *"28 of 48 repositories have no description"*).
3. **The Rescue:** An actionable, step-by-step checklist prioritized by recruiter ROI.
4. **Biggest Recruiter Roadblock:** A dynamic headline insight isolating the single most impactful weakness holding the developer back from recruiter interest.

---

## 4. Approach and Logic

### GitHub Public Data Collection
The serverless backend fetches real public profile and repository data from the GitHub REST API:
- **User metadata:** Bio length, display name, location, company, portfolio link, profile README existence.
- **Repository metadata:** Star counts, fork counts, primary languages, commit recency, custom repository descriptions, and README availability.

### 100-Point Deterministic Scoring Engine
Profile health is evaluated across five explainable, weighted dimensions:
- **Profile (15 pts):** Bio completeness, identity clarity, location, portfolio/website links, custom profile README.
- **Projects (30 pts):** Original authored repositories vs. forks, description coverage, star traction, language diversity, live demo URLs.
- **Documentation (20 pts):** Profile README presence, flagship repository description coverage, structured README availability.
- **Activity (20 pts):** Commit momentum, days since last push, consistent public development history.
- **Recruiter Readiness (15 pts):** 30-second scannability, flagship project discoverability, live links, friction-free profile presentation.

### Roast → Diagnose → Rescue Flow
Findings are deterministically ranked by priority (`priority: 10` down to `2`). Each finding item delivers a triplet:
- **Roast:** Memorable, sharp developer humor grounded in the profile's real data.
- **Diagnose:** Concrete numbers and verified evidence.
- **Rescue:** Realistic, technology-tailored corrective action.

### Biggest Recruiter Roadblock Logic
Rather than a generic warning, the system calculates the lowest-performing scoring dimension ratio (`score / max`) and isolates the single highest-friction barrier (e.g., repository documentation deficits, missing bio, stale push gaps, or 100% fork portfolios), pairing it with an immediate high-impact action step.

---

## 5. How the Solution Works

### End-to-End Execution Flow
```text
User enters GitHub username
   ↓
React / Vite frontend validates input format
   ↓
Calls GET /api/analyze?user=:username
   ↓
Server validates input, checks 3-minute in-memory cache, enforces IP rate limits
   ↓
Server queries GitHub REST API using server-side GITHUB_TOKEN
   ↓
Deterministic Scoring & Roast/Rescue Engine calculates scores & prioritized findings
   ↓
Normalized JSON response sent with defensive security headers
   ↓
Frontend transitions smoothly to the interactive Analysis Dashboard:
   • Animated score ring with tier badge
   • "Biggest Recruiter Roadblock" card
   • Recruiter View (30-second scan: Strong Signals vs. Red Flags)
   • Roast Navigator (interactive tabbed finding browser)
   • Rescue Plan (interactive action checklist)
   • Repositories explorer
```

### High-Level Architecture
```text
┌────────────────────────────────────────────────────────┐
│                   React 19 / Vite UI                   │
│  (Hero · Score Gauge · Roadblock · Recruiter View ·    │
│   Roast Navigator · Rescue Checklist · Repositories)   │
└───────────────────────────┬────────────────────────────┘
                            │  GET /api/analyze?user=...
                            ▼
┌────────────────────────────────────────────────────────┐
│             Serverless API Layer (Node.js)             │
│  • Strict Username Validation (regex)                  │
│  • In-Memory Sliding-Window IP Rate Limiter            │
│  • In-Memory 3-Minute TTL LRU Response Cache           │
│  • Origin-Restricted CORS & Defensive HTTP Headers     │
│  • Sanitized Error Responses                           │
└───────────────────────────┬────────────────────────────┘
                            │  Authenticated HTTPS Requests
                            ▼
┌────────────────────────────────────────────────────────┐
│                   GitHub REST API                      │
│      Users API · Repositories API · Readme API         │
└───────────────────────────┬────────────────────────────┘
                            │  Raw Profile & Repo Data
                            ▼
┌────────────────────────────────────────────────────────┐
│         Deterministic Scoring + Findings Engine        │
│          api/engine.js (100-Point Evaluation)          │
└────────────────────────────────────────────────────────┘
```

---

## 6. Security

- **Server-Side Token Isolation:** `GITHUB_TOKEN` is loaded strictly on the server via `process.env.GITHUB_TOKEN`. It is never prefixed with `VITE_`, never exposed to the frontend, and completely absent from the client build bundle.
- **Strict Input Validation:** Usernames are validated against GitHub's official handle specification (`/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/`). Malicious inputs and path traversal attempts are rejected with HTTP 400.
- **SSRF & Open Proxy Prevention:** All upstream URLs are hardcoded to `api.github.com` endpoints with strict URI-encoding. Arbitrary targets cannot be queried.
- **Restricted CORS Policy:** Wildcard `Access-Control-Allow-Origin: *` has been replaced with origin validation matching localhost, local loopback, same-origin host, and Vercel deployment domains.
- **Abuse Prevention & Rate Limiting:** An in-memory sliding-window limiter restricts clients to 30 requests per minute per IP, returning HTTP 429 (`Retry-After: 60`).
- **In-Memory Cache (TTL: 3 Minutes):** Caches successful responses by username in memory (`MAX_CACHE_ENTRIES: 100`), dramatically reducing GitHub API quota consumption on repeat queries.
- **Safe Link Handling (XSS Defense):** All external URLs (`blog`, `homepage`) are validated to enforce `http:` / `https:` schemes, preventing `javascript:` injection. External links use `rel="noopener noreferrer"`.
- **Zero Raw HTML Injection:** No usage of `dangerouslySetInnerHTML`, `innerHTML`, or `eval()`.
- **Sanitized Errors:** Error messages never disclose filesystem paths, stack traces, environment variable names, or configuration filenames.
- **Git Hygiene:** `.env`, `.env.*`, and `*.local` are explicitly ignored in `.gitignore`.

---

## 7. Assumptions

1. **Public Data Only:** The system analyzes only publicly accessible GitHub data. Private repositories, private organization contributions, and private commit history are not accessible without user OAuth.
2. **Temporal Dynamics:** GitHub profiles and repository data change over time; scores reflect the state of public data at query time.
3. **Explainable Heuristic:** The 100-point score is a pragmatic heuristic designed to highlight presentation and documentation friction, rather than an absolute measure of algorithmic skill.
4. **Recruiter Scan Proxy:** The "Recruiter Readiness" and "30-Second Scan" simulate the typical heuristics applied by hiring teams during rapid inbound triage.
5. **Data-Bound Recommendations:** Rescue action items are generated strictly based on detected languages and actual profile weaknesses, never fabricated claims.

---

## 8. Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A personal [GitHub Token](https://github.com/settings/tokens) (classic or fine-grained with public read access)

### Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd github-roast-rescue
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the project root:
   ```env
   GITHUB_TOKEN=your_github_token_here
   ```
   *(Note: `.env.local` is ignored by Git and will never be committed).*

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 9. Verification & Testing

Run all quality and security verification commands:

```bash
# 1. Lint verification (Oxlint)
npm run lint
# Output: Found 0 warnings and 0 errors.

# 2. Production build verification (Vite)
npm run build
# Output: built client environment in ~300ms without errors.

# 3. Dependency vulnerability audit
npm audit
# Output: found 0 vulnerabilities.
```

---

## 10. Demo / Judge Walkthrough (60 Seconds)

1. **Landing View:**
   - Open the web app. Notice the clean developer-tool aesthetic, responsive layout, and clear value proposition.
2. **Execute Analysis:**
   - Enter a public GitHub handle (e.g. `octocat` or your personal username) and click **"Roast My GitHub"**.
   - Observe the multi-stage loading assistant communicating the live audit steps.
3. **Inspect Overview:**
   - Watch the animated score wheel count up with its associated tier badge.
   - Read the prominent **"BIGGEST RECRUITER ROADBLOCK"** card highlighting the exact primary weakness and recommended fix.
4. **Explore Recruiter View:**
   - Switch to **"Recruiter View"** to review the 30-second scan (Strong Signals vs. Red Flags).
   - Toggle **High-Contrast Recruiter Mode** for high-efficiency reading.
5. **Inspect Roast & Rescue:**
   - Click **"Roast"** to browse through prioritized findings with Roast, Diagnose, and Rescue insights.
   - Click **"Rescue"** to interact with the top-3 action checklist and check off completed items.
6. **Try a Second Query:**
   - Click **"＋ New Analysis"** in the top navigation to analyze another profile or verify caching performance.

---

## 11. Limitations & Future Improvements

### Current Capabilities
- Real-time authenticated GitHub public profile and repository analysis.
- Deterministic 100-point scoring across 5 distinct dimensions.
- High-impact dynamic Recruiter Roadblock synthesis.
- Interactive Roast Navigator, Recruiter Mode, and Rescue Checklist.
- In-memory rate limiting, response caching, and strict CORS controls.

### Future Roadmap (Post-Submission)
- **Optional OAuth Integration:** Allow users to opt-in to authenticate with GitHub to audit private contribution activity and commit streaks.
- **Historical Tracking:** Save audit snapshots over time to measure improvement velocity.
- **Exportable Recruiter Summary:** Generate a shareable, one-page markdown report formatted for developer portfolios.
- **CI/CD Action:** A GitHub Action that runs during pull requests to verify README and repo description health on new repositories.

---

## License

MIT License. Built for the Hack2Skill challenge.
