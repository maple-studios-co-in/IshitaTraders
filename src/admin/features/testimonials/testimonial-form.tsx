"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { Field, FormGrid, Input, Select, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import type { ImageRef } from "@/admin/content/images";
import { testimonialBadges, testimonialBadgeLabels, type TestimonialBadge } from "@/admin/content/types";
import { ImageField } from "@/admin/features/media/image-field";
import { cn } from "@/lib/cn";

import { saveTestimonial } from "./actions";

export interface TestimonialValues {
  id: string;
  name: string;
  location: string;
  quote: string;
  rating: number;
  badgeKind: TestimonialBadge;
  badgeLabel: string;
  avatar: ImageRef | null;
  isPublished: boolean;
  isSample: boolean;
}

export function TestimonialForm({ testimonial }: { testimonial?: TestimonialValues }) {
  const [formKey, setFormKey] = useState(0);
  const [rating, setRating] = useState(testimonial?.rating ?? 5);
  const [quote, setQuote] = useState(testimonial?.quote ?? "");
  const { pending, onSubmit, errors } = useFormAction(saveTestimonial, {
    onSuccess: () => {
      if (testimonial) return;
      setRating(5);
      setQuote("");
      setFormKey((key) => key + 1);
    },
  });
  const prefix = testimonial ? `t-${testimonial.id}` : "t-new";

  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4">
      {testimonial ? <input type="hidden" name="id" value={testimonial.id} /> : null}
      <FormGrid>
        <Field label="Customer name" htmlFor={`${prefix}-name`} error={errors.name} required>
          <Input id={`${prefix}-name`} name="name" defaultValue={testimonial?.name} maxLength={80} required />
        </Field>
        <Field
          label="Location / role"
          htmlFor={`${prefix}-location`}
          error={errors.location}
          hint="e.g. “Homeowner, Chakia”."
        >
          <Input id={`${prefix}-location`} name="location" defaultValue={testimonial?.location} maxLength={80} />
        </Field>
      </FormGrid>
      <Field label="Review" htmlFor={`${prefix}-quote`} error={errors.quote} required aside={`${quote.length}/600`}>
        <Textarea
          id={`${prefix}-quote`}
          name="quote"
          rows={4}
          value={quote}
          onChange={(event) => setQuote(event.target.value)}
          maxLength={600}
        />
      </Field>
      <FormGrid>
        <Field label="Rating" error={errors.rating}>
          <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} star${value === 1 ? "" : "s"}`}
                onClick={() => setRating(value)}
                className="rounded p-0.5 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <Star className={cn("size-6", value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300")} />
              </button>
            ))}
            <input type="hidden" name="rating" value={rating} />
          </div>
        </Field>
        <Field label="Badge" htmlFor={`${prefix}-badge`} error={errors.badgeKind}>
          <div className="grid grid-cols-[1fr_1.2fr] gap-2">
            <Select
              id={`${prefix}-badge`}
              name="badgeKind"
              defaultValue={testimonial?.badgeKind ?? "installation"}
              aria-label="Badge colour"
            >
              {testimonialBadges.map((badge) => (
                <option key={badge} value={badge}>
                  {testimonialBadgeLabels[badge]}
                </option>
              ))}
            </Select>
            <Input
              name="badgeLabel"
              defaultValue={testimonial?.badgeLabel}
              maxLength={40}
              placeholder="e.g. 5kW Rooftop Solar"
              aria-label="Badge text"
            />
          </div>
        </Field>
      </FormGrid>
      <ImageField
        name="avatar"
        label="Photo"
        defaultValue={testimonial?.avatar ?? null}
        aspect="1/1"
        error={errors.avatar}
        hint="Optional. Without a photo the card shows the customer’s initials."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-5">
          <Toggle
            id={`${prefix}-published`}
            name="isPublished"
            defaultChecked={testimonial?.isPublished ?? true}
            label="Published"
          />
          <Toggle
            id={`${prefix}-sample`}
            name="isSample"
            defaultChecked={testimonial?.isSample ?? false}
            label="Sample"
            description="Placeholder to replace."
          />
        </div>
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {testimonial ? "Save review" : "Add review"}
        </SubmitButton>
      </div>
    </form>
  );
}
