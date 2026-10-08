import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

describe('Accessibility & WCAG Compliance Standards', () => {
  const indexCss = fs.readFileSync('src/index.css', 'utf8')
  const heroHtml = fs.readFileSync('src/components/HeroSection.jsx', 'utf8')
  const headerHtml = fs.readFileSync('src/components/DashboardHeader.jsx', 'utf8')
  const dashboardHtml = fs.readFileSync('src/components/AnalysisDashboard.jsx', 'utf8')
  const appHtml = fs.readFileSync('src/App.jsx', 'utf8')
  const indexHtml = fs.readFileSync('index.html', 'utf8')

  describe('Document HTML & Language Semantics', () => {
    it('has declared lang attribute on root html element', () => {
      assert.ok(indexHtml.includes('<html lang="en">'), 'index.html must specify lang="en"')
    })

    it('has meta viewport configuration for mobile accessibility and pinch-zoom', () => {
      assert.ok(indexHtml.includes('name="viewport"'), 'index.html must include viewport meta')
      assert.ok(!indexHtml.includes('user-scalable=no'), 'must not disable user scaling/zoom')
    })

    it('has descriptive title tag', () => {
      assert.ok(indexHtml.includes('<title>'), 'index.html must have a title tag')
    })

    it('implements skip-to-content landmark link in root App structure', () => {
      assert.ok(appHtml.includes('skip-link'), 'App.jsx must provide a skip-link anchor')
      assert.ok(appHtml.includes('id="main-content"'), 'App.jsx must provide a #main-content target')
      assert.ok(indexCss.includes('.skip-link'), 'CSS must define styles for .skip-link')
    })
  })

  describe('Form Labels & Accessible Names', () => {
    it('input in HeroSection has explicit label and aria-label', () => {
      assert.ok(
        heroHtml.includes('htmlFor="github-username"') && heroHtml.includes('className="sr-only"'),
        'Username input must have associated <label> for screen readers'
      )
      assert.ok(heroHtml.includes('aria-describedby'), 'Input must link to error descriptions via aria-describedby')
      assert.ok(heroHtml.includes('id="hero-error-message"'), 'Error description must have matching id')
    })

    it('submit CTA button has accessible label and disabled state indicator', () => {
      assert.ok(heroHtml.includes('id="roast-cta-btn"'))
      assert.ok(heroHtml.includes('type="submit"'))
    })

    it('decorative icons and animations have aria-hidden="true"', () => {
      assert.ok(heroHtml.includes('aria-hidden="true"'))
      assert.ok(dashboardHtml.includes('aria-hidden="true"'))
      assert.ok(headerHtml.includes('aria-hidden="true"'))
    })
  })

  describe('Dynamic Feedback & Live Regions', () => {
    it('loading progress card uses role="status" and aria-live="polite"', () => {
      assert.ok(heroHtml.includes('role="status"'))
      assert.ok(heroHtml.includes('aria-live="polite"'))
    })

    it('error alerts use role="alert" and aria-live="assertive"', () => {
      assert.ok(heroHtml.includes('role="alert"'))
      assert.ok(heroHtml.includes('aria-live="assertive"'))
    })
  })

  describe('Keyboard Navigation & WAI-ARIA Tabs', () => {
    it('header navigation implements WAI-ARIA tablist and tab roles', () => {
      assert.ok(headerHtml.includes('role="tablist"'), 'Nav container must have role="tablist"')
      assert.ok(headerHtml.includes('role="tab"'), 'Tab buttons must have role="tab"')
      assert.ok(headerHtml.includes('aria-selected'), 'Tab buttons must specify aria-selected')
      assert.ok(headerHtml.includes('aria-controls'), 'Tab buttons must specify aria-controls')
    })

    it('analysis dashboard implements tabpanel linked to active tab', () => {
      assert.ok(dashboardHtml.includes('role="tabpanel"'), 'Dashboard container must have role="tabpanel"')
      assert.ok(dashboardHtml.includes('aria-labelledby'), 'Tabpanel must have aria-labelledby matching active tab')
      assert.ok(dashboardHtml.includes('tabIndex={0}'), 'Tabpanel must be keyboard focusable')
    })

    it('category cards in AnalysisDashboard have button semantics and keyboard accessibility', () => {
      assert.ok(dashboardHtml.includes('handleCategoryClick'))
      assert.ok(dashboardHtml.includes('expandedCategoryId'))
      assert.ok(dashboardHtml.includes('aria-expanded'))
      assert.ok(dashboardHtml.includes('aria-controls'))
    })

    it('rescue checklist items support checkbox role and keyboard toggling', () => {
      assert.ok(
        dashboardHtml.includes('role="checkbox"') && dashboardHtml.includes('aria-checked'),
        'Checklist items must have role="checkbox" and aria-checked'
      )
      assert.ok(dashboardHtml.includes('tabIndex={0}'), 'Checklist items must be focusable via tabIndex={0}')
    })
  })

  describe('Color Contrast, Focus & Screen Reader Utilities', () => {
    it('defines .sr-only utility class for screen readers', () => {
      assert.ok(indexCss.includes('.sr-only'), 'CSS must define .sr-only utility')
    })

    it('defines universal :focus-visible outlines', () => {
      assert.ok(indexCss.includes(':focus-visible'), 'CSS must specify :focus-visible rules')
    })

    it('respects prefers-reduced-motion media queries in JavaScript and CSS', () => {
      assert.ok(dashboardHtml.includes('prefers-reduced-motion'), 'AnalysisDashboard must check prefers-reduced-motion')
    })
  })
})
