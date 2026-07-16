import {ArrowUpRight} from 'lucide-react';
import {CONFIG_CMS} from '../../config/siteConfig';

const SOCIAL_CONFIG_KEYS = {
  vkontakte: 'vkontakte',
  youtube: 'youtube',
  dzen: 'dzen',
  telegram: 'telegramChannel',
};

function resolveFooterHref(href, config) {
  if (href === 'portfolio') return config.links.portfolioDrive;
  if (href === 'privacy') return config.legal.privacyPolicyLink;
  return href;
}

export default function Footer({config = CONFIG_CMS, onSectionNavigate}) {
  const {footer} = config;

  return (
    <footer aria-label={config.accessibility.footerLabel} className="footer-surface border-t border-white/10 rounded-t-[2.25rem] pt-16 md:pt-20 pb-10 px-5 sm:px-6 md:px-16 relative z-10">
      <div className="content-container">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-white/10">
          <div className="md:col-span-6 space-y-4">
            <div className="text-lg font-bold uppercase tracking-widest text-stone-200">{footer.brandName}</div>
            <p className="text-stone-400 font-light max-w-sm text-sm leading-[1.7]">{footer.description}</p>
            <div className="text-[11px] leading-relaxed text-stone-500 font-sans space-y-0.5 pt-2">
              <div data-preview-legal-field="ownerFullName" className="block">{config.legal.owner}</div>
              <div data-preview-legal-field="inn" className="block">{config.legal.inn}</div>
              <div data-preview-legal-field="ogrnip" className="block">{config.legal.ogrn}</div>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <div className="meta-label footer-heading">{footer.navigationTitle}</div>
            <ul className="text-sm text-stone-400 space-y-2">
              {footer.navigationLinks.map((item) => {
                const href = resolveFooterHref(item.href, config);
                const isAnchor = href.startsWith('#');
                const isPrivacy = item.href === 'privacy';
                return (
                  <li key={item.key} data-preview-footer-link-key={item.key}>
                    {isAnchor ? (
                      <button type="button" onClick={() => onSectionNavigate(href.slice(1))} className="ui-text-link footer-nav-link text-left">
                        {item.label}
                      </button>
                    ) : (
                      <a href={href} target="_blank" rel="noreferrer" className={`ui-text-link footer-nav-link text-left${isPrivacy ? ' text-stone-500 text-xs' : ' gap-1'}`}>
                        {item.label}{!isPrivacy && <ArrowUpRight size={12} aria-hidden="true" />}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="md:col-span-3 space-y-4">
            <div className="meta-label footer-heading">{footer.mediaTitle}</div>
            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-mono uppercase tracking-wider">
              {footer.socialLinks.map((item) => (
                <a
                  key={item.key}
                  data-preview-social-network={item.network}
                  href={item.url ?? config.links[SOCIAL_CONFIG_KEYS[item.network]]}
                  target="_blank"
                  rel="noreferrer"
                  className="footer-social-link p-2"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] leading-relaxed font-mono text-stone-500 text-center sm:text-left">
          <div>© {new Date().getFullYear()} {footer.copyrightBrand}</div>
          <div className="flex items-center gap-1.5 text-stone-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            {footer.studioStatus}
          </div>
        </div>
      </div>
    </footer>
  );
}
