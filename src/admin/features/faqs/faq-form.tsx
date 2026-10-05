"use client";

import { useRef, useState } from "react";

import { Field, Input, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";

import { saveFaq } from "./actions";

interface FaqFormProps {
  faq?: { id: string; question: string; answer: string; isPublished: boolean };
  onSaved?: () => void;
}

export function FaqForm({ faq, onSaved }: FaqFormProps) {
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const form = useRef<HTMLFormElement>(null);
  const { pending, onSubmit, errors } = useFormAction(saveFaq, {
    onSuccess: () => {
      if (!faq) {
        form.current?.reset();
        setAnswer("");
      }
      onSaved?.();
    },
  });
  const prefix = faq ? `faq-${faq.id}` : "faq-new";

  return (
    <form ref={form} onSubmit={onSubmit} className="flex flex-col gap-4">
      {faq ? <input type="hidden" name="id" value={faq.id} /> : null}
      <Field label="Question" htmlFor={`${prefix}-question`} error={errors.question} required>
        <Input
          id={`${prefix}-question`}
          name="question"
          defaultValue={faq?.question}
          maxLength={240}
          required
          aria-invalid={!!errors.question || undefined}
        />
      </Field>
      <Field
        label="Answer"
        htmlFor={`${prefix}-answer`}
        error={errors.answer}
        hint="Optional. With an answer the question expands on the website and appears as an FAQ rich result in Google; without one it opens WhatsApp."
        aside={`${answer.length}/2000`}
      >
        <Textarea
          id={`${prefix}-answer`}
          name="answer"
          rows={4}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          maxLength={2000}
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle
          id={`${prefix}-published`}
          name="isPublished"
          defaultChecked={faq?.isPublished ?? true}
          label="Published"
          description="Show this question on the website."
        />
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {faq ? "Save changes" : "Add FAQ"}
        </SubmitButton>
      </div>
    </form>
  );
}
