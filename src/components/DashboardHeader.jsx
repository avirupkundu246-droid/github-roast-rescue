import './DashboardHeader.css'

export default function DashboardHeader({
  username,
  avatar,
  activeTab,
  onTabChange,
  onNewAnalysis,
}) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'recruiter', label: 'Recruiter View', icon: '🎯' },
    { id: 'roast', label: 'Roast', icon: '🔥' },
    { id: 'rescue', label: 'Rescue', icon: '🛠️' },
    { id: 'repositories', label: 'Repositories', icon: '📦' },
  ]

  return (
    <header className="dash-header">
      <div className="dash-header__inner">
        {/* Logo / Brand */}
        <div
          className="dash-header__brand"
          onClick={onNewAnalysis}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onNewAnalysis()
            }
          }}
          role="button"
          tabIndex={0}
          title="Return to start"
        >
          <span className="dash-header__fire" aria-hidden="true">🔥</span>
          <span className="dash-header__title">
            GitHub <span className="gradient-text">Roast</span> &amp; <span className="dash-header__rescue-text">Rescue</span>
          </span>
        </div>

        {/* Navigation Tabs */}
        <nav className="dash-header__nav" aria-label="Dashboard navigation">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`dash-header__nav-btn ${activeTab === tab.id ? 'dash-header__nav-btn--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="dash-header__nav-icon" aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div className="dash-header__actions">
          {username && (
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dash-header__user-chip"
              title="View on GitHub"
            >
              {avatar && (
                <img
                  src={avatar}
                  alt={`${username}'s avatar`}
                  className="dash-header__avatar"
                  width="22"
                  height="22"
                />
              )}
              <span className="dash-header__username">@{username}</span>
            </a>
          )}
          <button
            type="button"
            className="dash-header__new-btn"
            onClick={onNewAnalysis}
            title="Analyze another GitHub profile"
          >
            <span>＋</span> New Analysis
          </button>
        </div>
      </div>
    </header>
  )
}
