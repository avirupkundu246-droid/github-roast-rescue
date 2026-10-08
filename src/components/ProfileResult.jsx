import { useState } from 'react'
import './ProfileResult.css'

export default function ProfileResult({ data }) {
  const [activeStageTab, setActiveStageTab] = useState('all')

  if (!data || !data.user) return null

  const { user, stats, topRepositories, scores, findings } = data
  const daysSinceLastPush = stats?.daysSinceLastPush ?? null

  // Fallback defaults for scores if missing
  const safeScores = {
    overall: scores?.overall ?? 0,
    profile: scores?.profile ?? 0,
    projects: scores?.projects ?? 0,
    documentation: scores?.documentation ?? 0,
    activity: scores?.activity ?? 0,
    recruiterReadiness: scores?.recruiterReadiness ?? 0,
  }

  // Derive findings list safely
  const roasts = Array.isArray(findings?.roast) ? findings.roast : []
  const diagnoses = Array.isArray(findings?.diagnose) ? findings.diagnose : []
  const rescues = Array.isArray(findings?.rescue) ? findings.rescue : []

  // Build combined items for rendering
  const itemsCount = Math.max(roasts.length, diagnoses.length, rescues.length)
  const findingItems = Array.from({ length: itemsCount }, (_, i) => ({
    id: i + 1,
    roast: roasts[i] || '',
    diagnose: diagnoses[i] || '',
    rescue: rescues[i] || '',
    priority: findings?.items?.[i]?.priority || (i === 0 ? 10 : i === 1 ? 8 : 6),
  }))

  // Score tier evaluation
  let scoreTier = {
    label: 'Needs Work',
    badgeClass: 'score-tier--danger',
    color: 'var(--fire)',
    verdict: 'Your GitHub profile has several glaring gaps that give recruiters reason to skip.',
  }
  if (safeScores.overall >= 80) {
    scoreTier = {
      label: 'Recruiter Ready',
      badgeClass: 'score-tier--success',
      color: 'var(--green)',
      verdict: 'Solid portfolio presentation with clear projects, documentation, and active momentum.',
    }
  } else if (safeScores.overall >= 60) {
    scoreTier = {
      label: 'Solid Foundation',
      badgeClass: 'score-tier--warning',
      color: '#facc15',
      verdict: 'Good technical projects, but missing key polish that would convert profile views into interview calls.',
    }
  } else if (safeScores.overall >= 40) {
    scoreTier = {
      label: 'Needs Optimization',
      badgeClass: 'score-tier--caution',
      color: 'var(--fire)',
      verdict: 'Notable gaps in documentation, descriptions, or activity hold your profile back.',
    }
  }

  // Compute SVG gauge values (circumference for r=52 is ~326.73)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const strokeOffset = circumference - (circumference * safeScores.overall) / 100

  // 30-Second Recruiter Checklist generated from real data
  const reposWithDesc = (data.repositories || []).filter(
    (r) => typeof r.description === 'string' && r.description.trim().length > 0
  )
  const undescribedCount = (user.publicRepoCount || 0) - reposWithDesc.length

  const strongPoints = []
  if (stats?.totalStars && stats.totalStars > 0) {
    strongPoints.push(
      `${stats.totalStars.toLocaleString()} total star${stats.totalStars === 1 ? '' : 's'} across repositories (external validation)`
    )
  }
  if (daysSinceLastPush !== null && daysSinceLastPush <= 30) {
    strongPoints.push(
      `Active momentum: pushed code ${daysSinceLastPush === 0 ? 'today' : `${daysSinceLastPush} days ago`}`
    )
  }
  if (stats?.nonForkRepoCount && stats.nonForkRepoCount >= 2) {
    strongPoints.push(
      `${stats.nonForkRepoCount} original repositories demonstrating hands-on building`
    )
  }
  if (user.bio && user.bio.trim().length >= 15) {
    strongPoints.push('Bio provides immediate context on engineering background')
  }
  if (user.hasProfileReadme) {
    strongPoints.push('Custom profile README welcomes visitors with personality')
  }
  if (user.blog) {
    strongPoints.push('Portfolio / personal link available for contact')
  }
  if (stats?.languages && stats.languages.length >= 2) {
    strongPoints.push(`Core tech stack visible: ${stats.languages.slice(0, 3).join(', ')}`)
  }
  if (strongPoints.length === 0) {
    strongPoints.push('Public GitHub profile accessible for evaluation')
  }

  const weakPoints = []
  if (undescribedCount > 0) {
    weakPoints.push(
      `${undescribedCount} of ${user.publicRepoCount || 0} repositories are missing descriptions`
    )
  }
  if (!user.bio || user.bio.trim().length === 0) {
    weakPoints.push('No bio: visitors cannot determine your primary specialization')
  }
  if (!user.hasProfileReadme) {
    weakPoints.push('No profile README: missed opportunity to feature flagship projects')
  }
  if (daysSinceLastPush !== null && daysSinceLastPush > 60) {
    weakPoints.push(
      `Push gap: no commits recorded in the past ${daysSinceLastPush} days (~${Math.floor(daysSinceLastPush / 30)} months)`
    )
  }
  if (stats?.nonForkRepoCount === 0 && (user.publicRepoCount || 0) > 0) {
    weakPoints.push('All repositories are forks; no original work authored under this handle')
  }
  if (!user.blog) {
    weakPoints.push('No portfolio or external demo link in profile metadata')
  }
  if (weakPoints.length === 0) {
    weakPoints.push('Minor documentation polish recommended for maximum recruiter appeal')
  }

  const firstFix =
    rescues[0] ||
    (undescribedCount > 0
      ? 'Add one-line descriptions to your undescribed projects.'
      : 'Create a profile README to introduce your stack.')

  // Category Score Cards config
  const categoryCards = [
    {
      id: 'profile',
      label: 'Profile',
      icon: '👤',
      score: safeScores.profile,
      max: 15,
      hint: 'Bio, links, avatar, identity',
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: '📦',
      score: safeScores.projects,
      max: 30,
      hint: 'Original repos, stars, stack',
    },
    {
      id: 'documentation',
      label: 'Documentation',
      icon: '📝',
      score: safeScores.documentation,
      max: 20,
      hint: 'READMEs, descriptions, details',
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: '⚡',
      score: safeScores.activity,
      max: 20,
      hint: 'Commit recency, maintenance',
    },
    {
      id: 'recruiter',
      label: 'Recruiter Readiness',
      icon: '🎯',
      score: safeScores.recruiterReadiness,
      max: 15,
      hint: '30-second scan clarity',
    },
  ]

  // Top priorities: take first 3 rescue items
  const topPriorities = rescues.slice(0, 3)

  return (
    <section className="profile-result" aria-label="GitHub Profile Result">
      {/* 1. Success banner */}
      <div className="profile-result__status-bar">
        <span className="profile-result__status-dot" aria-hidden="true" />
        <span className="profile-result__status-text">
          GitHub profile loaded successfully
        </span>
      </div>

      {/* 2. Profile Card */}
      <div className="profile-card">
        <div className="profile-card__header">
          <img
            src={user.avatar}
            alt={`${user.username}'s avatar`}
            className="profile-card__avatar"
            width="84"
            height="84"
            loading="lazy"
          />
          <div className="profile-card__info">
            <div className="profile-card__title-row">
              <h2 className="profile-card__name">{user.name || user.username}</h2>
              <a
                href={user.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="profile-card__username"
                title="View on GitHub"
              >
                @{user.username}
                <span className="profile-card__ext-icon" aria-hidden="true">↗</span>
              </a>
            </div>

            {user.bio ? (
              <p className="profile-card__bio">{user.bio}</p>
            ) : (
              <p className="profile-card__bio profile-card__bio--empty">
                No bio provided
              </p>
            )}

            <div className="profile-card__meta">
              {user.location && (
                <span className="profile-card__meta-item" title="Location">
                  📍 {user.location}
                </span>
              )}
              {user.company && (
                <span className="profile-card__meta-item" title="Company">
                  🏢 {user.company}
                </span>
              )}
              {user.blog && (
                <a
                  href={
                    /^https?:\/\//i.test(user.blog)
                      ? user.blog
                      : !user.blog.includes(':')
                      ? `https://${user.blog}`
                      : '#'
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-card__meta-link"
                  title="Website"
                >
                  🔗 {user.blog.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="profile-stats">
          <div className="profile-stat-item">
            <span className="profile-stat-item__value">{user.publicRepoCount}</span>
            <span className="profile-stat-item__label">Repositories</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__value">{user.followers.toLocaleString()}</span>
            <span className="profile-stat-item__label">Followers</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__value">{user.following.toLocaleString()}</span>
            <span className="profile-stat-item__label">Following</span>
          </div>
          <div className="profile-stat-item">
            <span className="profile-stat-item__value">{stats?.totalStars?.toLocaleString() || 0}</span>
            <span className="profile-stat-item__label">Total Stars</span>
          </div>
        </div>
      </div>

      {/* 3. Top Repositories */}
      {topRepositories && topRepositories.length > 0 && (
        <div className="profile-repos">
          <div className="profile-repos__header">
            <h3 className="profile-repos__title">Top Repositories</h3>
            <span className="profile-repos__count">
              Showing top {topRepositories.length} of {user.publicRepoCount}
            </span>
          </div>

          <div className="profile-repos__grid">
            {topRepositories.map((repo) => (
              <article key={repo.name} className="repo-card">
                <div className="repo-card__header">
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="repo-card__name"
                  >
                    {repo.name}
                    <span className="repo-card__ext" aria-hidden="true">↗</span>
                  </a>
                  {repo.isFork && (
                    <span className="repo-card__badge repo-card__badge--fork">Fork</span>
                  )}
                </div>

                <p className="repo-card__desc">
                  {repo.description || 'No description provided.'}
                </p>

                <div className="repo-card__footer">
                  {repo.language && (
                    <span className="repo-card__lang">
                      <span className="repo-card__lang-dot" aria-hidden="true" />
                      {repo.language}
                    </span>
                  )}
                  <div className="repo-card__metrics">
                    <span className="repo-card__metric" title="Stars">
                      ⭐ {repo.stars}
                    </span>
                    <span className="repo-card__metric" title="Forks">
                      🍴 {repo.forks}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          4. GITHUB HEALTH REPORT & RECRUITER READINESS REPORT
          ============================================================ */}
      <section className="health-report" aria-labelledby="health-report-title">
        <div className="health-report__header">
          <span className="health-report__tag">ANALYSIS RESULTS</span>
          <h2 id="health-report-title" className="health-report__title">
            GitHub Health &amp; <span className="gradient-text">Recruiter Readiness</span> Report
          </h2>
          <p className="health-report__subtitle">
            Deterministic diagnostic score computed from your public GitHub profile and repository metadata.
          </p>
        </div>

        {/* Overall Score Dominant Card */}
        <div className="overall-score-card">
          <div className="overall-score-card__gauge-wrap">
            <svg
              className="overall-score-gauge"
              viewBox="0 0 120 120"
              width="140"
              height="140"
              aria-hidden="true"
            >
              <circle
                className="overall-score-gauge__bg"
                cx="60"
                cy="60"
                r={radius}
                strokeWidth="10"
              />
              <circle
                className="overall-score-gauge__fill"
                cx="60"
                cy="60"
                r={radius}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                stroke={scoreTier.color}
              />
            </svg>
            <div className="overall-score-gauge__text">
              <span className="overall-score-gauge__value">{safeScores.overall}</span>
              <span className="overall-score-gauge__max">/100</span>
            </div>
          </div>

          <div className="overall-score-card__info">
            <div className="overall-score-card__badge-row">
              <span className={`score-tier-badge ${scoreTier.badgeClass}`}>
                {scoreTier.label}
              </span>
              <span className="overall-score-card__status">
                Recruiter Readiness: <strong>{safeScores.recruiterReadiness}/15</strong>
              </span>
            </div>
            <h3 className="overall-score-card__heading">Overall Health Score</h3>
            <p className="overall-score-card__verdict">{scoreTier.verdict}</p>
          </div>
        </div>

        {/* Score Category Breakdown Cards */}
        <div className="score-breakdown-grid" aria-label="Score breakdown categories">
          {categoryCards.map((cat) => {
            const pct = Math.round((cat.score / cat.max) * 100)
            return (
              <div key={cat.id} className="score-cat-card">
                <div className="score-cat-card__header">
                  <span className="score-cat-card__icon" aria-hidden="true">
                    {cat.icon}
                  </span>
                  <span className="score-cat-card__title">{cat.label}</span>
                  <span className="score-cat-card__val">
                    <strong>{cat.score}</strong>
                    <span className="score-cat-card__max">/{cat.max}</span>
                  </span>
                </div>
                <div
                  className="score-cat-card__bar-track"
                  role="progressbar"
                  aria-valuenow={cat.score}
                  aria-valuemin={0}
                  aria-valuemax={cat.max}
                  aria-label={`${cat.label} score`}
                >
                  <div
                    className="score-cat-card__bar-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="score-cat-card__footer">
                  <span className="score-cat-card__hint">{cat.hint}</span>
                  <span className="score-cat-card__pct">{pct}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          5. WHAT A RECRUITER SEES IN 30 SECONDS
          ============================================================ */}
      <section className="recruiter-view" aria-labelledby="recruiter-view-title">
        <div className="recruiter-view__header">
          <span className="recruiter-view__tag">FIRST IMPRESSION AUDIT</span>
          <h2 id="recruiter-view-title" className="recruiter-view__title">
            What a Recruiter Sees in <span className="gradient-text">30 Seconds</span>
          </h2>
          <p className="recruiter-view__subtitle">
            Recruiters scan quickly. Here is the exact snapshot extracted from your public footprint.
          </p>
        </div>

        <div className="recruiter-checklist-grid">
          {/* Strong points column */}
          <div className="recruiter-col recruiter-col--strong">
            <div className="recruiter-col__header">
              <span className="recruiter-col__icon" aria-hidden="true">✓</span>
              <h3 className="recruiter-col__title">Strong Points</h3>
            </div>
            <ul className="recruiter-col__list">
              {strongPoints.map((point, idx) => (
                <li key={idx} className="recruiter-col__item">
                  <span className="recruiter-col__bullet" aria-hidden="true">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Weak points column */}
          <div className="recruiter-col recruiter-col--weak">
            <div className="recruiter-col__header">
              <span className="recruiter-col__icon" aria-hidden="true">⚠</span>
              <h3 className="recruiter-col__title">Red Flags &amp; Gaps</h3>
            </div>
            <ul className="recruiter-col__list">
              {weakPoints.map((point, idx) => (
                <li key={idx} className="recruiter-col__item">
                  <span className="recruiter-col__bullet" aria-hidden="true">⚠</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Fix First Banner */}
          <div className="recruiter-col recruiter-col--action">
            <div className="recruiter-col__header">
              <span className="recruiter-col__icon" aria-hidden="true">→</span>
              <h3 className="recruiter-col__title">Immediate Recommendation</h3>
            </div>
            <p className="recruiter-col__action-desc">
              If you only change <strong>one thing</strong> today to maximize recruiter conversion:
            </p>
            <div className="recruiter-col__action-box">
              <span className="recruiter-col__action-bullet" aria-hidden="true">🚀</span>
              <p className="recruiter-col__action-text">{firstFix}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          6. TOP PRIORITIES: FIX THESE FIRST
          ============================================================ */}
      {topPriorities.length > 0 && (
        <section className="priorities-section" aria-labelledby="priorities-title">
          <div className="priorities-header">
            <span className="priorities-tag">ACTION PLAN</span>
            <h2 id="priorities-title" className="priorities-title">
              Fix These <span className="gradient-text">First</span>
            </h2>
            <p className="priorities-subtitle">
              Prioritized recommendations ranked by impact on recruiter perception.
            </p>
          </div>

          <div className="priorities-list">
            {topPriorities.map((item, idx) => (
              <div key={idx} className="priority-card">
                <div className="priority-card__rank">
                  <span className="priority-card__num">{idx + 1}</span>
                </div>
                <div className="priority-card__body">
                  <div className="priority-card__badge-row">
                    <span className={`priority-badge priority-badge--${idx === 0 ? 'highest' : idx === 1 ? 'high' : 'medium'}`}>
                      {idx === 0 ? 'Highest Impact' : idx === 1 ? 'High Priority' : 'Quick Win'}
                    </span>
                  </div>
                  <p className="priority-card__text">{item}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          7. ROAST → DIAGNOSE → RESCUE DEEP DIVE
          ============================================================ */}
      {findingItems.length > 0 && (
        <section className="deep-dive-section" aria-labelledby="deep-dive-title">
          <div className="deep-dive-header">
            <span className="deep-dive-tag">THREE-STAGE BREAKDOWN</span>
            <h2 id="deep-dive-title" className="deep-dive-title">
              Roast <span className="deep-dive-arrow">→</span> Diagnose{' '}
              <span className="deep-dive-arrow">→</span> Rescue
            </h2>
            <p className="deep-dive-subtitle">
              The honest roast, the data-backed diagnosis, and the concrete rescue plan.
            </p>

            {/* Filter Tabs */}
            <div className="stage-tabs" role="tablist" aria-label="Findings Stage Filter">
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'all'}
                className={`stage-tab ${activeStageTab === 'all' ? 'stage-tab--active' : ''}`}
                onClick={() => setActiveStageTab('all')}
              >
                All Stages
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'roast'}
                className={`stage-tab ${activeStageTab === 'roast' ? 'stage-tab--active' : ''}`}
                onClick={() => setActiveStageTab('roast')}
              >
                🔥 Roasts ({roasts.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'diagnose'}
                className={`stage-tab ${activeStageTab === 'diagnose' ? 'stage-tab--active' : ''}`}
                onClick={() => setActiveStageTab('diagnose')}
              >
                🔍 Diagnostics ({diagnoses.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeStageTab === 'rescue'}
                className={`stage-tab ${activeStageTab === 'rescue' ? 'stage-tab--active' : ''}`}
                onClick={() => setActiveStageTab('rescue')}
              >
                🛠️ Rescues ({rescues.length})
              </button>
            </div>
          </div>

          <div className="findings-stream">
            {findingItems.map((item, idx) => (
              <article key={item.id} className="finding-card">
                <div className="finding-card__header">
                  <span className="finding-card__index">Finding #{idx + 1}</span>
                  <span className={`finding-card__priority ${item.priority >= 9 ? 'priority--critical' : item.priority >= 7 ? 'priority--high' : 'priority--normal'}`}>
                    {item.priority >= 9 ? 'Critical Gap' : item.priority >= 7 ? 'Needs Polish' : 'Optimization'}
                  </span>
                </div>

                {/* All View: Shows all 3 stages in sequence */}
                {activeStageTab === 'all' && (
                  <div className="finding-stages">
                    <div className="finding-stage finding-stage--roast">
                      <span className="finding-stage__label">
                        <span aria-hidden="true">🔥</span> ROAST
                      </span>
                      <p className="finding-stage__text finding-stage__text--roast">
                        &ldquo;{item.roast}&rdquo;
                      </p>
                    </div>

                    <div className="finding-stage finding-stage--diagnose">
                      <span className="finding-stage__label">
                        <span aria-hidden="true">🔍</span> DIAGNOSE
                      </span>
                      <p className="finding-stage__text">
                        {item.diagnose}
                      </p>
                    </div>

                    <div className="finding-stage finding-stage--rescue">
                      <span className="finding-stage__label">
                        <span aria-hidden="true">🛠️</span> RESCUE
                      </span>
                      <p className="finding-stage__text">
                        {item.rescue}
                      </p>
                    </div>
                  </div>
                )}

                {/* Roast Only Tab */}
                {activeStageTab === 'roast' && (
                  <div className="finding-single-stage finding-single-stage--roast">
                    <span className="finding-stage__label">🔥 THE ROAST</span>
                    <p className="finding-stage__text finding-stage__text--roast">
                      &ldquo;{item.roast}&rdquo;
                    </p>
                  </div>
                )}

                {/* Diagnose Only Tab */}
                {activeStageTab === 'diagnose' && (
                  <div className="finding-single-stage finding-single-stage--diagnose">
                    <span className="finding-stage__label">🔍 THE DIAGNOSIS</span>
                    <p className="finding-stage__text">
                      {item.diagnose}
                    </p>
                  </div>
                )}

                {/* Rescue Only Tab */}
                {activeStageTab === 'rescue' && (
                  <div className="finding-single-stage finding-single-stage--rescue">
                    <span className="finding-stage__label">🛠️ ACTIONABLE RESCUE</span>
                    <p className="finding-stage__text">
                      {item.rescue}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  )
}
