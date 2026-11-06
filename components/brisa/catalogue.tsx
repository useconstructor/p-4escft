"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, Search, RotateCcw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookList, Category, integer, request, track } from "@/lib/client/books";
import { BookRecord } from "./book-record";
import { RecordPages } from "./record-pages";
import { DemoNote } from "./shell";
export function Catalogue() {
  const params = useSearchParams(), router = useRouter();
  const q = params.get("q") || "", category = params.get("category") || "";
  const requestedPage = Number(params.get("page") || "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [search, setSearch] = useState(q), [selected, setSelected] = useState(category);
  const [data, setData] = useState<BookList | null>(null), [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [retry, setRetry] = useState(0);
  const sequence = useRef(0);
  const [previousFilters, setPreviousFilters] = useState({ q, category });
  if (previousFilters.q !== q || previousFilters.category !== category) {
    setPreviousFilters({ q, category });
    setSearch(q);
    setSelected(category);
  }
  useEffect(() => {
    const id = ++sequence.current, controller = new AbortController();
    // The URL/history is the external source of this request's loading state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setError("");
    const query = new URLSearchParams(); if (q) query.set("q", q); if (category) query.set("category", category);
    Promise.all([request<BookList>(`/api/libros?${query}`, { signal: controller.signal }), request<{ categories: Category[] }>("/api/categorias", { signal: controller.signal })])
      .then(([books, groups]) => { if (!controller.signal.aborted && sequence.current === id) { setData(books); setCategories(groups.categories); } })
      .catch(error => { if (!controller.signal.aborted && sequence.current === id) setError(error.message || "No se pudo cargar el catálogo."); })
      .finally(() => { if (!controller.signal.aborted && sequence.current === id) setLoading(false); });
    return () => controller.abort();
  }, [q, category, retry]);
  function navigate(nextQ: string, nextCategory: string) { const query = new URLSearchParams(); if (nextQ) query.set("q", nextQ); if (nextCategory) query.set("category", nextCategory); if (nextQ === q && nextCategory === category) setRetry(value => value + 1); router.push(query.size ? `/?${query}` : "/", { scroll: false }); }
  function submit(event: FormEvent) { event.preventDefault(); navigate(search, selected); track("Buscar libros"); }
  function clear() { setSearch(""); setSelected(""); navigate("", ""); }
  function changePage(next: number) {
    const query = new URLSearchParams(params.toString());
    if (next > 1) query.set("page", String(next)); else query.delete("page");
    router.push(query.size ? `/?${query}` : "/", { scroll: false });
  }
  const unknown = selected && !categories.some(item => item.id === selected);
  return <main id="contenido" tabIndex={-1} className="page-content catalogue-page">
    <div className="page-heading"><h1>Catálogo</h1><p className="result-count" aria-live="polite">{data ? <><strong>{integer(data.total)}</strong> {data.total === "1" ? "resultado" : "resultados"}</> : loading ? "Consultando…" : "Sin datos"}</p></div><DemoNote />
    <form className="catalogue-filters" onSubmit={submit} role="search">
      <div className="field search-field"><label htmlFor="book-search">Buscar por título o autor</label><div className="search-controls"><div className="search-input"><Search size={19} aria-hidden="true" /><Input className="pl-10" id="book-search" type="search" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} /></div><Button type="submit">Buscar</Button></div></div>
      <div className="field category-filter"><label htmlFor="category-filter">Categoría</label><select id="category-filter" value={selected} onChange={event => { setSelected(event.target.value); navigate(search, event.target.value); }}><option value="">Todas las categorías</option>{unknown && <option value={selected}>Categoría no disponible: {selected}</option>}{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="filter-actions"><Button variant="outline" type="button" onClick={clear}>Limpiar filtros</Button></div>
    </form>
    {data?.category_known === false && <div className="inline-notice"><p>Categoría no disponible: {category}</p><Button variant="outline" onClick={() => { setSelected(""); navigate(search, ""); }}>Quitar categoría</Button></div>}
    {error && <div className="message error-message" role="alert"><h2>No se pudo cargar el catálogo</h2><p>{error}</p>{data && <p><strong>Desactualizados:</strong> se muestran los últimos resultados recibidos.</p>}<Button variant="outline" onClick={() => setRetry(n => n + 1)}><RotateCcw size={16} />Reintentar</Button></div>}
    <section className="catalogue-results" aria-label="Libros del catálogo" aria-busy={loading}>
      {loading && <p role="status" className="loading-label">Consultando libros…</p>}
      {data && data.books.length > 0 && <RecordPages label="Páginas del catálogo" books={data.books} page={page} pageSize={8} onPageChange={changePage}>{visible => <div className="book-grid">{visible.map(book => <BookRecord key={book.id} book={book} />)}</div>}</RecordPages>}
      {!loading && !error && data?.books.length === 0 && <div className="empty-state"><Search size={32} aria-hidden="true" /><h2>{data.inventory_total === "0" ? "Todavía no hay libros" : "No hay coincidencias"}</h2><p>{data.inventory_total === "0" ? "Agrega el primer libro para empezar el inventario compartido." : "Prueba otro título o autor, cambia la categoría o limpia los filtros."}</p>{data.inventory_total === "0" ? <Button asChild><Link href="/administrar">Agregar libro<ArrowRight size={16} /></Link></Button> : <Button variant="outline" onClick={clear}>Limpiar filtros</Button>}</div>}
      {!data && loading && <div className="loading-records" aria-hidden="true"><span /><span /><span /><span /></div>}
    </section>
    <aside className="catalogue-footnote"><Info size={18} aria-hidden="true" /><p>El inventario es compartido. Para ver cambios recientes, recarga la página.</p><Link href="/administrar">Administrar libros<ArrowRight size={16} /></Link></aside>
  </main>;
}
