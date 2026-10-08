import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateScoresAndFindings } from '../api/engine.js'

describe('Scoring Engine (calculateScoresAndFindings)', () => {
  describe('Profile Score (/15 points)', () => {
    it('scores maximum 15 points for a fully fleshed out profile', () => {
      const user = {
        username: 'octocat',
        name: 'The Octocat',
        bio: 'Senior systems engineer specializing in distributed cloud infrastructure.',
        location: 'San Francisco, CA',
        blog: 'https://octocat.dev',
        company: 'GitHub Inc',
        hasProfileReadme: true,
      }
      const result = calculateScoresAndFindings({
        user,
        stats: { languages: ['Rust', 'Go'], totalStars: 100 },
        repositories: [],
        topRepositories: [],
      })
      // 5 (bio>=25) + 3 (readme) + 2 (loc) + 2 (blog) + 2 (name!=username) + 1 (company) = 15
      assert.equal(result.scores.profile, 15)
    })

    it('awards 3 points for short bio (< 25 chars)', () => {
      const user = {
        username: 'shortbio',
        name: 'shortbio',
        bio: 'Dev at work',
        hasProfileReadme: false,
      }
      const result = calculateScoresAndFindings({
        user,
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      // 3 (bio<25) + 1 (name==username) = 4
      assert.equal(result.scores.profile, 4)
    })

    it('awards 0 points when bio is empty or missing', () => {
      const user = {
        username: 'nobio',
        bio: '',
        hasProfileReadme: false,
      }
      const result = calculateScoresAndFindings({
        user,
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      assert.equal(result.scores.profile, 0)
    })

    it('caps profile score at exactly 15 even with overflow', () => {
      const user = {
        username: 'superprofile',
        name: 'Super Developer',
        bio: 'A very long, comprehensive bio explaining multi-decade technical leadership and contributions.',
        location: 'Earth',
        blog: 'https://portfolio.dev',
        company: 'Tech Corp',
        hasProfileReadme: true,
      }
      const result = calculateScoresAndFindings({
        user,
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      assert.equal(result.scores.profile, 15)
      assert.ok(result.scores.profile <= 15)
    })
  })

  describe('Projects Score (/30 points)', () => {
    it('awards high projects score for diverse, described, starred repositories', () => {
      const repos = [
        { name: 'r1', isFork: false, description: 'High performance API', homepage: 'https://r1.app' },
        { name: 'r2', isFork: false, description: 'CLI tool for deployments', homepage: '' },
        { name: 'r3', isFork: false, description: 'React dashboard UI', homepage: '' },
        { name: 'r4', isFork: false, description: 'Database query optimizer', homepage: '' },
        { name: 'r5', isFork: false, description: 'Compiler prototype in C', homepage: '' },
        { name: 'r6', isFork: false, description: 'OAuth2 authentication service', homepage: '' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'dev' },
        stats: {
          totalStars: 60,
          languages: ['TypeScript', 'Rust', 'Go', 'Python'],
        },
        repositories: repos,
        topRepositories: repos.slice(0, 3),
      })
      // nonForkCount>=6 => 8
      // descRatio 100% => 8
      // totalStars >= 50 => 6
      // languages >= 3 => 4
      // hasDemoUrl => 2
      // nonFork >= fork => 2
      // total = 8 + 8 + 6 + 4 + 2 + 2 = 30
      assert.equal(result.scores.projects, 30)
    })

    it('penalizes when all repositories are forks', () => {
      const repos = [
        { name: 'fork1', isFork: true, description: 'Forked project' },
        { name: 'fork2', isFork: true, description: 'Another fork' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'forker' },
        stats: { totalStars: 0, languages: ['JavaScript'] },
        repositories: repos,
        topRepositories: [],
      })
      // nonForkCount = 0 => 2 pts for totalRepos > 0, 0 for descRatio, 0 for stars, 3 for 1 lang, 0 demo, 0 ratio => 5 pts
      assert.ok(result.scores.projects < 10)
    })

    it('caps projects score at exactly 30', () => {
      const repos = Array.from({ length: 15 }, (_, i) => ({
        name: `repo-${i}`,
        isFork: false,
        description: `Description for project ${i}`,
        homepage: 'https://demo.dev',
      }))
      const result = calculateScoresAndFindings({
        user: { username: 'pro' },
        stats: { totalStars: 500, languages: ['Rust', 'Go', 'Python', 'TypeScript', 'C++'] },
        repositories: repos,
        topRepositories: repos.slice(0, 3),
      })
      assert.equal(result.scores.projects, 30)
    })
  })

  describe('Documentation Score (/20 points)', () => {
    it('scores maximum documentation points for profile README and full top repo README coverage', () => {
      const topRepos = [
        { name: 'app1', description: 'Web app', hasReadme: true },
        { name: 'app2', description: 'API server', hasReadme: true },
        { name: 'app3', description: 'Library', hasReadme: true },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'docs-master', hasProfileReadme: true },
        stats: {},
        repositories: topRepos,
        topRepositories: topRepos,
      })
      // hasProfileReadme: 5
      // topDescRatio 100%: 8
      // verifiedReadmes 3/3 (100%): 7
      // Total = 5 + 8 + 7 = 20
      assert.equal(result.scores.documentation, 20)
    })

    it('scores lower when top repositories lack READMEs', () => {
      const topRepos = [
        { name: 'app1', description: '', hasReadme: false },
        { name: 'app2', description: '', hasReadme: false },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'noreadme', hasProfileReadme: false },
        stats: {},
        repositories: topRepos,
        topRepositories: topRepos,
      })
      assert.equal(result.scores.documentation, 0)
    })

    it('caps documentation score at exactly 20', () => {
      const topRepos = [
        { name: 'app1', description: 'Described', hasReadme: true, homepage: 'https://demo.app' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'maxdocs', hasProfileReadme: true },
        stats: {},
        repositories: topRepos,
        topRepositories: topRepos,
      })
      assert.ok(result.scores.documentation <= 20)
    })
  })

  describe('Activity Score (/20 points)', () => {
    it('scores full 20 points for fresh pushes and consistent active repos', () => {
      const now = new Date()
      const repos = [
        { name: 'r1', pushedAt: now.toISOString() },
        { name: 'r2', pushedAt: new Date(now - 10 * 86400000).toISOString() },
        { name: 'r3', pushedAt: new Date(now - 20 * 86400000).toISOString() },
        { name: 'r4', pushedAt: new Date(now - 30 * 86400000).toISOString() },
      ]
      const user = {
        username: 'active-coder',
        createdAt: new Date(now - 400 * 86400000).toISOString(), // > 180 days old
      }
      const result = calculateScoresAndFindings({
        user,
        stats: { lastPushedAt: now.toISOString() },
        repositories: repos,
        topRepositories: repos,
      })
      // push <= 14 days => 10
      // 4 active recent repos => 6
      // accountAge > 180 and push <= 180 => 4
      // Total = 10 + 6 + 4 = 20
      assert.equal(result.scores.activity, 20)
    })

    it('scores low activity for dormant push history over 180 days', () => {
      const longAgo = new Date(Date.now() - 250 * 86400000).toISOString()
      const user = {
        username: 'dormant',
        createdAt: new Date(Date.now() - 500 * 86400000).toISOString(),
      }
      const result = calculateScoresAndFindings({
        user,
        stats: { lastPushedAt: longAgo },
        repositories: [{ name: 'old', pushedAt: longAgo }],
        topRepositories: [],
      })
      // push > 180 days => 2 pts (<=365)
      // activeRecentRepos = 0 => 0 pts
      // account age > 30 and push <= 365 => 3 pts
      // Total = 5 pts
      assert.ok(result.scores.activity <= 5)
    })
  })

  describe('Recruiter Readiness Score (/15 points)', () => {
    it('scores maximum 15 points for verified identity, contact, momentum, and described top repos', () => {
      const topRepos = [
        { name: 'main-app', description: 'Production SaaS platform', language: 'TypeScript' },
        { name: 'api-service', description: 'Core REST microservice', language: 'Go' },
      ]
      const user = {
        username: 'ready-candidate',
        name: 'Jane Developer',
        bio: 'Senior Backend Engineer building reliable cloud systems.',
        blog: 'https://janedev.com',
        location: 'Seattle, WA',
      }
      const result = calculateScoresAndFindings({
        user,
        stats: { lastPushedAt: new Date().toISOString() },
        repositories: topRepos,
        topRepositories: topRepos,
      })
      // hasName && hasBio => 4
      // blog => 2, location => 1 (contact = 3)
      // top 2 described with language => 5
      // push <= 60 days => 3
      // Total = 4 + 3 + 5 + 3 = 15
      assert.equal(result.scores.recruiterReadiness, 15)
    })

    it('scores 0 recruiter readiness for anonymous profile with no info and no top repos', () => {
      const user = { username: 'anon' }
      const result = calculateScoresAndFindings({
        user,
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      assert.equal(result.scores.recruiterReadiness, 0)
    })
  })

  describe('Overall Score & Mathematical Invariants', () => {
    it('overall score is exactly the sum of the 5 categories bounded between 0 and 100', () => {
      const user = { username: 'testuser', bio: 'Fullstack dev' }
      const result = calculateScoresAndFindings({
        user,
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      const expectedSum =
        result.scores.profile +
        result.scores.projects +
        result.scores.documentation +
        result.scores.activity +
        result.scores.recruiterReadiness

      assert.equal(result.scores.overall, expectedSum)
      assert.ok(result.scores.overall >= 0 && result.scores.overall <= 100)
    })
  })

  describe('Findings Generation (Roast, Diagnose, Rescue)', () => {
    it('flags empty profile with 0 repositories as priority 10 roast and rescue', () => {
      const result = calculateScoresAndFindings({
        user: { username: 'empty' },
        stats: {},
        repositories: [],
        topRepositories: [],
      })
      assert.ok(result.findings.items.length > 0)
      const zeroRepoFinding = result.findings.items.find((f) => f.diagnose.includes('0 public repositories'))
      assert.ok(zeroRepoFinding)
      assert.equal(zeroRepoFinding.priority, 10)
      assert.ok(zeroRepoFinding.roast.length > 0)
      assert.ok(zeroRepoFinding.rescue.length > 0)
    })

    it('flags missing bio with actionable recommendation citing detected tech stack', () => {
      const result = calculateScoresAndFindings({
        user: { username: 'nobio', publicRepoCount: 2 },
        stats: { languages: ['Rust', 'Python'] },
        repositories: [
          { name: 'r1', isFork: false, description: 'A project' },
          { name: 'r2', isFork: false, description: 'Another project' },
        ],
        topRepositories: [],
      })
      const bioFinding = result.findings.items.find((f) => f.priority === 10 && f.diagnose.includes('no bio'))
      assert.ok(bioFinding)
      assert.ok(bioFinding.rescue.includes('Rust, Python'))
    })

    it('flags undescribed repositories when none have descriptions', () => {
      const repos = [
        { name: 'p1', isFork: false, description: '' },
        { name: 'p2', isFork: false, description: null },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'nodesc', bio: 'A developer' },
        stats: {},
        repositories: repos,
        topRepositories: repos,
      })
      const descFinding = result.findings.items.find((f) => f.diagnose.includes('without a description') || f.diagnose.includes('None of your'))
      assert.ok(descFinding)
      assert.ok(descFinding.priority >= 8)
    })

    it('flags all-fork profiles with fork warning and priority 9', () => {
      const repos = [
        { name: 'f1', isFork: true, description: 'Fork 1' },
        { name: 'f2', isFork: true, description: 'Fork 2' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'onlyforks', bio: 'Coder' },
        stats: { languages: ['Go'] },
        repositories: repos,
        topRepositories: repos,
      })
      const forkFinding = result.findings.items.find((f) => f.diagnose.includes('forks'))
      assert.ok(forkFinding)
      assert.equal(forkFinding.priority, 9)
    })

    it('sorts findings by descending priority so most critical weaknesses appear first', () => {
      const repos = [
        { name: 'r1', isFork: false, description: '', hasReadme: false },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'testuser', bio: '' },
        stats: {},
        repositories: repos,
        topRepositories: repos,
      })
      const priorities = result.findings.items.map((i) => i.priority)
      for (let i = 0; i < priorities.length - 1; i++) {
        assert.ok(priorities[i] >= priorities[i + 1], `Priority ${priorities[i]} should be >= ${priorities[i + 1]}`)
      }
    })

    it('provides graceful fallback finding for pristine profiles with zero detected defects', () => {
      const now = new Date()
      const topRepos = [
        { name: 'top-app', isFork: false, description: 'Production service', hasReadme: true, homepage: 'https://demo.app', language: 'Rust' },
        { name: 'top-api', isFork: false, description: 'REST backend', hasReadme: true, homepage: 'https://api.dev', language: 'Go' },
      ]
      const repos = [
        ...topRepos,
        { name: 'tool1', isFork: false, description: 'Dev tool', homepage: 'https://tool.dev' },
        { name: 'tool2', isFork: false, description: 'CLI utility', homepage: 'https://cli.dev' },
      ]
      const user = {
        username: 'pristine-dev',
        name: 'Jane Doe',
        bio: 'Senior Infrastructure Engineer building resilient, scalable distributed platforms.',
        location: 'New York, NY',
        blog: 'https://janedoe.dev',
        company: 'Cloud Corp',
        hasProfileReadme: true,
      }
      const result = calculateScoresAndFindings({
        user,
        stats: {
          totalStars: 150,
          languages: ['Rust', 'Go'],
          lastPushedAt: now.toISOString(),
        },
        repositories: repos,
        topRepositories: topRepos,
      })
      // Profile has high score and at least one finding (positive or pristine fallback)
      assert.ok(result.scores.overall >= 80)
      assert.ok(result.findings.items.length > 0)
      assert.equal(result.findings.roast.length, result.findings.items.length)
      assert.equal(result.findings.diagnose.length, result.findings.items.length)
      assert.equal(result.findings.rescue.length, result.findings.items.length)
    })
  })

  describe('Defensive Edge Cases', () => {
    it('handles null/undefined user safely without crashing', () => {
      const result = calculateScoresAndFindings({
        user: { username: 'unknown' },
        stats: null,
        repositories: null,
        topRepositories: null,
      })
      assert.ok(result.scores)
      assert.ok(typeof result.scores.overall === 'number')
      assert.ok(Array.isArray(result.findings.roast))
    })

    it('handles invalid date strings gracefully', () => {
      const result = calculateScoresAndFindings({
        user: { username: 'baddates', createdAt: 'invalid-date' },
        stats: { lastPushedAt: 'not-a-real-date' },
        repositories: [{ name: 'r1', pushedAt: 'corrupted-timestamp' }],
        topRepositories: [],
      })
      assert.ok(result.scores.activity >= 0)
    })

    it('evaluates middle star thresholds (15-49, 5-14, 1-4 stars)', () => {
      const repos = [{ name: 'r1', isFork: false, description: 'app' }]
      const res1 = calculateScoresAndFindings({
        user: { username: 'stars1' },
        stats: { totalStars: 20 },
        repositories: repos,
        topRepositories: repos,
      })
      assert.ok(res1.scores.projects > 0)

      const res2 = calculateScoresAndFindings({
        user: { username: 'stars2' },
        stats: { totalStars: 8 },
        repositories: repos,
        topRepositories: repos,
      })
      assert.ok(res2.scores.projects > 0)

      const res3 = calculateScoresAndFindings({
        user: { username: 'stars3' },
        stats: { totalStars: 2 },
        repositories: repos,
        topRepositories: repos,
      })
      assert.ok(res3.scores.projects > 0)
    })

    it('evaluates activity push intervals (15-35, 36-90, 91-180 days)', () => {
      const now = Date.now()
      const d25 = new Date(now - 25 * 86400000).toISOString()
      const res1 = calculateScoresAndFindings({
        user: { username: 'push25' },
        stats: { lastPushedAt: d25 },
        repositories: [{ name: 'r1', pushedAt: d25 }, { name: 'r2', pushedAt: d25 }],
        topRepositories: [],
      })
      assert.ok(res1.scores.activity >= 8)

      const d60 = new Date(now - 60 * 86400000).toISOString()
      const res2 = calculateScoresAndFindings({
        user: { username: 'push60' },
        stats: { lastPushedAt: d60 },
        repositories: [{ name: 'r1', pushedAt: d60 }],
        topRepositories: [],
      })
      assert.ok(res2.scores.activity >= 6)

      const d120 = new Date(now - 120 * 86400000).toISOString()
      const res3 = calculateScoresAndFindings({
        user: { username: 'push120' },
        stats: { lastPushedAt: d120 },
        repositories: [{ name: 'r1', pushedAt: d120 }],
        topRepositories: [],
      })
      assert.ok(res3.scores.activity >= 4)
    })

    it('flags partial undescribed repository ratio', () => {
      const repos = [
        { name: 'r1', isFork: false, description: 'Described project' },
        { name: 'r2', isFork: false, description: '' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'partialdesc', bio: 'Developer' },
        stats: {},
        repositories: repos,
        topRepositories: repos,
      })
      const finding = result.findings.items.find((f) => f.priority === 8)
      assert.ok(finding)
      assert.ok(finding.diagnose.includes('1 of 2 repositories without a description'))
    })

    it('flags heavy fork ratio when forks exceed non-forks by 2x', () => {
      const repos = [
        { name: 'orig', isFork: false, description: 'Original work' },
        { name: 'f1', isFork: true, description: 'Fork 1' },
        { name: 'f2', isFork: true, description: 'Fork 2' },
        { name: 'f3', isFork: true, description: 'Fork 3' },
      ]
      const result = calculateScoresAndFindings({
        user: { username: 'heavyfork', bio: 'Coder' },
        stats: {},
        repositories: repos,
        topRepositories: repos,
      })
      const finding = result.findings.items.find((f) => f.priority === 5)
      assert.ok(finding)
      assert.ok(finding.diagnose.includes('3 forked repositories compared to only 1 original'))
    })
  })
})
