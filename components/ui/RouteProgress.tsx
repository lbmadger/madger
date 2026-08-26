"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Indicateur de navigation. En App Router, entre le clic sur un lien et
// l'arrivée de la nouvelle page, rien ne bouge à l'écran : le serveur rend,
// et l'utilisateur croit que son clic n'a pas été pris. Ce composant comble
// exactement ce trou, en deux temps :
//   1. barre fine en haut, qui progresse dès ~120 ms (le clic est « reçu ») ;
//   2. si l'attente dépasse ~700 ms, un voile flouté avec le trait du logo
//      qui se dessine en boucle (la vraie « attente longue »).
// Les deux disparaissent quand l'URL change, puis app/template.tsx prend le
// relais avec son fondu d'entrée.

// Événement à émettre pour les navigations qui ne passent pas par un <a> :
// router.push() après une soumission de formulaire, une redirection JS…
// Import : `import { startRouteProgress } from "@/components/ui/RouteProgress"`.
const ROUTE_START_EVENT = "madger:route-start";

export function startRouteProgress() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ROUTE_START_EVENT));
  }
}

const SHOW_DELAY = 120; // ms : sous ce seuil, la page était déjà en cache
const VEIL_DELAY = 700; // ms : au-delà, l'attente mérite plus qu'une barre
const TRICKLE_EVERY = 180; // ms entre deux avancées
const CEILING = 0.9; // on n'atteint jamais 100 % avant la vraie arrivée
const SAFETY = 12000; // ms : filet si la navigation est annulée en route
const OUTRO = 420; // ms : temps laissé à la barre pour finir sa course

function RouteProgressInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams}`;

  const [pct, setPct] = useState(0);
  const [barVisible, setBarVisible] = useState(false);
  const [veilVisible, setVeilVisible] = useState(false);

  const running = useRef(false);
  const timers = useRef<number[]>([]);
  const ticker = useRef<number | null>(null);
  const lastKey = useRef(routeKey);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (ticker.current !== null) {
      window.clearInterval(ticker.current);
      ticker.current = null;
    }
  }, []);

  // Fin de navigation : la barre file à 100 %, le voile part tout de suite
  // (la page est là), puis tout se remet à zéro pour le prochain clic.
  const stop = useCallback(() => {
    if (!running.current) return;
    running.current = false;
    clearTimers();
    setVeilVisible(false);
    setPct(1);
    timers.current.push(
      window.setTimeout(() => {
        setBarVisible(false);
        timers.current.push(window.setTimeout(() => setPct(0), 300));
      }, OUTRO),
    );
  }, [clearTimers]);

  // Départ : progression asymptotique vers CEILING. Rapide au début (le clic
  // répond), de plus en plus lente ensuite — on ne promet jamais une fin
  // qu'on ne maîtrise pas.
  const start = useCallback(() => {
    if (running.current) return;
    running.current = true;
    clearTimers();
    setPct(0.08);
    timers.current.push(window.setTimeout(() => setBarVisible(true), SHOW_DELAY));
    timers.current.push(window.setTimeout(() => setVeilVisible(true), VEIL_DELAY));
    timers.current.push(window.setTimeout(() => stop(), SAFETY));
    ticker.current = window.setInterval(() => {
      setPct((p) => (p >= CEILING ? p : p + (CEILING - p) * 0.16));
    }, TRICKLE_EVERY);
  }, [clearTimers, stop]);

  // L'URL a changé → la nouvelle page est montée, on clôt.
  useEffect(() => {
    if (routeKey === lastKey.current) return;
    lastKey.current = routeKey;
    stop();
  }, [routeKey, stop]);

  useEffect(() => {
    // Capture : on veut voir le clic avant que Next ne l'intercepte, et même
    // si un handler applicatif appelle stopPropagation().
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      const targetAttr = anchor.getAttribute("target");
      if (targetAttr && targetAttr !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      // Externe, mailto:, tel: → le navigateur quitte l'app, rien à animer.
      if (url.origin !== window.location.origin) return;
      // Même URL (ancre, re-clic sur l'onglet courant) → aucune navigation.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }
      start();
    };

    const onPopState = () => start();

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    window.addEventListener(ROUTE_START_EVENT, start);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener(ROUTE_START_EVENT, start);
      clearTimers();
    };
  }, [start, clearTimers]);

  return (
    <>
      <div
        className="route-bar"
        data-visible={barVisible ? "true" : "false"}
        aria-hidden
      >
        <div
          className="route-bar__fill"
          style={{ width: `${Math.min(pct, 1) * 100}%` }}
        >
          <span className="route-bar__head" />
        </div>
      </div>

      {veilVisible && (
        <div className="route-veil" role="status">
          {/* Le trait du logo se dessine puis s'efface par la queue : la
              même courbe que la marque, en boucle, sans texte à traduire. */}
          <svg
            width="112"
            height="112"
            viewBox="0 0 1024 1024"
            fill="none"
            aria-hidden
          >
            <path
              d="M 160 820 L 320 320 L 480 580 L 640 280 L 740 600 C 800 580 850 380 884 180"
              pathLength={1}
              className="route-veil__trace"
              stroke="#CBFF03"
              strokeWidth="70"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="884" cy="180" r="36" className="route-veil__dot" fill="#E8FF5C" />
          </svg>
          <span className="sr-only">Chargement de la page…</span>
        </div>
      )}
    </>
  );
}

// useSearchParams() impose une frontière Suspense : sans elle, monter ce
// composant dans le layout racine ferait basculer TOUTES les pages en rendu
// client au build. Le fallback est nul : rien à afficher tant qu'on ne
// navigue pas.
export default function RouteProgress() {
  return (
    <Suspense fallback={null}>
      <RouteProgressInner />
    </Suspense>
  );
}
