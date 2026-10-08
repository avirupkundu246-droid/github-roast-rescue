import './FeatureCards.css'

const FEATURES = [
  {
    id: 'roast',
    emoji: '😈',
    label: 'Roast',
    color: 'fire',
    heading: 'Brutal Honesty',
    description:
      'No sugarcoating. Get direct, evidence-based feedback on what makes your profile look unprofessional or lazy to a recruiter.',
  },
  {
    id: 'diagnose',
    emoji: '🔍',
    label: 'Diagnose',
    color: 'purple',
    heading: 'Root Cause Analysis',
    description:
      "Understand the 'why' behind each issue — missing README, dead repos, sparse bio, poor commit history, and more.",
  },
  {
    id: 'rescue',
    emoji: '🚀',
    label: 'Rescue',
    color: 'green',
    heading: 'Actionable Fixes',
    description:
      'Walk away with a prioritized checklist of practical improvements you can start making today, ranked by impact.',
  },
]

export default function FeatureCards() {
  return (
    <section className="features-section" aria-labelledby="features-heading">
      <h2 id="features-heading" className="sr-only">Features</h2>
      <div className="features-grid">
        {FEATURES.map((feature) => (
          <article
            key={feature.id}
            className={`feature-card feature-card--${feature.color}`}
            aria-label={feature.label}
          >
            <div className="feature-card__icon-wrapper">
              <span className="feature-card__emoji" aria-hidden="true">
                {feature.emoji}
              </span>
            </div>
            <div className="feature-card__body">
              <h3 className="feature-card__label">{feature.label}</h3>
              <p className="feature-card__heading">{feature.heading}</p>
              <p className="feature-card__description">{feature.description}</p>
            </div>
            <div className="feature-card__glow" aria-hidden="true" />
          </article>
        ))}
      </div>
    </section>
  )
}
