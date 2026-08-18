import type { Migration } from "./0001_init.js";

export const migration0010Etiqueta: Migration = {
  name: "0010_etiqueta",
  sql: `
CREATE TABLE etiqueta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
`,
};
