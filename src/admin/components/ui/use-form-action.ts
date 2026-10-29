"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";

import { idleState, type ActionState, type FormAction } from "@/admin/lib/action-state";

import { notifyResult } from "./toaster";

type SuccessState = Extract<ActionState, { status: "success" }>;

interface FormActionOptions {
  /** Runs inside the action's transition, so state updates and navigation here are safe. */
  onSuccess?: (state: SuccessState, formData: FormData) => void;
  /** Runs after every result, success or not (after `onSuccess`). */
  onSettled?: (state: ActionState) => void;
}

/**
 * Fired on a form (via useFormAction) once its save has finished; `detail` is the result status.
 * The unsaved-changes dialog listens for it to continue after "Save changes".
 */
export const FORM_SETTLED_EVENT = "admin:form-settled";

/**
 * Wraps a Server Action for a client form: toasts the result, runs `onSuccess`, and exposes field
 * errors. A redirecting action never returns a state, so the previous one is kept.
 */
export function useWrappedAction(action: FormAction, options: FormActionOptions = {}) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  return useActionState(async (previous: ActionState, formData: FormData) => {
    const next = await action(previous, formData);
    if (!next) return previous;
    notifyResult(next);
    if (next.status === "success") optionsRef.current.onSuccess?.(next, formData);
    optionsRef.current.onSettled?.(next);
    return next;
  }, idleState);
}

/**
 * Runs a Server Action from a form's submit event instead of `<form action>`, because React resets
 * uncontrolled fields after every form action — including when the server rejects the input, which
 * would wipe what the user typed.
 */
export function useFormAction(action: FormAction, options: FormActionOptions = {}) {
  const submitted = useRef<HTMLFormElement | null>(null);
  const [state, dispatch, pending] = useWrappedAction(action, {
    ...options,
    onSettled: (result) => {
      options.onSettled?.(result);
      submitted.current?.dispatchEvent(new CustomEvent(FORM_SETTLED_EVENT, { detail: result.status }));
    },
  });

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitted.current = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(
      event.currentTarget,
      submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : null,
    );
    startTransition(() => dispatch(formData));
  };

  const errors: Record<string, string> = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  return { state, pending, onSubmit, errors };
}
