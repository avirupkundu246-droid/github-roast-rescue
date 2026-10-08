/**
 * Compact helper for the 30-Second Recruiter Simulation.
 * Synthesizes existing profile and repository analysis data into 3 quick-scan stages
 * and 3 final recruiter takeaways. Zero invented statistics or fake recruiter claims.
 */

export function getRecruiterSimulationData({
  user,
  stats,
  repositories,
  topRepositories,
  findings,
  roadblock,
  topRescues,
}) {
  const repos = Array.isArray(repositories) ? repositories : []
  const topRepos = Array.isArray(topRepositories) ? topRepositories : []
  const topRepo = topRepos[0] || repos[0] || null
  const totalRepos = user?.publicRepoCount || repos.length || 0
  const reposWithDesc = repos.filter((r) => r.description && r.description.trim().length > 0)
  const undescribedCount = Math.max(0, totalRepos - reposWithDesc.length)
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null
  const nonForkCount = stats?.nonForkRepoCount ?? repos.filter((r) => !r.isFork).length

  // A. FIRST IMPRESSION (0–5 SEC): 2–4 profile-level observations
  const firstImpression = []
  if (user?.bio && user.bio.trim().length >= 15) {
    firstImpression.push({ type: 'positive', icon: '✓', text: 'Bio gives immediate context' })
  } else if (user?.bio && user.bio.trim().length > 0) {
    firstImpression.push({ type: 'neutral', icon: '•', text: 'Brief bio provides minimal context' })
  } else {
    firstImpression.push({ type: 'negative', icon: '⚠', text: 'Missing bio' })
  }

  if (nonForkCount >= 2) {
    firstImpression.push({ type: 'positive', icon: '✓', text: `${nonForkCount} original repositories` })
  } else if (nonForkCount === 1) {
    firstImpression.push({ type: 'neutral', icon: '•', text: `1 original repository (${totalRepos} total)` })
  } else {
    firstImpression.push({ type: 'negative', icon: '⚠', text: 'All public repositories are forks' })
  }

  if (user?.hasProfileReadme) {
    firstImpression.push({ type: 'positive', icon: '✓', text: 'Profile README highlights background' })
  } else {
    firstImpression.push({ type: 'negative', icon: '⚠', text: 'No profile README' })
  }

  if (user?.blog) {
    firstImpression.push({ type: 'positive', icon: '✓', text: 'Portfolio link present' })
  } else {
    firstImpression.push({ type: 'negative', icon: '⚠', text: 'No portfolio link' })
  }

  // B. PROJECT SCAN (5–15 SEC): 2–4 repository-level observations
  const projectScan = []
  if (topRepo) {
    const hasDesc = topRepo.description && topRepo.description.trim().length > 0
    if (hasDesc && daysSinceLastPush !== null && daysSinceLastPush <= 30) {
      projectScan.push({ type: 'positive', icon: '✓', text: `Strongest project (${topRepo.name}) updated recently` })
    } else if (hasDesc) {
      projectScan.push({ type: 'positive', icon: '✓', text: `Strongest project (${topRepo.name}) has description` })
    } else {
      projectScan.push({ type: 'negative', icon: '⚠', text: `Flagship project (${topRepo.name}) has no description` })
    }
  }

  if (undescribedCount > 0) {
    projectScan.push({ type: 'negative', icon: '⚠', text: `${undescribedCount} ${undescribedCount === 1 ? 'repository has' : 'repositories have'} no description` })
  } else if (reposWithDesc.length > 0) {
    projectScan.push({ type: 'positive', icon: '✓', text: 'All public repositories have descriptions' })
  }

  if (stats?.languages && stats.languages.length >= 2) {
    projectScan.push({ type: 'positive', icon: '✓', text: `Projects show ${stats.languages.slice(0, 3).join(' / ')}` })
  } else if (stats?.languages && stats.languages.length === 1) {
    projectScan.push({ type: 'neutral', icon: '•', text: `Projects concentrated in ${stats.languages[0]}` })
  }

  if (daysSinceLastPush !== null && daysSinceLastPush <= 14) {
    projectScan.push({ type: 'positive', icon: '✓', text: `Recent commit momentum (${daysSinceLastPush === 0 ? 'today' : `${daysSinceLastPush}d ago`})` })
  } else if (daysSinceLastPush !== null && daysSinceLastPush > 90) {
    projectScan.push({ type: 'negative', icon: '⚠', text: `No repository updates in ${daysSinceLastPush} days` })
  } else if (topRepo?.hasReadme === false) {
    projectScan.push({ type: 'negative', icon: '⚠', text: 'Flagship project lacks a README' })
  } else if (stats?.totalStars && stats.totalStars > 0) {
    projectScan.push({ type: 'positive', icon: '✓', text: `${stats.totalStars.toLocaleString()} total stars validate work` })
  }

  // C. RECRUITER DECISION: WHY reasons (2–3 evidence-backed reasons)
  const whyReasons = []
  if (Array.isArray(findings?.diagnose)) {
    for (const d of findings.diagnose) {
      if (d && !whyReasons.includes(d)) {
        whyReasons.push(d)
        if (whyReasons.length >= 3) break
      }
    }
  }
  if (whyReasons.length < 2 && roadblock?.diagnosis && !whyReasons.includes(roadblock.diagnosis)) {
    whyReasons.push(roadblock.diagnosis)
  }
  if (whyReasons.length < 2 && roadblock?.evidence && !whyReasons.includes(roadblock.evidence)) {
    whyReasons.push(roadblock.evidence)
  }

  // D. WHAT THE RECRUITER LEAVES WITH (exact 3 concise items)
  const strongestSignal =
    (stats?.totalStars ? `${stats.totalStars.toLocaleString()} total stars across public repos` : null) ||
    (daysSinceLastPush !== null && daysSinceLastPush <= 30 ? `Active momentum (${daysSinceLastPush === 0 ? 'today' : `${daysSinceLastPush}d ago`})` : null) ||
    (nonForkCount >= 2 ? `${nonForkCount} original repositories built from scratch` : null) ||
    (user?.bio ? 'Clear bio giving engineering context' : null) ||
    'Public GitHub profile accessible for review'

  const biggestConcern =
    roadblock?.diagnosis ||
    (undescribedCount > 0 ? `${undescribedCount} repositories have no description` : 'Minor documentation polish needed')

  const firstThingToFix =
    (topRescues && topRescues[0]) ||
    roadblock?.action ||
    'Add clear descriptions to your top projects'

  return {
    firstImpression: firstImpression.slice(0, 4),
    projectScan: projectScan.slice(0, 4),
    whyReasons: whyReasons.slice(0, 3),
    takeaways: {
      strongestSignal,
      biggestConcern,
      firstThingToFix,
    },
  }
}
