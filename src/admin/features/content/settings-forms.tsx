"use client";

import { ExternalLink, Mail, MessageCircle, Phone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";

import { Button } from "@/admin/components/ui/button";
import { ConfirmAction } from "@/admin/components/ui/confirm-action";
import { controlClass, Field, FormGrid, Input, Select, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { SearchPreview } from "@/admin/components/ui/search-preview";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { TagsInput } from "@/admin/components/ui/tags-input";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import { useUnsavedChanges } from "@/admin/components/ui/use-unsaved-changes";
import type { SettingsKey, SiteSettings } from "@/admin/content/settings-schema";
import { ImageField } from "@/admin/features/media/image-field";
import { cn } from "@/lib/cn";

import { resetSettings, saveSettings } from "./actions";

/* ---------------------------------------------------------------- wrapper */

const ErrorsContext = createContext<{ errors: Record<string, string>; markDirty: () => void }>({
  errors: {},
  markDirty: () => {},
});
const useSettingsForm = () => useContext(ErrorsContext);

function SettingsForm({
  section,
  json = [],
  bools = [],
  isCustomised,
  children,
}: {
  section: SettingsKey;
  json?: string[];
  bools?: string[];
  /** Whether the section has been edited before (enables "Reset"). */
  isCustomised: boolean;
  children: ReactNode;
}) {
  const [dirty, setDirty] = useState(false);
  const { pending, onSubmit, errors } = useFormAction(saveSettings, { onSuccess: () => setDirty(false) });
  useUnsavedChanges(dirty);
  const markDirty = () => setDirty(true);

  return (
    <ErrorsContext.Provider value={{ errors, markDirty }}>
      <form onSubmit={onSubmit} onChange={markDirty} className="flex flex-col gap-5" noValidate>
        <input type="hidden" name="__section" value={section} />
        <input type="hidden" name="__json" value={json.join(",")} />
        <input type="hidden" name="__bool" value={bools.join(",")} />
        {children}
        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center justify-end gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur">
          {dirty ? <span className="mr-auto text-xs font-semibold text-amber-700">Unsaved changes</span> : null}
          <SubmitButton pending={pending} pendingLabel="Saving…">
            Save changes
          </SubmitButton>
        </div>
      </form>
      {isCustomised ? (
        <div className="mt-3 flex justify-end">
          <ConfirmAction
            action={resetSettings}
            fields={{ section }}
            title="Reset to the original design?"
            description="Your changes to this section are removed and the website shows the values it was designed with. This is recorded in the activity log."
            confirmLabel="Reset section"
            variant="ghost"
          >
            <RotateCcw /> Reset to original
          </ConfirmAction>
        </div>
      ) : null}
    </ErrorsContext.Provider>
  );
}

/** A text input bound to a settings path, with its error. */
function TextField({
  name,
  label,
  defaultValue,
  hint,
  required,
  maxLength,
  type = "text",
  placeholder,
  multiline,
  rows = 3,
  className,
  mono,
}: {
  name: string;
  label: ReactNode;
  defaultValue: string | number;
  hint?: ReactNode;
  required?: boolean;
  maxLength?: number;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  mono?: boolean;
}) {
  const { errors } = useSettingsForm();
  const id = `s-${name.replace(/\./g, "-")}`;
  return (
    <Field label={label} htmlFor={id} hint={hint} error={errors[name]} required={required} className={className}>
      {multiline ? (
        <Textarea
          id={id}
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!errors[name] || undefined}
        />
      ) : (
        <Input
          id={id}
          name={name}
          type={type}
          defaultValue={defaultValue}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!errors[name] || undefined}
          className={mono ? "font-mono" : undefined}
        />
      )}
    </Field>
  );
}

/** An image setting: picks up its error and marks the form dirty when changed. */
function ImageSetting(props: Omit<Parameters<typeof ImageField>[0], "error" | "onChange">) {
  const { errors, markDirty } = useSettingsForm();
  return <ImageField {...props} error={errors[props.name]} onChange={markDirty} />;
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="border-t border-slate-100 pt-5 text-xs font-bold tracking-[0.12em] text-slate-500 uppercase first:border-0 first:pt-0">
      {children}
    </h3>
  );
}

