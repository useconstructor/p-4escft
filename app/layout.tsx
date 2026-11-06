import type { Metadata } from "next";
import "./globals.css";
import branding from "@/branding.json";
import fontAssets from "@/lib/client/font-assets.json";
import { Shell } from "@/components/brisa/shell";
// Constructor: server-rendered website settings
import constructorWebsiteSettings from "../public/constructor-settings.json";
type constructorWebsiteSettingsMetadataValue<T> = Omit<NonNullable<T>, 'title' | 'description'> & { title: string; description: string };
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: PromiseLike<T>): Promise<constructorWebsiteSettingsMetadataValue<T>>;
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: T): constructorWebsiteSettingsMetadataValue<T>;
function constructorWebsiteSettingsMetadata(value: object | null | undefined | PromiseLike<object>): object | Promise<object> {
  if (value && 'then' in value && typeof value.then === 'function') return Promise.resolve(value).then(original => constructorWebsiteSettingsMetadata(original));
  return { ...value, title: constructorWebsiteSettings.title, description: constructorWebsiteSettings.description };
}


export const metadata: Metadata = constructorWebsiteSettingsMetadata(({
  title: { default: branding.logoText, template: `%s | ${branding.logoText}` },
  description: "Consulta libros ficticios y administra un inventario bibliográfico compartido.",
  icons: { icon: "/icon.svg", apple: "/brand-mark.svg" },
}));
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faces = branding.brandbook.fontFaces.map(face => {
    const source = (fontAssets as Record<string, string>)[face.url] || face.url;
    return `@font-face{font-family:${JSON.stringify(face.family)};font-style:normal;font-weight:${face.weight};font-display:swap;src:url(${JSON.stringify(source)});}`;
  }).join("\n");
  return <html lang={constructorWebsiteSettings.language}><head><style>{faces + `:root{--brand-font-heading:${JSON.stringify(branding.fontHeading)},serif;--brand-font-body:${JSON.stringify(branding.fontBody)},sans-serif;}`}</style></head><body><Shell>{children}</Shell><script src="/constructor-editor.js" defer></script><script src={"https://constructor-api-git-fix-two-projects-ai-p-5c3f22-useconstructor.vercel.app/v1/projects/P-4ESCFT/analytics/script.js"} defer></script><script src="/constructor-settings.js" defer></script></body></html>;
}
