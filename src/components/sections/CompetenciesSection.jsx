import {Compass, Radio, ShieldCheck, Target, TrendingUp, Volume2} from 'lucide-react';
import {CONFIG_CMS} from '../../config/siteConfig';

const ICONS = {
  volume: Volume2,
  target: Target,
  trending: TrendingUp,
  compass: Compass,
  shield: ShieldCheck,
  radio: Radio,
};

function CardDetails({card, variant, currentDateInfo, todayLabel}) {
  if (variant === 0) {
    return (
      <div className="space-y-2 font-mono text-[11px] leading-relaxed text-stone-400 mt-6">
        {card.additionalLabels.map((label) => <div key={label} className="surface-inset p-3">{label}</div>)}
      </div>
    );
  }

  if (variant === 1) {
    const [label, ...details] = card.additionalLabels;
    return (
      <div className="surface-inset p-4 font-mono text-[11px] leading-relaxed space-y-1.5 text-stone-400 mt-6">
        {label && (
          <div className="flex justify-between border-b border-white/10 pb-2 mb-2 text-[10px] text-stone-500">
            <span>{label}</span>
          </div>
        )}
        {details.map((detail, index) => (
          <div key={detail} className={index === details.length - 1 ? 'text-[#C9A84C]' : 'text-[#FAF8F5]'}>{detail}</div>
        ))}
      </div>
    );
  }

  return (
    <div className="surface-inset p-4 font-mono mt-6">
      {card.additionalLabels[0] && <div className="text-[10px] leading-relaxed text-stone-500 text-center mb-2.5 uppercase">{card.additionalLabels[0]}</div>}
      <div className="bg-black/25 p-3 rounded-lg border border-[#C9A84C]/20 text-center">
        <span className="text-[#C9A84C] font-bold text-sm">{currentDateInfo.day} {currentDateInfo.monthStr} ({todayLabel})</span>
      </div>
    </div>
  );
}

export default function CompetenciesSection({config = CONFIG_CMS, currentDateInfo}) {
  const {results} = config;

  return (
    <section id="features" aria-labelledby="features-title" className="section-shell relative bg-stone-900/10 border-y border-white/10 z-10">
      <div className="content-container">
        <div className="section-heading text-center md:text-left">
          <span className="section-eyebrow">{results.sectionTitle}</span>
          <h2 id="features-title" className="section-title">{results.mainTitle}</h2>
          {results.description && <p className="body-copy mt-4 max-w-2xl">{results.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {results.cards.map((card, index) => {
            const Icon = ICONS[card.icon] ?? Volume2;
            const variant = index % 3;
            return (
              <div
                key={card.key}
                data-preview-competency-key={card.key}
                className={`surface-card p-6 lg:p-7 flex flex-col justify-between h-full hover-luxury-card${variant === 2 ? ' md:col-span-2 lg:col-span-1' : ''}`}
              >
                <div>
                  <span data-preview-icon><Icon size={20} className="text-[#C9A84C] mb-5" aria-hidden="true" /></span>
                  <h3 className="card-title mb-3">{card.title}</h3>
                  <p className="card-copy">{card.description}</p>
                </div>
                <CardDetails card={card} variant={variant} currentDateInfo={currentDateInfo} todayLabel={results.todayLabel} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
