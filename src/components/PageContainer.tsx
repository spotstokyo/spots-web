import type { ReactNode } from "react";

const sizeClassMap = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
} as const;

interface PageContainerProps {
  children: ReactNode;
  size?: keyof typeof sizeClassMap;
  centerY?: boolean;
  className?: string;
}

export default function PageContainer({
  children,
  size = "lg",
  centerY = false,
  className = "",
}: PageContainerProps) {
  const sizeClass = sizeClassMap[size];
  const baseClasses = [
    "mx-auto",
    "w-full",
    "px-4",
    "sm:px-6",
    "lg:px-8",
    sizeClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (centerY) {
    return (
      <main className={`${baseClasses} flex min-h-[calc(100vh-6rem)] items-center justify-center`}>
        <div className="w-full">{children}</div>
      </main>
    );
  }

  return <main className={baseClasses}>{children}</main>;
}
