'use client';

import { useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Search, User } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { href: "/feed", icon: Home, label: "Feed" },
  { href: "/explore", icon: Search, label: "Explore" },
  { href: "/post", icon: Plus, label: "Post" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const isHome = pathname === "/";
  const isMap = pathname === "/map";
  const hasLandingShadow = isHome || isMap;
  const visibleTabs = isHome
    ? tabs.filter((tab) => tab.href !== "/feed" && tab.href !== "/explore")
    : tabs;

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
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 pb-2 safe-area-top">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className={`rounded-2xl border border-white/50 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-4 ${
            hasLandingShadow ? "shadow-[0_30px_70px_-30px_rgba(15,20,35,0.6)]" : "shadow-none"
          }`}
          style={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2 self-center sm:self-auto">
              <span className="text-xl font-semibold lowercase tracking-tight text-[#1d2742] sm:text-2xl">
                spots
              </span>
            </Link>
            <div className="flex items-center justify-center gap-2 sm:justify-end sm:gap-3">
              {visibleTabs.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d2742]/40 sm:h-10 sm:w-10 ${
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
