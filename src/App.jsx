import { useEffect, useRef, useState } from 'react';
import Footer from './components/layout/Footer';
import Navigation from './components/layout/Navigation';
import CompetenciesSection from './components/sections/CompetenciesSection';
import ExpertSection from './components/sections/ExpertSection';
import HeroSection from './components/sections/HeroSection';
import LeadFormSection from './components/sections/LeadFormSection';
import ManifestoSection from './components/sections/ManifestoSection';
import SpeechLabSection from './components/sections/SpeechLabSection';
import TransformationStepsSection from './components/sections/TransformationStepsSection';
import { CONFIG_CMS } from './config/siteConfig';
import { useBackgroundMotion } from './hooks/useBackgroundMotion';
import { useHeroAnimation } from './hooks/useHeroAnimation';
import { useSiteContent } from './hooks/useSiteContent';

export default function App() {
  const mainRef = useRef(null);
  const backgroundRef = useRef(null);
  const formSectionRef = useRef(null);
  const { config: siteContent } = useSiteContent();
  const [currentDateInfo, setCurrentDateInfo] = useState({ day: 4, monthStr: CONFIG_CMS.date.months[6] });

  const getScrollBehavior = () => (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  );

  const scrollToForm = (e) => {
    e.preventDefault();
    formSectionRef.current?.scrollIntoView({ behavior: getScrollBehavior(), block: 'center' });
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
  };

  useEffect(() => {
    const now = new Date();
    setCurrentDateInfo({ day: now.getDate(), monthStr: CONFIG_CMS.date.months[now.getMonth()] });
  }, []);

  useHeroAnimation(mainRef);
  useBackgroundMotion(backgroundRef);

  return (
    <div
      ref={mainRef}
      className="premium-shell relative min-h-screen bg-[#050508] text-[#FAF8F5] antialiased font-sans overflow-hidden"
    >
      <a href="#main-content" className="skip-link">
        {CONFIG_CMS.accessibility.skipToContent}
      </a>
      <div ref={backgroundRef} className="ambient-field" aria-hidden="true">
        <span className="ambient-orb ambient-orb--gold"></span>
        <span className="ambient-orb ambient-orb--steel"></span>
        <span className="ambient-cursor-light"></span>
      </div>
      <div className="ambient-pattern" aria-hidden="true"></div>
      <div className="noise-overlay" aria-hidden="true"></div>

      <Navigation config={siteContent} onConsultationClick={scrollToForm} />
      <main id="main-content" tabIndex="-1">
        <HeroSection config={siteContent} onConsultationClick={scrollToForm} />
        <ManifestoSection config={siteContent} onConsultationClick={scrollToForm} />
        <CompetenciesSection config={siteContent} currentDateInfo={currentDateInfo} />
        <ExpertSection config={siteContent} onConsultationClick={scrollToForm} />
        <SpeechLabSection config={siteContent} onConsultationClick={scrollToForm} />
        <TransformationStepsSection config={siteContent} />
        <LeadFormSection config={siteContent} sectionRef={formSectionRef} />
      </main>
      <Footer config={siteContent} onSectionNavigate={scrollToSection} />
    </div>
  );
}
