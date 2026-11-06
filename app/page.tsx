import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalogue } from "@/components/brisa/catalogue";
import { DemoNote } from "@/components/brisa/shell";
import branding from "@/branding.json";
// Constructor: server-rendered website settings
import constructorWebsiteSettings from "../public/constructor-settings.json";
type constructorWebsiteSettingsMetadataValue<T> = Omit<NonNullable<T>, 'title' | 'description'> & { title: string; description: string };
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: PromiseLike<T>): Promise<constructorWebsiteSettingsMetadataValue<T>>;
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: T): constructorWebsiteSettingsMetadataValue<T>;
function constructorWebsiteSettingsMetadata(value: object | null | undefined | PromiseLike<object>): object | Promise<object> {
  if (value && 'then' in value && typeof value.then === 'function') return Promise.resolve(value).then(original => constructorWebsiteSettingsMetadata(original));
  return { ...value, title: constructorWebsiteSettings.title, description: constructorWebsiteSettings.description };
}


export const metadata: Metadata = constructorWebsiteSettingsMetadata(({ title: { absolute: `Catálogo | ${branding.logoText}` }, description: "Busca libros ficticios por título, autor y categoría y consulta su precio y sus existencias." }));
export default function Home() {
  return <Suspense fallback={<main id="contenido" tabIndex={-1} className="page-content catalogue-page" aria-busy="true"><h1>Catálogo</h1><DemoNote /><p className="loading-label" role="status">Cargando catálogo…</p><div className="loading-records" aria-hidden="true"><span /><span /><span /><span /></div></main>}><Catalogue /></Suspense>;
}
