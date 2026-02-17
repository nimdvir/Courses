import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * AccessCloud MVP – Browser-based Microsoft Access simulator (prototype)
 * Tech: React + SQL.js (SQLite compiled to WebAssembly)
 *
 * Features implemented:
 * - Initialize in-memory SQLite database in the browser
 * - Table Designer: create table with fields and types
 * - Data Browser: list tables, preview rows, simple pagination
 * - Query Runner: run arbitrary read-only SELECT queries, render results, export CSV
 * - Simple Form (Insert): choose table, auto-generate inputs, insert a row
 * - Import/Export DB: download .sqlite file and load it back
 *
 * Notes:
 * - This is an MVP meant for quick iteration. No backend required.
 * - Security: DDL/DML are allowed in this prototype. In production, generate SQL server-side.
 * - Persistence: You can export the DB to a file, or save base64 to localStorage (see TODOs).
 */

// Helper: load SQL.js from CDN at runtime so this file is copy-paste friendly.
async function loadSQL() {
  // sql.js expects to fetch its wasm by relative path from locateFile
  const SQL = await window.initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });
  return SQL;
}

// Inject script tag once
function useScriptOnce(src) {
  const loadedRef = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (loadedRef.current) return;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
    loadedRef.current = true;
    return () => {
      // keep script for future renders
    };
  }, [src]);
  return ready;
}

// Types
const SQLITE_TYPES = [
  "INTEGER",
  "REAL",
  "TEXT",
  "BLOB",
  "NUMERIC",
];

