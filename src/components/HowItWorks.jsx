import './HowItWorks.css'

const STEPS = [
  {
    id: 1,
    icon: '⌨️',
    title: 'Enter Username',
    description: 'Type any public GitHub username into the input field.',
  },
  {
    id: 2,
    icon: '🔬',
    title: 'Analyze Profile',
    description: 'We scan repos, READMEs, activity, bio, and more.',
  },
  {
    id: 3,
    icon: '📊',
    title: 'Get Your Score',
    description: 'Receive a recruiter-readiness score with detailed breakdown.',
  },
  {
    id: 4,
    icon: '🛠️',
    title: 'Fix What Matters',
    description: 'Follow a prioritized action plan to level up your profile.',
  },
]

export default function HowItWorks() {
  return (
    <section className="hiw-section" aria-labelledby="hiw-heading">
      <div className="hiw-inner">
        <div className="hiw-header">
          <p className="hiw-label">How it works</p>
          <h2 id="hiw-heading" className="hiw-title">
            From messy to <span className="gradient-text">recruiter-ready</span>
          </h2>
          <p className="hiw-subtitle">
            Four steps. Honest analysis. Actionable results.
          </p>
        </div>

        <ol className="hiw-steps" aria-label="Process steps">
          {STEPS.map((step, index) => (
            <li key={step.id} className="hiw-step">
              <div className="hiw-step__icon-wrap">
                <span className="hiw-step__emoji" aria-hidden="true">{step.icon}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="hiw-step__connector" aria-hidden="true">
                  <span className="hiw-step__arrow">→</span>
                </div>
              )}
              <div className="hiw-step__content">
                <span className="hiw-step__num" aria-label={`Step ${step.id}`}>
                  {String(step.id).padStart(2, '0')}
                </span>
                <h3 className="hiw-step__title">{step.title}</h3>
                <p className="hiw-step__description">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
