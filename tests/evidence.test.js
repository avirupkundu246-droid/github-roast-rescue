import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Evidence logic mirroring AnalysisDashboard.jsx implementation
function calculateCategoryEvidence(categoryId, { safeScores, user, stats, repositories = [] }) {
  const totalRepos = user?.publicRepoCount || repositories.length || 0
  const nonForks = repositories.filter((r) => !r.isFork)
  const reposWithDesc = repositories.filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null
  const totalStars = stats?.totalStars || 0

  switch (categoryId) {
    case 'profile':
      return {
        score: safeScores.profile,
        max: 15,
        ratio: safeScores.profile / 15,
        hasBio: Boolean(user?.bio && user.bio.trim().length > 0),
        hasName: Boolean(user?.name && user.name.trim().length > 0),
        hasReadme: Boolean(user?.hasProfileReadme),
        hasBlog: Boolean(user?.blog && user.blog.trim().length > 0),
        hasLocation: Boolean(user?.location && user.location.trim().length > 0),
      }

    case 'projects':
      return {
        score: safeScores.projects,
        max: 30,
        ratio: safeScores.projects / 30,
        totalRepos,
        nonForkCount: nonForks.length,
        totalStars,
        languages: stats?.languages || [],
        reposWithDescCount: reposWithDesc.length,
      }

    case 'documentation':
      return {
        score: safeScores.documentation,
        max: 20,
        ratio: safeScores.documentation / 20,
        hasProfileReadme: Boolean(user?.hasProfileReadme),
        describedPercentage: totalRepos > 0 ? Math.round((reposWithDesc.length / totalRepos) * 100) : 0,
      }

    case 'activity':
      return {
        score: safeScores.activity,
        max: 20,
        ratio: safeScores.activity / 20,
        daysSinceLastPush,
        isRecent: daysSinceLastPush !== null && daysSinceLastPush <= 30,
      }

    case 'recruiterReadiness':
      return {
        score: safeScores.recruiterReadiness,
        max: 15,
        ratio: safeScores.recruiterReadiness / 15,
        verdict:
          safeScores.overall >= 70
            ? 'Passes 30s scan'
            : safeScores.overall >= 50
            ? 'Mixed impression'
            : 'High friction',
      }

    default:
      return null
  }
}

function determineLowestCategory(safeScores) {
  const categories = [
    { key: 'documentation', ratio: safeScores.documentation / 20 },
    { key: 'profile', ratio: safeScores.profile / 15 },
    { key: 'activity', ratio: safeScores.activity / 20 },
    { key: 'projects', ratio: safeScores.projects / 30 },
    { key: 'recruiterReadiness', ratio: safeScores.recruiterReadiness / 15 },
  ]
  categories.sort((a, b) => a.ratio - b.ratio)
  return categories[0].key
}

describe('Evidence-Driven Score Breakdown & Roadblock Analysis', () => {
  it('correctly maps profile category evidence from real user fields', () => {
    const user = {
      username: 'dev123',
      name: 'Real Dev',
      bio: 'Software engineer building web apps',
      hasProfileReadme: true,
      blog: 'https://dev123.com',
      location: 'Berlin, Germany',
    }
    const evidence = calculateCategoryEvidence('profile', {
      safeScores: { profile: 15, overall: 90 },
      user,
      stats: {},
    })
    assert.equal(evidence.score, 15)
    assert.equal(evidence.ratio, 1)
    assert.equal(evidence.hasBio, true)
    assert.equal(evidence.hasReadme, true)
    assert.equal(evidence.hasBlog, true)
    assert.equal(evidence.hasLocation, true)
  })

  it('correctly maps project category evidence including star count and language variety', () => {
    const repositories = [
      { name: 'r1', isFork: false, description: 'Tool 1' },
      { name: 'r2', isFork: false, description: 'Tool 2' },
      { name: 'r3', isFork: true, description: 'Forked' },
    ]
    const evidence = calculateCategoryEvidence('projects', {
      safeScores: { projects: 24, overall: 75 },
      user: { publicRepoCount: 3 },
      stats: { totalStars: 42, languages: ['TypeScript', 'Rust'] },
      repositories,
    })
    assert.equal(evidence.score, 24)
    assert.equal(evidence.nonForkCount, 2)
    assert.equal(evidence.totalStars, 42)
    assert.deepEqual(evidence.languages, ['TypeScript', 'Rust'])
    assert.equal(evidence.reposWithDescCount, 3)
  })

  it('correctly maps documentation category evidence and computes description ratio', () => {
    const repositories = [
      { name: 'r1', description: 'Has description' },
      { name: 'r2', description: '' },
    ]
    const evidence = calculateCategoryEvidence('documentation', {
      safeScores: { documentation: 10, overall: 60 },
      user: { publicRepoCount: 2, hasProfileReadme: false },
      repositories,
    })
    assert.equal(evidence.hasProfileReadme, false)
    assert.equal(evidence.describedPercentage, 50)
  })

  it('correctly maps activity evidence with push cadence and recency flags', () => {
    const evidence = calculateCategoryEvidence('activity', {
      safeScores: { activity: 18, overall: 80 },
      stats: { daysSinceLastPush: 4 },
    })
    assert.equal(evidence.daysSinceLastPush, 4)
    assert.equal(evidence.isRecent, true)
  })

  it('identifies the biggest bottleneck by lowest point ratio', () => {
    // profile: 15/15 (1.0), projects: 20/30 (0.66), docs: 5/20 (0.25), activity: 18/20 (0.9), recruiter: 12/15 (0.8)
    const scores = {
      profile: 15,
      projects: 20,
      documentation: 5,
      activity: 18,
      recruiterReadiness: 12,
      overall: 70,
    }
    const lowest = determineLowestCategory(scores)
    assert.equal(lowest, 'documentation')
  })

  it('identifies recruiter verdict based on 70 / 50 thresholds', () => {
    const high = calculateCategoryEvidence('recruiterReadiness', {
      safeScores: { recruiterReadiness: 15, overall: 85 },
    })
    assert.equal(high.verdict, 'Passes 30s scan')

    const medium = calculateCategoryEvidence('recruiterReadiness', {
      safeScores: { recruiterReadiness: 8, overall: 62 },
    })
    assert.equal(medium.verdict, 'Mixed impression')

    const low = calculateCategoryEvidence('recruiterReadiness', {
      safeScores: { recruiterReadiness: 3, overall: 35 },
    })
    assert.equal(low.verdict, 'High friction')
  })
})
