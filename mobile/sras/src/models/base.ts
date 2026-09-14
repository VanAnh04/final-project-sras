// Common field sets shared by every table (docs/database.dbml §2).

/** Standard business tables: id · created_at · updated_at · is_deleted. */
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

/** Append-only tables (no updated_at / is_deleted). */
export interface AppendOnlyEntity {
  id: number;
  createdAt: string;
}
