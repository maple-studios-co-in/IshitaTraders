"use client";

import { LoaderCircle, Plus, X } from "lucide-react";
import { startTransition, useActionState, useId, useRef } from "react";

import { Button } from "@/admin/components/ui/button";
import { Field, FormGrid, Input, Select, Textarea } from "@/admin/components/ui/form-controls";
import { useActionToast } from "@/admin/components/ui/toaster";
import { messageChannelLabels, messageChannels } from "@/admin/content/types";
import { idleState, type ActionState } from "@/admin/lib/action-state";

import { logConversation } from "./actions";

/** "2026-10-05T21:30" for a datetime-local input, in India time whatever the browser's zone. */
function nowInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * "Log a conversation" button + dialog: records a phone call, walk-in or chat that happened
 * outside the website. Submitted with `onSubmit` (not `action`) so React keeps what was typed
 * when validation fails.
 */
export function LogConversation({ products }: { products: { id: string; name: string }[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const id = useId();
  const [state, dispatch, pending] = useActionState(async (previous: ActionState, formData: FormData) => {
    const result = await logConversation(previous, formData);
    if (result.status === "success") {
      form.current?.reset();
      dialog.current?.close();
    }
    return result;
  }, idleState);
  useActionToast(state);
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const field = (name: string) => ({ id: `${id}-${name}`, name, "aria-invalid": errors[name] ? true : undefined });

  const open = () => {
    const when = form.current?.elements.namedItem("occurredAt");
    if (when instanceof HTMLInputElement && !when.value) when.value = nowInIndia();
    dialog.current?.showModal();
  };

  return (
    <>
      <Button onClick={open}>
        <Plus aria-hidden="true" /> Log a conversation
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby={`${id}-title`}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(680px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 p-0 shadow-2xl backdrop:bg-navy-950/45 backdrop:backdrop-blur-[2px]"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
      >
        <form
          ref={form}
          className="flex flex-col gap-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(() => dispatch(formData));
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id={`${id}-title`} className="font-display text-lg font-bold text-navy-950">
                Log a conversation
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Record a phone call, shop visit or chat that happened outside the website, so the whole team sees the
                history.
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => dialog.current?.close()}>
              <X />
            </Button>
          </div>

          {state.status === "error" && !state.fieldErrors ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </p>
          ) : null}

          <FormGrid>
            <Field label="Channel" htmlFor={`${id}-channel`} error={errors.channel} required>
              <Select {...field("channel")} defaultValue="call" required>
                {messageChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {messageChannelLabels[channel]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Direction" htmlFor={`${id}-direction`} error={errors.direction} required>
              <Select {...field("direction")} defaultValue="inbound" required>
                <option value="inbound">Customer contacted us</option>
                <option value="outbound">We contacted the customer</option>
              </Select>
            </Field>
            <Field label="Contact name" htmlFor={`${id}-contactName`} error={errors.contactName}>
              <Input {...field("contactName")} maxLength={160} autoComplete="off" />
            </Field>
            <Field
              label="Phone"
              htmlFor={`${id}-contactPhone`}
              error={errors.contactPhone}
              hint="10-digit Indian numbers get +91 automatically."
            >
              <Input {...field("contactPhone")} type="tel" inputMode="tel" maxLength={30} autoComplete="off" />
            </Field>
            <Field label="Email" htmlFor={`${id}-contactEmail`} error={errors.contactEmail}>
              <Input {...field("contactEmail")} type="email" maxLength={254} autoComplete="off" />
            </Field>
            <Field
              label="When"
              htmlFor={`${id}-occurredAt`}
              error={errors.occurredAt}
              hint="India time (IST)."
              required
            >
              <Input {...field("occurredAt")} type="datetime-local" required />
            </Field>
          </FormGrid>
          <Field label="Subject" htmlFor={`${id}-subject`} error={errors.subject}>
            <Input {...field("subject")} maxLength={300} placeholder="e.g. 5 kW rooftop solar quotation" />
          </Field>
          <Field label="What was discussed" htmlFor={`${id}-body`} error={errors.body} required>
            <Textarea
              {...field("body")}
              rows={5}
              maxLength={10_000}
              required
              placeholder="Requirement, quantities, prices quoted, next step…"
            />
          </Field>
          <Field
            label="Product"
            htmlFor={`${id}-productId`}
            error={errors.productId}
            hint="Optional: link the product they asked about."
          >
            <Select {...field("productId")} defaultValue="">
              <option value="">No product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="secondary" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
              {pending ? "Saving…" : "Save conversation"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
