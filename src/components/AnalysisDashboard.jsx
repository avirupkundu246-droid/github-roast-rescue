import { useState, useEffect, useRef } from 'react'
import './AnalysisDashboard.css'
import { getRecruiterSimulationData } from '../utils/recruiterSimulation.js'

export default function AnalysisDashboard({ data, activeTab, onTabChange }) {
  const [selectedFindingIndex, setSelectedFindingIndex] = useState(0)
  const [checkedRescueItems, setCheckedRescueItems] = useState({})
  const [isRecruiterModeActive, setIsRecruiterModeActive] = useState(false)
  const [expandedCategoryId, setExpandedCategoryId] = useState(null)
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

  // Keep tab-switch scroll position stable:
  // If user scrolled deeply below the tab content area, smoothly align to the tab panel top.
  // If already at or above the tab content, do not scroll at all to prevent any jump.
  const prevTabRef = useRef(activeTab)
  const tabPanelRef = useRef(null)

  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab
      if (tabPanelRef.current) {
        const rect = tabPanelRef.current.getBoundingClientRect()
        // If the top of the tab panel is scrolled off-screen above the viewport (rect.top < 60)
        if (rect.top < 60) {
          const targetY = window.scrollY + rect.top - 70 // 70px offset for sticky header
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: isReducedMotionPreferred ? 'auto' : 'smooth',
          })
        }
      }
    }
  }, [activeTab, isReducedMotionPreferred])

  if (!data || !data.user) return null

  const { user, stats, topRepositories, findings } = data
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null

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

  // 30-Second Recruiter Simulation data
  const recruiterSim = getRecruiterSimulationData({
    user,
    stats,
    repositories: data.repositories,
    topRepositories: data.topRepositories,
    findings,
    roadblock,
    topRescues,
  })

  // Categories for breakdown with real evidence linkage
  const categoryList = [
    { id: 'profile', label: 'Profile', score: safeScores.profile, max: 15, icon: '👤' },
    { id: 'projects', label: 'Projects', score: safeScores.projects, max: 30, icon: '📦' },
    { id: 'documentation', label: 'Documentation', score: safeScores.documentation, max: 20, icon: '📝' },
    { id: 'activity', label: 'Activity', score: safeScores.activity, max: 20, icon: '⚡' },
    { id: 'recruiterReadiness', label: 'Recruiter Readiness', score: safeScores.recruiterReadiness, max: 15, icon: '🎯' },
  ]

  function handleCategoryClick(categoryId) {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId))
  }

// Language color map for authentic developer analytics visualization
function getLanguageColor(language) {
  const map = {
    JavaScript: '#f1e05a',
    TypeScript: '#3178c6',
    Python: '#3572a5',
    Go: '#00add8',
    Rust: '#dea584',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Ruby: '#701516',
    Java: '#b07219',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    PHP: '#4f5d95',
    Swift: '#f05138',
    Kotlin: '#a97bff',
    Dart: '#00b4ab',
    Shell: '#89e051',
    Vue: '#41b883',
  }
  return map[language] || '#818cf8'
}

