import {CONFIG_CMS} from '../../config/siteConfig';

function resolveTarget(target, config) {
  if (target === 'telegram') return config.links.telegramPrimary ?? config.links.telegramBot;
  if (target === 'telegramBot') return config.links.telegramBot;
  if (target === 'telegramChannel') return config.links.telegramChannel;
  return target;
}

export default function ActionControl({
  target,
  config = CONFIG_CMS,
  onConsultationClick,
  className,
  children,
  ...elementProps
}) {
  const resolvedTarget = resolveTarget(target, config);

  if (resolvedTarget === 'scrollToForm' || resolvedTarget === '#consultation') {
    return (
      <button type="button" onClick={onConsultationClick} className={className} {...elementProps}>
        {children}
      </button>
    );
  }

  if (!resolvedTarget) return null;

  const isLocalTarget = resolvedTarget.startsWith('#') || resolvedTarget.startsWith('/');

  return (
    <a
      href={resolvedTarget}
      target={isLocalTarget ? undefined : '_blank'}
      rel={isLocalTarget ? undefined : 'noreferrer'}
      className={className}
      {...elementProps}
    >
      {children}
    </a>
  );
}