/* --------------------------------------------------------------- sections */

export function BusinessForm({ values, isCustomised }: { values: SiteSettings["business"]; isCustomised: boolean }) {
  return (
    <SettingsForm section="business" isCustomised={isCustomised}>
      <FormGrid>
        <TextField name="name" label="Business name" defaultValue={values.name} required maxLength={80} />
        <TextField
          name="tagline"
          label="Tagline"
          defaultValue={values.tagline}
          maxLength={80}
          hint="Under the logo in the footer."
        />
        <TextField name="foundedYear" label="Established (year)" defaultValue={values.foundedYear} type="number" />
        <TextField
          name="businessHours"
          label="Opening hours"
          defaultValue={values.businessHours}
          maxLength={120}
          placeholder="Mon–Sat 9:30 am – 7:30 pm"
        />
      </FormGrid>
      <TextField
        name="footerBlurb"
        label="Footer description"
        defaultValue={values.footerBlurb}
        multiline
        maxLength={400}
      />
      <TextField name="copyright" label="Copyright line" defaultValue={values.copyright} maxLength={200} />
      <SubHeading>Director</SubHeading>
      <div className="grid gap-5 sm:grid-cols-[120px_1fr_1fr]">
        <TextField
          name="director.honorific"
          label="Title"
          defaultValue={values.director.honorific}
          maxLength={10}
          hint="e.g. Er., Mr., Dr."
        />
        <TextField name="director.name" label="Name" defaultValue={values.director.name} required maxLength={80} />
        <TextField name="director.title" label="Position" defaultValue={values.director.title} maxLength={120} />
      </div>
      <SubHeading>Address</SubHeading>
      <TextField
        name="address.display"
        label="Address as shown on the site"
        defaultValue={values.address.display}
        required
        maxLength={200}
      />
      <FormGrid className="lg:grid-cols-3">
        <TextField name="address.locality" label="Town" defaultValue={values.address.locality} maxLength={80} />
        <TextField name="address.district" label="District" defaultValue={values.address.district} maxLength={80} />
        <TextField name="address.region" label="State" defaultValue={values.address.region} maxLength={80} />
        <TextField name="address.postalCode" label="PIN code" defaultValue={values.address.postalCode} maxLength={12} />
        <TextField
          name="address.country"
          label="Country code"
          defaultValue={values.address.country}
          maxLength={2}
          hint="Two letters, e.g. IN."
        />
        <TextField
          name="mapUrl"
          label="Google Maps link"
          defaultValue={values.mapUrl}
          maxLength={500}
          placeholder="https://maps.app.goo.gl/…"
        />
      </FormGrid>
    </SettingsForm>
  );
}

export function ContactForm({ values, isCustomised }: { values: SiteSettings["contact"]; isCustomised: boolean }) {
  const whatsappTest = `https://wa.me/${values.whatsappNumber}?text=${encodeURIComponent(values.whatsappMessage)}`;
  return (
    <SettingsForm section="contact" isCustomised={isCustomised}>
      <FormGrid>
        <TextField
          name="phoneDisplay"
          label="Phone number (as shown)"
          defaultValue={values.phoneDisplay}
          required
          maxLength={30}
          placeholder="7352405030"
        />
        <TextField
          name="phoneE164"
          label="Phone number (for dialling)"
          defaultValue={values.phoneE164}
          required
          maxLength={20}
          mono
          hint="International format: +917352405030."
        />
        <TextField
          name="whatsappNumber"
          label="WhatsApp number"
          defaultValue={values.whatsappNumber}
          required
          maxLength={20}
          mono
          hint="Digits with country code: 917352405030."
        />
        <TextField
          name="email"
          label="Email address"
          defaultValue={values.email}
          required
          type="email"
          maxLength={254}
        />
      </FormGrid>
      <TextField
        name="whatsappMessage"
        label="Default WhatsApp message"
        defaultValue={values.whatsappMessage}
        multiline
        rows={2}
        maxLength={300}
        hint="Pre-filled when visitors tap a general WhatsApp button."
      />
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold">Test the saved values:</span>
        <a
          href={whatsappTest}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-leaf-700 hover:underline"
        >
          <MessageCircle className="size-3.5" aria-hidden="true" /> WhatsApp
        </a>
        <a
          href={`tel:${values.phoneE164}`}
          className="inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
        >
          <Phone className="size-3.5" aria-hidden="true" /> Call
        </a>
        <a
          href={`mailto:${values.email}`}
          className="inline-flex items-center gap-1 font-semibold text-navy-800 hover:underline"
        >
          <Mail className="size-3.5" aria-hidden="true" /> Email
        </a>
      </div>
    </SettingsForm>
  );
}