// Formats repository activity date pure and consistent with GitHub repository listings
function formatRepoDate(dateString) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return null
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

  return (
    <main className="dash-container" aria-label="Analysis Dashboard">
      {/* ── Compact Profile Bar ── */}
      <section className="dash-profile-bar">
        <div className="dash-profile-bar__left">
          <img
            src={user.avatar}
            alt={`${user.username}'s avatar`}
            className="dash-profile-bar__avatar"
            width="52"
            height="52"
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
                @{user.username} <span aria-hidden="true" className="dash-profile-bar__external">↗</span>
              </a>
            </div>
            {user.bio && <p className="dash-profile-bar__bio">{user.bio}</p>}
            {stats?.languages && stats.languages.length > 0 && (
              <div className="dash-profile-bar__tech-stack" aria-label="Detected technologies">
                {stats.languages.slice(0, 4).map((lang) => (
                  <span key={lang} className="dash-tech-pill">
                    <span
                      className="dash-tech-pill__dot"
                      style={{ backgroundColor: getLanguageColor(lang) }}
                      aria-hidden="true"
                    />
                    {lang}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dash-profile-bar__chips">
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{user.publicRepoCount}</span>
            <span className="dash-stat-chip__label">Public Repos</span>
          </div>
          {stats?.nonForkRepoCount !== undefined && (
            <div className="dash-stat-chip">
              <span className="dash-stat-chip__num">{stats.nonForkRepoCount}</span>
              <span className="dash-stat-chip__label">Original</span>
            </div>
          )}
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{user.followers.toLocaleString()}</span>
            <span className="dash-stat-chip__label">Followers</span>
          </div>
          <div className="dash-stat-chip">
            <span className="dash-stat-chip__num">{stats?.totalStars?.toLocaleString() || 0}</span>
            <span className="dash-stat-chip__label">Stars</span>
          </div>
          {daysSinceLastPush !== null && (
            <div className="dash-stat-chip">
              <span className="dash-stat-chip__num">
                {daysSinceLastPush === 0 ? 'Today' : `${daysSinceLastPush}d`}
              </span>
              <span className="dash-stat-chip__label">Last Push</span>
            </div>
          )}
        </div>
      </section>

      {/* ── TAB CONTENT PANEL ── */}
      <div
        ref={tabPanelRef}
        className="dash-tab-panel"
        id={`dash-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
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
              <div className="dash-breakdown-header">
                <h3 className="dash-breakdown-title">Score Breakdown</h3>
                <span className="dash-breakdown-hint">Click category for evidence</span>
              </div>
              <div className="dash-breakdown-list" role="list">
                {categoryList.map((cat) => {
                  const pct = Math.round((cat.score / cat.max) * 100)
                  const isOpen = expandedCategoryId === cat.id
                  const evidence = isOpen
                    ? getCategoryEvidence(cat.id, {
                        user,
                        stats,
                        repositories: data.repositories,
                        safeScores,
                      })
                    : null

                  return (
                    <div
                      key={cat.id}
                      className={`dash-cat-row ${isOpen ? 'dash-cat-row--open' : ''}`}
                      role="listitem"
                    >
                      <button
                        type="button"
                        className={`dash-cat-row__btn ${
                          isOpen ? 'dash-cat-row__btn--active' : ''
                        }`}
                        onClick={() => handleCategoryClick(cat.id)}
                        aria-expanded={isOpen}
                        aria-controls={`evidence-panel-${cat.id}`}
                        id={`cat-btn-${cat.id}`}
                      >
                        <div className="dash-cat-row__header">
                          <span className="dash-cat-row__name">
                            <span aria-hidden="true">{cat.icon}</span> {cat.label}
                            <span
                              className={`dash-cat-row__chevron ${
                                isOpen ? 'dash-cat-row__chevron--open' : ''
                              }`}
                              aria-hidden="true"
                            >
                              ▾
                            </span>
                          </span>
                          <span className="dash-cat-row__val">
                            <strong>{cat.score}</strong>/{cat.max}
                          </span>
                        </div>
                        <div className="dash-cat-row__track">
                          <div className="dash-cat-row__fill" style={{ width: `${pct}%` }} />
                        </div>
                      </button>

                      {isOpen && evidence && (
                        <div
                          id={`evidence-panel-${cat.id}`}
                          role="region"
                          aria-labelledby={`cat-btn-${cat.id}`}
                          className="dash-evidence-panel"
                        >
                          <div className="dash-evidence-section">
                            <span className="dash-evidence-label">WHY THIS SCORE</span>
                            <p className="dash-evidence-text">{evidence.why}</p>
                          </div>
                          <div className="dash-evidence-section">
                            <span className="dash-evidence-label">RECRUITER IMPACT</span>
                            <p className="dash-evidence-text">{evidence.impact}</p>
                          </div>
                          <div className="dash-evidence-section dash-evidence-section--action">
                            <span className="dash-evidence-label">RECOMMENDED ACTION</span>
                            <p className="dash-evidence-text">{evidence.action}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── BIGGEST RECRUITER ROADBLOCK ── */}
          <section className="dash-roadblock-card" aria-label="Biggest Recruiter Roadblock">
            <div className="dash-roadblock-card__header">
              <div className="dash-roadblock-card__badge-group">
                <span className="dash-roadblock-card__pill">High Impact</span>
                <h3 className="dash-roadblock-card__title">Biggest Recruiter Roadblock</h3>
              </div>
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
              <div className="dash-roadblock-card__action-text-wrap">
                <span className="dash-roadblock-card__action-tag">Recommended Action</span>
                <span className="dash-roadblock-card__action-text">{roadblock.action}</span>
              </div>
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
                <h4 className="dash-tile__heading">Recruiter Simulation</h4>
                <p className="dash-tile__desc">See the 30-second scan: first impression, project scan &amp; decision.</p>
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

      {/* ── VIEW 2: RECRUITER VIEW / SIMULATION ── */}
      {activeTab === 'recruiter' && (
        <div className="dash-view dash-view--recruiter">
          <div className="dash-view-header">
            <div className="dash-view-header__left">
              <span className="dash-view-tag">30-SECOND SIMULATION</span>
              <h2 className="dash-view-title">30-Second Recruiter Simulation</h2>
              <p className="dash-view-subtitle">
                See what a recruiter can understand from your public GitHub profile in a quick scan.
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

          {/* Quick scan timeline steps */}
          <div className="recruiter-sim-progress" aria-hidden="true">
            <span className="recruiter-sim-step">01 First Impression · 0–5s</span>
            <span className="recruiter-sim-arrow">→</span>
            <span className="recruiter-sim-step">02 Project Scan · 5–15s</span>
            <span className="recruiter-sim-arrow">→</span>
            <span className="recruiter-sim-step">03 Decision · 15–30s</span>
          </div>

          <div className={`recruiter-audit-grid ${isRecruiterModeActive ? 'recruiter-audit-grid--high-contrast' : ''}`}>
            {/* A. FIRST IMPRESSION (0–5s) */}
            <div className="recruiter-audit-card recruiter-audit-card--strong">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-stage-badge">01 · 0–5s</span>
                <h3 className="recruiter-audit-card__title">First Impression</h3>
              </div>
              <ul className="recruiter-audit-list">
                {recruiterSim.firstImpression.map((item, idx) => (
                  <li key={idx} className={`recruiter-audit-item recruiter-audit-item--${item.type}`}>
                    <span className="recruiter-audit-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* B. PROJECT SCAN (5–15s) */}
            <div className="recruiter-audit-card recruiter-audit-card--weak">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-stage-badge">02 · 5–15s</span>
                <h3 className="recruiter-audit-card__title">Project Scan</h3>
              </div>
              <ul className="recruiter-audit-list">
                {recruiterSim.projectScan.map((item, idx) => (
                  <li key={idx} className={`recruiter-audit-item recruiter-audit-item--${item.type}`}>
                    <span className="recruiter-audit-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* C. RECRUITER DECISION (15–30s) */}
            <div className="recruiter-audit-card recruiter-audit-card--verdict">
              <div className="recruiter-audit-card__header">
                <span className="recruiter-stage-badge">03 · 15–30s</span>
                <h3 className="recruiter-audit-card__title">Recruiter Decision</h3>
              </div>
              <p className="recruiter-verdict-summary">{recruiterVerdict}</p>

              <div className="recruiter-decision-details">
                <div className="recruiter-first-action">
                  <span className="recruiter-first-action__label">Biggest Roadblock</span>
                  <p className="recruiter-first-action__text">{roadblock.action || roadblock.diagnosis}</p>
                </div>
                <div className="recruiter-first-action recruiter-first-action--rescue">
                  <span className="recruiter-first-action__label">Highest Priority Fix</span>
                  <p className="recruiter-first-action__text">{topRescues[0] || roadblock.action}</p>
                </div>
              </div>
            </div>
          </div>

          {/* D. WHAT THE RECRUITER LEAVES WITH */}
          <div className="recruiter-takeaways-card">
            <div className="recruiter-takeaways-header">
              <span className="recruiter-takeaways-icon" aria-hidden="true">💡</span>
              <h3 className="recruiter-takeaways-title">What the Recruiter Leaves With</h3>
            </div>
            <div className="recruiter-takeaways-grid">
              <div className="recruiter-takeaway-item">
                <span className="recruiter-takeaway-label">Strongest Signal</span>
                <p className="recruiter-takeaway-val">{recruiterSim.takeaways.strongestSignal}</p>
              </div>
              <div className="recruiter-takeaway-item">
                <span className="recruiter-takeaway-label">Biggest Concern</span>
                <p className="recruiter-takeaway-val">{recruiterSim.takeaways.biggestConcern}</p>
              </div>
              <div className="recruiter-takeaway-item">
                <span className="recruiter-takeaway-label">First Thing to Fix</span>
                <p className="recruiter-takeaway-val">{recruiterSim.takeaways.firstThingToFix}</p>
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
              <span className="dash-view-tag">FINDINGS AUDIT</span>
              <h2 className="dash-view-title">
                Roast &amp; Diagnosis Navigator <span className="dash-view-title__count">({findingCount})</span>
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
                {String(idx + 1).padStart(2, '0')}
              </button>
            ))}
          </div>

          {/* Interactive Single Finding Card */}
          <div className="finding-display-card">
            <div className="finding-display-card__header">
              <span className="finding-display-card__index">Finding {selectedFindingIndex + 1} of {findingCount}</span>
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
              {/* Roast */}
              <div className="finding-stage-box finding-stage-box--roast">
                <span className="finding-stage-box__label">Roast</span>
                <p className="finding-stage-box__quote">&ldquo;{currentFinding.roast}&rdquo;</p>
              </div>

              {/* Diagnosis */}
              <div className="finding-stage-box finding-stage-box--diagnose">
                <span className="finding-stage-box__label">Diagnosis</span>
                <p className="finding-stage-box__body">{currentFinding.diagnose}</p>
              </div>

              {/* Recommendation */}
              <div className="finding-stage-box finding-stage-box--rescue">
                <span className="finding-stage-box__label">Recommended Fix</span>
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
              <span className="dash-view-tag">RECRUITER ACTION CHECKLIST</span>
              <h2 className="dash-view-title">Recommended Rescue Plan</h2>
              <p className="dash-view-subtitle">
                The top 3 highest-impact improvements ranked by recruiter ROI. Check them off as you complete them!
              </p>
            </div>
            <div className="rescue-progress-badge">
              <div className="rescue-progress-dots" aria-hidden="true">
                {topRescues.map((_, i) => (
                  <span
                    key={i}
                    className={`rescue-progress-dot ${
                      checkedRescueItems[i] ? 'rescue-progress-dot--done' : ''
                    }`}
                  />
                ))}
              </div>
              {completedCount === topRescues.length ? (
                <span className="rescue-badge--done">✓ All 3 Actions Complete</span>
              ) : (
                <span className="rescue-badge--count">
                  <strong>{completedCount}</strong> of {topRescues.length} completed
                </span>
              )}
            </div>
          </div>

          <div className="rescue-checklist-container" role="list">
            {topRescues.map((item, idx) => {
              const isChecked = Boolean(checkedRescueItems[idx])
              const rankLabel =
                idx === 0 ? '#1 Highest Impact' : idx === 1 ? '#2 High Priority' : '#3 Quick Win'
              const rankClass = idx === 0 ? 'rank--1' : idx === 1 ? 'rank--2' : 'rank--3'

              return (
                <div
                  key={idx}
                  className={`rescue-check-card ${rankClass} ${
                    isChecked ? 'rescue-check-card--checked' : ''
                  }`}
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
                  aria-label={`${rankLabel}: ${item}. ${isChecked ? 'Completed' : 'Pending'}`}
                >
                  <div className="rescue-check-card__checkbox" aria-hidden="true">
                    {isChecked && (
                      <svg
                        viewBox="0 0 16 16"
                        width="12"
                        height="12"
                        fill="currentColor"
                        className="rescue-check-icon"
                      >
                        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
                      </svg>
                    )}
                  </div>
                  <div className="rescue-check-card__content">
                    <div className="rescue-check-card__meta">
                      <div className="rescue-check-card__tags">
                        <span className="rescue-action-num">ACTION 0{idx + 1}</span>
                        <span className={`rescue-rank-pill ${rankClass}`}>
                          {rankLabel}
                        </span>
                      </div>
                      <span className={`rescue-status-pill ${isChecked ? 'rescue-status-pill--done' : ''}`}>
                        {isChecked ? 'RESOLVED' : 'PENDING'}
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
              <h2 className="dash-view-title">Repository Portfolio Analysis</h2>
              <p className="dash-view-subtitle">
                Showing top public repositories ranked by stars, authorship, and push recency.
              </p>
            </div>
            <span className="dash-repos-count">{user.publicRepoCount} total public repositories</span>
          </div>

          <div className="dash-repos-grid">
            {(topRepositories || []).map((repo) => (
              <article key={repo.name} className="dash-repo-card">
                <div className="dash-repo-card__top">
                  <div className="dash-repo-card__header">
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dash-repo-card__name"
                    >
                      {repo.name} <span aria-hidden="true" className="dash-repo-card__external">↗</span>
                    </a>
                    <div className="dash-repo-card__badges">
                      {repo.isFork && <span className="dash-repo-card__fork-pill">Fork</span>}
                      {repo.archived && <span className="dash-repo-card__archived-pill">Archived</span>}
                    </div>
                  </div>

                  <p className="dash-repo-card__desc">
                    {repo.description || <span className="dash-repo-card__desc-empty">No description provided.</span>}
                  </p>
                </div>

                <div className="dash-repo-card__footer">
                  <div className="dash-repo-card__meta-left">
                    {repo.language ? (
                      <span className="dash-repo-card__lang">
                        <span
                          className="dash-repo-card__lang-dot"
                          style={{ backgroundColor: getLanguageColor(repo.language) }}
                          aria-hidden="true"
                        />
                        {repo.language}
                      </span>
                    ) : (
                      <span className="dash-repo-card__lang-none">Plain</span>
                    )}
                    {repo.pushedAt && (
                      <span className="dash-repo-card__activity">
                        {formatRepoDate(repo.pushedAt)}
                      </span>
                    )}
                  </div>

                  <div className="dash-repo-card__meta-right">
                    {repo.homepage && (
                      <a
                        href={repo.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dash-repo-card__demo-link"
                        title="View live demo or homepage"
                      >
                        Demo ↗
                      </a>
                    )}
                    <div className="dash-repo-card__metrics">
                      <span title="Stars" className="dash-repo-card__metric">★ {repo.stars.toLocaleString()}</span>
                      <span title="Forks" className="dash-repo-card__metric">⑂ {repo.forks.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      </div>
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

/**
 * Explains each score category using strictly real GitHub analysis data.
 * Returns { why, impact, action }.
 * If sufficient data is not available, returns honest fallback message.
 */
function getCategoryEvidence(catId, { user, stats, repositories, safeScores: _safeScores }) {
  if (!user && !stats && !repositories) {
    return {
      why: 'Detailed evidence is not available for this category.',
      impact: 'Recruiter evaluation relies on observable repository and profile signals.',
      action: 'Review this section for opportunities to polish public engineering evidence.',
    }
  }

  const repos = Array.isArray(repositories) ? repositories : []
  const totalRepos = user?.publicRepoCount ?? repos.length
  const nonForkCount = stats?.nonForkRepoCount ?? repos.filter((r) => !r.isFork).length
  const reposWithDesc = repos.filter((r) => Boolean(r.description && r.description.trim())).length
  const undescribedCount = Math.max(0, totalRepos - reposWithDesc)
  const reposWithDemo = repos.filter((r) => Boolean(r.homepage && r.homepage.trim())).length
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null

  switch (catId) {
    case 'profile': {
      const hasBio = Boolean(user?.bio && user.bio.trim().length > 0)
      const hasReadme = Boolean(user?.hasProfileReadme)
      const hasBlog = Boolean(user?.blog && user.blog.trim().length > 0)

      if (hasBio && hasReadme && hasBlog) {
        return {
          why: `Developer bio is set, profile README is active, and portfolio link (${user.blog}) is configured.`,
          impact: 'Gives recruiters immediate context on your seniority, specialty, and where to inspect your best work.',
          action: 'Keep your profile README current with your latest achievements and contact information.',
        }
      }
      if (!hasReadme && !hasBio) {
        return {
          why: 'Profile lacks both a custom profile README and a developer bio.',
          impact: 'Recruiters spend under 30 seconds scanning profile headers before deciding whether to inspect repositories.',
          action: 'Create a username-matching repository to enable a profile README and write a 1-sentence bio.',
        }
      }
      if (!hasReadme) {
        return {
          why: `Bio is configured${hasBlog ? ' with portfolio link' : ''}, but no custom profile README was detected.`,
          impact: 'A profile README is the highest-converting space on GitHub to showcase your 2 strongest projects.',
          action: `Create a repository named "${user?.username || 'your-username'}" with a README detailing your tech stack.`,
        }
      }
      if (!hasBio) {
        return {
          why: 'Profile README is active, but your short bio field is blank.',
          impact: 'The bio is the primary plain text visible in search results and social previews.',
          action: 'Add a concise bio stating your primary specialization and preferred tech stack.',
        }
      }
      if (!hasBlog) {
        return {
          why: 'Bio and profile README are active, but no external portfolio or personal website link is attached.',
          impact: 'Reviewers who want to view live projects or an external resume have no direct link.',
          action: 'Add your portfolio, LinkedIn, or personal website URL to your GitHub profile settings.',
        }
      }
      return {
        why: 'Profile header contains foundational developer metadata.',
        impact: 'Establishes clear developer identity during technical recruiter evaluations.',
        action: 'Refine your bio and README for concise, high-signal presentation.',
      }
    }

    case 'projects': {
      const totalStars = stats?.totalStars ?? 0
      const totalForks = stats?.totalForks ?? 0
      const mostStarred = stats?.mostStarredRepo

      if (totalRepos === 0) {
        return {
          why: '0 public repositories found under this account.',
          impact: 'Technical recruiters cannot evaluate your coding capabilities without public code samples.',
          action: 'Publish at least one well-architected project with modular code and clean commit history.',
        }
      }
      if (nonForkCount === 0) {
        return {
          why: `All ${totalRepos} public ${totalRepos === 1 ? 'repository is a fork' : 'repositories are forks'} of other codebases.`,
          impact: 'Forking shows curiosity, but engineering hiring requires proof of authored code.',
          action: 'Publish an original project built from scratch to showcase your software architecture skills.',
        }
      }
      if (nonForkCount < 3) {
        return {
          why: `Only ${nonForkCount} original ${nonForkCount === 1 ? 'repository' : 'repositories'} found among ${totalRepos} public projects.`,
          impact: 'Reviewers look for 2–3 substantive original codebases to verify technical consistency.',
          action: 'Build and ship another standalone project highlighting your primary language or framework.',
        }
      }
      if (totalStars === 0) {
        return {
          why: `${nonForkCount} original ${nonForkCount === 1 ? 'repository' : 'repositories'} authored, but with 0 stars across all projects.`,
          impact: 'Stars and forks provide social proof that your software has real-world utility or developer interest.',
          action: 'Enhance project READMEs with visual previews and clear documentation to attract developer interest.',
        }
      }
      return {
        why: `${nonForkCount} original ${nonForkCount === 1 ? 'repository' : 'repositories'} authored with ${totalStars} total ${totalStars === 1 ? 'star' : 'stars'} and ${totalForks} ${totalForks === 1 ? 'fork' : 'forks'}.`,
        impact: 'Demonstrates verified project creation and external traction from the developer community.',
        action: `Pin your two highest-traction repositories${mostStarred ? ` (such as ${mostStarred.name})` : ''} to the top of your profile.`,
      }
    }

    case 'documentation': {
      if (totalRepos === 0) {
        return {
          why: 'No repositories available to evaluate documentation.',
          impact: 'Documentation is a critical signal of how well an engineer communicates with team members.',
          action: 'Publish a project featuring a comprehensive README with setup, architecture, and usage guides.',
        }
      }
      if (undescribedCount > 0) {
        return {
          why: `${undescribedCount} of ${totalRepos} public ${totalRepos === 1 ? 'repository has' : 'repositories have'} no description.`,
          impact: 'Repositories without descriptions are routinely skipped by reviewers during 30-second scans.',
          action: 'Add concise 1-sentence descriptions in the About section of your top repositories.',
        }
      }
      return {
        why: `All ${totalRepos} public repositories have descriptions configured${user?.hasProfileReadme ? ' and a profile README is active' : ''}.`,
        impact: 'Clear descriptions let technical screeners immediately understand project scope and relevance.',
        action: 'Ensure each repository README includes architecture diagrams, setup commands, and demo GIFs.',
      }
    }

    case 'activity': {
      if (daysSinceLastPush === null) {
        return {
          why: 'No recent public push or commit timestamps recorded.',
          impact: 'Recruiters check recent commit cadence to confirm active coding engagement.',
          action: 'Push incremental commits to your public repositories to establish observable activity.',
        }
      }
      if (daysSinceLastPush === 0) {
        return {
          why: 'Code pushed to public repositories today, reflecting active ongoing development.',
          impact: 'Immediate proof of an active engineer consistently writing and shipping code.',
          action: 'Maintain regular commit momentum with descriptive conventional commit messages.',
        }
      }
      if (daysSinceLastPush <= 7) {
        return {
          why: `Last public push was ${daysSinceLastPush} ${daysSinceLastPush === 1 ? 'day' : 'days'} ago.`,
          impact: 'Demonstrates steady, weekly coding momentum that satisfies recruiter activity checks.',
          action: 'Keep committing incremental iterations and code refactors on your active branch.',
        }
      }
      if (daysSinceLastPush <= 30) {
        const weeks = Math.round(daysSinceLastPush / 7)
        return {
          why: `Last public push was ${daysSinceLastPush} days ago (~${weeks} ${weeks === 1 ? 'week' : 'weeks'} without public activity).`,
          impact: 'Recruiters may question whether your primary work is paused or entirely in private repos.',
          action: 'Ship an update or documentation improvement to your flagship project this week.',
        }
      }
      const months = Math.round(daysSinceLastPush / 30)
      return {
        why: `No public commits recorded in the past ${daysSinceLastPush} days (~${months} ${months === 1 ? 'month' : 'months'}).`,
        impact: 'Multi-month gaps in public activity create the perception of rusty technical skills.',
        action: 'Push a fresh update, bug fix, or refactor to your top repository to revive your contribution timeline.',
      }
    }

    case 'recruiterReadiness': {
      if (reposWithDemo === 0 && !user?.blog) {
        return {
          why: `0 live demo links found across ${totalRepos} repositories and no portfolio URL in profile.`,
          impact: 'Reviewers cannot test your software without cloning and compiling locally, causing drop-off.',
          action: 'Deploy your best project (via Vercel, Netlify, or Pages) and add the URL in the repo About section.',
        }
      }
      if (reposWithDemo > 0 && undescribedCount > 0) {
        return {
          why: `${reposWithDemo} ${reposWithDemo === 1 ? 'project has a live demo link' : 'projects have live demo links'}, but ${undescribedCount} of ${totalRepos} repos lack descriptions.`,
          impact: 'Live demos are high-converting, but missing descriptions prevent recruiters from finding them.',
          action: 'Add concise descriptions and pin the repositories that have live demo links.',
        }
      }
      if (reposWithDemo > 0 && undescribedCount === 0) {
        return {
          why: `${reposWithDemo} ${reposWithDemo === 1 ? 'project features' : 'projects feature'} live demos, all repos are described, and technical focus is clear.`,
          impact: 'Optimal 30-second recruiter usability: reviewers can immediately test and evaluate your work.',
          action: 'Pin your top 2 demoed projects with clear badges in the README for maximum conversion.',
        }
      }
      if (user?.blog && reposWithDemo === 0) {
        return {
          why: `Portfolio link provided (${user.blog}), but 0 repository live demo URLs detected across ${totalRepos} repositories.`,
          impact: 'Reviewers can visit your personal site, but cannot test individual codebases directly on GitHub.',
          action: 'Add direct deployment preview URLs to the GitHub About panel of your best repositories.',
        }
      }
      return {
        why: 'Profile exhibits baseline recruiter readiness indicators.',
        impact: 'Facilitates rapid initial screening by technical hiring managers.',
        action: 'Pin your two strongest repositories with live demo links and clear descriptions.',
      }
    }

    default:
      return {
        why: 'Detailed evidence is not available for this category.',
        impact: 'Recruiter evaluation relies on observable repository and profile signals.',
        action: 'Review this section for opportunities to polish public engineering evidence.',
      }
  }
}
