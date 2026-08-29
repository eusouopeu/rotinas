import { useEffect, useState } from "react";

// Porta de DESKTOP_MQ/ehDesktop() (index.html:3302-3303) — breakpoint de
// LAYOUT (900px), independente da plataforma (isDesktop/isNative em
// lib/storage.ts, que é sobre backend de armazenamento).
const QUERY = "(min-width: 900px)";

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(QUERY);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}
