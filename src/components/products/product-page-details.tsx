"use client";

import { useMemo } from "react";

import { contactLinks } from "@/admin/content/links";

import { ProductDetails } from "./product-dialog";
import type { CatalogueContact, CatalogueCopy, CatalogueProduct } from "./types";

/** The popup's product details laid out as a page (links are built here because functions can't cross from the server). */
export function ProductPageDetails({
  product,
  copy,
  contact,
}: {
  product: CatalogueProduct;
  copy: Omit<CatalogueCopy, "bannerImage">;
  contact: CatalogueContact;
}) {
  const links = useMemo(() => contactLinks(contact), [contact]);
  return <ProductDetails product={product} copy={copy} contact={contact} links={links} />;
}
