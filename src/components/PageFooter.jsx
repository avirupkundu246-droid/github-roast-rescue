import './PageFooter.css'

export default function PageFooter() {
  return (
    <footer className="page-footer">
      <div className="page-footer__inner">
        <p className="page-footer__disclaimer">
          <span className="page-footer__icon" aria-hidden="true">🔒</span>
          Feedback is based on publicly available GitHub data.
          We do not store your username or any personal information.
        </p>
        <p className="page-footer__credit">
          Built for the hackathon ·{' '}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="page-footer__link"
          >
            GitHub Roast &amp; Rescue
          </a>
        </p>
      </div>
    </footer>
  )
}
