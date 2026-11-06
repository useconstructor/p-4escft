"use client";
import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Book, integer } from "@/lib/client/books";

type Props = {
  books: Book[];
  label: string;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  children: (books: Book[]) => ReactNode;
};

/** Complete records remain in the document's ordinary reading flow. */
export function RecordPages({ books, label, page, pageSize, onPageChange, children }: Props) {
  const pages = Math.max(1, Math.ceil(books.length / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * pageSize;
  const top = useRef<HTMLElement>(null);
  const [returnFocus, setReturnFocus] = useState<"previous" | "next" | null>(null);
  useLayoutEffect(() => {
    if (!returnFocus) return;
    top.current?.querySelector<HTMLButtonElement>(`[data-page-action="${returnFocus}"]`)?.focus();
    // The lower navigation returns to the same action above the new records.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReturnFocus(null);
  }, [current, returnFocus]);
  function controls(bottom = false) {
    return <nav ref={bottom ? undefined : top} className={`record-pagination${bottom ? " record-pagination-bottom" : ""}`} aria-label={`${label}${bottom ? " inferior" : ""}`} data-page={current} data-pages={pages}>
      <p className="record-range" role={bottom ? undefined : "status"}>{integer(start + 1)}–{integer(Math.min(start + pageSize, books.length))} de {integer(books.length)}</p>
      <div className="page-actions">
        {(["previous", "next"] as const).map(direction => {
          const unavailable = direction === "previous" ? current === 1 : current === pages;
          return <Button key={direction} type="button" variant="ghost" data-page-action={direction} aria-disabled={unavailable} onClick={() => {
            if (unavailable) return;
            onPageChange(current + (direction === "previous" ? -1 : 1));
            if (bottom) setReturnFocus(direction);
          }}>{direction === "previous" ? <><ArrowLeft size={16} aria-hidden="true" />Anterior</> : <>Siguiente<ArrowRight size={16} aria-hidden="true" /></>}</Button>;
        })}
      </div>
    </nav>;
  }
  return <div className="record-pages">
    {controls()}
    {children(books.slice(start, start + pageSize))}
    {pages > 1 && controls(true)}
  </div>;
}
