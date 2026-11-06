import type { Metadata } from "next";
import { InventorySummary } from "@/components/brisa/summary";
export const metadata: Metadata = { title: "Resumen del inventario", description: "Consulta los títulos, las unidades y el valor conocido del inventario, con gráfico y detalle por categoría." };
export default function SummaryPage() { return <InventorySummary />; }
