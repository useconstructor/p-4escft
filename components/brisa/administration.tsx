"use client";
import { ChangeEvent, FormEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Pencil, Plus, RotateCcw, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, Book, BookList, Category, Draft, Field, FieldErrors, fields, integer, labels, request, sameDraft, toDraft, track, validate } from "@/lib/client/books";
import { BookRecord } from "./book-record";
import { ComparisonInput } from "./comparison-input";
import { RecordPages } from "./record-pages";
import { ConfirmDialog } from "./dialog";
import { DemoNote, useBrisaNavigation } from "./shell";
type Submission = Readonly<{ key: string; method: "POST" | "PATCH"; url: string; payload: Readonly<Draft & { version?: string }>; draft: Readonly<Draft>; editor: number }>;
type Archived = { submission: Submission; book?: Book; message?: string; rejected?: boolean };
export function Administration() {
  const { guard } = useBrisaNavigation();
  const [interactive, setInteractive] = useState(false);
  useEffect(() => { setInteractive(true); }, []);
  const [books, setBooks] = useState<Book[]>([]), [categories, setCategories] = useState<Category[]>([]);
  const [reading, setReading] = useState(true), [readError, setReadError] = useState(""), [refresh, setRefresh] = useState(0);
  const [listReceived, setListReceived] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [mode, setMode] = useState<"none" | "new" | "edit">("none"), [base, setBase] = useState<Book | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft()), [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState(""), [sending, setSending] = useState(false), [saved, setSaved] = useState(false);
  const [pending, setPending] = useState<Submission | null>(null), [archives, setArchives] = useState<Archived[]>([]);
  const [conflict, setConflict] = useState<Book | null>(null);
  const [missingBook, setMissingBook] = useState(false);
  const [dialog, setDialog] = useState<{ kind: "discard" | "new"; action: () => void } | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ field: Field; token: number; revealSelection: boolean } | null>(null);
  const appliedFocus = useRef<number | null>(null);
  const editorGeneration = useRef(0);
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({}), draftRef = useRef(draft), sendingRef = useRef(false);
  const resolutionButton = useRef<HTMLButtonElement>(null);
  draftRef.current = draft;
  const dirty = mode !== "none" && !sameDraft(draft, toDraft(base));
  const unresolved = pending !== null || archives.some(item => !item.book && !item.rejected);
  const protect = useCallback((action: () => void) => {
    if (sendingRef.current) { setStatus("Espera a que termine el envío para cambiar de libro o salir del editor."); return; }
    if (dirty || unresolved) setDialog({ kind: "discard", action }); else action();
  }, [dirty, unresolved]);
  useEffect(() => { guard.current = dirty || unresolved || sending ? protect : null; return () => { guard.current = null; }; }, [guard, protect, dirty, unresolved, sending]);
  useEffect(() => {
    if (!dirty && !unresolved && !sending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, unresolved, sending]);
  useLayoutEffect(() => {
    if (!focusRequest || appliedFocus.current === focusRequest.token || mode === "none") return;
    const input = inputRefs.current[focusRequest.field];
    if (input) {
      input.focus();
      if (focusRequest.revealSelection) {
        const edge = input.form?.querySelector(".editor-edge");
        const bounds = edge?.getBoundingClientRect();
        // Browser field centering can hide the beginning of a long selected
        // title. Keep its status/action edge together with the focused field.
        if (bounds && bounds.top < 16 && input.getBoundingClientRect().bottom - bounds.top < innerHeight - 32) {
          window.scrollBy({ top: bounds.top - 16, behavior: "instant" });
        }
      }
      appliedFocus.current = focusRequest.token;
    }
  }, [focusRequest, mode]);
  useEffect(() => {
    const controller = new AbortController(); setReading(true); setReadError("");
    Promise.allSettled([request<BookList>("/api/libros", { signal: controller.signal }), request<{ categories: Category[] }>("/api/categorias", { signal: controller.signal })]).then(results => {
      if (controller.signal.aborted) return;
      const [list, groups] = results;
      if (list.status === "fulfilled") { setBooks(list.value.books); setListReceived(true); }
      if (groups.status === "fulfilled") setCategories(groups.value.categories);
      if (list.status === "rejected" || groups.status === "rejected") setReadError("No se pudo actualizar la lista o sus categorías. Puedes conservar y editar tus campos; reintenta la lectura.");
      setReading(false);
    });
    return () => controller.abort();
  }, [refresh]);
  function focus(field: Field, revealSelection = false) { setFocusRequest(current => ({ field, token: (current?.token || 0) + 1, revealSelection })); }
  function archivePending() {
    if (pending) setArchives(items => items.some(item => item.submission.key === pending.key) ? items : [...items, { submission: pending }]);
    setPending(null);
  }
  function choose(book?: Book) {
    archivePending();
    editorGeneration.current += 1;
    setMissingBook(false);
    setBase(book || null); setDraft(toDraft(book)); setMode(book ? "edit" : "new"); setErrors({}); setStatus(""); setSaved(false); setPending(null); setConflict(null); focus("title", true);
  }
  function change(field: Field, value: string) { setDraft(current => ({ ...current, [field]: value })); setSaved(false); if (!pending && !conflict) setStatus(""); }
  function check(): boolean { const next = validate(draftRef.current); setErrors(next); const first = fields.find(field => next[field]); if (first) { setSaved(false); setStatus("Revisa los campos indicados antes de guardar."); focus(first); return false; } return true; }
  async function transmit(submission: Submission, archived = false) {
    if (sendingRef.current) return;
    const recovering = archived || pending?.key === submission.key;
    sendingRef.current = true; setSending(true); if (!archived) setSaved(false);
    if (!archived) { setPending(submission); setStatus("Guardando libro"); }
    try {
      const result = await request<{ book: Book }>(submission.url, { method: submission.method, headers: { "Content-Type": "application/json", "Idempotency-Key": submission.key }, body: JSON.stringify(submission.payload) });
      setBooks(current => current.some(book => book.id === result.book.id) ? current.map(book => book.id === result.book.id && BigInt(book.version) <= BigInt(result.book.version) ? result.book : book) : [...current, result.book]);
      setRefresh(value => value + 1);
      if (archived) {
        setArchives(current => current.map(item => item.submission.key === submission.key ? { ...item, book: result.book, message: "Envío original recuperado" } : item));
        // Replayed operations may predate another confirmed edit. Never move
        // the selected book's confirmed version backwards or replace its draft.
        setBase(current => current?.id === result.book.id && BigInt(current.version) <= BigInt(result.book.version) ? result.book : current);
        if (base?.id === result.book.id && BigInt(base.version) < BigInt(result.book.version)) {
          setSaved(false);
          setStatus("Envío original recuperado. Revisa tu borrador antes de guardar nuevos cambios.");
        }
        if (!base && mode === "new" && submission.editor === editorGeneration.current) {
          setBase(result.book);
          setMode("edit");
          setSaved(false);
          setStatus("Envío original recuperado. Tu borrador se conserva para editar este libro.");
        }
      }
      else {
        setBase(result.book); setMode("edit"); setPending(null); setConflict(null); setMissingBook(false); setErrors({});
        if (sameDraft(draftRef.current, submission.draft)) { setDraft(toDraft(result.book)); setSaved(true); setStatus("Libro guardado en la base de datos"); }
        else { setStatus("Envío confirmado. Cambios sin guardar en tu borrador actual."); }
        track("Libro guardado");
      }
    } catch (error) {
      // A denied recovery request cannot establish whether the earlier write
      // committed. Keep its original key and payload available.
      const rejection = error instanceof ApiError && error.status >= 400 && error.status < 500
        && !(recovering && (error.status === 403 || error.details.code === "IDEMPOTENCY_CONFLICT"));
      if (archived) { setArchives(current => current.map(item => item.submission.key === submission.key ? { ...item, rejected: rejection, message: error instanceof Error ? error.message : "Resultado sin confirmar. Recupera este envío otra vez." } : item)); }
      else if (rejection) {
        setPending(null);
        setMissingBook(error.details.code === "BOOK_NOT_FOUND");
        if (error.details.code === "VERSION_CONFLICT" && error.details.current) { setConflict(error.details.current); setStatus("Este libro cambió"); }
        else { setConflict(null); setStatus(error.message); if (error.details.fieldErrors) { setErrors(error.details.fieldErrors); const first = fields.find(field => error.details.fieldErrors?.[field]); if (first) focus(first); } }
      } else { setStatus("Resultado sin confirmar"); }
    } finally { sendingRef.current = false; setSending(false); }
  }
  function save(event?: FormEvent, overwrite?: Book) {
    event?.preventDefault(); if (sendingRef.current || pending || (conflict && !overwrite)) return;
    if (!check()) return;
    const confirmed = overwrite || base;
    const snapshot = Object.freeze({ ...draftRef.current });
    const submission: Submission = Object.freeze({ key: crypto.randomUUID(), method: confirmed ? "PATCH" : "POST", url: confirmed ? `/api/libros/${confirmed.id}` : "/api/libros", payload: Object.freeze({ ...snapshot, ...(confirmed ? { version: confirmed.version } : {}) }), draft: snapshot, editor: editorGeneration.current });
    void transmit(submission);
  }
  const saveLabel = pending && !sending ? "Recuperar envío" : sending ? "Guardando libro" : mode === "new" ? "Guardar libro" : "Guardar cambios";
  const stateLabel = pending && !sending ? "Resultado sin confirmar" : sending ? "Guardando libro" : saved ? "Libro guardado en la base de datos" : conflict ? "Este libro cambió" : status || (dirty ? "Cambios sin guardar" : mode === "edit" ? "Valores confirmados" : "Completa los cinco campos");
  function primary() { if (pending) void transmit(pending); else save(); }
  return <main id="contenido" tabIndex={-1} className="page-content administration-page">
    <div className="page-heading"><h1>Administrar libros</h1><Button disabled={!interactive} onClick={() => protect(() => choose())}><Plus size={18} />Agregar libro</Button></div><DemoNote />
    <div className="shared-notice"><ShieldCheck size={20} aria-hidden="true" /><p>La administración es pública y compartida. Los cambios afectan al inventario de esta demostración.</p></div>
    <div className={`admin-spread${mode === "none" ? " editor-unselected" : ""}`}>
      <section className="editor" aria-label="Editor de libros">
        {mode === "none" ? <div className="editor-empty"><h2>Un libro, cinco campos</h2><p>Usa Agregar libro o selecciona uno de la lista para editarlo.</p></div> : <form id="book-editor" onSubmit={event => save(event)} noValidate>
          <div className="editor-edge">
            <div><p className={`editor-status ${saved ? "success-text" : ""}`} role="status">{saved && <Check size={17} aria-hidden="true" />}{stateLabel}</p><h2>{mode === "new" ? "Nuevo libro" : base?.title}</h2></div>
            {!conflict && <Button type={pending ? "button" : "submit"} disabled={sending} onClick={pending ? primary : undefined}>{pending ? <RotateCcw size={17} /> : <Save size={17} />}{saveLabel}</Button>}
            {conflict && <div id="conflict-resolution" className="action-row reconciliation-actions"><Button ref={resolutionButton} type="button" variant="outline" disabled={sending} onClick={() => { setBase(conflict); setDraft(toDraft(conflict)); setConflict(null); setErrors({}); setStatus("Valores actuales recuperados"); }}>Usar datos actuales</Button><Button type="button" disabled={sending} onClick={() => save(undefined, conflict)}>Sobrescribir con mi borrador</Button></div>}
          </div>
          {Object.keys(errors).length > 0 && <div className="message error-message validation-summary" role="alert"><h3>Revisa los campos indicados</h3><ul>{fields.filter(field => errors[field]).map(field => <li key={field}><a href={`#${field}`} onClick={event => { event.preventDefault(); focus(field); }}>{errors[field]}</a></li>)}</ul></div>}
          {missingBook && <div className="message error-message" role="alert"><h3>No se encuentra el libro</h3><p>El servidor no pudo guardar esta edición. Tu borrador sigue aquí; puedes prepararlo como un libro nuevo y guardarlo después.</p><Button type="button" variant="outline" disabled={sending} onClick={() => { setBase(null); setMode("new"); setMissingBook(false); setSaved(false); setStatus("Borrador preparado como nuevo libro. Guarda para agregarlo."); focus("title"); }}>Usar borrador en un libro nuevo</Button></div>}
          {pending && !sending && <div className="message uncertain-message" role="alert"><p>El envío pudo haberse guardado aunque no recibimos la respuesta. Recupera el envío original para comprobarlo sin duplicarlo. Tus cambios posteriores se conservan por separado.</p><Button variant="outline" type="button" onClick={() => setDialog({ kind: "new", action: () => { archivePending(); setStatus("Nuevo envío preparado. El original sigue disponible para recuperar."); } })}>Iniciar otro envío</Button></div>}
          {conflict && <div className="message conflict-message" role="alert"><p>Otra persona guardó cambios. Compara el valor anterior, tu borrador editable y el valor actual en cada campo antes de decidir.</p></div>}
          {status && !pending && !conflict && !saved && !dirty && !sending && <p className="editor-explanation">{status}</p>}
          <div className={`editor-fields${conflict ? " conflict-comparison" : ""}`}>{conflict && <div className="comparison-headings" aria-hidden="true"><span>Valor anterior</span><span>Tu borrador</span><span>Valor actual</span></div>}{fields.map(field => {
            const previous = toDraft(base), current = toDraft(conflict);
            const changed = Boolean(conflict && previous[field] !== current[field]);
            const inputProps = { id: field, name: field, value: draft[field], onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(field, event.target.value), "aria-invalid": Boolean(errors[field]), "aria-describedby": [errors[field] ? `${field}-error` : "", field === "price" || field === "stock" ? `${field}-hint` : "", changed ? `${field}-changed` : ""].filter(Boolean).join(" ") || undefined, autoComplete: "off", required: true };
            const input = conflict && (field === "title" || field === "author" || field === "category")
              ? <ComparisonInput {...inputProps} ref={element => { inputRefs.current[field] = element; }} />
              : <Input {...inputProps} ref={element => { inputRefs.current[field] = element; }} inputMode={field === "price" ? "decimal" : field === "stock" ? "numeric" : "text"} list={field === "category" ? "category-suggestions" : undefined} />;
            return <section className={`field field-${field}`} key={field} data-changed={changed || undefined}>
              <h3><label htmlFor={field}>{labels[field]}</label></h3>
              {changed && <p className="changed-field" id={`${field}-changed`}>Este campo cambió en el inventario.</p>}
              {conflict ? <dl><div><dt>Valor anterior</dt><dd>{previous[field] || (field === "price" ? "Precio pendiente" : "Vacío")}</dd></div><div className="draft-comparison"><dt>Tu borrador</dt><dd>{input}</dd></div><div><dt>Valor actual</dt><dd>{current[field] || (field === "price" ? "Precio pendiente" : "Vacío")}</dd></div></dl> : input}
              {field === "price" && <p className="field-hint" id="price-hint">Obligatorio al guardar. Hasta dos decimales, con coma o punto.</p>}{field === "stock" && <p className="field-hint" id="stock-hint">Unidades enteras, de 0 a 2147483647.</p>}{errors[field] && <p id={`${field}-error`} className="field-error">{errors[field]}</p>}
            </section>;
          })}</div>
          {conflict && <a className="resolution-return" href="#conflict-resolution" onClick={event => { event.preventDefault(); resolutionButton.current?.focus({ preventScroll: true }); resolutionButton.current?.scrollIntoView({ block: "center" }); }}>Volver a las opciones de resolución ↑</a>}
          <datalist id="category-suggestions">{categories.map(category => <option key={category.id} value={category.name} />)}</datalist>
          <div className="editor-bottom"><Button type="button" variant="outline" onClick={() => protect(() => { archivePending(); setMissingBook(false); setDraft(toDraft(base)); setErrors({}); setStatus(""); setSaved(false); setPending(null); setConflict(null); if (!base) setMode("none"); })}>Cancelar</Button>{!conflict && <Button type={pending ? "button" : "submit"} disabled={sending} onClick={pending ? primary : undefined}>{saveLabel}</Button>}</div>
        </form>}
        {archives.length > 0 && <section className="archived-submissions"><h3>Envíos originales</h3><p>Se conservan mientras esta página permanece abierta.</p>{archives.map(item => <div className="message" key={item.submission.key}><h4>{item.submission.draft.title}</h4><p>{item.book ? `Envío original recuperado: ${item.book.title}` : item.rejected ? "El servidor rechazó este envío." : "El envío original pudo haberse aplicado."}</p>{item.message && <p role="status">{item.message}</p>}{!item.book && !item.rejected && <Button type="button" variant="outline" disabled={sending} onClick={() => void transmit(item.submission, true)}>Recuperar envío original</Button>}</div>)}</section>}
      </section>
      <section className="admin-list" aria-label="Lista de libros" aria-busy={reading}><div className="list-heading"><h2>Libros del inventario</h2><span>{listReceived ? `${integer(books.length)} títulos` : reading ? "Consultando…" : "Sin lista confirmada"}</span></div>{reading && <p role="status">Consultando inventario…</p>}{readError && <div className="message error-message" role="alert"><p>{readError}</p>{books.length > 0 && <p>Desactualizados: últimos libros recibidos.</p>}<Button variant="outline" onClick={() => setRefresh(n => n + 1)}>Reintentar</Button></div>}{!reading && !readError && !books.length && <p className="empty-list">Todavía no hay libros. Agrega el primero desde el editor.</p>}{books.length > 0 && <RecordPages label="Páginas del inventario" books={books} page={listPage} pageSize={6} onPageChange={setListPage}>{visible => visible.map(book => <div className={base?.id === book.id ? "selected-record" : ""} key={book.id}><BookRecord book={book} action={<Button variant="outline" aria-label={`Editar ${book.title}`} onClick={() => protect(() => choose(book))}><Pencil size={16} />Editar</Button>} /></div>)}</RecordPages>}</section>
    </div>
    <ConfirmDialog open={Boolean(dialog)} title={dialog?.kind === "new" ? "Iniciar otro envío" : "Descartar cambios"} confirmLabel={dialog?.kind === "new" ? "Iniciar otro envío" : "Descartar cambios"} onCancel={() => setDialog(null)} onConfirm={() => { const action = dialog?.action; setDialog(null); action?.(); }}><p>{dialog?.kind === "new" ? "El envío original pudo haberse guardado. Un nuevo envío tendrá una clave distinta y podría crear otro libro. Podrás recuperar el original en esta página." : `Se perderán los cambios sin guardar de este editor.${unresolved ? " Los envíos sin confirmar pudieron haberse aplicado; recupéralos antes de abandonar la página si necesitas conocer su resultado." : ""}`}</p></ConfirmDialog>
  </main>;
}
