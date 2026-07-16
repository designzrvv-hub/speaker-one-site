import { CONFIG_CMS } from '../../config/siteConfig';
import ActionControl from '../ui/ActionControl';

export default function ManifestoSection({config = CONFIG_CMS, onConsultationClick}) {
  const {manifesto} = config;
  if (manifesto.visible === false) return null;

  return (
    <section id="about" aria-labelledby="about-title" className="section-shell relative max-w-5xl mx-auto z-10 border-t border-white/10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-4 space-y-4">
          <div className="section-eyebrow">{manifesto.sectionTitle}</div>
          <div className="surface-card surface-card--elevated rounded-[2rem] overflow-hidden aspect-[3/4] hover-luxury-card">
            <img src={config.media.expertAboutCard} alt={manifesto.imageAlt} loading="lazy" decoding="async" className="w-full h-full object-cover mix-blend-luminosity hover:mix-blend-normal transition-all duration-700" />
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          <p className="text-lg md:text-2xl text-stone-300 font-light leading-[1.55] tracking-[-0.015em]">
            {manifesto.quote}
          </p>
          <h2 id="about-title" className="text-xl md:text-2xl font-semibold tracking-tight text-stone-100 border-l-2 border-[#C9A84C] pl-5 md:pl-7 py-1 leading-[1.55]">
            {manifesto.mainText}
          </h2>
          {manifesto.additionalText && <p className="body-copy">{manifesto.additionalText}</p>}
          {manifesto.ctaVisible !== false && (
            <div className="pt-2">
              <ActionControl
                data-preview-target="manifesto-cta"
                target={manifesto.ctaTarget}
                config={config}
                onConsultationClick={onConsultationClick}
                className="ui-button ui-button--secondary"
              >
                {manifesto.ctaLabel}
              </ActionControl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
