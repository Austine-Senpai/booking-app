import { useEffect, useId, useRef } from "react";

// A confirmation popup built on the browser's own <dialog> element, which gives
// us for free: focus stays inside the popup, Esc closes it, and the rest of the
// page can't be clicked.
//
// <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Cancel booking?"
//   actions={<><Button variant="secondary" onClick={close}>Keep it</Button>
//              <Button variant="danger" onClick={cancel}>Cancel booking</Button></>}>
//   This can't be undone.
// </Modal>
export default function Modal({ open, onClose, title, children, actions }) {
  const dialogRef = useRef(null);
  const titleId = useId();

  // Keep the real <dialog> in sync with the `open` prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClick(event) {
    // Clicks on the dark backdrop land on the <dialog> itself, not its content
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose} // fires when Esc is pressed
      onClick={handleClick}
      aria-labelledby={titleId}
      // max-h + overflow: a tall popup (e.g. the slot picker) scrolls instead of going off-screen on phones
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/50"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <div className="mt-2 text-sm text-slate-600">{children}</div>
        {actions && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{actions}</div>}
      </div>
    </dialog>
  );
}
