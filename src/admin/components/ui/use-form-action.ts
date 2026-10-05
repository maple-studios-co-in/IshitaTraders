"use client";

import { startTransition, useActionState, useEffect, useRef, type FormEvent } from "react";

import { idleState, type ActionState, type FormAction } from "@/admin/lib/action-state";

import { notifyResult } from "./toaster";

type SuccessState = Extract<ActionState, { status: "success" }>;

interface FormActionOptions {
  /** Runs inside the action's transition, so state updates and navigation here are safe. */
  onSuccess?: (state: SuccessState, formData: FormData) => void;
}

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
    return next;
  }, idleState);
}

/**
 * Runs a Server Action from a form's submit event instead of `<form action>`, because React resets
 * uncontrolled fields after every form action — including when the server rejects the input, which
 * would wipe what the user typed.
 */
export function useFormAction(action: FormAction, options: FormActionOptions = {}) {
  const [state, dispatch, pending] = useWrappedAction(action, options);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