const socialFields = [
  { key: "facebook", label: "Facebook page", placeholder: "https://www.facebook.com/ishitatraders" },
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/ishitatraders" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://www.linkedin.com/company/…" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/…" },
  { key: "youtube", label: "YouTube channel", placeholder: "https://www.youtube.com/@…" },
] as const;

export function SocialForm({ values, isCustomised }: { values: SiteSettings["social"]; isCustomised: boolean }) {
  return (
    <SettingsForm section="social" isCustomised={isCustomised}>
      <p className="text-sm text-slate-600">
        Paste the full address of each profile. Linked profiles are also told to Google (structured data) so it can
        connect them to the business.
      </p>
      <FormGrid>
        {socialFields.map((field) => (
          <TextField
            key={field.key}
            name={field.key}
            label={field.label}
            defaultValue={values[field.key]}
            type="url"
            maxLength={500}
            placeholder={field.placeholder}
          />
        ))}
      </FormGrid>
    </SettingsForm>
  );
}

function LinesInput({
  name,
  defaultValue,
  max,
  placeholder,
}: {
  name: string;
  defaultValue: string[];
  max: number;
  placeholder: string;
}) {
  const { errors, markDirty } = useSettingsForm();
  const [lines, setLines] = useState(defaultValue.length ? defaultValue : [""]);
  const update = (next: string[]) => {
    setLines(next);
    markDirty();
  };
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={index} className="flex gap-2">
          <input
            value={line}
            maxLength={60}
            onChange={(event) => update(lines.map((item, i) => (i === index ? event.target.value : item)))}
            placeholder={placeholder}
            aria-label={`Line ${index + 1}`}
            className={cn(controlClass, "h-10")}
          />
          {lines.length > 1 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => update(lines.filter((_, i) => i !== index))}
              aria-label={`Remove line ${index + 1}`}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      ))}
      {lines.length < max ? (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => update([...lines, ""])}>
          <Plus /> Add line
        </Button>
      ) : null}
      {errors[name] ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {errors[name]}
        </p>
      ) : null}
      <input type="hidden" name={name} value={JSON.stringify(lines.map((line) => line.trim()).filter(Boolean))} />
    </div>
  );
}

export function HeroForm({ values, isCustomised }: { values: SiteSettings["hero"]; isCustomised: boolean }) {
  return (
    <SettingsForm section="hero" json={["titleLines", "trustedBrands", "image"]} isCustomised={isCustomised}>
      <FormGrid>
        <TextField name="eyebrow" label="Small heading" defaultValue={values.eyebrow} maxLength={60} />
        <TextField name="established" label="Established badge" defaultValue={values.established} maxLength={40} />
      </FormGrid>
      <Field label="Headline" hint="Each line starts on a new line on large screens (max 3).">
        <LinesInput name="titleLines" defaultValue={values.titleLines} max={3} placeholder="Reliable Power." />
      </Field>
      <TextField name="description" label="Description" defaultValue={values.description} multiline maxLength={400} />
      <ImageSetting
        name="image"
        label="Background image"
        defaultValue={values.image}
        required
        aspect="16/9"
        hint="A wide landscape photo (at least 1920 px wide) works best."
      />
      <FormGrid>
        <TextField
          name="trustedBrandsLabel"
          label="Brands label"
          defaultValue={values.trustedBrandsLabel}
          maxLength={40}
        />
        <Field label="Brands" hint="Press Enter after each.">
          <HeroBrands defaultValue={values.trustedBrands} />
        </Field>
        <TextField name="helpQuestion" label="Help question" defaultValue={values.helpQuestion} maxLength={120} />
        <TextField name="helpLabel" label="Help line text" defaultValue={values.helpLabel} maxLength={120} />
      </FormGrid>
    </SettingsForm>
  );
}

