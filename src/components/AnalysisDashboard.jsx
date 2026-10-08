import { useState, useEffect } from 'react'
import './AnalysisDashboard.css'

export default function AnalysisDashboard({ data, activeTab, onTabChange }) {
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0)
  const [checkedRescueItems, setCheckedRescueItems] = useState({})
  const [isRecruiterModeActive, setIsRecruiterModeActive] = useState(false)
  const safeScores = {
    overall: data?.scores?.overall ?? 0,
    profile: data?.scores?.profile ?? 0,
    projects: data?.scores?.projects ?? 0,
    documentation: data?.scores?.documentation ?? 0,
    activity: data?.scores?.activity ?? 0,
    recruiterReadiness: data?.scores?.recruiterReadiness ?? 0,
  }

  const isReducedMotionPreferred =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [prevData, setPrevData] = useState(data)
  const [displayScore, setDisplayScore] = useState(() =>
    isReducedMotionPreferred ? safeScores.overall : 0
  )
  const [gaugeRatio, setGaugeRatio] = useState(() =>
    isReducedMotionPreferred ? safeScores.overall / 100 : 0
  )
  const [isBadgeVisible, setIsBadgeVisible] = useState(() =>
    Boolean(isReducedMotionPreferred)
  )

  // Re-sync and re-trigger animation cleanly when new analysis data arrives
  if (prevData !== data) {
    setPrevData(data)
    if (isReducedMotionPreferred) {
      setDisplayScore(safeScores.overall)
      setGaugeRatio(safeScores.overall / 100)
      setIsBadgeVisible(true)
    } else {
      setDisplayScore(0)
      setGaugeRatio(0)
      setIsBadgeVisible(false)
    }
  }

  // Smooth animation for score number and progress ring
  useEffect(() => {
    const targetScore = safeScores.overall

    // Respect prefers-reduced-motion: immediately show final score without animation
    if (isReducedMotionPreferred) {
      return
    }

    let animationFrameId
    const startTime = performance.now()
    const duration = 1350 // ~1.35s (within 1.2–1.5s window)

    function animate(currentTime) {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)
      // Smooth easeOutQuart curve for high-end deceleration
      const eased = 1 - Math.pow(1 - progress, 4)

      const currentScore = Math.round(eased * targetScore)
      setDisplayScore(currentScore)
      setGaugeRatio(eased * (targetScore / 100))

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate)
      } else {
        setDisplayScore(targetScore)
        setGaugeRatio(targetScore / 100)
        setIsBadgeVisible(true)
      }
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [data, safeScores.overall, isReducedMotionPreferred])

  if (!data || !data.user) return null

  const { user, stats, topRepositories, findings } = data

  // Score label from prompt examples
  function getScoreBadge(score) {
    if (score >= 85) return { label: 'Recruiter Magnet', className: 'tier-badge--magnet', color: 'var(--green)' }
    if (score >= 70) return { label: 'Strong Potential', className: 'tier-badge--strong', color: '#38bdf8' }
    if (score >= 55) return { label: 'Needs Polish', className: 'tier-badge--polish', color: '#facc15' }
    if (score >= 40) return { label: 'GitHub Cleanup Required', className: 'tier-badge--cleanup', color: 'var(--fire)' }
    return { label: 'We Need To Talk', className: 'tier-badge--talk', color: '#f87171' }
  }

  const scoreBadge = getScoreBadge(safeScores.overall)

  // One-sentence verdict based on real score
  function getVerdict(score) {
    if (score >= 85) {
      return 'Exceptionally strong profile with verified project traction and well-maintained repositories.'
    }
    if (score >= 70) {
      return 'Solid engineering foundation; polishing documentation and repository descriptions will further strengthen your public profile.'
    }
    if (score >= 55) {
      return 'Demonstrated technical ability, but incomplete repository descriptions and metadata reduce profile clarity.'
    }
    if (score >= 40) {
      return 'Clear signs of coding activity, but missing descriptions and profile metadata create friction for reviewers.'
    }
    return 'Profile has significant documentation and metadata gaps that obscure your technical capabilities.'
  }

  const verdict = getVerdict(safeScores.overall)

  // Findings data
  const roasts = Array.isArray(findings?.roast) ? findings.roast : []
  const diagnoses = Array.isArray(findings?.diagnose) ? findings.diagnose : []
  const rescues = Array.isArray(findings?.rescue) ? findings.rescue : []

  const findingCount = Math.max(roasts.length, diagnoses.length, rescues.length)
  const currentFinding = {
    roast: roasts[selectedFindingIndex] || 'No roast available.',
    diagnose: diagnoses[selectedFindingIndex] || 'No diagnosis available.',
    rescue: rescues[selectedFindingIndex] || 'No rescue recommendation available.',
    priority: findings?.items?.[selectedFindingIndex]?.priority || 8,
  }

  // Top 3 rescue checklist items
  const topRescues = rescues.slice(0, 3)

  function toggleRescueCheck(index) {
    setCheckedRescueItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const completedCount = topRescues.filter((_, idx) => checkedRescueItems[idx]).length

  // Recruiter Checklist derived from real data
  const reposWithDesc = (data.repositories || []).filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )
  const undescribedCount = (user.publicRepoCount || 0) - reposWithDesc.length
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null

  const strongSignals = []
  if (stats?.totalStars && stats.totalStars > 0) {
    strongSignals.push(`${stats.totalStars.toLocaleString()} total stars across public repositories`)
  }
  if (daysSinceLastPush !== null && daysSinceLastPush <= 30) {
    strongSignals.push(`Recent active momentum (${daysSinceLastPush === 0 ? 'today' : `${daysSinceLastPush} days ago`})`)
  }
  if (stats?.nonForkRepoCount && stats.nonForkRepoCount >= 2) {
    strongSignals.push(`${stats.nonForkRepoCount} original repositories built from scratch`)
  }
  if (user.bio && user.bio.trim().length >= 15) {
    strongSignals.push('Bio provides immediate context on engineering focus')
  }
  if (user.hasProfileReadme) {
    strongSignals.push('Custom profile README welcomes visitors with personality')
  }
  if (user.blog) {
    strongSignals.push('Direct portfolio or external site linked')
  }
  if (stats?.languages && stats.languages.length >= 2) {
    strongSignals.push(`Visible tech stack: ${stats.languages.slice(0, 3).join(', ')}`)
  }
  if (strongSignals.length === 0) {
    strongSignals.push('Public GitHub profile accessible for evaluation')
  }

  const redFlags = []
  if (undescribedCount > 0) {
    redFlags.push(`${undescribedCount} of ${user.publicRepoCount || 0} repositories have no description`)
  }
  if (!user.bio || user.bio.trim().length === 0) {
    redFlags.push('Missing bio: visitors cannot determine your primary specialization')
  }
  if (!user.hasProfileReadme) {
    redFlags.push('No profile README: missed opportunity to feature flagship projects')
  }
  if (daysSinceLastPush !== null && daysSinceLastPush > 60) {
    redFlags.push(`Push gap: no commits recorded in the past ${daysSinceLastPush} days`)
  }
  if (stats?.nonForkRepoCount === 0 && (user.publicRepoCount || 0) > 0) {
    redFlags.push('All repositories are forks; no original work authored under this handle')
  }
  if (!user.blog) {
    redFlags.push('No portfolio or external demo link in profile metadata')
  }
  if (redFlags.length === 0) {
    redFlags.push('Minor documentation polish recommended for maximum recruiter appeal')
  }

  const recruiterVerdict =
    safeScores.overall >= 70
      ? 'Passes the 30-second scan. Has tangible evidence of skill and projects worth exploring.'
      : safeScores.overall >= 50
      ? 'Mixed first impression. Good raw material, but missing descriptions and links create friction.'
      : 'High friction. Reviewers cannot quickly gauge your primary technical focus due to missing project descriptions and metadata.'

  // SVG Gauge calculations (r = 52, circumference ~ 326.73)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - circumference * gaugeRatio

  // Calculate Biggest Recruiter Roadblock based on real scores and analysis
  const roadblock = getBiggestRoadblock({
    safeScores,
    user,
    stats,
    repositories: data.repositories,
  })

  // Categories for breakdown
  const categoryList = [
    { label: 'Profile', score: safeScores.profile, max: 15, icon: '👤' },
    { label: 'Projects', score: safeScores.projects, max: 30, icon: '📦' },
    { label: 'Documentation', score: safeScores.documentation, max: 20, icon: '📝' },
    { label: 'Activity', score: safeScores.activity, max: 20, icon: '⚡' },
    { label: 'Recruiter Readiness', score: safeScores.recruiterReadiness, max: 15, icon: '🎯' },
  ]

  return (
    <main className="dash-container" aria-label="Analysis Dashboard">
      {/* ── Compact Profile Bar ── */}
      <section className="dash-profile-bar">
        <div className="dash-profile-bar__left">
          <img
            src={user.avatar}
            alt={`${user.username}'s avatar`}
            className="dash-profile-bar__avatar"
            width="54"
            height="54"
          />
          <div className="dash-profile-bar__info">
            <div className="dash-profile-bar__name-row">
              <h1 className="dash-profile-bar__name">{user.name || user.username}</h1>
              <a
                href={user.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="dash-profile-bar__handle"
                title="View on GitHub"
              >
                @{user.username} ↗
              </a>
            </div>
            {user.bio && <p className="dash-profile-bar__bio">{user.bio}</p>}
          </div>
        </div>

        <div className="dash-profile-bar__chips">
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{user.publicRepoCount}</span>
            <span className="dash-stat-chip__label">Repos</span>
          </div>
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{user.followers.toLocaleString()}</span>
            <span className="dash-stat-chip__label">Followers</span>
          </div>
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{stats?.totalStars?.toLocaleString() || 0}</span>
            <span className="dash-stat-chip__label">Stars</span>
          </div>
        </div>
      </section>

      {/* ── VIEW 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="dash-view dash-view--overview">
          {/* Main Hero Score Grid */}
          <div className="dash-score-hero">
            {/* Left Score Gauge */}
            <div className="dash-gauge-card">
              <div className="dash-gauge-wrap">
                <svg className="dash-gauge-svg" viewBox="0 0 120 120" width="130" height="130" aria-hidden="true">
                  <circle className="dash-gauge-bg" cx="60" cy="60" r={radius} strokeWidth="10" />
                  <circle
                    className="dash-gauge-fill"
                    cx="60"
                    cy="60"
                    r={radius}
                    strokeWidth="10"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    stroke={scoreBadge.color}
                  />
                </svg>
                <div className="dash-gauge-text">
                  <span className="dash-gauge-num">{displayScore}</span>
                  <span className="dash-gauge-denom">/100</span>
                </div>
              </div>

              <div className="dash-gauge-details">
                <span
                  className={`dash-tier-badge ${scoreBadge.className} ${
                    isBadgeVisible ? 'dash-tier-badge--visible' : 'dash-tier-badge--hidden'
                  }`}
                >
                  {scoreBadge.label}
                </span>
                <h2 className="dash-gauge-title">GitHub Health Score</h2>
                <p className="dash-gauge-verdict">{verdict}</p>
              </div>
            </div>

            {/* Right Category Breakdown */}
            <div className="dash-breakdown-card">
              <h3 className="dash-breakdown-title">Score Breakdown</h3>
              <div className="dash-breakdown-list">
                {categoryList.map((cat) => {
                  const pct = Math.round((cat.score / cat.max) * 100)
                  return (
                    <div key={cat.label} className="dash-cat-row">
                      <div className="dash-cat-row__header">
                        <span className="dash-cat-row__name">
                          <span aria-hidden="true">{cat.icon}</span> {cat.label}
                        </span>
                        <span className="dash-cat-row__val">
                          <strong>{cat.score}</strong>/{cat.max}
                        </span>
                      </div>
                      <div className="dash-cat-row__track">
                        <div className="dash-cat-row__fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── BIGGEST RECRUITER ROADBLOCK ── */}
          <section className="dash-roadblock-card" aria-label="Biggest Recruiter Roadblock">
            <div className="dash-roadblock-card__header">
              <span className="dash-roadblock-card__badge" aria-hidden="true">⚠️</span>
              <h3 className="dash-roadblock-card__title">BIGGEST RECRUITER ROADBLOCK</h3>
              <span className="dash-roadblock-card__cat">
                Impact Area: <strong>{roadblock.category}</strong>
              </span>
            </div>
            <p className="dash-roadblock-card__diagnosis">{roadblock.diagnosis}</p>
            {roadblock.evidence && (
              <p className="dash-roadblock-card__evidence">{roadblock.evidence}</p>
            )}
            <div className="dash-roadblock-card__action">
              <span className="dash-roadblock-card__action-arrow" aria-hidden="true">→</span>
              <span className="dash-roadblock-card__action-text">{roadblock.action}</span>
            </div>
          </section>

          {/* Quick Action Navigation Tiles */}
          <div className="dash-tiles-grid">
            <button
              type="button"
              className="dash-tile dash-tile--recruiter"
              onClick={() => onTabChange('recruiter')}
            >
              <div className="dash-tile__icon-wrap">
                <span aria-hidden="true">🎯</span>
              </div>
              <div className="dash-tile__text">
                <h4 className="dash-tile__heading">Recruiter Mode</h4>
                <p className="dash-tile__desc">See the 30-second scan: strong signals, red flags &amp; verdict.</p>
              </div>
              <span className="dash-tile__arrow">→</span>
            </button>

            <button
              type="button"
              className="dash-tile dash-tile--roast"
              onClick={() => onTabChange('roast')}
            >
              <div className="dash-tile__icon-wrap">
                <span aria-hidden="true">🔥</span>
              </div>
              <div className="dash-tile__text">
                <h4 className="dash-tile__heading">Roast Navigator</h4>
                <p className="dash-tile__desc">Explore all {findingCount} data-backed roasts, diagnostics &amp; fixes.</p>
              </div>
              <span className="dash-tile__arrow">→</span>
            </button>

            <button
              type="button"
              className="dash-tile dash-tile--rescue"
              onClick={() => onTabChange('rescue')}
            >
              <div className="dash-tile__icon-wrap">
                <span aria-hidden="true">🛠️</span>
              </div>
              <div className="dash-tile__text">
                <h4 className="dash-tile__heading">Rescue Plan</h4>
                <p className="dash-tile__desc">Interactive checklist of the top 3 highest-impact improvements.</p>
              </div>
              <span className="dash-tile__arrow">→</span>
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW 2: RECRUITER VIEW / MODE ── */}
      {activeTab === 'recruiter' && (
        <div className="dash-view dash-view--recruiter">
          <div className="dash-view-header">
            <div className="dash-view-header__left">
              <span className="dash-view-tag">30-SECOND AUDIT</span>
              <h2 className="dash-view-title">
                What a Recruiter Sees in <span className="gradient-text">30 Seconds</span>
              </h2>
              <p className="dash-view-subtitle">
                Factual evaluation synthesized purely from your public profile and repositories.
              </p>
            </div>
            <button
              type="button"
              className={`recruiter-toggle-btn ${isRecruiterModeActive ? 'recruiter-toggle-btn--active' : ''}`}
              onClick={() => setIsRecruiterModeActive((prev) => !prev)}
            >
              <span className="recruiter-toggle-btn__dot" aria-hidden="true" />
              {isRecruiterModeActive ? 'Recruiter Mode: ON' : 'Toggle High-Contrast'}
            </button>
          </div>

          <div className={`recruiter-audit-grid ${isRecruiterModeActive ? 'recruiter-audit-grid--high-contrast' : ''}`}>
            {/* 🟢 Strong Signals */}
            <div className="recruiter-audit-card recruiter-audit-card--strong">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-signal-dot recruiter-signal-dot--green" aria-hidden="true">🟢</span>
                <h3 className="recruiter-audit-card__title">Strong Signals</h3>
              </div>
              <ul className="recruiter-audit-list">
                {strongSignals.map((item, idx) => (
                  <li key={idx} className="recruiter-audit-item">
                    <span className="recruiter-audit-icon" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🔴 Red Flags */}
            <div className="recruiter-audit-card recruiter-audit-card--weak">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-signal-dot recruiter-signal-dot--red" aria-hidden="true">🔴</span>
                <h3 className="recruiter-audit-card__title">Red Flags</h3>
              </div>
              <ul className="recruiter-audit-list">
                {redFlags.map((item, idx) => (
                  <li key={idx} className="recruiter-audit-item">
                    <span className="recruiter-audit-icon" aria-hidden="true">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 🎯 Recruiter Verdict */}
            <div className="recruiter-audit-card recruiter-audit-card--verdict">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-signal-dot" aria-hidden="true">🎯</span>
                <h3 className="recruiter-audit-card__title">Recruiter Verdict</h3>
              </div>
              <p className="recruiter-verdict-summary">{recruiterVerdict}</p>

              <div className="recruiter-first-action">
                <span className="recruiter-first-action__label">PRIMARY ROADBLOCK TO FIX:</span>
                <p className="recruiter-first-action__text">{roadblock.action}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 3: ROAST EXPERIENCE NAVIGATOR ── */}
      {activeTab === 'roast' && (
        <div className="dash-view dash-view--roast">
          <div className="dash-view-header">
            <div className="dash-view-header__left">
              <span className="dash-view-tag">INTERACTIVE NAVIGATOR</span>
              <h2 className="dash-view-title">
                🔥 Roast Navigator — <span className="gradient-text">{findingCount} Findings</span>
              </h2>
              <p className="dash-view-subtitle">
                Select a finding below to inspect the honest roast, root cause diagnosis, and rescue fix.
              </p>
            </div>
          </div>

          {/* Finding Pills Bar */}
          <div className="finding-pills-bar" role="tablist" aria-label="Finding selector">
            {Array.from({ length: findingCount }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={selectedFindingIndex === idx}
                className={`finding-pill-btn ${selectedFindingIndex === idx ? 'finding-pill-btn--active' : ''}`}
                onClick={() => setSelectedFindingIndex(idx)}
              >
                [{String(idx + 1).padStart(2, '0')}]
              </button>
            ))}
          </div>

          {/* Interactive Single Finding Card */}
          <div className="finding-display-card">
            <div className="finding-display-card__header">
              <span className="finding-display-card__index">Finding #{selectedFindingIndex + 1} of {findingCount}</span>
              <div className="finding-display-card__controls">
                <button
                  type="button"
                  className="finding-nav-arrow"
                  disabled={selectedFindingIndex === 0}
                  onClick={() => setSelectedFindingIndex((p) => Math.max(0, p - 1))}
                  title="Previous finding"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  className="finding-nav-arrow"
                  disabled={selectedFindingIndex === findingCount - 1}
                  onClick={() => setSelectedFindingIndex((p) => Math.min(findingCount - 1, p + 1))}
                  title="Next finding"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="finding-stages-vertical">
              {/* 🔥 ROAST */}
              <div className="finding-stage-box finding-stage-box--roast">
                <span className="finding-stage-box__label">🔥 ROAST</span>
                <p className="finding-stage-box__quote">&ldquo;{currentFinding.roast}&rdquo;</p>
              </div>

              {/* 🔍 DIAGNOSE */}
              <div className="finding-stage-box finding-stage-box--diagnose">
                <span className="finding-stage-box__label">🔍 DIAGNOSE</span>
                <p className="finding-stage-box__body">{currentFinding.diagnose}</p>
              </div>

              {/* 🛠️ RESCUE */}
              <div className="finding-stage-box finding-stage-box--rescue">
                <span className="finding-stage-box__label">🛠️ RESCUE</span>
                <p className="finding-stage-box__body">{currentFinding.rescue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 4: RESCUE EXPERIENCE CHECKLIST ── */}
      {activeTab === 'rescue' && (
        <div className="dash-view dash-view--rescue">
          <div className="dash-view-header">
            <div className="dash-view-header__left">
              <span className="dash-view-tag">ACTION CHECKLIST</span>
              <h2 className="dash-view-title">
                Your <span className="gradient-text">Rescue Plan</span>
              </h2>
              <p className="dash-view-subtitle">
                The top 3 highest-impact improvements ranked by recruiter ROI. Check them off as you complete them!
              </p>
            </div>
            <div className="rescue-progress-badge">
              {completedCount === topRescues.length ? (
                <span className="rescue-badge--done">🎉 All Fixes Done!</span>
              ) : (
                <span>{completedCount} of {topRescues.length} completed</span>
              )}
            </div>
          </div>

          <div className="rescue-checklist-container">
            {topRescues.map((item, idx) => {
              const isChecked = Boolean(checkedRescueItems[idx])
              return (
                <div
                  key={idx}
                  className={`rescue-check-card ${isChecked ? 'rescue-check-card--checked' : ''}`}
                  onClick={() => toggleRescueCheck(idx)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      toggleRescueCheck(idx)
                    }
                  }}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                >
                  <div className="rescue-check-card__checkbox" aria-hidden="true">
                    {isChecked ? '✓' : ''}
                  </div>
                  <div className="rescue-check-card__content">
                    <div className="rescue-check-card__tags">
                      <span className={`rescue-rank-pill ${idx === 0 ? 'rank--1' : idx === 1 ? 'rank--2' : 'rank--3'}`}>
                        {idx === 0 ? '#1 Highest Impact' : idx === 1 ? '#2 High Priority' : '#3 Quick Win'}
                      </span>
                    </div>
                    <p className={`rescue-check-card__text ${isChecked ? 'rescue-check-card__text--done' : ''}`}>
                      {item}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 5: REPOSITORIES ── */}
      {activeTab === 'repositories' && (
        <div className="dash-view dash-view--repos">
          <div className="dash-view-header">
            <div className="dash-view-header__left">
              <span className="dash-view-tag">CODE AUDIT</span>
              <h2 className="dash-view-title">
                Top <span className="gradient-text">Repositories</span>
              </h2>
              <p className="dash-view-subtitle">
                Showing top public repositories ranked by stars and push recency.
              </p>
            </div>
            <span className="dash-repos-count">{user.publicRepoCount} total public repos</span>
          </div>

          <div className="dash-repos-grid">
            {(topRepositories || []).map((repo) => (
              <article key={repo.name} className="dash-repo-card">
                <div className="dash-repo-card__header">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dash-repo-card__name"
                  >
                    {repo.name} <span aria-hidden="true">↗</span>
                  </a>
                  {repo.isFork && <span className="dash-repo-card__fork-pill">Fork</span>}
                </div>

                <p className="dash-repo-card__desc">
                  {repo.description || 'No description provided.'}
                </p>

                <div className="dash-repo-card__footer">
                  {repo.language ? (
                    <span className="dash-repo-card__lang">
                      <span className="dash-repo-card__lang-dot" aria-hidden="true" />
                      {repo.language}
                    </span>
                  ) : (
                    <span className="dash-repo-card__lang-none">No language specified</span>
                  )}
                  <div className="dash-repo-card__metrics">
                    <span title="Stars">⭐ {repo.stars}</span>
                    <span title="Forks">🍴 {repo.forks}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}

/**
 * Dynamically determines the single highest-impact Recruiter Roadblock
 * from the user's real scores, repository attributes, and profile data.
 * Zero hardcoded numbers or invented stats.
 */
function getBiggestRoadblock({ safeScores, user, stats, repositories }) {
  const repos = Array.isArray(repositories) ? repositories : []
  const totalRepos = user?.publicRepoCount || repos.length || 0
  const reposWithDesc = repos.filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )
  const undescribedCount = Math.max(0, totalRepos - reposWithDesc.length)
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null
  const nonForkCount =
    stats?.nonForkRepoCount ?? repos.filter((r) => !r.isFork).length
  const hasDemoUrl = repos.some((r) => r.homepage && r.homepage.trim().length > 0)
  const topLang =
    Array.isArray(stats?.languages) && stats.languages.length > 0
      ? stats.languages[0]
      : null

  // 1. High scoring profiles (>= 85 overall): highlight remaining polish
  if (safeScores.overall >= 85) {
    if (undescribedCount > 0) {
      return {
        category: 'Documentation',
        diagnosis: 'Minor documentation gaps remain on secondary repositories.',
        evidence: `${undescribedCount} of ${totalRepos} ${totalRepos === 1 ? 'repository has' : 'repositories have'} no description.`,
        action: `Add concise descriptions to your remaining ${undescribedCount} ${undescribedCount === 1 ? 'repository' : 'repositories'} for complete profile polish.`,
      }
    }
    if (!user.hasProfileReadme) {
      return {
        category: 'Profile Presentation',
        diagnosis: 'Profile header could feature flagship projects more prominently.',
        evidence: `No custom profile README found for @${user.username}.`,
        action: `Create a ${user.username}/${user.username} repository to showcase your best projects directly at the top of your profile.`,
      }
    }
    if (!hasDemoUrl) {
      return {
        category: 'Recruiter Readiness',
        diagnosis: 'Flagship projects lack instant live previews.',
        evidence: 'No repository homepage or live demo URL configured in project metadata.',
        action: 'Add live demo links in the repository About section for your top projects.',
      }
    }
    return {
      category: 'Recruiter Readiness',
      diagnosis: 'Profile is exceptionally recruiter-ready with minimal friction.',
      evidence: `Verified traction, documentation, and active momentum across ${totalRepos} ${totalRepos === 1 ? 'repository' : 'repositories'}.`,
      action: 'Maintain your active commit cadence and spotlight your latest architectural improvements.',
    }
  }

  // 2. Determine lowest category by percentage of maximum possible points
  const categories = [
    { key: 'documentation', name: 'Documentation', ratio: safeScores.documentation / 20 },
    { key: 'profile', name: 'Profile Presentation', ratio: safeScores.profile / 15 },
    { key: 'activity', name: 'Activity', ratio: safeScores.activity / 20 },
    { key: 'projects', name: 'Project Quality', ratio: safeScores.projects / 30 },
    { key: 'recruiterReadiness', name: 'Recruiter Readiness', ratio: safeScores.recruiterReadiness / 15 },
  ]

  // Priority order for tie-breaking: documentation > profile > activity > projects > recruiterReadiness
  const priorityOrder = {
    documentation: 1,
    profile: 2,
    activity: 3,
    projects: 4,
    recruiterReadiness: 5,
  }

  categories.sort((a, b) => {
    if (Math.abs(a.ratio - b.ratio) < 0.001) {
      return (priorityOrder[a.key] || 99) - (priorityOrder[b.key] || 99)
    }
    return a.ratio - b.ratio
  })

  const lowest = categories[0]

  // 3. Dynamically map lowest category to data-grounded roadblock
  if (lowest.key === 'documentation') {
    if (undescribedCount > 0) {
      const targetCount = Math.min(5, undescribedCount)
      return {
        category: 'Documentation',
        diagnosis: 'Documentation is holding your profile back.',
        evidence: `${undescribedCount} of ${totalRepos} ${totalRepos === 1 ? 'repository has' : 'repositories have'} no description.`,
        action: `Add clear descriptions to your ${targetCount} strongest projects first.`,
      }
    }
    if (!user.hasProfileReadme) {
      return {
        category: 'Documentation',
        diagnosis: 'Your profile is missing a custom README.',
        evidence: `No custom profile README found for @${user.username}.`,
        action: `Create a ${user.username}/${user.username} repository to introduce your work and featured projects.`,
      }
    }
    return {
      category: 'Documentation',
      diagnosis: 'Project documentation needs deeper detail.',
      evidence: 'Repositories lack comprehensive README files and setup instructions.',
      action: 'Add structured README files with architecture and installation steps to your top projects.',
    }
  }

  if (lowest.key === 'profile') {
    if (!user.bio || user.bio.trim().length === 0) {
      return {
        category: 'Profile Presentation',
        diagnosis: 'Your profile header gives reviewers minimal technical context.',
        evidence: 'Your profile has no bio, leaving visitors with zero context on your specialization.',
        action: topLang
          ? `Add a 1-sentence bio stating your primary engineering focus in ${topLang} and what you build.`
          : 'Add a 1-sentence bio stating your primary engineering focus and what you build.',
      }
    }
    if (user.bio.trim().length < 25) {
      return {
        category: 'Profile Presentation',
        diagnosis: 'Your profile bio provides minimal technical detail.',
        evidence: `Your bio is only ${user.bio.trim().length} characters long ("${user.bio.trim()}").`,
        action: topLang
          ? `Expand your bio to highlight your specialization in ${topLang} and systems you build.`
          : 'Expand your bio to highlight your core technologies and systems you build.',
      }
    }
    if (!user.hasProfileReadme) {
      return {
        category: 'Profile Presentation',
        diagnosis: 'Your profile header is leaving prime GitHub space unused.',
        evidence: `No custom profile README found for @${user.username}.`,
        action: `Create a ${user.username}/${user.username} repository to showcase your background and flagship projects.`,
      }
    }
    if (!user.blog) {
      return {
        category: 'Profile Presentation',
        diagnosis: 'Missing portfolio link slows down external review.',
        evidence: 'No external portfolio, personal website, or demo link in profile metadata.',
        action: 'Add a direct link to your portfolio website or LinkedIn profile in your GitHub bio.',
      }
    }
    return {
      category: 'Profile Presentation',
      diagnosis: 'Profile metadata lacks complete engineering identity.',
      evidence: 'Missing location or organization context in public profile metadata.',
      action: 'Fill in your location and organization details to provide immediate credibility to hiring teams.',
    }
  }

  if (lowest.key === 'activity') {
    if (daysSinceLastPush !== null && daysSinceLastPush > 30) {
      const months = Math.floor(daysSinceLastPush / 30)
      return {
        category: 'Activity',
        diagnosis: 'Push inactivity creates concern about recent technical momentum.',
        evidence:
          daysSinceLastPush > 60
            ? `No public commits recorded in the past ${daysSinceLastPush} days (~${months} months).`
            : `No public commits recorded in the past ${daysSinceLastPush} days.`,
        action: 'Push a meaningful update or dependency upgrade to your primary project to re-establish active momentum.',
      }
    }
    if (totalRepos === 0) {
      return {
        category: 'Activity',
        diagnosis: 'No public repositories available for technical review.',
        evidence: 'Your GitHub profile currently has 0 public repositories.',
        action: 'Publish your first public repository with code and documentation to showcase your engineering ability.',
      }
    }
    return {
      category: 'Activity',
      diagnosis: 'Public commit frequency appears intermittent.',
      evidence: 'Low recent commit and push frequency across your public repositories.',
      action: 'Establish regular commit momentum by documenting iterations and releasing improvements.',
    }
  }

  if (lowest.key === 'projects') {
    if (nonForkCount === 0 && totalRepos > 0) {
      return {
        category: 'Project Quality',
        diagnosis: 'Reviewers cannot verify your independent code authorship.',
        evidence: `All ${totalRepos} public ${totalRepos === 1 ? 'repository is a fork' : 'repositories are forks'} of other codebases.`,
        action: topLang
          ? `Publish an original repository built from scratch using ${topLang} to showcase your own engineering skills.`
          : 'Publish an original repository built from scratch to showcase your own engineering skills.',
      }
    }
    if (nonForkCount < 3 && totalRepos > 0) {
      return {
        category: 'Project Quality',
        diagnosis: 'Portfolio lacks depth of original authored projects.',
        evidence: `Only ${nonForkCount} original ${nonForkCount === 1 ? 'repository' : 'repositories'} found among your public work.`,
        action: topLang
          ? `Build and publish a standalone flagship project using ${topLang} with complete architecture.`
          : 'Build and publish a standalone flagship project with complete architecture and tests.',
      }
    }
    if ((stats?.totalStars || 0) === 0 && totalRepos > 0) {
      return {
        category: 'Project Quality',
        diagnosis: 'Projects lack external traction or validation.',
        evidence: `Zero stars across ${totalRepos} public repositories to signal external adoption.`,
        action: 'Refine your top 2 projects with clear documentation and screenshots to demonstrate real-world utility.',
      }
    }
    return {
      category: 'Project Quality',
      diagnosis: 'Projects need clearer flagship differentiation.',
      evidence: 'Repositories lack standout signals or pinned highlights for visitors.',
      action: 'Pin your 2 strongest original repositories to the top of your GitHub profile.',
    }
  }

  // Fallback: Recruiter Readiness
  if (!hasDemoUrl && !user.blog) {
    return {
      category: 'Recruiter Readiness',
      diagnosis: 'Lack of live demos slows down reviewer evaluation.',
      evidence: 'None of your public repositories have a live demo or homepage URL linked.',
      action: 'Deploy a live preview or demo for your flagship project and link it in the repository About section.',
    }
  }
  if (undescribedCount > 0) {
    return {
      category: 'Recruiter Readiness',
      diagnosis: 'Repositories lack quick context for a 30-second scan.',
      evidence: `${undescribedCount} of ${totalRepos} repositories have no description.`,
      action: 'Add concise descriptions to your top repositories so recruiters immediately understand their purpose.',
    }
  }
  return {
    category: 'Recruiter Readiness',
    diagnosis: 'Portfolio presentation needs 30-second recruiter optimization.',
    evidence: 'Repositories lack clear live previews or pinned flagship showcases.',
    action: 'Pin your best 2 projects with live demo links and concise descriptions for instant recruiter evaluation.',
  }
}
