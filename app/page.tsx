import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalogue } from "@/components/brisa/catalogue";
import { DemoNote } from "@/components/brisa/shell";
import branding from "@/branding.json";
export const metadata: Metadata = { title: { absolute: `Catálogo | ${branding.logoText}` }, description: "Busca libros ficticios por título, autor y categoría y consulta su precio y sus existencias." };
export default function Home() {
  return <Suspense fallback={<main id="contenido" tabIndex={-1} className="page-content catalogue-page" aria-busy="true"><h1>Catálogo</h1><DemoNote /><p className="loading-label" role="status">Cargando catálogo…</p><div className="loading-records" aria-hidden="true"><span /><span /><span /><span /></div></main>}><Catalogue /></Suspense>;
}
