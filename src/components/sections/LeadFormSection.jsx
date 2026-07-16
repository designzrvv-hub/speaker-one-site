import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { CONFIG_CMS } from '../../config/siteConfig';
import { submitLead } from '../../services/submitLead';

const INITIAL_FORM_DATA = {
  name: '',
  contact: '',
  message: '',
  website: '',
};

function normalizeFormData(formData) {
  return {
    name: formData.name.trim(),
    contact: formData.contact.trim(),
    message: formData.message.trim(),
    website: formData.website.trim(),
  };
}

function validateForm(formData, isAgreed, formConfig) {
  const errors = {};
  const validation = formConfig.validation;
  const limits = formConfig.limits;

  if (!formData.name) {
    errors.name = validation.nameRequired;
  } else if (formData.name.length < limits.name.min || formData.name.length > limits.name.max) {
    errors.name = validation.nameLength;
  }

  if (!formData.contact) {
    errors.contact = validation.contactRequired;
  } else if (formData.contact.length < limits.contact.min || formData.contact.length > limits.contact.max) {
    errors.contact = validation.contactLength;
  }

  if (!formData.message) {
    errors.message = validation.messageRequired;
  } else if (formData.message.length < limits.message.min || formData.message.length > limits.message.max) {
    errors.message = validation.messageLength;
  }

  if (!isAgreed) {
    errors.consent = validation.consentRequired;
  }

  return errors;
}

function getDescriptionIds(fieldName, hasError) {
  return `lead-${fieldName}-hint${hasError ? ` lead-${fieldName}-error` : ''}`;
}

