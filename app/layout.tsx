import type { Metadata } from "next";
import "./globals.css";
import branding from "@/branding.json";
import fontAssets from "@/lib/client/font-assets.json";
import { Shell } from "@/components/brisa/shell";
export const metadata: Metadata = {
  title: { default: branding.logoText, template: `%s | ${branding.logoText}` },
  description: "Consulta libros ficticios y administra un inventario bibliográfico compartido.",
  icons: { icon: "/icon.svg", apple: "/brand-mark.svg" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const faces = branding.brandbook.fontFaces.map(face => {
    const source = (fontAssets as Record<string, string>)[face.url] || face.url;
    return `@font-face{font-family:${JSON.stringify(face.family)};font-style:normal;font-weight:${face.weight};font-display:swap;src:url(${JSON.stringify(source)});}`;
  }).join("\n");
  return <html lang="es"><head><style>{faces + `:root{--brand-font-heading:${JSON.stringify(branding.fontHeading)},serif;--brand-font-body:${JSON.stringify(branding.fontBody)},sans-serif;}`}</style></head><body><Shell>{children}</Shell><script src="/constructor-editor.js" defer></script><script src={"https://constructor-api-git-fix-two-projects-ai-p-5c3f22-useconstructor.vercel.app/v1/projects/P-4ESCFT/analytics/script.js"} defer></script></body></html>;
}
