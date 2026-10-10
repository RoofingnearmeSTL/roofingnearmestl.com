"use client";

import { usePathname } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";

export default function EstimateLink({ children, className }: { children: ReactNode; className?: string }) {
  const pathname = usePathname();
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const estimate = document.getElementById("estimate");
    if (!estimate) return;
    event.preventDefault();
    estimate.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", "#estimate");
  }
  return <a href={pathname === "/" ? "#estimate" : "/#estimate"} onClick={handleClick} className={className}>{children}</a>;
}
