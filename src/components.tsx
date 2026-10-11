import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Link, FormMessage, useOperation } from "./ui";
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
  variant = "dialog",
  busy = false,
}: {
  title: string;
  variant?: "dialog" | "drawer";
  busy?: boolean;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = React.useId();
  useEffect(() => {
    const el = ref.current!,
      old = document.activeElement as HTMLElement;
    el.showModal();
    el.querySelector<HTMLButtonElement>("[data-dialog-cancel]")?.focus();
    return () => {
      el.close();
      old?.focus();
    };
  }, [title]);
  return (
    <dialog
      ref={ref}
      className={variant === "drawer" ? "drawer" : ""}
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-description"}
      aria-busy={busy}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="dialog-heading">
        <h2 id={id + "-title"}>{title}</h2>
        <button
          className="icon"
          title="Close dialog"
          aria-label="Close dialog"
          disabled={busy}
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      <p id={id + "-description"} className="sr-only">
        {title}. Use the controls below. Close returns to the current page.
      </p>
      <div className="dialog-body">{children}</div>
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
  const live = useOperation();
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
            if (busy) return;
            setError("");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
              setError("Enter a valid demo email and password.");
              return;
            }
            setBusy(true);
            try {
              const a = await D.login(email, password);
              if (!live(true)) return;
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
            />
          </label>
          <label>
            Password
            <div className="password">
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShow(!show)}>
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <FormMessage error={error} />
          <button disabled={busy} aria-busy={busy} className="primary wide">
            {busy ? "Signing in…" : "Sign in to workspace"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        <AuthOptions onLogin={onLogin} email={email} />
        <details>
          <summary>Explore with a demo account</summary>
          <div className="credential-grid">
            {D.db.accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setEmail(a.email);
                  setPassword(a.credential ? "" : "DemoOnly!2026");
                }}
              >
                <span className="mini-avatar">{a.name[0]}</span>
                <span>
                  <strong>{a.name}</strong>
                  <small>{a.email}</small>
                  <small>
                    {a.role}
                    {!a.enabled ? " · disabled" : ""}
                  </small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${email || "maya@demo.example"}\n${password || "DemoOnly!2026"}`,
                );
                notify("Demo credentials copied.");
              } catch {
                setError(
                  "Clipboard unavailable. Select and copy the email and password shown here.",
                );
              }
            }}
          >
            Copy filled credentials
          </button>
          <p className="fine">
            Seed accounts use <code>DemoOnly!2026</code> unless reset.
            Registered accounts use their chosen demo password. Fill
            credentials, then sign in. Client-side simulation; do not use real
            credentials.
          </p>
        </details>
      </section>
    </div>
  );
}
function DemoPassword({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label>
      {label}
      <div className="password">
        <input
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          aria-label={(visible ? "Hide " : "Show ") + label.toLowerCase()}
          onClick={() => setVisible(!visible)}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
function AuthOptions({
  onLogin,
  email,
}: {
  onLogin: (a: D.Account) => void;
  email: string;
}) {
  const [mode, setMode] = useState<
    "register" | "forgot" | "sent" | "reset" | "success" | "google" | null
  >(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const live = useOperation();
  const open = (next: typeof mode) => {
    setMode(next);
    setAddress(email);
    setName("");
    setPassword("");
    setConfirmation("");
    setError("");
    setToken("");
  };
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      if (live(true)) setError((e as Error).message);
    } finally {
      if (live(true)) setBusy(false);
    }
  };
  const title =
    mode === "register"
      ? "Create your demo account"
      : mode === "google"
        ? "Continue with Google"
        : mode === "sent"
          ? "Check your demo inbox"
          : mode === "reset"
            ? "Choose a new password"
            : mode === "success"
              ? "You’re all set"
              : "Reset your password";
  return (
    <>
      <div className="auth-divider">
        <span>or</span>
      </div>
      <button className="wide google-signin" onClick={() => open("google")}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M21.8 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 5-.9 6.8-2.4l-3.3-2.6c-.9.6-2.1 1-3.5 1-2.6 0-4.8-1.7-5.6-4H3v2.7A10.2 10.2 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.4 14a6 6 0 0 1 0-4V7.3H3a10 10 0 0 0 0 9.4L6.4 14Z"
          />
          <path
            fill="#EA4335"
            d="M12 6c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10.2 10.2 0 0 0-9 5.3L6.4 10c.8-2.3 3-4 5.6-4Z"
          />
        </svg>
        Continue with Google<span className="mode-tag">Demo</span>
      </button>
      <div className="auth-links">
        <button onClick={() => open("forgot")}>Forgot password?</button>
        <span>
          New here?{" "}
          <button onClick={() => open("register")}>Create an account</button>
        </span>
      </div>
      {mode && (
        <Dialog title={title} busy={busy} close={() => setMode(null)}>
          <p className="fine">
            Frontend demo only. Use synthetic details and a demo password. No
            email is sent and Google is not contacted.
          </p>
          {mode === "google" ? (
            <>
              <p>
                Choose a synthetic account to preview the Google sign-in flow.
              </p>
              <div className="google-accounts">
                {D.db.accounts
                  .filter((a) => a.enabled && a.role === "teacher")
                  .map((a) => (
                    <button
                      key={a.id}
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const account = await D.googleDemo(a.id);
                          if (live(true)) onLogin(account);
                        })
                      }
                    >
                      <span className="mini-avatar">{a.name[0]}</span>
                      <span>
                        <strong>{a.name}</strong>
                        <small>{a.email}</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
              </div>
              <FormMessage error={error} />
              <button
                data-dialog-cancel
                disabled={busy}
                onClick={() => setMode(null)}
              >
                Cancel Google sign-in
              </button>
            </>
          ) : mode === "sent" ? (
            <>
              <p>
                If an enabled demo account matches <strong>{address}</strong>, a
                reset is ready. The reset expires in 15 minutes.
              </p>
              {token ? (
                <div className="auth-inbox">
                  <span className="eyebrow">LOCAL DEMO INBOX</span>
                  <h3>Password reset requested</h3>
                  <p>Open the reset below to choose a new demo password.</p>
                  <button
                    className="primary"
                    onClick={() => {
                      setMode("reset");
                      setError("");
                    }}
                  >
                    Open demo reset
                  </button>
                </div>
              ) : (
                <p className="notice">
                  No reset message is available here. Check the address or
                  create a demo account.
                </p>
              )}
              <button onClick={() => open("forgot")}>Use another email</button>
            </>
          ) : mode === "success" ? (
            <>
              <div className="auth-inbox" role="status">
                <Check size={24} />
                <h3>{success}</h3>
                <p>Sign in with {address} and your demo password.</p>
              </div>
              <button className="primary wide" onClick={() => setMode(null)}>
                Back to sign in
              </button>
            </>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  if (
                    mode === "register" &&
                    (!name.trim() || name.trim().length > 80)
                  )
                    throw Error("Enter a name between 1 and 80 characters.");
                  if (
                    mode !== "reset" &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
                  )
                    throw Error("Enter a valid demo email address.");
                  if (mode !== "forgot" && password.length < 8)
                    throw Error(
                      "Use at least 8 characters for your demo password.",
                    );
                  if (mode !== "forgot" && password !== confirmation)
                    throw Error(
                      "The passwords do not match. Enter the same password in both fields.",
                    );
                  if (mode === "forgot") {
                    const ticket = await D.requestPasswordReset(address);
                    if (live(true)) {
                      setToken(ticket);
                      setMode("sent");
                    }
                  } else {
                    if (mode === "register")
                      await D.register(name, address, password);
                    else await D.resetPassword(token, password);
                    if (live(true)) {
                      setPassword("");
                      setConfirmation("");
                      setSuccess(
                        mode === "register"
                          ? "Your account is ready"
                          : "Your password has been reset",
                      );
                      setMode("success");
                    }
                  }
                });
              }}
            >
              {mode === "register" && (
                <label>
                  Full name
                  <input
                    autoComplete="name"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              )}
              {mode !== "reset" && (
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </label>
              )}
              {mode === "register" && (
                <p className="fine">
                  New accounts receive a private teacher workspace.
                  Administrator access is managed separately.
                </p>
              )}
              {mode !== "forgot" && (
                <>
                  <p className="fine">
                    Use at least 8 characters. Choose a password you do not use
                    elsewhere.
                  </p>
                  <DemoPassword
                    label="New demo password"
                    value={password}
                    onChange={setPassword}
                  />
                  <DemoPassword
                    label="Confirm demo password"
                    value={confirmation}
                    onChange={setConfirmation}
                  />
                </>
              )}
              <FormMessage error={error} />
              <div className="form-actions">
                <button
                  type="button"
                  data-dialog-cancel
                  disabled={busy}
                  onClick={() => setMode(null)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy} aria-busy={busy}>
                  {busy
                    ? "Please wait…"
                    : mode === "register"
                      ? "Create account"
                      : mode === "forgot"
                        ? "Send reset instructions"
                        : "Reset password"}
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </>
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
  const location = useLocation();
  const bits = location.pathname.split("/");
  const run =
    bits[1] === "prediction-runs"
      ? D.db.runs.find((r) => r.id === bits[2])
      : undefined;
  const d = D.db.datasets.find(
    (d) => d.id === (run?.dataset || (bits[1] === "datasets" ? bits[2] : "")),
  );
  const trail: { label: string; to: string }[] = [{ label: parent, to: "/" }];
  if (d) {
    trail.push({ label: "Datasets", to: "/datasets" });
    if (bits.length > 3 || run)
      trail.push({ label: d.name, to: "/datasets/" + d.id });
  }
  return (
    <>
      <div className="breadcrumbs" aria-label="Breadcrumbs">
        <FolderOpen size={13} />
        {trail.map((item, i) => (
          <React.Fragment key={item.to + String(i)}>
            <Link to={item.to}>{item.label}</Link>
            <ArrowRight size={13} />
          </React.Fragment>
        ))}
        <span aria-current="page">{title}</span>
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
          <span
            aria-current={i === active ? "step" : undefined}
            className={i === active ? "current" : i < active ? "done" : ""}
          >
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
    sortable?: boolean;
    sortValue?: (r: Record<string, unknown>) => string | number;
  }[];
  name?: string;
  exportable?: boolean;
}) {
  const [allParams, setAllParams] = useSearchParams();
  const prefix = ["fields", "field values"].includes(name)
    ? name.replaceAll(" ", "_") + "_"
    : "";
  const params = new URLSearchParams(allParams);
  if (prefix) {
    ["size", "page", "sort", "dir"].forEach((k) => {
      params.delete(k);
      const v = allParams.get(prefix + k);
      if (v !== null) params.set(k, v);
    });
  }
  const setParams = (
    next: URLSearchParams,
    options?: { replace?: boolean },
  ) => {
    if (!prefix) {
      setAllParams(next, options);
      return;
    }
    const merged = new URLSearchParams(allParams);
    ["size", "page", "sort", "dir"].forEach((k) => {
      const v = next.get(k);
      if (v === null) merged.delete(prefix + k);
      else merged.set(prefix + k, v);
    });
    setAllParams(merged, options);
  };
  const input = useRef<HTMLInputElement>(null);
  const [exportScope, setExportScope] = useState<"matching" | "page" | null>(
    null,
  );
  const here = useLocation();
  const [query, setQuery] = useState(
    name === "datasets"
      ? params.get("q") || ""
      : sessionStorage.getItem(
          "table-search:" + D.current()?.id + here.pathname + ":" + name,
        ) || "",
  );
  const rawSize = Number(
    params.get("size") || D.db.preferences[D.current()?.id || ""]?.size || 10,
  );
  const size = [10, 25, 50].includes(rawSize) ? rawSize : 10;
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  const sortable = (c: (typeof columns)[number]) =>
    c.sortable !== false && !["action", "actions", "details"].includes(c.key);
  const sort = columns.some((c) => c.key === params.get("sort") && sortable(c))
    ? params.get("sort")!
    : "";
  const direction = params.get("dir") === "desc" ? "desc" : "asc";
  useEffect(() => {
    setQuery(
      name === "datasets"
        ? params.get("q") || ""
        : sessionStorage.getItem(
            "table-search:" + D.current()?.id + here.pathname + ":" + name,
          ) || "",
    );
  }, [here.pathname, params.get("q"), name]);
  const filtered = data
    .filter((r) =>
      Object.values(r).some(
        (v) =>
          typeof v !== "object" &&
          String(v).toLowerCase().includes(query.toLowerCase()),
      ),
    )
    .sort((a, b) => {
      const col = columns.find((c) => c.key === sort);
      const av = col?.sortValue ? col.sortValue(a) : a[sort],
        bv = col?.sortValue ? col.sortValue(b) : b[sort];
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
  useEffect(() => {
    const next = new URLSearchParams(params);
    let changed = false;
    if (params.has("page") && params.get("page") !== String(p)) {
      next.set("page", String(p));
      changed = true;
    }
    if (params.has("size") && params.get("size") !== String(size)) {
      next.set("size", String(size));
      changed = true;
    }
    if (params.has("sort") && !sort) {
      next.delete("sort");
      changed = true;
    }
    if (changed) setParams(next, { replace: true });
  }, [params.toString(), p, size, sort]);
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
            ref={input}
            aria-label={`Search ${name}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              sessionStorage.setItem(
                "table-search:" + D.current()?.id + here.pathname + ":" + name,
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
                input.current?.focus();
                setQuery("");
                sessionStorage.removeItem(
                  "table-search:" +
                    D.current()?.id +
                    here.pathname +
                    ":" +
                    name,
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
            <button onClick={() => setExportScope("matching")}>
              <Download size={15} /> Export {name}
            </button>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table aria-label={name}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort === c.key
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {sortable(c) ? (
                    <button
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("sort", c.key);
                        next.set("page", "1");
                        next.set(
                          "dir",
                          sort === c.key && direction === "asc"
                            ? "desc"
                            : "asc",
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
                  ) : (
                    c.label
                  )}
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
                  input.current?.focus();
                  setQuery("");
                  sessionStorage.removeItem(
                    "table-search:" +
                      D.current()?.id +
                      here.pathname +
                      ":" +
                      name,
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
      <div className="pagination" aria-label={`${name} pagination`}>
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
            title="Previous page"
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
            title="Next page"
            aria-label="Next page"
            disabled={p >= pages}
            onClick={() => put("page", String(p + 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {exportScope && (
        <ExportDialog
          name={name}
          matching={filtered}
          page={visible}
          close={() => setExportScope(null)}
        />
      )}
    </div>
  );
}
export function Schema() {
  return (
    <dl className="schema">
      {Object.entries(D.fieldRules).map(([k, v]) => (
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

export function ExportDialog({
  name,
  matching,
  page,
  close,
}: {
  name: string;
  matching: Record<string, unknown>[];
  page: Record<string, unknown>[];
  close: () => void;
}) {
  const [scope, setScope] = useState("matching"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const metadata = D.exportMetadata();
  return (
    <Dialog title={"Export " + name} busy={busy} close={close}>
      <p>Download synthetic data from the current filters and sort order.</p>
      <label>
        Export scope
        <select value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="matching">
            All matching rows ({matching.length})
          </option>
          <option value="page">Current page ({page.length})</option>
        </select>
      </label>
      <p className="notice">
        {metadata.dataset || name}
        {metadata.run_id ? " · run " + metadata.run_id : ""} · {metadata.schema}
        . CSV includes scope and synthetic-data metadata.
      </p>
      <FormMessage error={error} />
      <div className="dialog-actions">
        <button data-dialog-cancel disabled={busy} onClick={close}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={busy}
          aria-busy={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await D.delay("prepare export");
              const rows = (scope === "page" ? page : matching).map((row) => ({
                ...metadata,
                export_scope: scope,
                ...Object.fromEntries(
                  Object.entries(row).filter(([, v]) => typeof v !== "object"),
                ),
              }));
              D.download(name + "-" + scope + ".csv", D.csv(rows));
              notify("CSV prepared for download.");
              close();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Preparing…" : "Download CSV"}
        </button>
      </div>
    </Dialog>
  );
}
