import {ArrowUpRight, Compass, Radio, ShieldCheck, Target, TrendingUp, Volume2} from 'lucide-react';
import { CONFIG_CMS } from '../../config/siteConfig';
import ActionControl from '../ui/ActionControl';

const ICONS = {
  volume: Volume2,
  target: Target,
  trending: TrendingUp,
  compass: Compass,
  shield: ShieldCheck,
  radio: Radio,
};

export default function ExpertSection({config = CONFIG_CMS, onConsultationClick}) {
  const {expert} = config;

  return (
    <section id="expert" aria-labelledby="expert-title" className="section-shell relative max-w-5xl mx-auto z-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative">

        <div className="lg:col-span-5 relative group max-w-[440px] mx-auto lg:max-w-none">
          <div className="relative w-full aspect-[3/4.6] rounded-[2.5rem] bg-[#0A0A10]/40 border border-white/10 p-1 overflow-hidden surface-card--elevated">
            <img
              src={config.media.expertNewCard}
              alt={expert.portraitAlt}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover object-top mix-blend-screen filter grayscale opacity-90 group-hover:opacity-100 group-hover:filter-none transition-all duration-700 ease-out rounded-[2.4rem]"
            />
            <div className="glass-surface absolute inset-x-4 bottom-4 text-center rounded-2xl px-4 py-3.5">
              <p className="font-serif italic text-2xl text-[#C9A84C]">{expert.name}</p>
              <p className="font-mono text-[10px] leading-relaxed text-stone-400 mt-1 uppercase tracking-wider">{expert.subRole}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-7 mt-4 lg:mt-0">
          <div>
            <span className="section-eyebrow">{expert.sectionTitle}</span>
            <h2 id="expert-title" className="section-title">{expert.name}</h2>
            <p className="text-sm text-stone-400 font-mono mt-3 leading-relaxed">{expert.subRole}</p>
            {expert.description && <p className="body-copy mt-4">{expert.description}</p>}
          </div>

          <div className="space-y-4">
            <h3 className="meta-label text-stone-400 border-b border-white/10 pb-3">{expert.credentialsTitle}</h3>
            <ul className="space-y-3">
              {expert.regalies.map((item) => (
                <li key={item} className="flex items-start gap-3 text-stone-300 text-sm leading-[1.7]">
                  <span className="text-[#C9A84C] font-bold select-none pt-0.5">[✓]</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {expert.experienceCards.map((card) => {
              const Icon = ICONS[card.icon] ?? Compass;
              return (
                <div key={card.key} data-preview-experience-key={card.key} className="surface-card p-5 hover-luxury-card">
                  <span data-preview-icon><Icon className="text-[#C9A84C] mb-3" size={18} aria-hidden="true" /></span>
                  <h3 className="meta-label text-stone-500 mb-1.5">{card.label}</h3>
                  <p className="text-sm leading-relaxed font-medium text-stone-300">{card.text}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="meta-label text-stone-400 border-b border-white/10 pb-3">{expert.audienceTitle}</h3>
            <p className="body-copy">{expert.studentsText}</p>
          </div>

          {expert.telegramCtaVisible !== false && (
            <div className="pt-3">
              <ActionControl
                data-preview-target="expert-cta"
                target={expert.telegramCtaTarget ?? config.links.telegramBotToChannel}
                config={config}
                onConsultationClick={onConsultationClick}
                className="ui-button ui-button--primary btn-magnetic"
              >
                {expert.telegramCta} <ArrowUpRight size={14} />
              </ActionControl>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
