import React, { useEffect, useId, useRef, useState } from "react";
import {
  Link as RouterLink,
  type LinkProps,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import * as D from "./domain";

export function useQuery() {
  const [params, setParams] = useSearchParams();
  const set = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    if (!("page" in values)) next.delete("page");
    setParams(next);
  };
  return { params, set };
}
export function Link({ to, ...props }: LinkProps) {
  const here = useLocation();
  let dest = typeof to === "string" ? to : undefined;
  if (dest?.startsWith("/") && !dest.includes("?") && !dest.includes("#"))
    dest =
      sessionStorage.getItem("view:" + D.current()?.id + ":" + dest) || dest;
  return (
    <RouterLink
      {...props}
      to={dest || to}
      state={props.state || { from: here.pathname + here.search + here.hash }}
    />
  );
}
export function FormMessage({ error }: { error: string }) {
  const ref = useRef<HTMLParagraphElement>(null),
    id = useId();
  useEffect(() => {
    if (!error) return;
    const scope = ref.current?.closest("form,dialog");
    const fields = Array.from(
      scope?.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >("input:not([type=file]),textarea,select") || [],
    );
    const bad = fields.filter((f) => !f.checkValidity());
    const affected = bad.length ? bad : fields;
    affected.forEach((f) => {
      f.setAttribute("aria-invalid", "true");
      f.setAttribute("aria-describedby", id);
    });
    (bad[0] || fields[0])?.focus();
    return () =>
      affected.forEach((f) => {
        f.removeAttribute("aria-invalid");
        f.removeAttribute("aria-describedby");
      });
  }, [error, id]);
  return (
    <p
      ref={ref}
      id={id}
      className={error ? "error form-status" : "form-status"}
      role={error ? "alert" : "status"}
    >
      {error || <span aria-hidden="true"> </span>}
    </p>
  );
}
export function Popover({
  id,
  close,
  children,
}: {
  id: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement;
    ref.current?.querySelector<HTMLElement>("button,a")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        trigger?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (
        !ref.current?.contains(e.target as Node) &&
        !trigger?.contains(e.target as Node)
      )
        close();
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  return (
    <div
      ref={ref}
      id={id}
      className={"popover " + id}
      role="region"
      aria-label={id === "account" ? "Account options" : "Workspace activity"}
    >
      {children}
    </div>
  );
}
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );
  useEffect(() => {
    let target: HTMLElement | null = null;
    const show = (e: Event) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(
        "button[title],a[title],button[aria-label],a[aria-label]",
      );
      if (!el || (el.textContent?.trim() && !el.classList.contains("avatar")))
        return;
      target = el;
      const r = el.getBoundingClientRect();
      setTip({
        text: el.title || el.getAttribute("aria-label") || "",
        x: Math.max(90, Math.min(innerWidth - 90, r.x + r.width / 2)),
        y: r.bottom + 8,
      });
      el.setAttribute("aria-describedby", "ui-tooltip");
    };
    const hide = () => {
      target?.removeAttribute("aria-describedby");
      setTip(null);
    };
    document.addEventListener("focusin", show);
    document.addEventListener("pointerover", show);
    document.addEventListener("focusout", hide);
    document.addEventListener("pointerout", hide);
    document.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("focusin", show);
      document.removeEventListener("pointerover", show);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("pointerout", hide);
      document.removeEventListener("scroll", hide, true);
    };
  }, []);
  return tip ? (
    <span
      id="ui-tooltip"
      role="tooltip"
      className="tooltip"
      style={{ left: tip.x, top: tip.y }}
    >
      {tip.text}
    </span>
  ) : null;
}
export class PageBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    if (this.state.error)
      return (
        <section className="card error-panel">
          <h1>
            {this.state.error.includes("Forbidden")
              ? "Access restricted"
              : "Page unavailable"}
          </h1>
          <p>{this.state.error}</p>
          <p className="muted">Reference: VIEW-RECOVERY</p>
          <Link className="button" to="/">
            Back to workspace
          </Link>
          <Link className="button" to="/help">
            Recovery guide
          </Link>
        </section>
      );
    return this.props.children;
  }
}
export function Loading({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <section className="card loading-region" role="status">
      <span className="spinner" />
      <p>{label}</p>
    </section>
  );
}
export function ReadGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState("loading"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState("loading");
    D.readWorkspace()
      .then(() => {
        if (active) setState("ready");
      })
      .catch((e) => {
        if (active) setState(e.message);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return state === "ready" ? (
    children
  ) : state === "loading" ? (
    <Loading />
  ) : (
    <section className="card error-panel">
      <h1>Workspace unavailable</h1>
      <p role="alert">{state}</p>
      <button onClick={() => setAttempt((n) => n + 1)}>Retry read</button>
    </section>
  );
}
export function useOperation() {
  const active = useRef(true),
    revision = useRef(D.sessionRevision);
  useEffect(() => {
    active.current = true;
    revision.current = D.sessionRevision;
    return () => {
      active.current = false;
    };
  }, []);
  return (allowSessionChange = false) =>
    active.current &&
    (allowSessionChange || revision.current === D.sessionRevision);
}
