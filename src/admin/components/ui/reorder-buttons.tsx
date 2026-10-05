import { ArrowDown, ArrowUp } from "lucide-react";

import { adminButton } from "./button";

/** Up/down controls for manually ordered lists (plain forms: work without JavaScript). */
export function ReorderButtons({
  action,
  id,
  isFirst,
  isLast,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  isFirst: boolean;
  isLast: boolean;
  label: string;
}) {
  return (
    <form action={action} className="flex items-center">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="direction"
        value="up"
        disabled={isFirst}
        className={adminButton({ variant: "ghost", size: "icon-sm" })}
        aria-label={`Move “${label}” up`}
        title="Move up"
      >
        <ArrowUp />
      </button>
      <button
        type="submit"
        name="direction"
        value="down"
        disabled={isLast}
        className={adminButton({ variant: "ghost", size: "icon-sm" })}
        aria-label={`Move “${label}” down`}
        title="Move down"
      >
        <ArrowDown />
      </button>
    </form>
  );
}
