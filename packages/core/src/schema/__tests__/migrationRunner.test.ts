import { describe, expect, it } from "vitest";
import { splitStatements } from "../migrationRunner.js";

describe("splitStatements", () => {
  it("splits simple statements on top-level semicolons", () => {
    expect(splitStatements("CREATE TABLE a (id INT); CREATE TABLE b (id INT);")).toEqual([
      "CREATE TABLE a (id INT)",
      "CREATE TABLE b (id INT)",
    ]);
  });

  it("does not split on semicolons inside string literals", () => {
    const sql = "INSERT INTO t (v) VALUES ('7 obras -> 1 PA; 25 obras -> 3 PA.');";
    expect(splitStatements(sql)).toEqual(["INSERT INTO t (v) VALUES ('7 obras -> 1 PA; 25 obras -> 3 PA.')"]);
  });

  it("handles multiple statements where one contains a semicolon in a string", () => {
    const sql = `
      CREATE TABLE t (v TEXT);
      INSERT INTO t (v) VALUES ('a; b');
      INSERT INTO t (v) VALUES ('c');
    `;
    expect(splitStatements(sql)).toEqual([
      "CREATE TABLE t (v TEXT)",
      "INSERT INTO t (v) VALUES ('a; b')",
      "INSERT INTO t (v) VALUES ('c')",
    ]);
  });
});
