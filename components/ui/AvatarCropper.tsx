"use client";

import { useEffect, useRef, useState } from "react";
import Dialog from "@/components/ui/Dialog";
import Button from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";

// Recadrage de la photo de profil dans le rond, sans dépendance : on
// glisse l'image pour la cadrer, on zoome au curseur, et on exporte un
// carré 512 × 512 (JPEG) dessiné sur un canvas. Le coach voit exactement ce
// que verront ses clients : le rond affiché ici est celui de sa page.

const OUT = 512; // taille de sortie, px
const MAX_ZOOM = 4;

// Recadrer une photo déjà en ligne : on la rapatrie en fichier local pour
// la passer au recadrage comme une photo fraîchement choisie. Le stockage
// Supabase autorise l'origine croisée, le canvas n'est donc pas « taché ».
export async function fileFromUrl(url: string): Promise<File | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return new File([blob], "avatar", { type: blob.type });
  } catch {
    return null;
  }
}

export default function AvatarCropper({
  file,
  onCancel,
  onDone,
}: {
  file: File;
  onCancel: () => void;
  // Reçoit le fichier recadré, prêt à envoyer.
  onDone: (cropped: File) => void;
}) {
  const { t } = useI18n();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  // Diamètre du rond à l'écran (dépend de la largeur disponible).
  const [size, setSize] = useState(280);
  const [zoom, setZoom] = useState(1);
  // Décalage du centre de l'image par rapport au centre du rond (px écran).
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Chargement de l'image depuis le fichier choisi.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const el = new window.Image();
    el.onload = () => setImg(el);
    el.onerror = () => setLoadErr(true);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Le rond prend la largeur du panneau, plafonnée.
  useEffect(() => {
    const f = frameRef.current;
    if (!f) return;
    const measure = () => setSize(Math.min(320, Math.max(200, f.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(f);
    return () => ro.disconnect();
  }, [img]);

  // Échelle de base : l'image couvre entièrement le rond (cover).
  const base = img ? Math.max(size / img.naturalWidth, size / img.naturalHeight) : 1;
  const scale = base * zoom;
  const drawW = img ? img.naturalWidth * scale : 0;
  const drawH = img ? img.naturalHeight * scale : 0;

  // L'image ne peut jamais laisser de vide dans le rond.
  function clamp(o: { x: number; y: number }, s = scale) {
    if (!img) return o;
    const maxX = Math.max(0, (img.naturalWidth * s - size) / 2);
    const maxY = Math.max(0, (img.naturalHeight * s - size) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const d = drag.current;
    setOffset(clamp({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }));
  }
  function onPointerUp() {
    drag.current = null;
  }

  function onZoom(next: number) {
    const s = base * next;
    setZoom(next);
    // Le décalage est proportionnel à l'échelle : on le recalcule pour que
    // le point au centre du rond reste au centre.
    setOffset((o) => clamp({ x: (o.x * s) / scale, y: (o.y * s) / scale }, s));
  }

  async function confirm() {
    if (!img) return;
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      const k = OUT / size; // px écran → px sortie
      ctx.fillStyle = "#141414";
      ctx.fillRect(0, 0, OUT, OUT);
      ctx.drawImage(
        img,
        (size / 2 - drawW / 2 + offset.x) * k,
        (size / 2 - drawH / 2 + offset.y) * k,
        drawW * k,
        drawH * k
      );
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.9)
      );
      if (!blob) throw new Error("blob");
      onDone(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    } catch {
      setLoadErr(true);
      setBusy(false);
    }
  }

  return (
    <Dialog
      onClose={onCancel}
      label={t("avatarCrop.title")}
      className="w-full max-w-md rounded-t-2xl border border-border bg-bg-card p-6 sm:rounded-2xl"
    >
      <h2 className="text-lg font-bold text-text-base">{t("avatarCrop.title")}</h2>
      <p className="mt-1 text-sm text-text-dim">{t("avatarCrop.hint")}</p>

      <div ref={frameRef} className="mt-5 flex w-full justify-center">
        {loadErr ? (
          <p role="alert" className="text-sm text-danger">
            {t("settings.photoErr")}
          </p>
        ) : img ? (
          <div
            role="img"
            aria-label={t("avatarCrop.title")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative shrink-0 cursor-grab touch-none select-none overflow-hidden rounded-full border-2 border-accent/60 bg-bg-elevated active:cursor-grabbing"
            style={{ width: size, height: size }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: drawW,
                height: drawH,
                left: size / 2 - drawW / 2 + offset.x,
                top: size / 2 - drawH / 2 + offset.y,
              }}
            />
          </div>
        ) : (
          <div
            className="animate-pulse rounded-full bg-bg-elevated"
            style={{ width: size, height: size }}
          />
        )}
      </div>

      {img && !loadErr && (
        <label className="mt-5 flex items-center gap-3">
          <span className="text-xs font-medium text-text-muted">{t("avatarCrop.zoom")}</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            className="flex-1 accent-accent"
            aria-label={t("avatarCrop.zoom")}
          />
        </label>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <Button onClick={confirm} disabled={!img || loadErr} loading={busy}>
          {t("avatarCrop.confirm")}
        </Button>
      </div>
    </Dialog>
  );
}
