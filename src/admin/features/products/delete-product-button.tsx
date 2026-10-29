import { Trash2 } from "lucide-react";

import { ConfirmAction } from "@/admin/components/ui/confirm-action";

import { deleteProduct } from "./actions";

/**
 * Deletes a product after a confirmation. The action refreshes the website's catalogue, so the
 * product leaves the products page, the homepage and the sitemap at once and its own page answers
 * 404. `compact` is the icon button on a products-list row (the list stays open); the full button
 * sits on the edit page and returns to the list.
 */
export function DeleteProductButton({ id, name, compact = false }: { id: string; name: string; compact?: boolean }) {
  return (
    <ConfirmAction
      action={deleteProduct}
      fields={compact ? { id } : { id, redirectTo: "list" }}
      title="Delete this product?"
      description={
        <>
          “{name}” will be removed from the website immediately. Enquiries about it are kept. This can’t be undone —
          hide it instead if you might sell it again.
        </>
      }
      confirmLabel="Delete product"
      variant="danger-ghost"
      size={compact ? "icon-sm" : "md"}
      ariaLabel={compact ? `Delete ${name}` : undefined}
      tooltip={compact ? "Delete" : undefined}
    >
      <Trash2 aria-hidden="true" />
      {compact ? null : " Delete"}
    </ConfirmAction>
  );
}
