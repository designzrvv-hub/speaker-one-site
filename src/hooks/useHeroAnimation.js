import { useEffect } from 'react';
import { gsap } from 'gsap';

export function useHeroAnimation(mainRef) {
  useEffect(() => {
    const scope = mainRef.current;
    if (!scope) return undefined;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animationContext = null;

    const syncAnimation = () => {
      animationContext?.revert();
      animationContext = null;

      if (reducedMotionQuery.matches) return;

      animationContext = gsap.context(() => {
        gsap.from('.hero-fade', { y: 20, opacity: 0, duration: 1.2, stagger: 0.08, ease: 'power3.out' });
      }, scope);
    };

    syncAnimation();
    reducedMotionQuery.addEventListener('change', syncAnimation);

    return () => {
      reducedMotionQuery.removeEventListener('change', syncAnimation);
      animationContext?.revert();
    };
  }, [mainRef]);
}
