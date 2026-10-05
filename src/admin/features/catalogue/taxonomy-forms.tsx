"use client";

import { useState } from "react";

import { Field, FormGrid, Input, Textarea, Toggle } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useFormAction } from "@/admin/components/ui/use-form-action";
import type { ImageRef } from "@/admin/content/images";
import { ImageField } from "@/admin/features/media/image-field";
import { slugify } from "@/admin/lib/slug";

import { saveBrand, saveCategory } from "./actions";

function useSlugFromName(initialName: string, initialSlug: string, locked: boolean) {
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [edited, setEdited] = useState(locked);
  return {
    name,
    slug,
    onName: (value: string) => {
      setName(value);
      if (!edited) setSlug(slugify(value, 60));
    },
    onSlug: (value: string) => {
      setEdited(true);
      setSlug(slugify(value, 60));
    },
    reset: () => {
      setName("");
      setSlug("");
      setEdited(false);
    },
  };
}

interface BrandValues {
  id: string;
  name: string;
  slug: string;
  tabLabel: string;
  logo: ImageRef | null;
  isActive: boolean;
}

export function BrandForm({ brand }: { brand?: BrandValues }) {
  const [formKey, setFormKey] = useState(0);
  const names = useSlugFromName(brand?.name ?? "", brand?.slug ?? "", Boolean(brand));
  const { pending, onSubmit, errors } = useFormAction(saveBrand, {
    onSuccess: () => {
      if (brand) return;
      names.reset();
      setFormKey((key) => key + 1);
    },
  });
  const prefix = brand ? `brand-${brand.id}` : "brand-new";
  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4">
      {brand ? <input type="hidden" name="id" value={brand.id} /> : null}
      <FormGrid>
        <Field label="Brand name" htmlFor={`${prefix}-name`} error={errors.name} required>
          <Input
            id={`${prefix}-name`}
            name="name"
            value={names.name}
            onChange={(event) => names.onName(event.target.value)}
            maxLength={60}
            required
          />
        </Field>
        <Field
          label="Web address"
          htmlFor={`${prefix}-slug`}
          error={errors.slug}
          required
          hint={`/products?brand=${names.slug || "…"}`}
        >
          <Input
            id={`${prefix}-slug`}
            name="slug"
            value={names.slug}
            onChange={(event) => names.onSlug(event.target.value)}
            maxLength={60}
            required
            className="font-mono"
          />
        </Field>
      </FormGrid>
      <Field
        label="Catalogue tab label"
        htmlFor={`${prefix}-tab`}
        error={errors.tabLabel}
        hint="The filter tab on the products page, e.g. “EXIDE Catalogue”. Empty = “<name> Catalogue”."
      >
        <Input id={`${prefix}-tab`} name="tabLabel" defaultValue={brand?.tabLabel} maxLength={40} />
      </Field>
      <ImageField name="logo" label="Logo" defaultValue={brand?.logo ?? null} aspect="3/1" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle
          id={`${prefix}-active`}
          name="isActive"
          defaultChecked={brand?.isActive ?? true}
          label="Active"
          description="Inactive brands get no catalogue tab."
        />
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {brand ? "Save brand" : "Add brand"}
        </SubmitButton>
      </div>
    </form>
  );
}

interface CategoryValues {
  id: string;
  name: string;
  slug: string;
  label: string;
  description: string;
  image: ImageRef | null;
  enquirySubject: string;
  showOnHomepage: boolean;
}

export function CategoryForm({ category }: { category?: CategoryValues }) {
  const [formKey, setFormKey] = useState(0);
  const names = useSlugFromName(category?.name ?? "", category?.slug ?? "", Boolean(category));
  const { pending, onSubmit, errors } = useFormAction(saveCategory, {
    onSuccess: () => {
      if (category) return;
      names.reset();
      setFormKey((key) => key + 1);
    },
  });
  const prefix = category ? `category-${category.id}` : "category-new";
  return (
    <form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-4">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <FormGrid>
        <Field label="Category name" htmlFor={`${prefix}-name`} error={errors.name} required>
          <Input
            id={`${prefix}-name`}
            name="name"
            value={names.name}
            onChange={(event) => names.onName(event.target.value)}
            maxLength={60}
            required
          />
        </Field>
        <Field label="Web address" htmlFor={`${prefix}-slug`} error={errors.slug} required>
          <Input
            id={`${prefix}-slug`}
            name="slug"
            value={names.slug}
            onChange={(event) => names.onSlug(event.target.value)}
            maxLength={60}
            required
            className="font-mono"
          />
        </Field>
        <Field
          label="Card label"
          htmlFor={`${prefix}-label`}
          error={errors.label}
          hint="Small line on the homepage card, e.g. “Rooftop & Project”."
        >
          <Input id={`${prefix}-label`} name="label" defaultValue={category?.label} maxLength={40} />
        </Field>
        <Field
          label="WhatsApp enquiry subject"
          htmlFor={`${prefix}-subject`}
          error={errors.enquirySubject}
          hint="Fills “…price and availability for ___.”"
        >
          <Input
            id={`${prefix}-subject`}
            name="enquirySubject"
            defaultValue={category?.enquirySubject}
            maxLength={80}
          />
        </Field>
      </FormGrid>
      <Field label="Description" htmlFor={`${prefix}-description`} error={errors.description}>
        <Textarea
          id={`${prefix}-description`}
          name="description"
          rows={3}
          defaultValue={category?.description}
          maxLength={400}
        />
      </Field>
      <ImageField name="image" label="Card image" defaultValue={category?.image ?? null} aspect="4/3" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle
          id={`${prefix}-home`}
          name="showOnHomepage"
          defaultChecked={category?.showOnHomepage ?? true}
          label="Show on homepage"
          description="In the “What We Provide” section."
        />
        <SubmitButton pending={pending} pendingLabel="Saving…">
          {category ? "Save category" : "Add category"}
        </SubmitButton>
      </div>
    </form>
  );
}
