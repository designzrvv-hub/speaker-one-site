import { FolderGit2 } from 'lucide-react';
import { CONFIG_CMS } from '../../config/siteConfig';
import ActionControl from '../ui/ActionControl';

export default function Navigation({ config = CONFIG_CMS, onConsultationClick }) {
  return (
    <nav aria-label={config.accessibility.mainNavigationLabel} className="fixed top-0 left-0 right-0 z-50 flex justify-center p-3 sm:p-4">
      <div className="nav-island glass-surface flex items-center justify-between w-full max-w-7xl px-3 sm:px-5 md:px-7 py-2.5 sm:py-3 rounded-full">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img src={config.media.logoMark} alt={config.brand.logoAlt} className="h-8 w-8 sm:h-9 sm:w-9 object-contain" />
          <span className="hidden sm:inline font-bold tracking-[0.16em] text-sm uppercase font-sans text-stone-100">{config.brand.name}</span>
        </div>

        <div className="hidden xl:flex items-center gap-4 2xl:gap-7 text-[11px] uppercase tracking-[0.13em] font-semibold text-stone-400">
          {config.navigation.items.map((item) => (
            <a
              key={item.key ?? item.href}
              data-preview-navigation-key={item.key}
              href={item.href}
              target={item.openInNewTab ? '_blank' : undefined}
              rel={item.openInNewTab ? 'noreferrer' : undefined}
              className="ui-nav-link"
            >
              {item.label}
            </a>
          ))}
          <a data-preview-portfolio-link href={config.links.portfolioDrive} target="_blank" rel="noreferrer" className="ui-nav-link text-[#C9A84C] flex items-center gap-1.5 font-semibold">
            <FolderGit2 size={13} aria-hidden="true" /> {config.navigation.portfolioLabel}
          </a>
        </div>

        {config.navigation.consultationVisible !== false && (
          <ActionControl
            data-preview-target="navigation-consultation"
            target={config.navigation.consultationTarget}
            config={config}
            onConsultationClick={onConsultationClick}
            className="ui-button ui-button--primary ui-button--compact nav-cta shrink-0 btn-magnetic"
          >
            {config.navigation.consultationLabel}
          </ActionControl>
        )}
      </div>
    </nav>
  );
}