function clsx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function AccessCloudMVP() {
  // Load SQL.js runtime
  const scriptReady = useScriptOnce("https://sql.js.org/dist/sql-wasm.js");
  const [db, setDb] = useState(null); // SQL.Database instance
  const [status, setStatus] = useState("Initializing...");

  // UI state
  const [activeTab, setActiveTab] = useState("designer");

  // Designer state
  const [tableName, setTableName] = useState("customers");
  const [fields, setFields] = useState([
    { name: "id", type: "INTEGER", notNull: true, pk: true },
    { name: "name", type: "TEXT", notNull: true, pk: false },
    { name: "email", type: "TEXT", notNull: false, pk: false },
  ]);

  // Query Runner state
  const [sqlText, setSqlText] = useState("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  const [queryResult, setQueryResult] = useState(null);
  const [queryError, setQueryError] = useState("");

  // Data Browser state
  const [tables, setTables] = useState([]);
  const [browseTable, setBrowseTable] = useState("");
  const [browseRows, setBrowseRows] = useState([]);

  // Simple Insert Form state
  const [insertTable, setInsertTable] = useState("");
  const [insertColumns, setInsertColumns] = useState([]);
  const [insertData, setInsertData] = useState({});

  // Initialization
  useEffect(() => {
    async function init() {
      try {
        if (!scriptReady) return;
        setStatus("Loading SQL.js...");
        const SQL = await loadSQL();
        const db = new SQL.Database();
        setDb(db);
        setStatus("Ready");
        refreshTables(db);
      } catch (e) {
        console.error(e);
        setStatus("Failed to initialize SQL.js");
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  function runSQL(db, statement) {
    // Returns first result set as rows of objects
    const res = db.exec(statement); // array of { columns, values }
    if (!res || res.length === 0) return [];
    const { columns, values } = res[0];
    return values.map((row) => Object.fromEntries(row.map((v, i) => [columns[i], v])));
  }

  function exec(db, statement) {
    db.run(statement);
  }

  function refreshTables(dbInstance = db) {
    if (!dbInstance) return;
    try {
      const rows = runSQL(dbInstance, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
      const names = rows.map((r) => r.name);
      setTables(names);
      if (names.length && !browseTable) setBrowseTable(names[0]);
      if (names.length && !insertTable) setInsertTable(names[0]);
    } catch (e) {
      console.error(e);
    }
  }

  // Designer: add/remove field rows
  function addField() {
    setFields((fs) => [...fs, { name: "", type: "TEXT", notNull: false, pk: false }]);
  }
  function removeField(idx) {
    setFields((fs) => fs.filter((_, i) => i !== idx));
  }

  function buildCreateTableSQL() {
    if (!tableName.trim()) throw new Error("Table name required");
    const cols = fields.map((f) => {
      if (!f.name.trim()) throw new Error("Field name required");
      const parts = [quoteId(f.name), f.type];
      if (f.notNull) parts.push("NOT NULL");
      return parts.join(" ");
    });
    const pkCols = fields.filter((f) => f.pk).map((f) => quoteId(f.name));
    if (pkCols.length) cols.push(`PRIMARY KEY (${pkCols.join(", ")})`);
    return `CREATE TABLE IF NOT EXISTS ${quoteId(tableName)} (\n  ${cols.join(",\n  ")}\n);`;
  }

  function quoteId(name) {
    // Double-quote identifier and escape inner quotes
    return '"' + String(name).replaceAll('"', '""') + '"';
  }

  function onCreateTable() {
    try {
      if (!db) return;
      const ddl = buildCreateTableSQL();
      exec(db, ddl);
      setStatus(`Table ${tableName} created/updated`);
      refreshTables();
    } catch (e) {
      setStatus("Error: " + e.message);
    }
  }

  function onRunQuery() {
    try {
      if (!db) return;
      setQueryError("");
      const rows = runSQL(db, sqlText);
      setQueryResult({ rows, columns: rows[0] ? Object.keys(rows[0]) : [] });
    } catch (e) {
      setQueryError(String(e.message || e));
      setQueryResult(null);
    }
  }

  function onBrowseLoad() {
    try {
      if (!db || !browseTable) return;
      const rows = runSQL(db, `SELECT * FROM ${quoteId(browseTable)} LIMIT 200;`);
      setBrowseRows(rows);
    } catch (e) {
      setStatus("Browse error: " + e.message);
    }
  }

  async function loadTableColumns(tbl) {
    if (!db || !tbl) return;
    const info = runSQL(db, `PRAGMA table_info(${quoteId(tbl)});`);
    // info columns: cid, name, type, notnull, dflt_value, pk
    setInsertColumns(info.map((r) => ({ name: r.name, type: r.type, notnull: !!r.notnull, pk: !!r.pk })));
    setInsertData({});
  }

  useEffect(() => {
    if (insertTable) loadTableColumns(insertTable);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insertTable, db]);

  function onInsertSubmit(e) {
    e.preventDefault();
    if (!db || !insertTable) return;
    // Build parameterized INSERT
    const cols = insertColumns.filter((c) => !c.pk).map((c) => c.name);
    const vals = cols.map((c) => insertData[c] ?? null);
    // Naive escaping for MVP; sql.js supports prepared statements but for brevity we inline values safely
    const placeholders = vals.map((v) => sqlLiteral(v));
    const stmt = `INSERT INTO ${quoteId(insertTable)} (${cols.map(quoteId).join(", ")}) VALUES (${placeholders.join(", ")});`;
    try {
      exec(db, stmt);
      setStatus(`Inserted 1 row into ${insertTable}`);
      if (browseTable === insertTable) onBrowseLoad();
    } catch (e) {
      setStatus("Insert error: " + e.message);
    }
  }

  function sqlLiteral(v) {
    if (v === null || v === undefined || v === "") return "NULL";
    if (!isNaN(Number(v))) return String(Number(v));
    // Escape single quotes
    return "'" + String(v).replaceAll("'", "''") + "'";
  }

  function exportCSV(result) {
    if (!result || !result.rows) return;
    const cols = result.columns || (result.rows[0] ? Object.keys(result.rows[0]) : []);
    const csv = [cols.join(",")]
      .concat(result.rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "query_result.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(val) {
    if (val === null || val === undefined) return "";
    const s = String(val);
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return '"' + s.replaceAll('"', '""') + '"';
    }
    return s;
  }

  // Export / Import DB (binary)
  function onExportDB() {
    if (!db) return;
    const data = db.export(); // Uint8Array
    const blob = new Blob([data], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "accesscloud.sqlite";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportDB(file) {
    if (!file || !scriptReady) return;
    const arrayBuffer = await file.arrayBuffer();
    const u8 = new Uint8Array(arrayBuffer);
    const SQL = await loadSQL();
    const newDb = new SQL.Database(u8);
    setDb(newDb);
    setStatus(`Loaded DB: ${file.name}`);
    refreshTables(newDb);
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">AccessCloud – MVP</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50"
            disabled={!db}
            onClick={onExportDB}
          >
            Export DB
          </button>
          <label className="px-3 py-2 rounded border cursor-pointer hover:bg-gray-50">
            Import DB
            <input
              type="file"
              accept=".sqlite,.db,application/octet-stream"
              className="hidden"
              onChange={(e) => onImportDB(e.target.files?.[0])}
            />
          </label>
        </div>
      </header>

      <p className="mt-2 text-sm text-gray-600">Status: {status}{!scriptReady && " (loading sql.js runtime)"}</p>

      {/* Tabs */}
      <nav className="mt-6 border-b">
        <ul className="flex gap-2">
          {[
            ["designer", "Table Designer"],
            ["browser", "Data Browser"],
            ["runner", "Query Runner"],
            ["insert", "Insert Form"],
          ].map(([key, label]) => (
            <li key={key}>
              <button
                className={clsx(
                  "px-4 py-2 rounded-t border border-b-0",
                  activeTab === key ? "bg-white" : "bg-gray-100 hover:bg-gray-200"
                )}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Panels */}
      <section className="border rounded-b p-4 bg-white">
        {activeTab === "designer" && (
          <DesignerPanel
            tableName={tableName}
            setTableName={setTableName}
            fields={fields}
            setFields={setFields}
            onCreateTable={onCreateTable}
            types={SQLITE_TYPES}
          />
        )}

        {activeTab === "browser" && (
          <BrowserPanel
            tables={tables}
            browseTable={browseTable}
            setBrowseTable={setBrowseTable}
            onLoad={onBrowseLoad}
            rows={browseRows}
          />
        )}

        {activeTab === "runner" && (
          <RunnerPanel
            sqlText={sqlText}
            setSqlText={setSqlText}
            onRun={onRunQuery}
            result={queryResult}
            error={queryError}
            onExport={() => exportCSV(queryResult)}
          />
        )}

        {activeTab === "insert" && (
          <InsertPanel
            tables={tables}
            insertTable={insertTable}
            setInsertTable={setInsertTable}
            columns={insertColumns}
            data={insertData}
            setData={setInsertData}
            onSubmit={onInsertSubmit}
          />
        )}
      </section>

      <footer className="mt-8 text-xs text-gray-500">
        MVP prototype – for demo and teaching use. Built with React + SQL.js.
      </footer>
    </div>
  );
}

function DesignerPanel({ tableName, setTableName, fields, setFields, onCreateTable, types }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Table Designer</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium">Table name</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="my_table"
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Fields</h3>
          <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={() => setFields((fs) => [...fs, { name: "", type: "TEXT", notNull: false, pk: false }])}>
            + Add field
          </button>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Type</th>
                <th className="border px-2 py-1">NOT NULL</th>
                <th className="border px-2 py-1">Primary Key</th>
                <th className="border px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1">
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={f.name}
                      onChange={(e) =>
                        setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder={`field_${i + 1}`}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={f.type}
                      onChange={(e) => setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, type: e.target.value } : x)))}
                    >
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={f.notNull}
                      onChange={(e) => setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, notNull: e.target.checked } : x)))}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={f.pk}
                      onChange={(e) => setFields((fs) => fs.map((x, idx) => (idx === i ? { ...x, pk: e.target.checked } : x)))}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button className="text-red-600 hover:underline" onClick={() => setFields((fs) => fs.filter((_, idx) => idx !== i))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700" onClick={onCreateTable}>
          Create / Update Table
        </button>
      </div>
    </div>
  );
}

function BrowserPanel({ tables, browseTable, setBrowseTable, onLoad, rows }) {
  const columns = useMemo(() => (rows[0] ? Object.keys(rows[0]) : []), [rows]);
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Data Browser</h2>
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-sm font-medium">Table</label>
          <select className="mt-1 border rounded px-3 py-2" value={browseTable} onChange={(e) => setBrowseTable(e.target.value)}>
            <option value="" disabled>
              Select a table
            </option>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={onLoad}>
          Load rows
        </button>
      </div>

      <div className="mt-4 overflow-auto border rounded">
        {rows.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">No rows to display.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th key={c} className="border px-2 py-1 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                  {columns.map((c) => (
                    <td key={c} className="border px-2 py-1">
                      {String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function RunnerPanel({ sqlText, setSqlText, onRun, result, error, onExport }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Query Runner</h2>
      <p className="text-sm text-gray-600 mb-3">Run SELECT statements. For the MVP, other statements also work.</p>
      <textarea
        className="w-full border rounded p-2 font-mono text-sm h-40"
        value={sqlText}
        onChange={(e) => setSqlText(e.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <button className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700" onClick={onRun}>
          Run
        </button>
        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={onExport} disabled={!result || !result.rows?.length}>
          Export CSV
        </button>
      </div>
      {error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
      <div className="mt-4 overflow-auto border rounded">
        {!result || !result.rows?.length ? (
          <p className="p-3 text-sm text-gray-500">No results.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="border px-2 py-1 text-left">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50"}>
                  {result.columns.map((c) => (
                    <td key={c} className="border px-2 py-1">
                      {String(r[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function InsertPanel({ tables, insertTable, setInsertTable, columns, data, setData, onSubmit }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Insert Form (Auto-generated)</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium">Table</label>
          <select className="mt-1 border rounded px-3 py-2" value={insertTable} onChange={(e) => setInsertTable(e.target.value)}>
            {tables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        {columns
          .filter((c) => !c.pk)
          .map((c) => (
            <div key={c.name}>
              <label className="block text-sm font-medium">
                {c.name} <span className="text-gray-400">({c.type || "TEXT"})</span>
              </label>
              <input
                className="mt-1 w-full border rounded px-3 py-2"
                value={data[c.name] ?? ""}
                onChange={(e) => setData((d) => ({ ...d, [c.name]: e.target.value }))}
                placeholder={`Enter ${c.name}`}
              />
            </div>
          ))}
        <div className="md:col-span-2">
          <button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700" type="submit">
            Insert Row
          </button>
        </div>
      </form>
    </div>
  );
}
