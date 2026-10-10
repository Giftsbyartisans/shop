"use client";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function DeletionProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className="manager-deletion-dialog"
      aria-labelledby="deletion-heading"
      tabIndex={-1}
      onCancel={(event) => event.preventDefault()}
    >
      <div role="status" aria-live="polite">
        <span className="manager-deletion-spinner" aria-hidden="true" />
        <h2 id="deletion-heading">Deleting listings…</h2>
        <p>
          {completed === total
            ? "Refreshing your catalog…"
            : `${completed} of ${total} deleted`}
        </p>
        <p>Please wait until deletion is complete.</p>
      </div>
    </dialog>,
    document.body,
  );
}
