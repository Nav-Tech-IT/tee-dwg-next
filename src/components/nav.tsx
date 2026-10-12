import Link from "next/link";

export function Nav({ active }: { active: "projects" | "library" }) {
  const item = (href: string, label: string, on: boolean) => (
    <Link href={href} className={`px-3 py-1.5 rounded-md text-sm ${on ? "bg-fg text-bg" : "hover:bg-panel2"}`}>{label}</Link>
  );
  return (
    <header className="border-b border-rule bg-panel">
      <div className="mx-auto w-full max-w-6xl px-4 py-2.5 flex items-center gap-4">
        <Link href="/" className="font-display text-xl font-bold tracking-wide">TSG Panel Studio</Link>
        <nav className="flex gap-1">
          {item("/", "Projects", active === "projects")}
          {item("/library", "Component library", active === "library")}
        </nav>
      </div>
    </header>
  );
}
