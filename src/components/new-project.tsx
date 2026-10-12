"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function NewProject() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [reference, setReference] = useState("");
  const [from, setFrom] = useState<"example" | "blank">("example");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, client, reference, from }) });
    if (!res.ok) {
      setBusy(false);
      setError("Could not create the project.");
      return;
    }
    const { id } = await res.json();
    router.push(`/projects/${id}`);
  }

  const field = "w-full rounded-md border border-rule bg-panel px-3 py-2 text-sm";
  return (
    <form onSubmit={create} className="rounded-md border border-rule bg-panel p-4 grid gap-3">
      <h2 className="font-display text-xl font-semibold tracking-wide">New project from an approved quotation</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-muted">Project name<input className={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pump station MCC" required /></label>
        <label className="grid gap-1 text-xs text-muted">Client<input className={field} value={client} onChange={(e) => setClient(e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-muted">Quotation / order ref.<input className={field} value={reference} onChange={(e) => setReference(e.target.value)} /></label>
      </div>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex gap-2 text-sm" role="radiogroup" aria-label="Start from">
          {(["example", "blank"] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={from === v} onClick={() => setFrom(v)}
              className={`rounded-md border px-3 py-1.5 ${from === v ? "bg-fg text-bg border-fg" : "border-rule bg-panel"}`}>
              {v === "example" ? "Start from the reference 4 feeders" : "Start with no feeders"}
            </button>
          ))}
        </div>
        <button disabled={busy} className="rounded-md bg-accent text-white px-4 py-2 font-medium disabled:opacity-60">{busy ? "Creating…" : "Create project"}</button>
      </div>
      {error && <p className="text-bad text-sm">{error}</p>}
    </form>
  );
}
