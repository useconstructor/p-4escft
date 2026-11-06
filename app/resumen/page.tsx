import type { Metadata } from "next";
import { InventorySummary } from "@/components/brisa/summary";
// Constructor: server-rendered website settings
import constructorWebsiteSettings from "../../public/constructor-settings.json";
type constructorWebsiteSettingsMetadataValue<T> = Omit<NonNullable<T>, 'title' | 'description'> & { title: string; description: string };
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: PromiseLike<T>): Promise<constructorWebsiteSettingsMetadataValue<T>>;
function constructorWebsiteSettingsMetadata<T extends object | null | undefined>(value: T): constructorWebsiteSettingsMetadataValue<T>;
function constructorWebsiteSettingsMetadata(value: object | null | undefined | PromiseLike<object>): object | Promise<object> {
  if (value && 'then' in value && typeof value.then === 'function') return Promise.resolve(value).then(original => constructorWebsiteSettingsMetadata(original));
  return { ...value, title: constructorWebsiteSettings.title, description: constructorWebsiteSettings.description };
}


export const metadata: Metadata = constructorWebsiteSettingsMetadata(({ title: "Resumen del inventario", description: "Consulta los títulos, las unidades y el valor conocido del inventario, con gráfico y detalle por categoría." }));
export default function SummaryPage() { return <InventorySummary />; }
