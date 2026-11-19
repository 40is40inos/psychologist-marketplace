"use client";

import { useActionState } from "react";
import { sendContact, type ContactState } from "@/actions/contact";
import { CONTACT_TOPICS } from "@/domain/contact";
import type { Dictionary } from "@/i18n/get-dictionary";
import { Field, FormAlert, inputClass, textareaClass } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

export function ContactForm({ t }: { t: Dictionary["contactPage"] }) {
  const [state, action] = useActionState<ContactState, FormData>(sendContact, {});

  if (state.ok) {
    return <FormAlert tone="success">{t.sent}</FormAlert>;
  }

  return (
    <form action={action} className="space-y-5">
      {state.error && <FormAlert>{t.errors[state.error]}</FormAlert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="contact-name" label={t.name}>
          <input id="contact-name" name="name" required maxLength={100} autoComplete="name" className={inputClass} />
        </Field>
        <Field id="contact-email" label={t.email}>
          <input id="contact-email" name="email" type="email" required maxLength={254} autoComplete="email" className={inputClass} />
        </Field>
      </div>
      <Field id="contact-topic" label={t.topic}>
        <select id="contact-topic" name="topic" defaultValue="general" className={inputClass}>
          {CONTACT_TOPICS.map((k) => <option key={k} value={k}>{t.topics[k]}</option>)}
        </select>
      </Field>
      <Field id="contact-message" label={t.message} hint={t.noHealth}>
        <textarea id="contact-message" name="message" required minLength={5} maxLength={4000} rows={6} aria-describedby="contact-message-hint" className={textareaClass} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton>{t.send}</SubmitButton>
    </form>
  );
}
