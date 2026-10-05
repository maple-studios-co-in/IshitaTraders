"use client";

import { BulkBar, SelectAll } from "@/admin/components/ui/bulk-bar";

import { bulkUpdateProducts } from "./actions";

export const BULK_FORM_ID = "bulk-products";

export function ProductsSelectAll() {
  return <SelectAll formId={BULK_FORM_ID} label="Select all products" />;
}

export function ProductsBulkBar() {
  return (
    <BulkBar
      formId={BULK_FORM_ID}
      action={bulkUpdateProducts}
      noun={["product", "products"]}
      operations={[
        { value: "publish", label: "Publish" },
        { value: "hide", label: "Hide from website" },
        { value: "feature", label: "Feature on homepage" },
        { value: "unfeature", label: "Remove from featured" },
        { value: "in_stock", label: "Mark in stock" },
        { value: "out_of_stock", label: "Mark out of stock" },
        { value: "delete", label: "Delete", destructive: true },
      ]}
    />
  );
}