export default function LeadFormSection({config = CONFIG_CMS, sectionRef}) {
  const formConfig = config.form;
  const formLimits = formConfig.limits;
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isAgreed, setIsAgreed] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [showTelegramAction, setShowTelegramAction] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const statusRef = useRef(null);
  const submissionLockRef = useRef(false);
  const formStartedAtRef = useRef(Date.now());
  const isSubmitting = formStatus === 'submitting';

  useEffect(() => {
    if (focusRequest === 0) return;
    statusRef.current?.focus({ preventScroll: true });
  }, [focusRequest]);

  const setOutcome = (status, message, { focus = true, telegram = false } = {}) => {
    setFormStatus(status);
    setStatusMessage(message);
    setShowTelegramAction(telegram);
    if (focus) setFocusRequest((request) => request + 1);
  };

  const clearOutcome = () => {
    if (formStatus === 'idle' || formStatus === 'submitting') return;
    setFormStatus('idle');
    setStatusMessage('');
    setShowTelegramAction(false);
  };

  const updateField = (fieldName, value) => {
    setFormData((currentData) => ({ ...currentData, [fieldName]: value }));
    setFieldErrors((currentErrors) => ({ ...currentErrors, [fieldName]: undefined }));
    clearOutcome();
  };

  const handleConsentChange = (event) => {
    setIsAgreed(event.target.checked);
    setFieldErrors((currentErrors) => ({ ...currentErrors, consent: undefined }));
    clearOutcome();
  };

  const handleInvalid = (event) => {
    event.preventDefault();
    const normalizedData = normalizeFormData(formData);
    const validationErrors = validateForm(normalizedData, isAgreed, formConfig);

    setFormData(normalizedData);
    setFieldErrors(validationErrors);
    setOutcome('error', formConfig.messages.validation, { telegram: false });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submissionLockRef.current) return;

    const normalizedData = normalizeFormData(formData);
    const validationErrors = validateForm(normalizedData, isAgreed, formConfig);

    setFormData(normalizedData);
    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setOutcome('error', formConfig.messages.validation, { telegram: false });
      return;
    }

    if (normalizedData.website) {
      setOutcome('error', formConfig.messages.error, { telegram: false });
      return;
    }

    submissionLockRef.current = true;
    setOutcome('submitting', formConfig.submittingLabel, { focus: false });

    try {
      const result = await submitLead({
        name: normalizedData.name,
        contact: normalizedData.contact,
        message: normalizedData.message,
        consent: true,
        website: normalizedData.website,
        formStartedAt: formStartedAtRef.current,
      });

      if (result.ok && result.status === 'success') {
        setFormData({ ...INITIAL_FORM_DATA });
        setIsAgreed(false);
        setFieldErrors({});
        formStartedAtRef.current = Date.now();
        setOutcome('success', formConfig.messages.success);
      } else if (result.status === 'unavailable') {
        setOutcome('unavailable', formConfig.messages.unavailable, { telegram: true });
      } else {
        setOutcome('error', formConfig.messages.error, { telegram: true });
      }
    } catch {
      setOutcome('error', formConfig.messages.error, { telegram: true });
    } finally {
      submissionLockRef.current = false;
    }
  };

  return (
    <section id="consultation" ref={sectionRef} aria-labelledby="consultation-title" className="section-shell section-shell--compact relative border-t border-white/10 bg-gradient-to-b from-transparent to-stone-950/30 z-10">
      <div className="surface-card surface-card--elevated glass-surface max-w-xl mx-auto p-5 sm:p-8 md:p-10 rounded-[2rem]">
        <div className="text-center mb-8 md:mb-10">
          <span className="section-eyebrow">{formConfig.eyebrow}</span>
          <h2 id="consultation-title" className="text-2xl md:text-3xl font-semibold leading-tight tracking-[-0.025em] text-stone-100">{formConfig.title}</h2>
          <p className="body-copy mt-3 max-w-md mx-auto">{formConfig.description}</p>
        </div>

        <form onSubmit={handleSubmit} onInvalid={handleInvalid} className="space-y-5" aria-busy={isSubmitting}>
          <div>
            <label htmlFor="lead-name" className="field-label mb-2">{formConfig.fields.name.label}</label>
            <input
              id="lead-name"
              name="name"
              type="text"
              required
              minLength={formLimits.name.min}
              maxLength={formLimits.name.max}
              autoComplete="name"
              placeholder={formConfig.fields.name.placeholder}
              data-preview-target="form-name-placeholder"
              value={formData.name}
              onChange={(event) => updateField('name', event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={getDescriptionIds('name', Boolean(fieldErrors.name))}
              className={`ui-field${fieldErrors.name ? ' ui-field--invalid' : ''}`}
            />
            <p id="lead-name-hint" className="form-field-hint">{formConfig.fields.name.hint}</p>
            {fieldErrors.name && <p id="lead-name-error" className="form-field-error">{fieldErrors.name}</p>}
          </div>

          <div>
            <label htmlFor="lead-contact" className="field-label mb-2">{formConfig.fields.contact.label}</label>
            <input
              id="lead-contact"
              name="contact"
              type="text"
              required
              minLength={formLimits.contact.min}
              maxLength={formLimits.contact.max}
              autoComplete="tel"
              placeholder={formConfig.fields.contact.placeholder}
              data-preview-target="form-contact-placeholder"
              value={formData.contact}
              onChange={(event) => updateField('contact', event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.contact)}
              aria-describedby={getDescriptionIds('contact', Boolean(fieldErrors.contact))}
              className={`ui-field${fieldErrors.contact ? ' ui-field--invalid' : ''}`}
            />
            <p id="lead-contact-hint" className="form-field-hint">{formConfig.fields.contact.hint}</p>
            {fieldErrors.contact && <p id="lead-contact-error" className="form-field-error">{fieldErrors.contact}</p>}
          </div>

          <div>
            <label htmlFor="lead-message" className="field-label mb-2">{formConfig.fields.message.label}</label>
            <textarea
              id="lead-message"
              name="message"
              rows="4"
              required
              minLength={formLimits.message.min}
              maxLength={formLimits.message.max}
              placeholder={formConfig.fields.message.placeholder}
              data-preview-target="form-message-placeholder"
              value={formData.message}
              onChange={(event) => updateField('message', event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={getDescriptionIds('message', Boolean(fieldErrors.message))}
              className={`ui-field resize-none${fieldErrors.message ? ' ui-field--invalid' : ''}`}
            />
            <p id="lead-message-hint" className="form-field-hint">{formConfig.fields.message.hint}</p>
            {fieldErrors.message && <p id="lead-message-error" className="form-field-error">{fieldErrors.message}</p>}
          </div>

          <div aria-hidden="true">
            <input
              type="text"
              name="website"
              hidden
              tabIndex="-1"
              aria-hidden="true"
              autoComplete="off"
              value={formData.website}
              onChange={(event) => updateField('website', event.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className={`form-consent flex items-start gap-3 pt-2${fieldErrors.consent ? ' form-consent--invalid' : ''}`}>
            <input
              id="lead-consent"
              name="consent"
              type="checkbox"
              required
              checked={isAgreed}
              onChange={handleConsentChange}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.consent)}
              aria-describedby={fieldErrors.consent ? 'lead-consent-error' : undefined}
            />
            <div>
              <label htmlFor="lead-consent" className="text-xs font-sans text-stone-400 leading-relaxed">
                {formConfig.legalPrefix}<a data-preview-target="form-policy-link" href={config.legal.privacyPolicyLink} target="_blank" rel="noreferrer" className="ui-text-link text-[#C9A84C] underline underline-offset-2">
                  {formConfig.legalLinkLabel}
                </a>{formConfig.legalSuffix}
              </label>
              {fieldErrors.consent && <p id="lead-consent-error" className="form-field-error mt-2">{fieldErrors.consent}</p>}
            </div>
          </div>

          <div className="pt-2">
            <button
              data-preview-target="form-submit"
              type="submit"
              disabled={isSubmitting}
              className="ui-button ui-button--primary w-full btn-magnetic"
            >
              {isSubmitting ? formConfig.submittingLabel : formConfig.submitLabel}
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          {formStatus !== 'idle' && (
            <div
              ref={statusRef}
              tabIndex="-1"
              role={formStatus === 'error' || formStatus === 'unavailable' ? 'alert' : 'status'}
              aria-live={formStatus === 'error' || formStatus === 'unavailable' ? 'assertive' : 'polite'}
              className={`form-status form-status--${formStatus}`}
            >
              <p>{statusMessage}</p>
              {showTelegramAction && formConfig.telegramActionVisible !== false && (
                <a
                  data-preview-target="form-telegram-action"
                  href={formConfig.telegramTarget ?? config.links.telegramPrimary ?? config.links.telegramBot}
                  target="_blank"
                  rel="noreferrer"
                  className="ui-button ui-button--secondary mt-4"
                >
                  {formConfig.telegramLabel}
                </a>
              )}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
