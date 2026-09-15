'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export function Modal({ title, children, close }: {title: string; children: ReactNode; close: () => void}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = previous; }; }, []);
  return <dialog ref={ref} className="modal" onCancel={e => {e.preventDefault();close();}} onClick={e => {if(e.target === e.currentTarget) close();}}><div className="modal-header"><div><span className="eyebrow">SITECRAFT WORKSPACE</span><h2>{title}</h2></div><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
