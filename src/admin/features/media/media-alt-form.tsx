"use client";

import { controlClass } from "@/admin/components/ui/form-controls";
import { SubmitButton } from "@/admin/components/ui/submit-button";
import { useWrappedAction } from "@/admin/components/ui/use-form-action";
import { cn } from "@/lib/cn";

import { saveMediaAlt } from "./actions";

/** Inline editor for a file's default description (used as alt text when it's picked). */
export function MediaAltForm({ id, alt }: { id: string; alt: string }) {
  const [, action] = useWrappedAction(saveMediaAlt);
  return (
    <form action={action} className="flex gap-1.5">
      <input type="hidden" name="id" value={id} />
      <label className="sr-only" htmlFor={`alt-${id}`}>
        Description
      </label>
      <input
        id={`alt-${id}`}
        name="alt"
        defaultValue={alt}
        maxLength={200}
        placeholder="Describe this file…"
        className={cn(controlClass, "h-8 text-xs")}
      />
      <SubmitButton size="sm" variant="secondary">
        Save
      </SubmitButton>
    </form>
  );
}
