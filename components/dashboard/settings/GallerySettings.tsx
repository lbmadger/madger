"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import Button from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/useConfirm";
import { inputClass } from "@/lib/ui/styles";
import type { CoachPhoto } from "@/lib/coaches/public-types";

const MAX_PHOTOS = 6;

// Galerie « Résultats » du coach : upload vers le bucket gallery
// (gallery/<uid>/…), une ligne coach_photos par photo. La légende
// s'enregistre au blur, sans bouton.
export default function GallerySettings({ coachId }: { coachId: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  // Photo « après » : l'input caché est partagé, cette ref dit pour quelle
  // carte l'upload est en cours.
  const afterForId = useRef<string | null>(null);
  const [photos, setPhotos] = useState<CoachPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("coach_photos")
      .select("id, url, url_after, caption")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setPhotos((data as CoachPhoto[]) ?? []));
  }, [coachId]);

  // Envoie un fichier vers le Storage et renvoie son URL publique.
  async function uploadFile(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)
      return null;
    const supabase = createClient();
    const path = `${coachId}/${crypto.randomUUID()}`;
    const { error: upErr } = await supabase.storage
      .from("gallery")
      .upload(path, file, { contentType: file.type });
    if (upErr) return null;
    return supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;
  }

  async function uploadAfter(photoId: string, file: File) {
    setError(false);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (!url) {
        setError(true);
        return;
      }
      const supabase = createClient();
      const { error: updErr } = await supabase
        .from("coach_photos")
        .update({ url_after: url })
        .eq("id", photoId);
      if (updErr) {
        setError(true);
        return;
      }
      setPhotos((p) =>
        p.map((x) => (x.id === photoId ? { ...x, url_after: url } : x))
      );
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function removeAfter(photo: CoachPhoto) {
    if (!photo.url_after) return;
    const supabase = createClient();
    await supabase
      .from("coach_photos")
      .update({ url_after: null })
      .eq("id", photo.id);
    const path = photo.url_after.split("/gallery/")[1]?.split("?")[0];
    if (path) await supabase.storage.from("gallery").remove([path]);
    setPhotos((p) =>
      p.map((x) => (x.id === photo.id ? { ...x, url_after: null } : x))
    );
    router.refresh();
  }

  async function upload(file: File) {
    setError(false);
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (!url) {
        setError(true);
        return;
      }
      const supabase = createClient();
      const { data: row, error: insErr } = await supabase
        .from("coach_photos")
        .insert({ coach_id: coachId, url })
        .select("id, url, url_after, caption")
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
    // Suppression définitive (base + fichiers) : confirmation obligatoire.
    const ok = await confirm({
      title: t("settings.galleryDelete"),
      message: t("settings.galleryDeleteConfirm"),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      danger: true,
    });
    if (!ok) return;
    const supabase = createClient();
    await supabase.from("coach_photos").delete().eq("id", photo.id);
    // Nettoie les fichiers du Storage (chemins extraits des URLs publiques).
    const paths = [photo.url, photo.url_after]
      .filter(Boolean)
      .map((u) => (u as string).split("/gallery/")[1]?.split("?")[0])
      .filter(Boolean) as string[];
    if (paths.length) await supabase.storage.from("gallery").remove(paths);
    setPhotos((p) => p.filter((x) => x.id !== photo.id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      {dialog}
      {photos.length === 0 ? (
        <p className="text-sm text-text-dim">{t("settings.galleryEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
            >
              <div className="relative">
                {p.url_after ? (
                  <div className="grid grid-cols-2">
                    <div className="relative aspect-[2/2.5]">
                      <Image
                        src={p.url}
                        alt={p.caption ?? ""}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase text-white backdrop-blur">
                        {t("coachProfile.before")}
                      </span>
                    </div>
                    <div className="relative aspect-[2/2.5]">
                      <Image
                        src={p.url_after}
                        alt={p.caption ?? ""}
                        fill
                        sizes="100px"
                        className="object-cover"
                      />
                      <span className="absolute left-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold uppercase text-black">
                        {t("coachProfile.after")}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAfter(p)}
                        aria-label={t("settings.galleryRemoveAfter")}
                        className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-danger"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={p.url}
                      alt={p.caption ?? ""}
                      fill
                      sizes="(max-width: 640px) 50vw, 200px"
                      className="object-cover"
                    />
                    {/* Transforme la photo en paire avant/après */}
                    <button
                      type="button"
                      onClick={() => {
                        afterForId.current = p.id;
                        afterRef.current?.click();
                      }}
                      disabled={uploading}
                      className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur transition-colors hover:bg-accent hover:text-black disabled:opacity-50"
                    >
                      {t("settings.galleryAddAfter")}
                    </button>
                  </div>
                )}
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
        <input
          ref={afterRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const id = afterForId.current;
            if (f && id) uploadAfter(id, f);
            afterForId.current = null;
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
        {/* Rappel RGPD/droit à l'image : les avant/après montrent des
            personnes, la responsabilité de l'accord appartient au coach. */}
        <p className="text-xs leading-relaxed text-text-dim">
          {t("settings.galleryConsent")}
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {t("settings.photoErr")}
          </p>
        )}
      </div>
    </div>
  );
}
