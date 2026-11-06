"use client";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

// Keep the editable value itself fully visible when comparing long fields.
export const ComparisonInput = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function ComparisonInput(props, forwardedRef) {
  const element = useRef<HTMLTextAreaElement>(null);
  const invalid = props["aria-invalid"];
  useImperativeHandle(forwardedRef, () => element.current!, []);
  function resize() {
    const input = element.current;
    if (!input) return;
    input.style.height = "auto";
    const style = getComputedStyle(input);
    input.style.height = `${input.scrollHeight + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)}px`;
  }
  useLayoutEffect(resize, [props.value, invalid]);
  useLayoutEffect(() => {
    const input = element.current!;
    let width = input.getBoundingClientRect().width;
    const observer = new ResizeObserver(() => {
      const nextWidth = input.getBoundingClientRect().width;
      if (nextWidth !== width) { width = nextWidth; resize(); }
    });
    observer.observe(input);
    let active = true;
    void document.fonts.ready.then(() => { if (active) resize(); });
    return () => { active = false; observer.disconnect(); };
  }, []);
  return <textarea {...props} ref={element} rows={1} wrap="soft" className="comparison-input" />;
});
