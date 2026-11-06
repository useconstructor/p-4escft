"use client";

import { useId, useLayoutEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ open, title, children, confirmLabel = "Descartar cambios", onCancel, onConfirm }: {
  open: boolean; title: string; children: React.ReactNode; confirmLabel?: string; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const titleId = useId(), descriptionId = useId();
  const callbacks = useRef({ onCancel, onConfirm });
  useLayoutEffect(() => { callbacks.current = { onCancel, onConfirm }; }, [onCancel, onConfirm]);
  useLayoutEffect(() => {
    if (!open) return;
    const node = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (node && !node.open) node.showModal();
    cancel.current?.focus();
    return () => { node?.close(); if (trigger?.isConnected) trigger.focus(); };
  }, [open]);
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={event => { event.preventDefault(); callbacks.current.onCancel(); }}
    onKeyDown={event => {
      if (event.key !== "Tab") return;
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button,a[href],input,select,textarea,[tabindex]')).filter(item => item.tabIndex >= 0 && !item.matches(":disabled") && !item.closest("[inert]") && item.getClientRects().length > 0 && getComputedStyle(item).visibility !== "hidden");
      const first = items[0], last = items.at(-1), active = document.activeElement;
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (active === first || !event.currentTarget.contains(active))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || !event.currentTarget.contains(active))) { event.preventDefault(); first.focus(); }
    }}>
    <h2 id={titleId}>{title}</h2>
    <div id={descriptionId} className="dialog-copy">{children}</div>
    <div className="action-row">
      <Button ref={cancel} type="button" variant="outline" onClick={() => callbacks.current.onCancel()}>Continuar editando</Button>
      <Button type="button" onClick={() => callbacks.current.onConfirm()}>{confirmLabel}</Button>
    </div>
  </dialog>;
}
