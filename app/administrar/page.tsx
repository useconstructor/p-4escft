import type { Metadata } from "next";
import { Administration } from "@/components/brisa/administration";
export const metadata: Metadata = { title: "Administrar libros", description: "Agrega y edita los cinco campos de cada libro en el inventario público y compartido de Librería Brisa." };
export default function AdminPage() { return <Administration />; }
