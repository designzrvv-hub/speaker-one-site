import { CONFIG_CMS } from '../../config/siteConfig';

export default function TransformationStepsSection({config = CONFIG_CMS}) {
  const {steps} = config;

  return (
    <section id="protocol" aria-labelledby="protocol-title" className="section-shell relative bg-[#0A0A10]/40 border-t border-white/10 z-10">
      <div className="content-container">
        <div className="section-heading text-center">
          <span className="section-eyebrow">{steps.sectionTitle}</span>
          <h2 id="protocol-title" className="section-title mx-auto">{steps.mainTitle}</h2>
          {steps.description && <p className="body-copy mt-4 mx-auto max-w-2xl">{steps.description}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
          {steps.items.map((step) => (
            <div
              key={step.key}
              data-preview-step-key={step.key}
              className="surface-card p-6 lg:p-7 min-h-[270px] flex flex-col justify-between hover-luxury-card"
            >
              <div className="flex justify-between items-start">
                <span className="meta-label">{steps.itemLabel} <span data-preview-step-number>{step.num}</span></span>
                <div className="step-number w-9 h-9 rounded-full border border-white/10 flex items-center justify-center font-mono text-stone-400 text-xs font-semibold bg-[#0A0A10]">
                  {step.num}
                </div>
              </div>
              <div className="mt-4 relative z-10">
                <h3 className="card-title mb-3">{step.title}</h3>
                <p className="card-copy">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
