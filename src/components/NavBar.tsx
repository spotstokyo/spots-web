'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plus, User, Search } from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();
  const tabs = [
    { href: "/discover", icon: Search, label: "Discover" },
    { href: "/add-review", icon: Plus, label: "Add Review" },
    { href: "/profile", icon: User, label: "Profile" },
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl p-4 border bg-white/70 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
                <Compass className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Spots</h1>
            </div>
            <div className="flex gap-2">
              {tabs.map(({ href, icon: Icon, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`p-3 rounded-xl transition ${
                      active
                        ? "bg-white/70 text-slate-900 shadow-sm"
                        : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                    }`}
                    aria-label={label}
                  >
                    <Icon className="w-5 h-5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
