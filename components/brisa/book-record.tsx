import { Book, integer, money } from "@/lib/client/books";

export function BookRecord({ book, action }: { book: Book; action?: React.ReactNode }) {
  return <article className="book-record" data-book-id={book.id}>
    <div className="book-text">
      <h2>{book.title}</h2>
      <p className="book-author">{book.author}</p>
      <div className="book-metadata"><p className="book-category">{book.category}</p>
      <dl className="book-details">
        <div><dt className="sr-only">Precio</dt><dd>{book.price_cents === null ? "Precio pendiente" : money(book.price_cents)}</dd></div>
        <div><dt className="sr-only">Stock</dt><dd className={book.stock === 0 ? "out-of-stock" : ""}>{book.stock === 0 ? "Sin existencias" : `Stock: ${integer(book.stock)}`}</dd></div>
      </dl></div>
    </div>
    {action}
  </article>;
}
