import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getRecruiterSimulationData } from '../src/utils/recruiterSimulation.js'

describe('30-Second Recruiter Simulation Helper', () => {
  it('generates 3 stages and 3 takeaways for a strong profile', () => {
    const user = {
      username: 'dev-pro',
      bio: 'Senior Full Stack Engineer building open source tooling',
      hasProfileReadme: true,
      blog: 'https://dev-pro.dev',
      publicRepoCount: 8,
    }
    const stats = {
      nonForkRepoCount: 6,
      languages: ['TypeScript', 'Rust'],
      daysSinceLastPush: 2,
      totalStars: 150,
    }
    const topRepositories = [
      { name: 'fast-api', description: 'High performance API', stars: 100 },
    ]
    const repositories = [
      { name: 'fast-api', description: 'High performance API', stars: 100 },
      { name: 'cli-tool', description: 'Command line helper', stars: 50 },
    ]
    const roadblock = {
      diagnosis: 'Flagship repo lacks live demo.',
      action: 'Add live demo URL.',
    }
    const findings = {
      diagnose: ['High-quality repositories with strong traction.'],
    }
    const topRescues = ['Add live demo URL to flagship project.']

    const result = getRecruiterSimulationData({
      user,
      stats,
      repositories,
      topRepositories,
      findings,
      roadblock,
      topRescues,
    })

    // Stage 1 (0–5 SEC)
    assert.ok(result.firstImpression.length >= 2 && result.firstImpression.length <= 4)
    assert.equal(result.firstImpression[0].type, 'positive')
    assert.equal(result.firstImpression[0].icon, '✓')

    // Stage 2 (5–15 SEC)
    assert.ok(result.projectScan.length >= 2 && result.projectScan.length <= 4)
    assert.equal(result.projectScan[0].type, 'positive')

    // Stage 3 (Decision WHY)
    assert.ok(result.whyReasons.length >= 2 && result.whyReasons.length <= 3)

    // Takeaways
    assert.ok(result.takeaways.strongestSignal.includes('150 total stars'))
    assert.equal(result.takeaways.biggestConcern, 'Flagship repo lacks live demo.')
    assert.equal(result.takeaways.firstThingToFix, 'Add live demo URL to flagship project.')
  })

  it('generates warning states and flags for a sparse profile', () => {
    const user = {
      username: 'silent-coder',
      bio: null,
      hasProfileReadme: false,
      blog: null,
      publicRepoCount: 3,
    }
    const stats = {
      nonForkRepoCount: 0,
      daysSinceLastPush: 120,
    }
    const repositories = [
      { name: 'fork1', description: '' },
      { name: 'fork2', description: '' },
    ]
    const roadblock = {
      diagnosis: '3 repositories have no description.',
      action: 'Add descriptions to your repositories.',
    }
    const findings = {
      diagnose: ['Missing bio prevents context.', '3 repositories have no description.'],
    }

    const result = getRecruiterSimulationData({
      user,
      stats,
      repositories,
      topRepositories: [],
      findings,
      roadblock,
      topRescues: ['Add descriptions to your repositories.'],
    })

    assert.equal(result.firstImpression[0].type, 'negative')
    assert.ok(result.firstImpression[0].text.includes('Missing bio'))
    assert.equal(result.projectScan[0].type, 'negative')
    assert.ok(result.takeaways.biggestConcern.includes('3 repositories have no description'))
  })
})
