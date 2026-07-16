import { ChevronRight } from 'lucide-react';
import { CONFIG_CMS } from '../../config/siteConfig';
import ActionControl from '../ui/ActionControl';

export default function HeroSection({ config = CONFIG_CMS, onConsultationClick }) {
  return (
    <header aria-labelledby="hero-title" className="relative min-h-[100svh] w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] items-center px-4 sm:px-6 md:px-10 xl:px-16 2xl:px-20 pt-20 sm:pt-28 lg:pt-28 pb-14 lg:pb-10 z-10 gap-12 lg:gap-8 xl:gap-16 max-w-[1440px] mx-auto">

      <div className="max-w-[720px] w-full text-left order-1">
        <p className="hero-fade inline-flex items-center gap-2.5 font-mono text-[#D7B85B] text-[11px] md:text-xs tracking-[0.14em] uppercase mb-5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C] shadow-[0_0_16px_rgba(201,168,76,0.75)]" aria-hidden="true"></span>
          <span>{config.hero.tagline}</span>
        </p>
        <h1 id="hero-title" className="hero-fade font-semibold text-[2.25rem] sm:text-5xl lg:text-[3.4rem] xl:text-[4rem] 2xl:text-[4.35rem] tracking-[-0.035em] leading-[1.03] mb-4 sm:mb-6 text-stone-100">
          {config.hero.titleMain}
          <span className="font-serif italic font-normal text-gradient bg-gradient-to-r from-[#C9A84C] via-[#E5CA7A] to-[#F3DB93] bg-clip-text text-transparent text-[0.9em] leading-[1.08] block mt-2">
            {config.hero.titleItalic}
          </span>
        </h1>
        <p className="hero-fade text-stone-200 max-w-2xl text-base sm:text-lg lg:text-xl mb-2 sm:mb-3 leading-[1.5] font-medium">
          {config.hero.subtitle}
        </p>
        <p className="hero-fade text-stone-400 max-w-xl text-sm sm:text-base mb-5 sm:mb-7 leading-[1.65] font-light">
          {config.hero.description}
        </p>
        <div className="hero-fade flex flex-col items-start gap-3.5">
          {config.hero.primaryCtaVisible !== false && (
            <ActionControl
              data-preview-target="hero-primary-cta"
              target={config.hero.primaryCtaTarget}
              config={config}
              onConsultationClick={onConsultationClick}
              className="ui-button ui-button--primary hero-cta min-h-[52px] w-full sm:w-auto whitespace-nowrap btn-magnetic"
            >
              {config.hero.primaryCta} <ChevronRight size={17} />
            </ActionControl>
          )}
          <p className="max-w-md flex items-start gap-2.5 text-sm leading-relaxed text-stone-400">
            <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-[#C9A84C]" aria-hidden="true"></span>
            <span>{config.hero.ctaNote}</span>
          </p>
        </div>
      </div>

      <div className="hero-portrait-stage relative w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[430px] xl:max-w-[460px] justify-self-center lg:justify-self-end order-2">
        <div className="hero-portrait relative w-full aspect-[2/3] rounded-[2.25rem] sm:rounded-[2.75rem] border border-white/10 bg-[#12121a] overflow-hidden shadow-[0_45px_120px_rgba(0,0,0,0.72)]">
          <img
            src={config.media.expertHeroBg}
            alt={config.hero.imageAlt}
            fetchPriority="high"
            decoding="async"
            className="hero-portrait-image w-full h-full object-cover object-top transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07070B] via-[#07070B]/5 to-transparent opacity-95"></div>

          <div className="glass-surface absolute bottom-4 sm:bottom-5 left-1/2 w-[calc(100%-2rem)] sm:w-[calc(100%-2.5rem)] max-w-[360px] -translate-x-1/2 p-4 sm:p-5 rounded-2xl text-center">
            <span className="font-mono text-[11px] uppercase text-stone-400 tracking-[0.14em] block">{config.hero.expertRole}</span>
            <span className="font-serif italic text-xl sm:text-2xl text-[#E2C66E] tracking-wide block mt-1.5">{config.hero.expertName ?? config.expert.name}</span>
            <div className="mt-2.5">
              {config.hero.proofPoints.map((point) => (
                <span key={point} className="block text-xs leading-[1.5] text-stone-400">
                  {point}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </header>
  );
}
