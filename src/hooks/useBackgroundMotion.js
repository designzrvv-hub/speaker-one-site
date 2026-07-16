import { useEffect, useRef } from 'react';

const POINTER_MEDIA = '(min-width: 1024px) and (hover: hover) and (pointer: fine)';
const REDUCED_MOTION_MEDIA = '(prefers-reduced-motion: reduce)';
const PARALLAX_X = 12;
const PARALLAX_Y = 10;
const LERP_FACTOR = 0.08;
const SETTLE_THRESHOLD = 0.08;

const addMediaListener = (query, listener) => {
  if (query.addEventListener) query.addEventListener('change', listener);
  else query.addListener(listener);
};

const removeMediaListener = (query, listener) => {
  if (query.removeEventListener) query.removeEventListener('change', listener);
  else query.removeListener(listener);
};

export function useBackgroundMotion(backgroundRef) {
  const animationFrameRef = useRef(null);
  const motionRef = useRef({
    currentX: 0,
    currentY: 0,
    currentCursorX: 0,
    currentCursorY: 0,
    targetX: 0,
    targetY: 0,
    targetCursorX: 0,
    targetCursorY: 0,
  });

  useEffect(() => {
    const background = backgroundRef.current;
    if (!background) return undefined;

    const cursorLight = background.querySelector('.ambient-cursor-light');
    const pointerQuery = window.matchMedia(POINTER_MEDIA);
    const reducedMotionQuery = window.matchMedia(REDUCED_MOTION_MEDIA);
    const motion = motionRef.current;
    let pointerEnabled = false;

    const setRestingPosition = () => {
      const restingCursorX = window.innerWidth * 0.5;
      const restingCursorY = window.innerHeight * 0.28;

      Object.assign(motion, {
        currentX: 0,
        currentY: 0,
        currentCursorX: restingCursorX,
        currentCursorY: restingCursorY,
        targetX: 0,
        targetY: 0,
        targetCursorX: restingCursorX,
        targetCursorY: restingCursorY,
      });
    };

    const applyTransforms = () => {
      background.style.transform = `translate3d(${motion.currentX.toFixed(2)}px, ${motion.currentY.toFixed(2)}px, 0)`;

      if (cursorLight) {
        cursorLight.style.transform = `translate3d(calc(${motion.currentCursorX.toFixed(2)}px - 50%), calc(${motion.currentCursorY.toFixed(2)}px - 50%), 0)`;
      }
    };

    const cancelFrame = () => {
      if (animationFrameRef.current === null) return;
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };

    const animate = () => {
      const deltaX = motion.targetX - motion.currentX;
      const deltaY = motion.targetY - motion.currentY;
      const cursorDeltaX = motion.targetCursorX - motion.currentCursorX;
      const cursorDeltaY = motion.targetCursorY - motion.currentCursorY;

      motion.currentX += deltaX * LERP_FACTOR;
      motion.currentY += deltaY * LERP_FACTOR;
      motion.currentCursorX += cursorDeltaX * LERP_FACTOR;
      motion.currentCursorY += cursorDeltaY * LERP_FACTOR;
      applyTransforms();

      const isSettled =
        Math.abs(deltaX) < SETTLE_THRESHOLD &&
        Math.abs(deltaY) < SETTLE_THRESHOLD &&
        Math.abs(cursorDeltaX) < SETTLE_THRESHOLD &&
        Math.abs(cursorDeltaY) < SETTLE_THRESHOLD;

      if (isSettled) {
        motion.currentX = motion.targetX;
        motion.currentY = motion.targetY;
        motion.currentCursorX = motion.targetCursorX;
        motion.currentCursorY = motion.targetCursorY;
        applyTransforms();
        animationFrameRef.current = null;
        return;
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    const requestMotionFrame = () => {
      if (animationFrameRef.current !== null) return;
      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event) => {
      const normalizedX = (event.clientX / window.innerWidth - 0.5) * 2;
      const normalizedY = (event.clientY / window.innerHeight - 0.5) * 2;

      motion.targetX = normalizedX * -PARALLAX_X;
      motion.targetY = normalizedY * -PARALLAX_Y;
      motion.targetCursorX = event.clientX;
      motion.targetCursorY = event.clientY;
      requestMotionFrame();
    };

    const returnToRest = () => {
      motion.targetX = 0;
      motion.targetY = 0;
      motion.targetCursorX = window.innerWidth * 0.5;
      motion.targetCursorY = window.innerHeight * 0.28;
      requestMotionFrame();
    };

    const enablePointerMotion = () => {
      if (pointerEnabled) return;
      pointerEnabled = true;
      background.classList.add('is-pointer-reactive');
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('blur', returnToRest);
    };

    const disablePointerMotion = () => {
      if (pointerEnabled) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('blur', returnToRest);
      }

      pointerEnabled = false;
      cancelFrame();
      setRestingPosition();
      background.classList.remove('is-pointer-reactive');
      background.style.transform = '';
      if (cursorLight) cursorLight.style.transform = '';
    };

    const syncMotionPreference = () => {
      if (pointerQuery.matches && !reducedMotionQuery.matches) enablePointerMotion();
      else disablePointerMotion();
    };

    setRestingPosition();
    syncMotionPreference();
    addMediaListener(pointerQuery, syncMotionPreference);
    addMediaListener(reducedMotionQuery, syncMotionPreference);

    return () => {
      disablePointerMotion();
      removeMediaListener(pointerQuery, syncMotionPreference);
      removeMediaListener(reducedMotionQuery, syncMotionPreference);
    };
  }, [backgroundRef]);
}