function HeroBrands({ defaultValue }: { defaultValue: string[] }) {
  const { markDirty } = useSettingsForm();
  return <TagsInput name="trustedBrands" defaultValue={defaultValue} max={8} maxLength={30} onChange={markDirty} />;
}

const toneSwatches = { navy: "bg-navy-900", leaf: "bg-leaf-600", brand: "bg-brand-600" } as const;

export function AnnouncementForm({
  values,
  isCustomised,
}: {
  values: SiteSettings["announcement"];
  isCustomised: boolean;
}) {
  const [preview, setPreview] = useState(values);
  return (
    <SettingsForm section="announcement" bools={["enabled"]} isCustomised={isCustomised}>
      <div
        onChange={(event) => {
          const form = (event.target as HTMLElement).closest("form");
          if (!form) return;
          const data = new FormData(form);
          setPreview({
            enabled: data.get("enabled") === "on",
            text: String(data.get("text") ?? ""),
            linkLabel: String(data.get("linkLabel") ?? ""),
            linkUrl: String(data.get("linkUrl") ?? ""),
            tone: (String(data.get("tone") ?? "navy") as SiteSettings["announcement"]["tone"]) || "navy",
          });
        }}
        className="flex flex-col gap-5"
      >
        <Toggle
          id="s-enabled"
          name="enabled"
          defaultChecked={values.enabled}
          label="Show the announcement bar"
          description="Appears above the header on every page."
        />
        <TextField
          name="text"
          label="Message"
          defaultValue={values.text}
          maxLength={180}
          placeholder="Festive offer: free installation on all solar systems till 31 October"
        />
        <FormGrid>
          <TextField
            name="linkLabel"
            label="Link text"
            defaultValue={values.linkLabel}
            maxLength={40}
            placeholder="Enquire now"
          />
          <TextField
            name="linkUrl"
            label="Link address"
            defaultValue={values.linkUrl}
            maxLength={500}
            placeholder="/products or #contact or https://…"
          />
        </FormGrid>
        <Field label="Colour" htmlFor="s-tone">
          <Select id="s-tone" name="tone" defaultValue={values.tone}>
            <option value="navy">Navy</option>
            <option value="leaf">Green</option>
            <option value="brand">Blue</option>
          </Select>
        </Field>
      </div>
      <div>
        <p className="mb-2 text-xs font-bold tracking-[0.12em] text-slate-400 uppercase">Preview</p>
        {preview.enabled && preview.text ? (
          <div className={cn("rounded-lg px-4 py-2 text-center text-sm text-white", toneSwatches[preview.tone])}>
            <span className="font-medium">{preview.text}</span>
            {preview.linkLabel && preview.linkUrl ? (
              <span className="ml-3 font-bold underline underline-offset-4">{preview.linkLabel} →</span>
            ) : null}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-center text-xs text-slate-500">
            Hidden — switch it on and write a message.
          </p>
        )}
      </div>
    </SettingsForm>
  );
}

