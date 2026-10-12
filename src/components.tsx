import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand() {
  return (
    <span className="brand-lockup">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <b>student</b>performance<small>COURSE MVP</small>
      </span>
    </span>
  );
}

export function Title({
  title,
  sub,
  eyebrow,
  actions,
  back,
}: {
  title: string;
  sub?: string;
  eyebrow?: string;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  useEffect(() => {
    document.title = `${title} — Student Performance`;
  }, [title]);
  return (
    <div className="page-title">
      <div>
        {back && (
          <Link className="back-link" to={back.to}>
            <ChevronLeft size={16} />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="title-actions">{actions}</div>}
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "error" | "success";
  title?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {title && <strong>{title}</strong>}
      <div>{children}</div>
    </div>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const helpId = error ? `${id}-error` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={helpId}
        />
        <button
          type="button"
          className="icon-button"
          aria-label={
            visible
              ? `Hide ${label.toLowerCase()}`
              : `Show ${label.toLowerCase()}`
          }
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <span id={helpId} className="field-error">
          {error}
        </span>
      )}
    </div>
  );
}

export function Pager({
  page,
  total,
  pageSize = 25,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = total ? (safePage - 1) * pageSize + 1 : 0;
  const end = Math.min(total, safePage * pageSize);
  return (
    <nav className="pager" aria-label="Table pages">
      <span>
        {start}–{end} of {total}
      </span>
      <div>
        <button
          type="button"
          onClick={() => onChange(safePage - 1)}
          disabled={safePage <= 1}
        >
          <ChevronLeft size={16} />
          Previous
        </button>
        <span aria-current="page">
          Page {safePage} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onChange(safePage + 1)}
          disabled={safePage >= pages}
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}

export function DataTable({
  label,
  headers,
  children,
}: {
  label: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-frame">
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {headers.map((header) => (
                <th scope="col" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <div className="empty-orbit" aria-hidden="true">
        <i />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </section>
  );
}

export function Dialog({
  title,
  close,
  children,
  variant = "dialog",
  busy = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  variant?: "dialog" | "drawer" | "plan";
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const cancel = (event: Event) => {
      if (busy) event.preventDefault();
      else close();
    };
    dialog.addEventListener("cancel", cancel);
    return () => dialog.removeEventListener("cancel", cancel);
  }, [busy, close]);
  return (
    <dialog
      ref={ref}
      className={`dialog ${variant}`}
      aria-labelledby="dialog-title"
      onClick={(event) => {
        if (event.target === ref.current && !busy) close();
      }}
    >
      <div className="dialog-panel">
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={close}
            disabled={busy}
            aria-label={`Close ${title}`}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </dialog>
  );
}

export function ErrorPanel({
  title = "Page unavailable",
  text,
  action,
}: {
  title?: string;
  text: string;
  action?: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} — Student Performance`;
  }, [title]);
  return (
    <EmptyState
      title={title}
      text={text}
      action={
        action ?? (
          <Link className="button primary" to="/dashboard">
            Return to dashboard
          </Link>
        )
      }
    />
  );
}
