import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  FolderOpen,
  ShieldCheck,
  BookOpen,
} from "lucide-react";
import * as D from "./domain";
import { notify } from "./notifications";
export function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!,
      old = document.activeElement as HTMLElement;
    el.showModal();
    el.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    return () => {
      el.close();
      old?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Login({
  onLogin,
  returnTo,
}: {
  onLogin: (a: D.Account) => void;
  returnTo?: string;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="login-grid">
      <section className="login-intro">
        <span className="eyebrow">
          A CLEARER PICTURE. A THOUGHTFUL NEXT STEP.
        </span>
        <h1>
          Understanding progress.
          <br />
          Supporting possibility.
        </h1>
        <p>
          A focused workspace to bring student data together, explore simulated
          academic risk and inform your review.
        </p>
        <div className="login-orbit">
          <BookOpen size={74} strokeWidth={1} />
          <span>Data → Insight → Review</span>
        </div>
        <Steps active={0} />
        <p className="fine">
          Interactive university prototype. All examples are synthetic.
          Predictions are simulated, never a judgement of a student.
        </p>
      </section>
      <section className="login-form">
        <span className="eyebrow">YOUR TEACHING WORKSPACE</span>
        <h2>Welcome back.</h2>
        <p>Sign in with a synthetic demo account to explore.</p>
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
              setError("Enter a valid demo email and password.");
              return;
            }
            setBusy(true);
            try {
              const a = await D.login(email, password);
              if (
                returnTo &&
                returnTo.startsWith("/") &&
                !returnTo.startsWith("//")
              )
                window.history.replaceState(null, "", returnTo);
              onLogin(a);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maya@demo.example"
              required
              aria-invalid={!!error}
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="primary wide">
            {busy ? "Signing in…" : "Sign in to workspace"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        <details open>
          <summary>Explore with a demo account</summary>
          <div className="credential-grid">
            {D.db.accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setEmail(a.email);
                  setPassword("DemoOnly!2026");
                }}
              >
                <span className="mini-avatar">{a.name[0]}</span>
                <span>
                  <strong>{a.name}</strong>
                  <small>
                    {a.role}
                    {!a.enabled ? " · disabled" : ""}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          <p className="fine">
            All accounts use <code>DemoOnly!2026</code>. Fill credentials, then
            sign in. Client-side simulation; do not use real credentials.
          </p>
        </details>
      </section>
    </div>
  );
}
export function Title({
  title,
  sub,
  action,
  parent = "Workspace",
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
  parent?: string;
}) {
  return (
    <>
      <div className="breadcrumbs">
        <FolderOpen size={13} />
        <Link to="/">{parent}</Link>
        <ArrowRight size={13} />
        <span>{title}</span>
      </div>
      <div className="title-row">
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <div className="button-row">{action}</div>
      </div>
    </>
  );
}
export function Steps({ active }: { active: number }) {
  return (
    <div className="steps">
      {["Import", "Preview", "Predict", "Review"].map((s, i) => (
        <React.Fragment key={s}>
          <span className={i === active ? "current" : i < active ? "done" : ""}>
            <b>{i < active ? <Check size={12} /> : i + 1}</b>
            {s}
          </span>
          {i < 3 && <span className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  );
}
export function ErrorPanel({
  title = "Unable to open this page",
  text,
  action,
}: {
  title?: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="card error-panel">
      <ShieldCheck size={36} />
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="button-row">
        {action}
        <Link className="button" to="/">
          Back to workspace
        </Link>
      </div>
    </section>
  );
}
export function Table({
  data,
  columns,
  name = "records",
  exportable = false,
}: {
  data: Record<string, unknown>[];
  columns: {
    key: string;
    label: string;
    render?: (r: Record<string, unknown>) => React.ReactNode;
  }[];
  name?: string;
  exportable?: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(
    name === "datasets"
      ? params.get("q") || ""
      : sessionStorage.getItem(
          "table-search:" + D.current()?.id + location.pathname,
        ) || "",
  );
  const size = +(
      params.get("size") ||
      D.db.preferences[D.current()?.id || ""]?.size ||
      10
    ),
    page = +(params.get("page") || 1),
    sort = params.get("sort") || "",
    direction = params.get("dir") || "asc";
  const filtered = data
    .filter((r) =>
      Object.values(r).some(
        (v) =>
          typeof v !== "object" &&
          String(v).toLowerCase().includes(query.toLowerCase()),
      ),
    )
    .sort((a, b) => {
      const av = a[sort],
        bv = b[sort];
      return (
        (typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av ?? "").localeCompare(String(bv ?? ""))) *
        (direction === "asc" ? 1 : -1)
      );
    });
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    p = Math.min(page, pages),
    visible = filtered.slice((p - 1) * size, p * size);
  const put = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setParams(next, { replace: true });
  };
  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            aria-label={`Search ${name}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              sessionStorage.setItem(
                "table-search:" + D.current()?.id + location.pathname,
                e.target.value,
              );
              if (name === "datasets") put("q", e.target.value);
              else put("page", "1");
            }}
            placeholder={`Search ${name}…`}
          />
          {query && (
            <button
              title="Clear search"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                sessionStorage.removeItem(
                  "table-search:" + D.current()?.id + location.pathname,
                );
                if (name === "datasets") put("q", "");
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
        <div className="button-row">
          <span className="muted">
            {filtered.length} {name}
          </span>
          {exportable && (
            <button
              onClick={() => {
                try {
                  D.download(name + "-matching.csv", D.csv(filtered));
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              <Download size={15} /> All matching
            </button>
          )}
          {exportable && (
            <button
              onClick={() => {
                try {
                  D.download(name + "-page.csv", D.csv(visible));
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Current page
            </button>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  aria-sort={
                    sort === c.key
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button
                    onClick={() => {
                      put("sort", c.key);
                      const next = new URLSearchParams(params);
                      next.set("sort", c.key);
                      next.set(
                        "dir",
                        sort === c.key && direction === "asc" ? "desc" : "asc",
                      );
                      setParams(next, { replace: true });
                    }}
                  >
                    {c.label}
                    {sort === c.key ? (
                      <span>{direction === "asc" ? "↑" : "↓"}</span>
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={String(r.id || r.record_id || i)}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.render ? c.render(r) : String(r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            <Search size={28} />
            <h3>{query ? "No matching " + name : "No " + name + " yet"}</h3>
            <p>
              {query
                ? "Try another search or clear your filters."
                : "New items will appear here."}
            </p>
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  sessionStorage.removeItem(
                    "table-search:" + D.current()?.id + location.pathname,
                  );
                  if (name === "datasets") put("q", "");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
      <div className="pagination">
        <span>
          {filtered.length ? (p - 1) * size + 1 : 0}–
          {Math.min(p * size, filtered.length)} of {filtered.length} {name}
        </span>
        <div>
          <label>
            Rows per page{" "}
            <select
              aria-label="Rows per page"
              value={size}
              onChange={(e) => put("size", e.target.value)}
            >
              {[10, 25, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <button
            aria-label="Previous page"
            disabled={p <= 1}
            onClick={() => put("page", String(p - 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {p} / {pages}
          </span>
          <button
            aria-label="Next page"
            disabled={p >= pages}
            onClick={() => put("page", String(p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
export function Schema() {
  return (
    <dl className="schema">
      {[
        ["record_id", "Unique, non-empty pseudonymous ID"],
        ["G1", "Integer · 0–20"],
        ["failures", "Integer · 0–4"],
        ["studytime", "Category · 1–4"],
        ["schoolsup", "yes or no"],
      ].map(([k, v]) => (
        <div key={k}>
          <dt>
            <code>{k}</code>
          </dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
