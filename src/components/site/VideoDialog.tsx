"use client";
import { useEffect, useRef, useState } from "react";

export function VideoDialog({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { const dialog = dialogRef.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <><button ref={triggerRef} type="button" className="video-play" onClick={() => setOpen(true)}><span aria-hidden>▶</span> Assistir ao vídeo</button><dialog ref={dialogRef} className="video-dialog" onClose={() => { setOpen(false); triggerRef.current?.focus(); }} onCancel={() => setOpen(false)} aria-label="Vídeo da Chácara Serra Verde"><button type="button" className="video-close" onClick={() => setOpen(false)} aria-label="Fechar vídeo">×</button>{open && <iframe src={url} title="Conheça a Chácara Serra Verde" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />}</dialog></>;
}
