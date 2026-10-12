import type { ProductStatus } from "@/library/schema";

const STYLE: Record<ProductStatus, string> = {
  verified: "bg-ok-soft text-ok",
  extracted: "bg-warn-soft text-warn",
  draft: "bg-panel2 text-muted",
};
const LABEL: Record<ProductStatus, string> = { verified: "Verified", extracted: "Extracted", draft: "Draft" };

export function StatusPill({ status }: { status: ProductStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STYLE[status]}`}>{LABEL[status]}</span>;
}

export const input = "w-full rounded-md border border-rule bg-panel px-2.5 py-1.5 text-sm";
export const label = "grid gap-1 text-[11px] uppercase tracking-wider text-muted font-mono";
export const btn = "rounded-md border border-rule bg-panel px-3 py-1.5 text-sm hover:bg-panel2 disabled:opacity-50";
export const btnPrimary = "rounded-md bg-accent text-white px-3 py-1.5 text-sm font-medium disabled:opacity-50";
