"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import branding from "@/branding.json";
type Guard = (action: () => void) => void;
const NavigationContext = createContext<{ catalogueUrl: string; guard: React.RefObject<Guard | null> } | null>(null);
export function useBrisaNavigation() { return useContext(NavigationContext)!; }
function CatalogueMemory({ remember }: { remember: (url: string) => void }) {
  const pathname = usePathname(), params = useSearchParams(), query = params.toString();
  useEffect(() => { if (pathname === "/") remember(query ? `/?${query}` : "/"); }, [pathname, query, remember]);
  return null;
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), router = useRouter();
  const [catalogueUrl, remember] = useState("/");
  const guard = useRef<Guard | null>(null), nav = useRef<HTMLElement>(null);
  const currentLocation = useRef<{ url: string; state: unknown } | null>(null);
  const [marker, setMarker] = useState({ left: 0, width: 0 });
  useLayoutEffect(() => {
    currentLocation.current = { url: location.href, state: history.state };
  }, [pathname]);
  useLayoutEffect(() => {
    const interceptHistory = (event: PopStateEvent) => {
      const current = currentLocation.current;
      if (!guard.current || !current || location.href === current.url) return;
      const destination = location.pathname + location.search + location.hash;
      // Install once before the router's passive history listener. Re-registering
      // after every route would allow its traversal to unmount the dirty editor.
      event.stopImmediatePropagation();
      // Retain the current route's router state as well as its URL. Pushing a
      // null state would let Next restore the destination tree and unmount the
      // editor before the discard dialog can mount.
      history.pushState(current.state, "", current.url);
      guard.current(() => router.push(destination));
    };
    window.addEventListener("popstate", interceptHistory, true);
    return () => window.removeEventListener("popstate", interceptHistory, true);
  }, [router]);
  useLayoutEffect(() => {
    const measure = () => { const active = nav.current?.querySelector<HTMLElement>('[aria-current="page"]'); if (active) setMarker({ left: active.offsetLeft, width: active.offsetWidth }); };
    measure(); const observer = new ResizeObserver(measure); if (nav.current) observer.observe(nav.current);
    document.fonts.ready.then(measure); return () => observer.disconnect();
  }, [pathname]);
  const links = [{ href: catalogueUrl, path: "/", label: "Catálogo" }, { href: "/administrar", path: "/administrar", label: "Administrar" }, { href: "/resumen", path: "/resumen", label: "Resumen" }];
  return <NavigationContext.Provider value={{ catalogueUrl, guard }}>
    <Suspense><CatalogueMemory remember={remember} /></Suspense>
    <div className="site-sheet" onClickCapture={event => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
      if (!guard.current || !anchor || anchor.target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname === pathname) return;
      event.preventDefault(); event.stopPropagation(); guard.current(() => router.push(url.pathname + url.search + url.hash));
    }}>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="site-header">
        <Link href={catalogueUrl} className="brand" aria-label={`${branding.logoText}, ir al catálogo`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img data-brand-logo src={branding.logoImageUrl || "/brand-mark.svg"} width="48" height="48" alt="" /><span>{branding.logoText}</span>
        </Link>
        <nav className="primary-navigation" ref={nav} aria-label="Navegación principal">
          {links.map(link => <Link key={link.path} href={link.href} aria-current={pathname === link.path ? "page" : undefined}>{link.label}</Link>)}
          <span className="navigation-marker" data-navigation-marker aria-hidden="true" style={{ transform: `translateX(${marker.left}px) scaleX(${marker.width})` }} />
        </nav>
      </header>
      {children}
      <footer className="site-footer"><div><span className="footer-brand">{branding.logoText}</span><p>Catálogo e inventario bibliográfico</p></div><nav aria-label="Navegación al pie">{links.map(link => <Link key={link.path} href={link.href}>{link.label}</Link>)}</nav></footer>
    </div>
  </NavigationContext.Provider>;
}
export function DemoNote() { return <p className="demo-note">Demostración funcional con libros, autores e inventario ficticios</p>; }