function BadgesInput({ defaultValue }: { defaultValue: { title: string; subtitle: string }[] }) {
  const { markDirty } = useSettingsForm();
  const [badges, setBadges] = useState(defaultValue);
  const update = (next: typeof badges) => {
    setBadges(next);
    markDirty();
  };
  return (
    <div className="flex flex-col gap-2">
      {badges.map((badge, index) => (
        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            value={badge.title}
            maxLength={30}
            onChange={(event) =>
              update(badges.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)))
            }
            placeholder="100% OEM"
            aria-label={`Badge ${index + 1} title`}
            className={cn(controlClass, "h-9")}
          />
          <input
            value={badge.subtitle}
            maxLength={40}
            onChange={(event) =>
              update(badges.map((item, i) => (i === index ? { ...item, subtitle: event.target.value } : item)))
            }
            placeholder="Original Stock"
            aria-label={`Badge ${index + 1} subtitle`}
            className={cn(controlClass, "h-9")}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="self-center"
            onClick={() => update(badges.filter((_, i) => i !== index))}
            aria-label={`Remove badge ${index + 1}`}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {badges.length < 4 ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => update([...badges, { title: "", subtitle: "" }])}
        >
          <Plus /> Add badge
        </Button>
      ) : null}
      <input type="hidden" name="trustBadges" value={JSON.stringify(badges.filter((badge) => badge.title.trim()))} />
    </div>
  );
}

export function CatalogueForm({ values, isCustomised }: { values: SiteSettings["catalogue"]; isCustomised: boolean }) {
  return (
    <SettingsForm section="catalogue" json={["bannerImage", "trustBadges"]} isCustomised={isCustomised}>
      <ImageSetting
        name="bannerImage"
        label="Banner image"
        defaultValue={values.bannerImage}
        required
        aspect="1440/480"
        hint="The wide brand line-up at the top of the products page."
      />
      <FormGrid>
        <TextField name="ctaLabel" label="Product button text" defaultValue={values.ctaLabel} maxLength={40} />
        <TextField
          name="searchPlaceholder"
          label="Search box hint"
          defaultValue={values.searchPlaceholder}
          maxLength={80}
        />
      </FormGrid>
      <Field label="Trust badges" hint="Shown in each product’s details window (up to 4).">
        <BadgesInput defaultValue={values.trustBadges} />
      </Field>
      <SubHeading>Enquiry form in the details window</SubHeading>
      <TextField name="rfqTitle" label="Form heading" defaultValue={values.rfqTitle} maxLength={80} />
      <TextField name="rfqSubtitle" label="Form subheading" defaultValue={values.rfqSubtitle} maxLength={200} />
      <TextField name="datasheetNote" label="Datasheet note" defaultValue={values.datasheetNote} maxLength={80} />
    </SettingsForm>
  );
}

export function HomepageForm({ values, isCustomised }: { values: SiteSettings["homepage"]; isCustomised: boolean }) {
  return (
    <SettingsForm section="homepage" isCustomised={isCustomised}>
      <TextField
        name="solarTourVideoUrl"
        label="Solar tour video link"
        defaultValue={values.solarTourVideoUrl}
        type="url"
        maxLength={500}
        placeholder="https://www.youtube.com/watch?v=…"
        hint="A YouTube (or other) link opened by the play button in “From Sunlight to Electricity”. Empty hides the button."
      />
      {values.solarTourVideoUrl ? (
        <a
          href={values.solarTourVideoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
        >
          Open the current video <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      ) : null}
    </SettingsForm>
  );
}

export function NotificationsForm({
  values,
  isCustomised,
  emailConfigured,
}: {
  values: SiteSettings["notifications"];
  isCustomised: boolean;
  emailConfigured: boolean;
}) {
  return (
    <SettingsForm
      section="notifications"
      json={["enquiryEmails"]}
      bools={["messageEmails"]}
      isCustomised={isCustomised}
    >
      {!emailConfigured ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Email sending isn’t connected yet, so alerts are saved but not sent. Add a Resend API key (see Integrations)
          to switch them on. Enquiries are always stored here either way.
        </p>
      ) : null}
      <Field label="Send new enquiries to" hint="Up to 10 addresses. Press Enter after each.">
        <NotificationEmails defaultValue={values.enquiryEmails} />
      </Field>
      <Toggle
        id="s-messageEmails"
        name="messageEmails"
        defaultChecked={values.messageEmails}
        label="Also email new WhatsApp / SMS / email messages"
        description="Sent to the same addresses when the inbox receives a message."
      />
    </SettingsForm>
  );
}

