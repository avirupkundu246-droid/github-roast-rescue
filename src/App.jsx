import { useState } from 'react'
import './App.css'
import HeroSection from './components/HeroSection'
import FeatureCards from './components/FeatureCards'
import SectionDivider from './components/SectionDivider'
import PageFooter from './components/PageFooter'
import DashboardHeader from './components/DashboardHeader'
import AnalysisDashboard from './components/AnalysisDashboard'

function App() {
  const [analysisData, setAnalysisData] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  function handleAnalysisComplete(data) {
    setAnalysisData(data)
    setActiveTab('overview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNewAnalysis() {
    setAnalysisData(null)
    setActiveTab('overview')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className={`app ${analysisData ? 'app--dashboard' : 'app--landing'}`}>
      {analysisData ? (
        /* ── STATE 2: ANALYSIS DASHBOARD ── */
        <>
          <DashboardHeader
            username={analysisData.user?.username}
            avatar={analysisData.user?.avatar}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onNewAnalysis={handleNewAnalysis}
          />
          <AnalysisDashboard
            data={analysisData}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <PageFooter />
        </>
      ) : (
        /* ── STATE 1: LANDING PAGE ── */
        <>
          <HeroSection onAnalysisComplete={handleAnalysisComplete} />
          <SectionDivider label="Roast · Diagnose · Rescue" />
          <FeatureCards />
          <PageFooter />
        </>
      )}
    </div>
  )
}

export default App
