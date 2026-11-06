"use client";
import Link from "next/link";
import { memo, startTransition, useEffect, useRef, useState } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer } from "@/components/ui/chart";
import { Summary, integer, money, request, track } from "@/lib/client/books";
import { DemoNote } from "./shell";
import "./summary.css";

const unitsChartConfig = { units: { label: "Unidades", color: "var(--brand-text)" } };

const CategoryBar = memo(function CategoryBar({ category, units, maxUnits, ready }: {
  category: string;
  units: string;
  maxUnits: bigint;
  ready: boolean;
}) {
  return <div className="category-bar">
    <div className="bar-caption"><span>{category}</span><strong>{integer(units)} <span>unidades</span></strong></div>
    {ready ? <ChartContainer config={unitsChartConfig} aria-hidden="true">
      <BarChart layout="vertical" data={[{ units: Number(BigInt(units) * BigInt(1000000) / maxUnits) / 10000 }]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" hide />
        <Bar dataKey="units" fill="var(--color-units)" background={{ fill: "var(--brand-accent)" }} barSize={16} isAnimationActive={false} />
      </BarChart>
    </ChartContainer> : <div className="chart-container" aria-hidden="true" />}
  </div>;
});

const CategoryBars = memo(function CategoryBars({ categories, maxUnits, onReady }: {
  categories: Summary["categories"];
  maxUnits: bigint;
  onReady: (categories: Summary["categories"]) => void;
}) {
  const [readyCount, setReadyCount] = useState(0);
  useEffect(() => {
    // Each ResponsiveContainer mounts and measures its SVG independently.
    // Yield between mounts so a large inventory cannot block navigation/input.
    // Labels, values and row dimensions are available from the first render.
    const frame = requestAnimationFrame(() => {
      if (readyCount < categories.length) {
        startTransition(() => setReadyCount(count => count + 1));
      } else {
        onReady(categories);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [categories, onReady, readyCount]);
  return <div className="category-bars" role="img" aria-busy={readyCount < categories.length} aria-label="Gráfico horizontal de unidades por categoría. Los valores completos están en la tabla siguiente.">
    {categories.map((item, index) => <CategoryBar key={item.category_id} category={item.category} units={item.units} maxUnits={maxUnits} ready={index < readyCount} />)}
  </div>;
});

export function InventorySummary() {
  const [data, setData] = useState<Summary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const [renderedCategories, setRenderedCategories] = useState<Summary["categories"] | null>(null);
  const busy = useRef(false), sequence = useRef(0);
  useEffect(() => {
    const controller = new AbortController(), id = ++sequence.current;
    busy.current = true;
    request<Summary>("/api/resumen", { signal: controller.signal }).then(result => { if (!controller.signal.aborted && sequence.current === id) setData(result); }).catch(error => { if (!controller.signal.aborted && sequence.current === id) setError(error.message || "No se pudo actualizar el resumen."); }).finally(() => { if (!controller.signal.aborted && sequence.current === id) { busy.current = false; setLoading(false); } });
    return () => controller.abort();
  }, [retry]);
  function refresh() { if (busy.current) return; busy.current = true; setLoading(true); setError(""); setRetry(n => n + 1); track("Actualizar resumen"); }
  const maxUnits = data?.categories.reduce((max, item) => BigInt(item.units) > max ? BigInt(item.units) : max, BigInt(0)) || BigInt(1);
  return <main id="contenido" tabIndex={-1} className="page-content summary-page">
    <div className="page-heading"><h1>Resumen del inventario</h1><Button variant="outline" aria-label="Actualizar resumen" disabled={loading} onClick={refresh}><RotateCcw size={17} />{loading ? "Actualizando…" : "Actualizar"}</Button></div><DemoNote />
    {error && <div className="message error-message" role="alert"><h2>No se pudo actualizar el resumen</h2>{data ? <><p>{error}</p><p><strong>Desactualizados:</strong> se conserva el último resumen recibido.</p></> : <p>No hay cifras confirmadas disponibles.</p>}<Button variant="outline" onClick={refresh}>Reintentar</Button></div>}
    <section aria-label="Resumen confirmado" aria-busy={loading || Boolean(data && data.totals.titles !== "0" && renderedCategories !== data.categories)}>
      {loading && <p className="loading-label" role="status">Consultando el inventario…</p>}
      {data ? <>
        <dl className="summary-metrics"><div><dt>Títulos</dt><dd>{integer(data.totals.titles)}</dd></div><div><dt>Unidades</dt><dd>{integer(data.totals.units)}</dd></div><div><dt>{data.totals.pending_price_titles !== "0" ? "Valor conocido" : "Valor del inventario"}</dt><dd>{money(data.totals.known_value_cents)}</dd>{data.totals.pending_price_titles !== "0" && <p>{integer(data.totals.pending_price_titles)} títulos con precio pendiente</p>}</div></dl>
        {data.totals.titles === "0" ? <div className="empty-state"><h2>Todavía no hay libros</h2><p>Las cifras reflejan un inventario vacío. Agrega un libro para empezar.</p><Button asChild><Link href="/administrar">Agregar libro<ArrowRight size={16} /></Link></Button></div> : <section className="category-chart" aria-labelledby="chart-heading"><div className="section-heading"><h2 id="chart-heading">Unidades por categoría</h2><p>Existencias del inventario</p></div><a className="category-detail-link" href="#table-heading" onClick={event => { event.preventDefault(); document.getElementById("table-heading")?.focus(); }}>Ver detalle por categoría ↓</a><CategoryBars categories={data.categories} maxUnits={maxUnits} onReady={setRenderedCategories} /></section>}
        <section className="category-table-section" aria-labelledby="table-heading">
          <h2 id="table-heading" tabIndex={-1}>Detalle por categoría</h2>
          <table className="category-table" role="table">
            <caption className="sr-only">Títulos, unidades y valor de cada categoría</caption>
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">Categoría</th>
                <th id="summary-titles-column" scope="col" role="columnheader">Títulos</th>
                <th id="summary-units-column" scope="col" role="columnheader">Unidades</th>
                <th id="summary-value-column" scope="col" role="columnheader">Valor</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {data.categories.map(item => <tr key={item.category_id} role="row">
                <th id={`summary-category-${item.category_id}`} scope="row" role="rowheader">{item.category}</th>
                <td role="cell" headers={`summary-category-${item.category_id} summary-titles-column`} data-label="Títulos">{integer(item.titles)}</td>
                <td role="cell" headers={`summary-category-${item.category_id} summary-units-column`} data-label="Unidades">{integer(item.units)}</td>
                <td role="cell" headers={`summary-category-${item.category_id} summary-value-column`} data-label="Valor">{money(item.known_value_cents)}{item.pending_price_titles !== "0" && <small>Valor conocido · {integer(item.pending_price_titles)} con precio pendiente</small>}</td>
              </tr>)}
            </tbody>
            <tfoot role="rowgroup">
              <tr role="row">
                <th id="summary-category-total" scope="row" role="rowheader">Total</th>
                <td role="cell" headers="summary-category-total summary-titles-column" data-label="Títulos">{integer(data.totals.titles)}</td>
                <td role="cell" headers="summary-category-total summary-units-column" data-label="Unidades">{integer(data.totals.units)}</td>
                <td role="cell" headers="summary-category-total summary-value-column" data-label="Valor">{money(data.totals.known_value_cents)}{data.totals.pending_price_titles !== "0" && <small>Valor conocido</small>}</td>
              </tr>
            </tfoot>
          </table>
        </section>
        <p className="summary-updated">Última consulta: <time dateTime={data.updated_at}>{new Date(data.updated_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</time></p>
      </> : !error && <div className="summary-placeholder" aria-hidden="true"><div /><div /><div /></div>}
    </section>
  </main>;
}
