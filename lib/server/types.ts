/** Wire types only. This module contains no database access or credentials. */
export type UInt = string;
export type Version = string;

export interface Category {
  id: string;
  name: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  category_id: string;
  category: string;
  price_cents: UInt | null;
  stock: number;
  version: Version;
  created_at: string;
  updated_at: string;
}

export interface BookInput {
  title: string;
  author: string;
  category: string;
  price: string;
  stock: string;
}

export interface BookPatch extends BookInput {
  version: Version;
}

export type FieldErrors = Partial<Record<keyof BookPatch, string>>;
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: FieldErrors;
    current?: Book;
  };
}

export interface Catalogue {
  books: Book[];
  total: UInt;
  inventory_total: UInt;
  filters: { q: string; category: string | null };
  category_known: boolean;
}

export interface Aggregate {
  titles: UInt;
  units: UInt;
  known_value_cents: UInt;
  pending_price_titles: UInt;
}

export interface InventorySummary {
  totals: Aggregate;
  categories: Array<Aggregate & { category_id: string; category: string }>;
  updated_at: string;
}
