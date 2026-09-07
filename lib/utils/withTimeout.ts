// Garde-fou côté navigateur : une requête qui ne répond jamais (session
// Supabase bloquée, réseau coupé) laisserait un bouton en « Enregistrement… »
// pour toujours. Passé le délai, on rend la main avec une erreur lisible.
export function withTimeout<T>(p: PromiseLike<T>, ms = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("timeout")), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}
