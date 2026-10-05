/** Result of an admin Server Action, consumed with `useActionState` (client-safe). */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; at: number; data?: Record<string, unknown> }
  | { status: "error"; message: string; at: number; fieldErrors?: Record<string, string> };

export const idleState: ActionState = { status: "idle" };

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
