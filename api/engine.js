/**
 * Deterministic GitHub Profile Scoring + Roast & Rescue Engine
 * 
 * Evaluates real public GitHub profile data across 5 exact categories:
 *  - Profile (15 pts)
 *  - Projects (30 pts)
 *  - Documentation (20 pts)
 *  - Activity (20 pts)
 *  - Recruiter Readiness (15 pts)
 * Total is always out of 100.
 * 
 * Generates tailored, data-backed findings:
 *  - 🔥 Roast (sharp, funny, never abusive)
 *  - 🔍 Diagnose (concrete metrics and facts)
 *  - 🛠️ Rescue (actionable steps)
 */

export function calculateScoresAndFindings({ user, stats, topRepositories, repositories }) {
  const repos = Array.isArray(repositories) ? repositories : []
  const topRepos = Array.isArray(topRepositories) ? topRepositories : []
  const totalRepos = user.publicRepoCount || repos.length
  const nonForks = repos.filter((r) => !r.isFork)
  const forkCount = repos.filter((r) => r.isFork).length
  const nonForkCount = nonForks.length

  // Calculate days since last pushed activity
  let daysSinceLastPush = null
  if (stats?.lastPushedAt) {
    const pushDate = new Date(stats.lastPushedAt)
    if (!isNaN(pushDate.getTime())) {
      const diffMs = Date.now() - pushDate.getTime()
      daysSinceLastPush = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }
  }

  // Count repos with non-empty descriptions
  const reposWithDesc = repos.filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )
  const nonForksWithDesc = nonForks.filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )

  // -------------------------------------------------------------
  // 1. PROFILE SCORE (/15)
  // -------------------------------------------------------------
  let profileScore = 0

  // Bio (up to 5 pts)
  if (user.bio && user.bio.trim().length >= 25) {
    profileScore += 5
  } else if (user.bio && user.bio.trim().length > 0) {
    profileScore += 3
  }

  // Profile README (up to 3 pts)
  if (user.hasProfileReadme) {
    profileScore += 3
  }

  // Location (up to 2 pts)
  if (user.location && user.location.trim().length > 0) {
    profileScore += 2
  }

  // Website / Portfolio link (up to 2 pts)
  if (user.blog && user.blog.trim().length > 0) {
    profileScore += 2
  }

  // Identity / Real display name (up to 2 pts)
  if (user.name && user.name.trim().length > 0 && user.name.trim().toLowerCase() !== user.username.toLowerCase()) {
    profileScore += 2
  } else if (user.name && user.name.trim().length > 0) {
    profileScore += 1
  }

  // Company / Organization (up to 1 pt)
  if (user.company && user.company.trim().length > 0) {
    profileScore += 1
  }

  profileScore = Math.min(15, Math.max(0, profileScore))

  // -------------------------------------------------------------
  // 2. PROJECTS SCORE (/30)
  // -------------------------------------------------------------
  let projectsScore = 0

  // Quantity of original work (up to 8 pts)
  if (nonForkCount >= 6) {
    projectsScore += 8
  } else if (nonForkCount >= 3) {
    projectsScore += 6
  } else if (nonForkCount >= 1) {
    projectsScore += 4
  } else if (totalRepos > 0) {
    projectsScore += 2
  }

  // Description coverage on original repositories (up to 8 pts)
  if (nonForkCount > 0) {
    const descRatio = nonForksWithDesc.length / nonForkCount
    projectsScore += Math.round(descRatio * 8)
  }

  // Stars & External traction (up to 6 pts)
  const totalStars = stats?.totalStars || 0
  if (totalStars >= 50) {
    projectsScore += 6
  } else if (totalStars >= 15) {
    projectsScore += 5
  } else if (totalStars >= 5) {
    projectsScore += 4
  } else if (totalStars >= 1) {
    projectsScore += 2
  }

  // Language diversity & technical stack (up to 4 pts)
  const languages = Array.isArray(stats?.languages) ? stats.languages : []
  if (languages.length >= 3) {
    projectsScore += 4
  } else if (languages.length >= 1) {
    projectsScore += 3
  }

  // Completeness & live demo presence (up to 4 pts)
  const hasDemoUrl = repos.some((r) => r.homepage && r.homepage.trim().length > 0)
  if (hasDemoUrl) {
    projectsScore += 2
  }
  // Balanced ratio of original vs forked work
  if (nonForkCount >= forkCount && nonForkCount > 0) {
    projectsScore += 2
  }

  projectsScore = Math.min(30, Math.max(0, projectsScore))

  // -------------------------------------------------------------
  // 3. DOCUMENTATION SCORE (/20)
  // -------------------------------------------------------------
  let documentationScore = 0

  // Profile README presence (up to 5 pts)
  if (user.hasProfileReadme) {
    documentationScore += 5
  }

  // Top repositories description completeness (up to 8 pts)
  if (topRepos.length > 0) {
    const topWithDesc = topRepos.filter(
      (r) => typeof r.description === 'string' && r.description.trim().length > 0
    )
    const topDescRatio = topWithDesc.length / topRepos.length
    documentationScore += Math.round(topDescRatio * 8)
  }

  // Verified README availability on top repositories (up to 7 pts)
  const verifiedReadmes = topRepos.filter((r) => r.hasReadme === true).length
  const checkedReadmes = topRepos.filter((r) => r.hasReadme !== null).length
  if (checkedReadmes > 0) {
    const readmeRatio = verifiedReadmes / checkedReadmes
    documentationScore += Math.round(readmeRatio * 7)
  } else {
    // If README status was unverified, evaluate repository metadata & demo completeness
    const descRatio = repos.length > 0 ? reposWithDesc.length / repos.length : 0
    documentationScore += Math.round(descRatio * 5)
    if (repos.some((r) => r.homepage)) {
      documentationScore += 2
    }
  }

  documentationScore = Math.min(20, Math.max(0, documentationScore))

  // -------------------------------------------------------------
  // 4. ACTIVITY SCORE (/20)
  // -------------------------------------------------------------
  let activityScore = 0

  // Recency of most recent push (up to 10 pts)
  if (daysSinceLastPush !== null) {
    if (daysSinceLastPush <= 14) {
      activityScore += 10
    } else if (daysSinceLastPush <= 35) {
      activityScore += 8
    } else if (daysSinceLastPush <= 90) {
      activityScore += 6
    } else if (daysSinceLastPush <= 180) {
      activityScore += 4
    } else if (daysSinceLastPush <= 365) {
      activityScore += 2
    }
  }

  // Multiple active repos in past 180 days (up to 6 pts)
  const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000
  const activeRecentRepos = repos.filter((r) => {
    if (!r.pushedAt) return false
    const d = new Date(r.pushedAt).getTime()
    return !isNaN(d) && d >= sixMonthsAgo
  }).length

  if (activeRecentRepos >= 4) {
    activityScore += 6
  } else if (activeRecentRepos >= 2) {
    activityScore += 4
  } else if (activeRecentRepos >= 1) {
    activityScore += 2
  }

  // Account maturity & active maintenance (up to 4 pts)
  if (user.createdAt) {
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    )
    if (accountAgeDays > 180 && daysSinceLastPush !== null && daysSinceLastPush <= 180) {
      activityScore += 4
    } else if (accountAgeDays > 30 && daysSinceLastPush !== null && daysSinceLastPush <= 365) {
      activityScore += 3
    } else {
      activityScore += 1
    }
  }

  activityScore = Math.min(20, Math.max(0, activityScore))

  // -------------------------------------------------------------
  // 5. RECRUITER READINESS SCORE (/15)
  // -------------------------------------------------------------
  let recruiterScore = 0

  // 1. First impression identity: Name + Bio (up to 4 pts)
  const hasName = Boolean(user.name && user.name.trim().length > 0)
  const hasBio = Boolean(user.bio && user.bio.trim().length > 0)
  if (hasName && hasBio) {
    recruiterScore += 4
  } else if (hasName || hasBio) {
    recruiterScore += 2
  }

  // 2. Direct contact avenues: Website or Location (up to 3 pts)
  if (user.blog && user.blog.trim().length > 0) {
    recruiterScore += 2
  }
  if (user.location && user.location.trim().length > 0) {
    recruiterScore += 1
  }

  // 3. Flagship repos readability (up to 5 pts)
  // Are top 2-3 repositories clearly described with recognized primary languages?
  const topTwo = topRepos.slice(0, 2)
  const topTwoDescribed = topTwo.filter(
    (r) => r.description && r.description.trim().length > 0 && r.language
  ).length
  if (topTwo.length >= 2 && topTwoDescribed === 2) {
    recruiterScore += 5
  } else if (topTwoDescribed >= 1) {
    recruiterScore += 3
  }

  // 4. Momentum / Not stale (up to 3 pts)
  if (daysSinceLastPush !== null && daysSinceLastPush <= 60) {
    recruiterScore += 3
  } else if (daysSinceLastPush !== null && daysSinceLastPush <= 180) {
    recruiterScore += 2
  }

  recruiterScore = Math.min(15, Math.max(0, recruiterScore))

  // -------------------------------------------------------------
  // OVERALL SCORE (/100)
  // -------------------------------------------------------------
  const overallScore = Math.min(
    100,
    Math.max(0, profileScore + projectsScore + documentationScore + activityScore + recruiterScore)
  )

  // -------------------------------------------------------------
  // FINDINGS GENERATOR (Roast, Diagnose, Rescue)
  // Prioritize biggest weaknesses first, supported strictly by fetched data.
  // -------------------------------------------------------------
  const findingItems = []
  const detectedLanguages = Array.isArray(stats?.languages) ? stats.languages : []
  const topDetectedLangs = detectedLanguages.slice(0, 3)
  const techStackSummary = topDetectedLangs.length > 0 ? topDetectedLangs.join(', ') : null

  // Check 0: 0 Public Repositories
  if (totalRepos === 0) {
    findingItems.push({
      priority: 10,
      roast:
        "Your public GitHub profile is a digital ghost town with zero public repositories.",
      diagnose:
        "You currently have 0 public repositories visible on GitHub. Evaluators cannot assess your code, architecture, or implementation skills.",
      rescue:
        "Publish at least one public repository containing documented code that represents your technical focus.",
    })
  }

  // Check 1: Empty Profile Bio
  if (!user.bio || user.bio.trim().length === 0) {
    const bioRescue = techStackSummary
      ? `Add a 1-sentence bio stating your primary engineering focus and core languages (${techStackSummary}) so visitors immediately understand what you build.`
      : "Add a 1-sentence bio summarizing your primary development focus and the problems you solve."

    findingItems.push({
      priority: 10,
      roast:
        "Your profile bio is an invisible ink masterpiece — visitors have no idea what you specialize in or what you build.",
      diagnose:
        "Your profile has no bio, leaving zero context on your specialization, primary tools, or current engineering focus.",
      rescue: bioRescue,
    })
  } else if (user.bio.trim().length < 20) {
    const shortBioRescue = techStackSummary
      ? `Expand your bio beyond "${user.bio.trim()}" to highlight your experience with ${techStackSummary} and the types of systems you build.`
      : `Expand your bio beyond "${user.bio.trim()}" to clearly describe your primary technologies and what you build.`

    findingItems.push({
      priority: 6,
      roast: "Your bio is shorter than a git commit message for a typo fix.",
      diagnose: `Your bio is only ${user.bio.trim().length} characters long ("${user.bio.trim()}"). It leaves visitors guessing what technical problems you solve.`,
      rescue: shortBioRescue,
    })
  }

  // Check 2: Undescribed Repositories
  const undescribedCount = totalRepos - reposWithDesc.length
  if (totalRepos > 0 && undescribedCount > 0) {
    if (reposWithDesc.length === 0) {
      const countTarget = Math.min(3, totalRepos)
      findingItems.push({
        priority: 9,
        roast:
          "Your repositories are playing a game of mystery box — nobody knows what's inside until they clone the source code.",
        diagnose: `None of your ${totalRepos} public repositories have a description. Visitors cannot tell what any project actually does.`,
        rescue: `Write concise one-line descriptions for your ${countTarget === 1 ? 'repository' : `top ${countTarget} repositories`} immediately so visitors understand their purpose at a glance.`,
      })
    } else {
      findingItems.push({
        priority: 8,
        roast:
          "You left repositories without descriptions, like grocery store cans with the labels ripped off.",
        diagnose: `You have ${undescribedCount} of ${totalRepos} repositories without a description.`,
        rescue: `Add concise one-line descriptions to your ${undescribedCount} undescribed ${undescribedCount === 1 ? 'repository' : 'repositories'}, starting with your most starred and recent projects.`,
      })
    }
  }

  // Check 3: Profile README
  if (!user.hasProfileReadme) {
    const readmeRescue = techStackSummary
      ? `Create a public repository named "${user.username}" and add a README.md highlighting your experience with ${techStackSummary}, featured repositories, and contact links.`
      : `Create a public repository named "${user.username}" and add a README.md introducing your technical background, featured repositories, and contact links.`

    findingItems.push({
      priority: 7,
      roast:
        "Your profile header has no README — you're leaving GitHub's prime real estate completely blank.",
      diagnose: `You have not created a special ${user.username}/${user.username} repository to showcase a custom profile README.`,
      rescue: readmeRescue,
    })
  }

  // Check 4: Stale Activity / Cobwebs
  if (daysSinceLastPush !== null && daysSinceLastPush > 90) {
    const months = Math.floor(daysSinceLastPush / 30)
    findingItems.push({
      priority: 8,
      roast:
        "Cobwebs have officially taken over your push history — git log feels like ancient archaeology here.",
      diagnose: `Your most recent repository activity was ${daysSinceLastPush} days ago (~${months} months ago). Stale profiles give the impression of inactivity.`,
      rescue:
        "Push a commit to one of your repositories: update dependencies, document a feature, or release recent improvements to re-establish active momentum.",
    })
  }

  // Check 5: Only Forks or Heavy Fork Ratio
  if (totalRepos > 0 && nonForkCount === 0) {
    const forkRescue = topDetectedLangs.length > 0
      ? `Create and publish an original repository built from scratch using ${topDetectedLangs[0]} to showcase your own design and implementation skills.`
      : "Create and publish an original repository built from scratch to showcase your own design and implementation skills."

    findingItems.push({
      priority: 9,
      roast:
        "Your GitHub profile is essentially an echo chamber — every single repository is a fork of someone else's work.",
      diagnose: `All ${totalRepos} public repositories on your profile are forks. There are zero original projects authored under your handle.`,
      rescue: forkRescue,
    })
  } else if (totalRepos >= 4 && forkCount > nonForkCount * 2) {
    findingItems.push({
      priority: 5,
      roast:
        "Your profile looks more like a browser bookmark folder than a developer portfolio.",
      diagnose: `You have ${forkCount} forked repositories compared to only ${nonForkCount} original repositories.`,
      rescue:
        "Pin your best original repositories to the top of your profile so visitors see your own authored code first.",
    })
  }

  // Check 6: Missing Top Repo READMEs
  const topMissingReadme = topRepos.filter((r) => r.hasReadme === false)
  if (topMissingReadme.length > 0) {
    const missingNames = topMissingReadme.map((r) => r.name).slice(0, 3).join(', ')
    const firstMissing = topMissingReadme[0]
    const repoLangRescue = firstMissing.language
      ? `Add a structured README.md to ${firstMissing.name} with a project overview, ${firstMissing.language} setup instructions, and feature details.`
      : `Add a structured README.md to ${firstMissing.name} with a project overview, setup instructions, and feature details.`

    findingItems.push({
      priority: 7,
      roast:
        "Your top projects lack README files. That's like shipping a flat-pack desk with zero assembly instructions.",
      diagnose: `Key projects (${missingNames}) are missing a README.md file.`,
      rescue: repoLangRescue,
    })
  }

  // Check 7: No Live Demo / Website Links
  if (totalRepos > 0 && !hasDemoUrl && !user.blog) {
    findingItems.push({
      priority: 6,
      roast:
        "None of your projects have live demo links. Visitors rarely clone and compile code locally just to see what a project does.",
      diagnose:
        "None of your repositories have a homepage or demo URL listed, and your profile has no website linked.",
      rescue:
        "Deploy a live preview or documentation page for your primary project and add the URL in the repository's About section.",
    })
  }

  // Check 8: Positive Highlight (Consistent Activity & Stars)
  if (totalStars >= 10) {
    findingItems.push({
      priority: 2,
      roast:
        "Credit where it's due: you've actually convinced real developers on the internet to star your work.",
      diagnose: `You have accumulated ${totalStars.toLocaleString()} total stars across your repositories, demonstrating external validation and utility.`,
      rescue:
        "Pin your highest-starred repositories to the very top of your profile to lead with verified social proof.",
    })
  } else if (daysSinceLastPush !== null && daysSinceLastPush <= 7) {
    findingItems.push({
      priority: 2,
      roast:
        "Your keyboard is clearly still smoking from recent commits — at least nobody can accuse you of abandoning ship.",
      diagnose: `You pushed code ${daysSinceLastPush === 0 ? 'today' : `${daysSinceLastPush} day${daysSinceLastPush === 1 ? '' : 's'} ago`}, showing ongoing active engineering.`,
      rescue:
        "Maintain your momentum and ensure your commit messages and pull requests clearly document features and fixes.",
    })
  }

  // Fallback if profile is in pristine condition or very few issues found
  if (findingItems.length === 0) {
    const pristineRescue = techStackSummary
      ? `Continue maintaining your repositories with regular updates, changelogs, and release notes for your ${techStackSummary} projects.`
      : "Continue maintaining your repositories with regular updates, changelogs, and release notes."

    findingItems.push({
      priority: 1,
      roast:
        "Your profile is almost suspiciously clean. Are you applying for jobs or running for public office?",
      diagnose:
        "Your profile has solid bio coverage, described repositories, and active push history.",
      rescue: pristineRescue,
    })
  }

  // Sort findings by priority (highest weakness priority first)
  findingItems.sort((a, b) => b.priority - a.priority)

  // Map into exact required schema
  const roasts = findingItems.map((item) => item.roast)
  const diagnoses = findingItems.map((item) => item.diagnose)
  const rescues = findingItems.map((item) => item.rescue)

  return {
    scores: {
      overall: overallScore,
      profile: profileScore,
      projects: projectsScore,
      documentation: documentationScore,
      activity: activityScore,
      recruiterReadiness: recruiterScore,
    },
    findings: {
      roast: roasts,
      diagnose: diagnoses,
      rescue: rescues,
      items: findingItems,
    },
  }
}
