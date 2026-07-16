import { useEffect, useRef, useState } from 'react';
import { CONFIG_CMS } from '../../config/siteConfig';
import ActionControl from '../ui/ActionControl';

export default function SpeechLabSection({config = CONFIG_CMS, onConsultationClick}) {
  const speechLab = config.speechLab;
  const questions = speechLab.questions;
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const activeHeadingRef = useRef(null);
  const shouldMoveFocusRef = useRef(false);

  useEffect(() => {
    if (!shouldMoveFocusRef.current) return;

    shouldMoveFocusRef.current = false;
    activeHeadingRef.current?.focus({ preventScroll: true });
  }, [currentStep, isComplete]);

  const moveFocusAfterUpdate = () => {
    shouldMoveFocusRef.current = true;
  };

  const handleAnswer = (points) => {
    setAnswers((currentAnswers) => {
      const nextAnswers = currentAnswers.slice(0, currentStep);
      nextAnswers[currentStep] = points;
      return nextAnswers;
    });
    moveFocusAfterUpdate();

    if (currentStep === questions.length - 1) {
      setIsComplete(true);
      return;
    }

    setCurrentStep((step) => step + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) return;

    moveFocusAfterUpdate();
    setCurrentStep((step) => step - 1);
  };

  const handleReset = () => {
    moveFocusAfterUpdate();
    setAnswers([]);
    setCurrentStep(0);
    setIsComplete(false);
  };

  const totalScore = answers.reduce((sum, points) => sum + points, 0);
  const result = speechLab.results.find(({minScore, maxScore = Number.POSITIVE_INFINITY}) => (
    totalScore >= minScore && totalScore <= maxScore
  ))
    ?? speechLab.results[speechLab.results.length - 1];
  const completedSteps = isComplete ? questions.length : currentStep + 1;
  const currentQuestion = questions[currentStep];
  const selectedAnswer = answers[currentStep];

  return (
    <section id="speech-lab" aria-labelledby="speech-lab-title" className="section-shell relative z-10">
      <div className="content-container content-container--wide speech-lab surface-card surface-card--elevated overflow-hidden rounded-[2.25rem]">
        <div className="grid lg:grid-cols-12 min-h-[620px]">
          <div className="lg:col-span-5 relative min-h-[400px] lg:min-h-[620px]">
            <img src={config.media.expertWork} alt={speechLab.imageAlt} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/25 to-transparent"></div>
            <div className="absolute left-5 right-5 bottom-6 sm:left-8 sm:right-8 sm:bottom-8">
              <span className="section-eyebrow">{speechLab.eyebrow}</span>
              <h2 id="speech-lab-title" className="text-3xl md:text-5xl font-semibold leading-[1.08] tracking-[-0.03em] mt-3 text-stone-100">{speechLab.title}</h2>
              <p className="text-sm md:text-base text-stone-300 mt-4 leading-[1.7]">{speechLab.description}</p>
            </div>
          </div>

          <div className="speech-lab-panel lg:col-span-7 p-5 sm:p-7 md:p-12 flex items-center bg-black/30">
            <div className="speech-lab-view w-full" aria-live="polite" aria-atomic="false">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <span className="meta-label text-stone-400">
                  {isComplete
                    ? speechLab.completedLabel
                    : `${speechLab.situationLabel} ${currentStep + 1} / ${questions.length}`}
                </span>
                <div
                  className="speech-lab-progress"
                  role="progressbar"
                  aria-label={speechLab.progressAriaLabel}
                  aria-valuemin="1"
                  aria-valuemax={questions.length}
                  aria-valuenow={completedSteps}
                >
                  {questions.map((question, index) => (
                    <span
                      key={question.key ?? question.title}
                      className={`speech-lab-progress-step${index < completedSteps ? ' is-active' : ''}`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              </div>

              {!isComplete ? (
                <div>
                  <p className="text-[#d7b85b] text-xs uppercase tracking-[0.16em] font-semibold">{currentQuestion.title}</p>
                  <h3
                    ref={activeHeadingRef}
                    data-preview-question-prompt={currentQuestion.key}
                    tabIndex="-1"
                    className="speech-lab-focus-heading text-2xl md:text-4xl font-semibold leading-[1.2] tracking-[-0.025em] mt-4 mb-8"
                  >
                    {currentQuestion.prompt}
                  </h3>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                      const isSelected = selectedAnswer === option.points;

                      return (
                        <button
                          key={option.key ?? `${currentQuestion.key ?? currentQuestion.title}-${index}`}
                          data-preview-question-key={currentQuestion.key}
                          data-preview-option-key={option.key}
                          type="button"
                          onClick={() => handleAnswer(option.points)}
                          className={`game-option surface-inset min-h-14 w-full text-left p-4 sm:p-5 text-sm md:text-base leading-relaxed text-stone-200${isSelected ? ' is-selected' : ''}`}
                          aria-pressed={isSelected}
                        >
                          <span className="font-mono text-[#d7b85b] mr-3" aria-hidden="true">{speechLab.optionLabels[index] ?? String(index + 1).padStart(2, '0')}</span>
                          {option.text}
                        </button>
                      );
                    })}
                  </div>

                  {currentStep > 0 && (
                    <button type="button" onClick={handleBack} className="ui-text-link min-h-11 mt-5 px-1">
                      {speechLab.backLabel}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="section-eyebrow">{speechLab.resultEyebrow}</p>
                  <h3
                    ref={activeHeadingRef}
                    data-preview-result-key={result.key}
                    data-preview-result-field="title"
                    tabIndex="-1"
                    className="speech-lab-focus-heading text-3xl md:text-5xl font-semibold leading-[1.12] tracking-[-0.03em] mt-3"
                  >
                    {result.title}
                  </h3>
                  <p data-preview-result-key={result.key} data-preview-result-field="description" className="body-copy mt-5 max-w-xl mx-auto">{result.description}</p>

                  <div className="speech-lab-recommendation text-left mt-7 mx-auto max-w-xl">
                    <p className="meta-label text-[#d7b85b]">{speechLab.recommendationLabel}</p>
                    <p data-preview-result-key={result.key} data-preview-result-field="recommendation" className="text-sm md:text-base leading-[1.75] text-stone-200 mt-3">{result.recommendation}</p>
                  </div>

                  <div className="speech-lab-result-cta mt-8 pt-8">
                    <h4 className="text-xl md:text-2xl font-semibold tracking-[-0.02em]">{speechLab.ctaTitle}</h4>
                    <p className="body-copy mt-3 max-w-xl mx-auto">{speechLab.ctaDescription}</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
                      {speechLab.resultCtaVisible !== false && (
                        <ActionControl
                          data-preview-target="speech-result-cta"
                          target={speechLab.resultCtaTarget}
                          config={config}
                          onConsultationClick={onConsultationClick}
                          className="ui-button ui-button--primary"
                        >
                          {speechLab.resultCta}
                        </ActionControl>
                      )}
                      <button type="button" onClick={handleReset} className="ui-button ui-button--secondary">{speechLab.resetLabel}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
