import Link from "next/link";

const tabs = [
  { href: "/", label: "Home", match: (p: string) => p === "/" },
  { href: "/manufacturers", label: "Makers", match: (p: string) => p.startsWith("/manufacturers") },
  { href: "/sell", label: "Sell", match: (p: string) =>
    p.startsWith("/sell") || p.startsWith("/clients") || p.startsWith("/quotes") },
  { href: "/invoices/new", label: "Scan", match: (p: string) => p.startsWith("/invoices") },
  { href: "/products", label: "Products", match: (p: string) => p.startsWith("/products") },
];

export function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex h-14 items-center justify-center text-xs font-medium ${
                  active ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
