"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { inputClass } from "@/lib/ui/styles";
import type { CoachPhoto } from "@/lib/coaches/public-types";

const MAX_PHOTOS = 6;

// Galerie « Résultats » du coach : upload vers le bucket gallery
// (gallery/<uid>/…), une ligne coach_photos par photo. La légende
// s'enregistre au blur, sans bouton.
export default function GallerySettings({ coachId }: { coachId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<CoachPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("coach_photos")
      .select("id, url, caption")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setPhotos((data as CoachPhoto[]) ?? []));
  }, [coachId]);

  async function upload(file: File) {
    setError(false);
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setError(true);
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${coachId}/${crypto.randomUUID()}`;
      const { error: upErr } = await supabase.storage
        .from("gallery")
        .upload(path, file, { contentType: file.type });
      if (upErr) {
        setError(true);
        return;
      }
      const { data } = supabase.storage.from("gallery").getPublicUrl(path);
      const { data: row, error: insErr } = await supabase
        .from("coach_photos")
        .insert({ coach_id: coachId, url: data.publicUrl })
        .select("id, url, caption")
        .single();
      if (insErr || !row) {
        setError(true);
        return;
      }
      setPhotos((p) => [...p, row as CoachPhoto]);
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  async function saveCaption(id: string, caption: string) {
    const supabase = createClient();
    await supabase
      .from("coach_photos")
      .update({ caption: caption.trim() || null })
      .eq("id", id);
    setPhotos((p) =>
      p.map((x) => (x.id === id ? { ...x, caption: caption.trim() || null } : x))
    );
    router.refresh();
  }

  async function remove(photo: CoachPhoto) {
    const supabase = createClient();
    await supabase.from("coach_photos").delete().eq("id", photo.id);
    // Nettoie le fichier du Storage (chemin extrait de l'URL publique).
    const path = photo.url.split("/gallery/")[1]?.split("?")[0];
    if (path) await supabase.storage.from("gallery").remove([path]);
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {photos.length === 0 ? (
        <p className="text-sm text-text-dim">{t("settings.galleryEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
            >
              <div className="relative aspect-[4/5]">
                <Image
                  src={p.url}
                  alt={p.caption ?? ""}
                  fill
                  sizes="(max-width: 640px) 50vw, 200px"
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => remove(p)}
                  aria-label={t("settings.galleryDelete")}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-danger"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <input
                type="text"
                defaultValue={p.caption ?? ""}
                placeholder={t("settings.galleryCaption")}
                onBlur={(e) => {
                  if (e.target.value !== (p.caption ?? ""))
                    saveCaption(p.id, e.target.value);
                }}
                className={`${inputClass} rounded-none border-x-0 border-b-0 text-xs`}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
        <Button
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="self-start"
        >
          {uploading ? t("settings.galleryUploading") : t("settings.galleryAdd")}
        </Button>
        <span className="text-xs text-text-dim">
          {photos.length}/{MAX_PHOTOS} · {t("settings.galleryLimit")}
        </span>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t("settings.photoErr")}
          </p>
        )}
      </div>
    </div>
  );
}
