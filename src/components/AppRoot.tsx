"use client";

import NavBar from "@/components/NavBar";
import { MapTransitionProvider } from "@/components/MapTransitionProvider";

interface AppRootProps {
  children: React.ReactNode;
}

export default function AppRoot({ children }: AppRootProps) {
  return (
    <MapTransitionProvider>
      <div className="relative min-h-screen">
        <NavBar />
        <div className="pt-28 pb-12">{children}</div>
      </div>
    </MapTransitionProvider>
  );
}
