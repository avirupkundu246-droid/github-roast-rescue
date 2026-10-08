import { useState, useEffect } from 'react'
import ProfileResult from './ProfileResult'
import './HeroSection.css'

const ANALYSIS_STEPS = [
  { text: 'Reading GitHub profile...', icon: '👤' },
  { text: 'Inspecting repositories...', icon: '📦' },
  { text: 'Checking project documentation...', icon: '📝' },
  { text: 'Analyzing recent activity...', icon: '⚡' },
  { text: 'Evaluating recruiter readiness...', icon: '🎯' },
  { text: 'Building your rescue plan...', icon: '🛠️' },
]

export default function HeroSection({ onAnalysisComplete }) {
  const [username, setUsername] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [profileData, setProfileData] = useState(null)
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0)

  // Smooth sequence of analysis steps during active request
  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setAnalysisStepIndex((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev))
    }, 450)

    return () => clearInterval(interval)
  }, [isLoading])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()

    if (!trimmed) {
      setError({
        type: 'invalid',
        message: 'Please enter a GitHub username.',
      })
      return
    }

    // Client-side validation matching GitHub username specifications
    const usernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/
    if (!usernameRegex.test(trimmed)) {
      setError({
        type: 'invalid',
        message:
          'Invalid username format. Usernames may only contain alphanumeric characters or single hyphens, and cannot start or end with a hyphen.',
      })
      setProfileData(null)
      return
    }

    // Reset state & initiate request
    setIsLoading(true)
    setAnalysisStepIndex(0)
    setError(null)
    setProfileData(null)

    try {
      const response = await fetch(`/api/analyze?user=${encodeURIComponent(trimmed)}`)
      const data = await response.json()

      if (!response.ok) {
        if (response.status === 404) {
          setError({
            type: 'notFound',
            message: data.error || `GitHub user "${trimmed}" was not found.`,
          })
        } else if (response.status === 429 || data.rateLimited) {
          setError({
            type: 'rateLimit',
            message:
              data.error ||
              'GitHub API rate limit reached. Please wait a few minutes before trying again.',
          })
        } else if (response.status === 400) {
          setError({
            type: 'invalid',
            message: data.error || 'Invalid username provided.',
          })
        } else {
          setError({
            type: 'general',
            message:
              data.error ||
              'An unexpected error occurred while fetching the profile.',
          })
        }
        return
      }

      if (onAnalysisComplete) {
        onAnalysisComplete(data)
      } else {
        setProfileData(data)
      }
    } catch {
      setError({
        type: 'network',
        message:
          'Network connection error. Unable to reach the server. Please check your internet connection.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  function handleInputChange(e) {
    setUsername(e.target.value)
    if (error) setError(null)
  }

  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      {/* Ambient glow orbs */}
      <div className="hero-orb hero-orb--purple" aria-hidden="true" />
      <div className="hero-orb hero-orb--orange" aria-hidden="true" />

      <div className="hero-content">
        {/* Badge */}
        <div className="hero-badge">
          <span className="hero-badge__dot" aria-hidden="true" />
          Public GitHub Profile Analysis
        </div>

        {/* Heading */}
        <h1 id="hero-heading" className="hero-title">
          GitHub{' '}
          <span className="gradient-text">Roast</span>
          {' & '}
          <span className="hero-title__rescue">Rescue</span>
        </h1>

        {/* Story & Value Proposition */}
        <div className="hero-copy-group">
          <p className="hero-hook">
            Your GitHub has a story.
            <span className="hero-hook__sub">Let&apos;s see what a recruiter actually sees.</span>
          </p>
          <p className="hero-subtext">
            Analyze your public GitHub profile. Get an evidence-based score, recruiter verdict, brutally honest findings, and a plan to fix what&apos;s holding you back.
          </p>
        </div>

        {/* Input form */}
        <form
          className="hero-form"
          onSubmit={handleSubmit}
          aria-label="GitHub username input"
        >
          <div className="hero-input-wrapper">
            <span className="hero-input-prefix" aria-hidden="true">
              github.com/
            </span>
            <input
              id="github-username"
              className="hero-input"
              type="text"
              value={username}
              onChange={handleInputChange}
              placeholder="Enter a GitHub username"
              autoComplete="off"
              spellCheck={false}
              disabled={isLoading}
              aria-label="GitHub username"
            />
          </div>
          <button
            type="submit"
            className={`hero-cta ${isLoading ? 'hero-cta--loading' : ''}`}
            id="roast-cta-btn"
            disabled={!username.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <span className="hero-cta__spinner" aria-hidden="true" />
                Analyzing...
              </>
            ) : (
              <>
                <span className="hero-cta__icon" aria-hidden="true">⚡</span>
                Analyze My GitHub
              </>
            )}
          </button>
        </form>

        {/* Trust Badges */}
        <p className="hero-hint">
          No signup required • Public GitHub data • Evidence-based
        </p>

        {/* Polished analysis assistant loading experience */}
        {isLoading && (
          <div className="hero-analysis-card" role="status" aria-live="polite">
            <div className="hero-analysis-card__header">
              <div className="hero-analysis-card__spinner-wrap">
                <span className="hero-analysis-card__spinner" aria-hidden="true" />
              </div>
              <div className="hero-analysis-card__title-box">
                <span className="hero-analysis-card__target">
                  Analyzing <strong>@{username.trim()}</strong>
                </span>
                <span className="hero-analysis-card__step-counter">
                  Step {analysisStepIndex + 1} of {ANALYSIS_STEPS.length}
                </span>
              </div>
            </div>

            {/* Current Active Step */}
            <div className="hero-analysis-card__body">
              <div key={analysisStepIndex} className="hero-analysis-card__step">
                <span className="hero-analysis-card__step-icon" aria-hidden="true">
                  {ANALYSIS_STEPS[analysisStepIndex].icon}
                </span>
                <span className="hero-analysis-card__step-text">
                  {ANALYSIS_STEPS[analysisStepIndex].text}
                </span>
              </div>
            </div>

            {/* Step Segments Progress Track */}
            <div className="hero-analysis-card__track" aria-hidden="true">
              {ANALYSIS_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`hero-analysis-card__segment ${
                    idx < analysisStepIndex
                      ? 'hero-analysis-card__segment--done'
                      : idx === analysisStepIndex
                      ? 'hero-analysis-card__segment--active'
                      : ''
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Error states */}
        {error && !isLoading && (
          <div
            className={`hero-state hero-state--error hero-state--${error.type}`}
            role="alert"
            aria-live="assertive"
          >
            <span className="hero-state__icon" aria-hidden="true">
              {error.type === 'notFound' && '🔍'}
              {error.type === 'rateLimit' && '⏳'}
              {error.type === 'invalid' && '⚠️'}
              {(error.type === 'general' || error.type === 'network') && '❌'}
            </span>
            <div className="hero-state__content">
              <span className="hero-state__title">
                {error.type === 'notFound' && 'User Not Found'}
                {error.type === 'rateLimit' && 'API Rate Limit Exceeded'}
                {error.type === 'invalid' && 'Invalid Username'}
                {error.type === 'network' && 'Connection Error'}
                {error.type === 'general' && 'Error Fetching Profile'}
              </span>
              <p className="hero-state__desc">{error.message}</p>
            </div>
          </div>
        )}

        {/* Result state */}
        {profileData && !isLoading && (
          <ProfileResult data={profileData} />
        )}
      </div>
    </section>
  )
}
