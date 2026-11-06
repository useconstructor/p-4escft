"use client";

import { ReactNode, useEffect, useId, useRef, useState } from "react";

/** Keep long inventories usable without hiding, truncating or dropping records. */
export function RecordScroll({ children, label }: { children: ReactNode; label: string }) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [overflow, setOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const region = viewport.current, body = content.current;
    if (!region || !body) return;
    const measure = () => {
      setOverflow(region.scrollHeight > region.clientHeight + 1);
      setAtEnd(region.scrollTop + region.clientHeight >= region.scrollHeight - 2);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(region);
    observer.observe(body);
    region.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      region.removeEventListener("scroll", measure);
    };
  }, []);

  return <div className="record-scroll-group">
    {overflow && <p className="record-scroll-hint" id={hintId}>
      {atEnd ? "Fin de la lista. Desplázate hacia arriba para volver." : "Más registros a continuación. Desplázate dentro de la lista para consultarlos."}
    </p>}
    <div ref={viewport} className="record-scroll" role="region" aria-label={label}
      aria-describedby={overflow ? hintId : undefined} tabIndex={overflow ? 0 : undefined}>
      <div ref={content}>{children}</div>
    </div>
  </div>;
}
