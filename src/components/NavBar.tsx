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

  const handleMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width;
    const offsetY = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (offsetY - 0.5) * -6,
      y: (offsetX - 0.5) * 6,
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          className="rounded-3xl border border-white/50 bg-white/50 px-5 py-4 shadow-[0_25px_60px_-45px_rgba(31,41,55,0.45)] backdrop-blur-xl"
          style={{ rotateX: tilt.x, rotateY: tilt.y }}
          transition={{ type: "spring", stiffness: 200, damping: 24 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center justify-between">
            <Link href="/feed" className="flex items-center gap-2">
              <span className="text-2xl font-semibold lowercase tracking-tight text-[#1d2742]">
                spots
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {tabs.map(({ href, icon: Icon, label }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-label={label}
                    className={`group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/60 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      active
                        ? "bg-white/80 text-[#1d2742] shadow-[0_22px_48px_-32px_rgba(31,41,55,0.35)]"
                        : "bg-white/40 text-[#4c5a7a] hover:scale-105 hover:text-[#1d2742]"
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
