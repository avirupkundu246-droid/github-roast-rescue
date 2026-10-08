import './SectionDivider.css'

/**
 * A subtle horizontal rule between sections with optional label.
 */
export default function SectionDivider({ label }) {
  return (
    <div className="section-divider" aria-hidden={!label} role={label ? 'separator' : undefined}>
      {label && <span className="section-divider__label">{label}</span>}
    </div>
  )
}
