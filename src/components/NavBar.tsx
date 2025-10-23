'use client';

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { useIsAdmin } from "@/lib/use-is-admin";

const tabs = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/explore", icon: Search, label: "Explore" },
  { href: "/post", icon: Plus, label: "Post" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();
  const { isAdmin } = useIsAdmin();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const isHome = pathname === "/";
  const isMap = pathname === "/map";
  const hasLandingShadow = isHome || isMap;
  const baseTabs = isHome ? tabs.filter((tab) => tab.href !== "/feed" && tab.href !== "/explore") : tabs;
  const visibleTabs = isAdmin ? baseTabs : baseTabs.filter((tab) => tab.href !== "/post");

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width;
    const offsetY = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (offsetY - 0.5) * -1.5,
      y: (offsetX - 0.5) * 1.5,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <nav className="pointer-events-none fixed left-0 right-0 z-50 px-4 pb-2 safe-area-top nav-position-offset">
      <div className="pointer-events-auto mx-auto max-w-6xl">
        <motion.div
          className={`pointer-events-auto rounded-2xl border border-white/50 bg-white/70 px-5 py-4 backdrop-blur-xl ${
            hasLandingShadow ? "shadow-[0_30px_70px_-30px_rgba(15,20,35,0.6)]" : "shadow-none"
          }`}
          style={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          onMouseMove={isHome ? undefined : handleMouseMove}
          onMouseLeave={isHome ? undefined : handleMouseLeave}
        >
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-semibold lowercase tracking-tight text-[#1d2742]">
                spots
              </span>
            </Link>
            <div className="flex items-center gap-3">
              {visibleTabs.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    className={`group relative flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2742]/40 ${
                      active
                        ? "text-[#1d2742] drop-shadow-[0_12px_24px_-18px_rgba(23,32,54,0.35)]"
                        : "text-[#4c5a7a] hover:scale-[1.05] hover:text-[#1d2742]"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </nav>
  );
}