function NotificationEmails({ defaultValue }: { defaultValue: string[] }) {
  const { errors, markDirty } = useSettingsForm();
  const error = errors.enquiryEmails ?? Object.entries(errors).find(([key]) => key.startsWith("enquiryEmails."))?.[1];
  return (
    <>
      <TagsInput
        name="enquiryEmails"
        defaultValue={defaultValue}
        max={10}
        maxLength={254}
        placeholder="name@example.com"
        invalid={!!error}
        onChange={markDirty}
      />
      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------------- SEO */

export function SeoForm({
  values,
  isCustomised,
  siteUrl,
}: {
  values: SiteSettings["seo"];
  isCustomised: boolean;
  siteUrl: string;
}) {
  const [title, setTitle] = useState(values.title);
  const [description, setDescription] = useState(values.description);
  return (
    <SettingsForm section="seo" json={["keywords", "ogImage"]} bools={["allowIndexing"]} isCustomised={isCustomised}>
      <SeoFields
        values={values}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
      />
      <SearchPreview title={title} description={description} url={siteUrl} />
    </SettingsForm>
  );
}

function SeoFields({
  values,
  title,
  setTitle,
  description,
  setDescription,
}: {
  values: SiteSettings["seo"];
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
}) {
  const { errors, markDirty } = useSettingsForm();
  const counter = (value: string, ideal: [number, number]) => (
    <span
      className={value.length < ideal[0] || value.length > ideal[1] ? "font-semibold text-amber-700" : "text-leaf-700"}
    >
      {value.length} chars · ideal {ideal[0]}–{ideal[1]}
    </span>
  );
  return (
    <>
      <Field label="Homepage title" htmlFor="s-title" error={errors.title} required aside={counter(title, [30, 60])}>
        <Input
          id="s-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={70}
          aria-invalid={!!errors.title || undefined}
        />
      </Field>
      <TextField
        name="titleTemplate"
        label="Title pattern for other pages"
        defaultValue={values.titleTemplate}
        maxLength={70}
        mono
        hint="%s is replaced by the page title, e.g. “Products | Ishita Traders”."
      />
      <Field
        label="Description"
        htmlFor="s-description"
        error={errors.description}
        required
        aside={counter(description, [120, 160])}
      >
        <Textarea
          id="s-description"
          name="description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={320}
          aria-invalid={!!errors.description || undefined}
        />
      </Field>
      <Field
        label="Keywords"
        hint="Search phrases customers use, e.g. “solar panels Chakia”. Press Enter after each."
        error={errors.keywords}
      >
        <TagsInput name="keywords" defaultValue={values.keywords} max={30} maxLength={60} onChange={markDirty} />
      </Field>
      <ImageSetting
        name="ogImage"
        label="Sharing image"
        defaultValue={values.ogImage}
        aspect="1200/630"
        hint="Shown when the site is shared on WhatsApp, Facebook or LinkedIn. 1200 × 630 px. Empty = the built-in image."
      />
      <Toggle
        id="s-allowIndexing"
        name="allowIndexing"
        defaultChecked={values.allowIndexing}
        label="Allow search engines to index the site"
        description="Switch off only for a private test copy — it removes the site from Google."
      />
      <SubHeading>Verification & analytics</SubHeading>
      <FormGrid>
        <TextField
          name="googleVerification"
          label="Google Search Console code"
          defaultValue={values.googleVerification}
          maxLength={120}
          mono
          hint="The content=“…” value of the HTML-tag method."
        />
        <TextField
          name="bingVerification"
          label="Bing Webmaster code"
          defaultValue={values.bingVerification}
          maxLength={120}
          mono
        />
        <TextField
          name="gaMeasurementId"
          label="Google Analytics 4 ID"
          defaultValue={values.gaMeasurementId}
          maxLength={20}
          mono
          placeholder="G-XXXXXXXXXX"
          hint="Adds GA4 tracking to every public page."
        />
      </FormGrid>
    </>
  );
}
