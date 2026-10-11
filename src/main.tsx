import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Upload,
  Download,
  ChevronDown,
  X,
  Check,
  Grid2X2,
  ChartNoAxesCombined,
  History,
  HelpCircle,
  Settings2,
  FlaskConical,
  LogOut,
  Bell,
  FolderOpen,
  CheckCheck,
  Layers,
  Users,
  CalendarDays,
} from "lucide-react";
import * as D from "./domain";
import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "./style.css";
const icons = {
  datasets: Layers,
  evaluation: ChartNoAxesCombined,
  analytics: Grid2X2,
  activity: History,
  accounts: Users,
  plan: CalendarDays,
};

import type { Modal, Context } from "./types";
import {
  Link,
  Popover,
  TooltipLayer,
  PageBoundary,
  ReadGate,
  FormMessage,
} from "./ui";
import { type Notice, bindNotify, notify } from "./notifications";
import { Dialog, Login, ErrorPanel } from "./components";
import { Workspace } from "./features/screens";
function App() {
  const [, render] = useState(0);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Notice | null>(null);
  const [pageError, setPageError] = useState("");
  const [modalError, setModalError] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);
  const modalRef = useRef(modal);
  modalRef.current = modal;
  const [modalBusy, setModalBusy] = useState(false);
  useEffect(() => {
    setModalBusy(false);
    setModalError("");
  }, [modal]);
  const [demo, setDemo] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [full, setFull] = useState(
    localStorage.getItem("prototype-mode") !== "core",
  );
  const location = useLocation(),
    nav = useNavigate();
  bindNotify(setToast);
  useEffect(() => {
    const a = D.current();
    if (a)
      sessionStorage.setItem(
        "view:" + a.id + ":" + location.pathname,
        location.pathname + location.search + location.hash,
      );
    setMenu(false);
    setNotifications(false);
    setPageError("");
  }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    D.init().then(() => setReady(true));
    return D.subscribe(() => render((x) => x + 1));
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      void D.resolveRuns().catch((e) => setPageError(e.message));
    }, 700);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  if (!ready)
    return <div className="boot">Opening your teaching workspace…</div>;
  const user = D.current();
  const resume = sessionStorage.getItem("session-return");
  const home =
    user?.role === "teacher"
      ? "/datasets"
      : user?.role === "administrator" && full
        ? "/admin/accounts"
        : "/evaluations/demo-eval-v1";
  const act = async (fn: () => Promise<unknown> | unknown) => {
    try {
      await fn();
    } catch (e) {
      const message = (e as Error).message;
      if (modalRef.current) setModalError(message);
      else setPageError(message);
      notify(message, "error");
    }
  };
  const logout = () => {
    sessionStorage.clear();
    D.invalidateSession();
    setNotifications(false);
    setMenu(false);
    nav("/login");
    render((x) => x + 1);
  };
  document.documentElement.dataset.density =
    D.db.preferences[user?.id || ""]?.density || "comfortable";
  const teacher = user?.role === "teacher";
  const links = teacher
    ? [
        ["datasets", "Datasets", "/datasets"],
        ["plan", "Plan", "/plan"],
        ["evaluation", "Model evaluation", "/evaluations/demo-eval-v1"],
        ...(full
          ? [
              ["analytics", "Analytics", "/analytics"],
              ["activity", "Activity", "/activity"],
            ]
          : []),
      ]
    : [
        ["plan", "Plan", "/plan"],
        ["evaluation", "Model evaluation", "/evaluations/demo-eval-v1"],
        ...(user?.role === "administrator" && full
          ? [
              ["accounts", "Accounts", "/admin/accounts"],
              ["activity", "Activity", "/activity"],
            ]
          : []),
      ];
  return (
    <div className="app-frame">
      <header>
        <Link className="brand" to={user ? home : "/login"}>
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            student<span className="brand-light">performance</span>
            <small>PREDICTION & DECISION SUPPORT</small>
          </span>
        </Link>
        {user && (
          <nav aria-label="Main navigation">
            {links.map(([key, label, to]) => {
              const Icon = icons[key as keyof typeof icons];
              return (
                <Link
                  key={key}
                  to={to}
                  className={
                    location.pathname.startsWith(
                      to.split("/").slice(0, 2).join("/"),
                    )
                      ? "active"
                      : ""
                  }
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        )}
        {user && (
          <details className="mobile-nav">
            <summary>
              Workspace menu <ChevronDown size={15} />
            </summary>
            <div>
              {links.map(([key, label, to]) => {
                const Icon = icons[key as keyof typeof icons];
                return (
                  <Link
                    key={key}
                    to={to}
                    onClick={(e) =>
                      ((
                        e.currentTarget.closest("details") as HTMLDetailsElement
                      ).open = false)
                    }
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                );
              })}
              <Link to="/help">Help & guides</Link>
              {full && <Link to="/settings">Preferences</Link>}
            </div>
          </details>
        )}
        <div className="header-end">
          <span className="synthetic">
            <i /> Synthetic data
          </span>
          {user && (
            <>
              <button
                className="icon"
                title="Notifications"
                aria-label={`Notifications, ${D.authorizedEvents().filter((e) => !e.read).length} unread`}
                aria-expanded={notifications}
                aria-controls="notification"
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={19} />
                {D.authorizedEvents().some((e) => !e.read) && (
                  <b className="notification-count">
                    {D.authorizedEvents().filter((e) => !e.read).length}
                  </b>
                )}
              </button>
              <button
                className="avatar"
                aria-label="Account menu"
                aria-expanded={menu}
                aria-controls="account"
                title="Account menu"
                onClick={() => setMenu(!menu)}
              >
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </button>
            </>
          )}
        </div>
        {menu && (
          <Popover id="account" close={() => setMenu(false)}>
            <strong>{user?.name}</strong>
            <small>{user?.role} · Demo account</small>
            {full && (
              <Link to="/settings" onClick={() => setMenu(false)}>
                Preferences
              </Link>
            )}
            <button onClick={logout}>
              <LogOut size={15} /> Sign out
            </button>
          </Popover>
        )}
        {notifications && user && (
          <Popover id="notification" close={() => setNotifications(false)}>
            <strong>Workspace activity</strong>
            <button
              onClick={() =>
                act(async () => {
                  D.db.events
                    .filter((e) => e.owner === user.id)
                    .forEach((e) => (e.read = true));
                  await D.persist();
                })
              }
            >
              Mark all read
            </button>
            {D.db.events
              .filter((e) => e.owner === user.id)
              .slice(0, 6)
              .map((e) => (
                <p key={e.id}>
                  {e.text}
                  {D.eventDestination(e) && (
                    <Link
                      to={D.eventDestination(e)!}
                      onClick={() =>
                        void act(async () => {
                          e.read = true;
                          await D.persist();
                          setNotifications(false);
                        })
                      }
                    >
                      Open activity object
                    </Link>
                  )}
                  <small>{D.formatDate(e.date)}</small>
                </p>
              ))}
            {!D.db.events.some((e) => e.owner === user.id) && (
              <p>You’re all caught up. New activity appears here.</p>
            )}
          </Popover>
        )}
      </header>
      <div className="shell">
        {user && (
          <aside className="rail">
            <div>
              <Link
                className={location.pathname === "/help" ? "selected" : ""}
                title="Help and guides"
                aria-label="Help and guides"
                to="/help"
              >
                <HelpCircle size={19} />
              </Link>
              {full && (
                <Link
                  className={
                    location.pathname === "/settings" ? "selected" : ""
                  }
                  title="Preferences"
                  aria-label="Preferences"
                  to="/settings"
                >
                  <Settings2 size={19} />
                </Link>
              )}
            </div>
            <button
              title="Demo Controls"
              aria-label="Demo Controls"
              onClick={() => setDemo(true)}
            >
              <FlaskConical size={19} />
            </button>
          </aside>
        )}
        <main key={user?.id || "guest"}>
          {pageError && (
            <div className="notice error" role="alert">
              <span>{pageError}</span>
              <button onClick={() => setPageError("")}>Dismiss error</button>
            </div>
          )}
          <details className="tablet-utilities">
            <summary>Workspace utilities</summary>
            <Link to="/help">Help & guides</Link>
            {full && <Link to="/settings">Preferences</Link>}
            <button onClick={() => setDemo(true)}>Demo Controls</button>
          </details>
          {D.storageError ? (
            <ErrorPanel
              title="Storage needs attention"
              text={D.storageError}
              action={
                <button onClick={() => setDemo(true)}>
                  Open Demo Controls
                </button>
              }
            />
          ) : !user && location.pathname !== "/login" ? (
            <>
              {sessionStorage.getItem("session-reason") && (
                <p className="notice" role="status">
                  {sessionStorage.getItem("session-reason")}
                </p>
              )}
              <Login
                onLogin={(a) =>
                  nav(
                    D.safeReturn(
                      location.pathname + location.search + location.hash,
                      a,
                      full,
                    ) ||
                      (a.role === "teacher"
                        ? "/datasets"
                        : a.role === "administrator" && full
                          ? "/admin/accounts"
                          : "/evaluations/demo-eval-v1"),
                  )
                }
                returnTo={location.pathname + location.search + location.hash}
              />
            </>
          ) : location.pathname === "/login" || !user ? (
            <>
              {sessionStorage.getItem("session-reason") && (
                <p className="notice" role="status">
                  {sessionStorage.getItem("session-reason")}
                </p>
              )}
              <Login
                onLogin={(a) =>
                  nav(
                    D.safeReturn(resume, a, full) ||
                      (a.role === "teacher"
                        ? "/datasets"
                        : a.role === "administrator" && full
                          ? "/admin/accounts"
                          : "/evaluations/demo-eval-v1"),
                  )
                }
              />
            </>
          ) : (
            <PageBoundary key={location.pathname + user.id + String(full)}>
              <ReadGate>
                <Workspace user={user} full={full} modal={setModal} act={act} />
              </ReadGate>
            </PageBoundary>
          )}
        </main>
      </div>
      <footer>
        <span>
          <span className="live-dot" /> Interactive demo{" "}
          <span className="footer-divider">/</span> Synthetic data only
        </span>
        <button onClick={() => setDemo(true)}>
          <FlaskConical size={14} /> Demo Controls{" "}
          <span className="mode-tag">{full ? "Full" : "Core"}</span>
        </button>
        <Link className="footer-help" to="/help">
          Help & user guide <ArrowUpRight size={12} />
        </Link>
      </footer>
      {D.preparedDownloads.find((d) => d.owner === user?.id) &&
        (() => {
          const file = D.preparedDownloads.find((d) => d.owner === user?.id)!;
          return (
            <div className="file-ready" role="status">
              <span>File ready</span>
              <a href={file.url} download={file.name}>
                {file.name}
              </a>
              <button
                aria-label="Dismiss prepared file"
                title="Dismiss prepared file"
                onClick={() => D.dismissDownload(file.url)}
              >
                <X size={15} />
              </button>
            </div>
          );
        })()}
      {toast && (
        <div
          className={"toast " + toast.tone}
          role={toast.tone === "error" ? "alert" : "status"}
        >
          {toast.tone === "error" ? (
            <X size={18} />
          ) : toast.tone === "info" ? (
            <HelpCircle size={18} />
          ) : (
            <CheckCheck size={18} />
          )}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Dialog
          title={modal.title}
          variant={modal.variant}
          busy={modalBusy}
          close={() => {
            modal.cancel?.();
            setModal(null);
          }}
        >
          <div>{modal.body}</div>
          <FormMessage error={modalError} />
          <div className="dialog-actions">
            <button
              autoFocus
              data-dialog-cancel
              disabled={modalBusy}
              onClick={() => {
                modal.cancel?.();
                setModal(null);
              }}
            >
              Cancel
            </button>
            {modal.action && (
              <button
                className={modal.danger ? "danger" : "primary"}
                disabled={modalBusy}
                onClick={async () => {
                  if (modalBusy) return;
                  setModalBusy(true);
                  try {
                    await modal.action?.();
                  } catch (e) {
                    setModalError((e as Error).message);
                  } finally {
                    setModalBusy(false);
                  }
                }}
              >
                {modal.label || "Save changes"}
              </button>
            )}
          </div>
        </Dialog>
      )}
      {demo && (
        <Dialog
          variant="drawer"
          title="Demo Controls"
          close={() => setDemo(false)}
        >
          <p>
            Prototype tools for exploring the workflow. Persona switching
            simulates sign-in; it is not a production permission feature.
          </p>
          <label>
            Prototype scope
            <select
              value={full ? "full" : "core"}
              onChange={(e) => {
                const v = e.target.value === "full";
                setFull(v);
                localStorage.setItem("prototype-mode", v ? "full" : "core");
                nav("/");
              }}
            >
              <option value="full">Full · core + course enhancements</option>
              <option value="core">Core · essential journey</option>
            </select>
          </label>
          <label>
            Switch demo persona
            <select
              value={user?.id || ""}
              onChange={(e) =>
                act(async () => {
                  const a = D.db.accounts.find((a) => a.id === e.target.value)!;
                  await D.login(a.email, "DemoOnly!2026");
                  setDemo(false);
                  nav(
                    a.role === "teacher"
                      ? "/datasets"
                      : a.role === "administrator" && full
                        ? "/admin/accounts"
                        : "/evaluations/demo-eval-v1",
                  );
                })
              }
            >
              <option value="" disabled>
                Choose account
              </option>
              {D.db.accounts.map((a) => (
                <option value={a.id} key={a.id}>
                  {a.name} · {a.role}
                  {!a.enabled ? " · disabled" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service latency
            <select
              onChange={(e) => D.config(D.scenario, +e.target.value)}
              defaultValue={D.latency}
            >
              <option value="450">Normal · 450 ms</option>
              <option value="2200">Slow · 2.2 s</option>
            </select>
          </label>
          <label>
            One-shot operation scenario
            <select
              value={D.scenario}
              onChange={(e) => {
                D.config(e.target.value, D.latency);
                render((x) => x + 1);
              }}
            >
              {[
                "normal",
                "invalid credentials",
                "login",
                "validate",
                "import rollback",
                "uncertain import",
                "start prediction",
                "ML unavailable",
                "malformed predictions",
                "schema mismatch",
                "model mismatch",
                "duplicate IDs",
                "missing IDs",
                "out of range",
                "storage failure",
                "read workspace",
                "evaluation unavailable",
                "slow prediction",
                "connection loss",
                "review",
                "feedback",
                "download",
              ].map((s) => (
                <option key={s} value={s}>
                  {(
                    {
                      normal: "No failure",
                      login: "Sign-in service unavailable",
                      validate: "File validation unavailable",
                      review: "Review save failure",
                      feedback: "Feedback save failure",
                      download: "File preparation failure",
                      "read workspace": "Workspace read failure",
                    } as Record<string, string>
                  )[s] ?? s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <p className="notice" role="status">
            {D.scenarioState}
          </p>
          <button onClick={() => D.config("normal", D.latency)}>
            Clear scenario
          </button>
          <small>
            Failures affect only the named operation and reset after
            consumption. Upload invalid samples from Help for concrete
            validation errors.
          </small>
          <div className="button-row">
            <button
              onClick={() => {
                sessionStorage.setItem(
                  "session-return",
                  location.pathname + location.search + location.hash,
                );
                sessionStorage.removeItem("persona");
                D.invalidateSession();
                sessionStorage.setItem(
                  "session-reason",
                  "Your demo session expired. Sign in again to return to your work. A private review draft is restored only for its original author.",
                );
                setDemo(false);
                nav("/login");
                notify("Session expired. Sign in again.");
              }}
            >
              Expire session
            </button>
            <button
              onClick={() => {
                D.db.previews
                  .filter((p) => !p.dataset)
                  .forEach((p) => (p.expires = 0));
                void D.persist();
                notify("Unconfirmed previews expired.");
              }}
            >
              Expire previews
            </button>
            <button
              onClick={() =>
                act(() =>
                  D.download(
                    "student-performance-prototype-backup.json",
                    JSON.stringify(D.db, null, 2),
                    "application/json",
                  ),
                )
              }
            >
              Export backup
            </button>
          </div>
          <label className="restore">
            Restore prototype backup
            <input
              type="file"
              accept=".json"
              onChange={(e) =>
                act(async () => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const s = D.validateBackup(
                    JSON.parse((await f.text()).replace(/^\uFEFF/, "")),
                  );
                  setDemo(false);
                  setModal({
                    title: "Replace local demo data?",
                    body: (
                      <p>
                        This replaces accounts, datasets, predictions and
                        reviews. Download your current backup before continuing.
                      </p>
                    ),
                    label: "Restore backup",
                    danger: true,
                    action: () =>
                      act(async () => {
                        D.download(
                          "before-restore-backup.json",
                          JSON.stringify(D.db),
                          "application/json",
                        );
                        await D.restore(s);
                        sessionStorage.removeItem("persona");
                        setModal(null);
                        nav("/login");
                        notify("Backup restored. Sign in to continue.");
                      }),
                  });
                })
              }
            />
          </label>
          <DemoScenarios close={() => setDemo(false)} act={act} />
          <button
            className="danger"
            onClick={() => {
              setDemo(false);
              setModal({
                title: "Reset the demo?",
                body: (
                  <p>
                    All local imports, predictions, reviews, preferences,
                    accounts and feedback will be replaced by the original
                    synthetic fixtures.
                  </p>
                ),
                label: "Reset demo",
                danger: true,
                action: () =>
                  act(async () => {
                    await D.restore(D.seed());
                    sessionStorage.removeItem("persona");
                    setModal(null);
                    nav("/login");
                    notify("Demo reset to original fixtures.");
                  }),
              });
            }}
          >
            Reset demo
          </button>
        </Dialog>
      )}
      <TooltipLayer />
    </div>
  );
}
function DemoScenarios({
  close,
  act,
}: {
  close: () => void;
  act: Context["act"];
}) {
  const nav = useNavigate();
  const items = [
    [
      "Schema mismatch",
      "schema mismatch",
      "/datasets/dataset-1",
      "Start a prediction; response schema is rejected.",
    ],
    [
      "Model mismatch",
      "model mismatch",
      "/datasets/dataset-1",
      "Start a prediction; response model is rejected.",
    ],
    [
      "Duplicate prediction IDs",
      "duplicate IDs",
      "/datasets/dataset-1",
      "Start a prediction; duplicate IDs fail atomically.",
    ],
    [
      "Missing prediction ID",
      "missing IDs",
      "/datasets/dataset-1",
      "Start a prediction; missing results fail atomically.",
    ],
    [
      "Out-of-range prediction",
      "out of range",
      "/datasets/dataset-1",
      "Start a prediction; risk outside [0,1] is rejected.",
    ],
    [
      "Browser save failure",
      "storage failure",
      "/datasets/new?fixture=valid-12",
      "The next browser save fails. Previous saved data is retained.",
    ],
    [
      "Feedback save failure",
      "feedback",
      "/help",
      "Enter feedback and save; the draft stays editable for retry.",
    ],
    [
      "Workspace read unavailable",
      "read workspace",
      "/datasets",
      "Open this page; retry the failed read deliberately.",
    ],
    [
      "Invalid credentials",
      "invalid credentials",
      "/login",
      "Submit any demo account; the next login fails.",
    ],
    [
      "Disabled account",
      "normal",
      "/login",
      "Fill the Disabled teacher credentials, then sign in.",
    ],
    [
      "Wrong-owner dataset",
      "normal",
      "/datasets/dataset-4",
      "Maya is forbidden from reading Noah’s dataset.",
    ],
    [
      "No search results",
      "normal",
      "/datasets?q=does-not-exist",
      "Clear the dataset search to recover.",
    ],
    [
      "Invalid CSV values",
      "normal",
      "/datasets/new?fixture=invalid-values",
      "Validate this explicitly selected invalid fixture.",
    ],
    [
      "Missing CSV field",
      "normal",
      "/datasets/new?fixture=missing-column",
      "Validate the missing-column fixture.",
    ],
    [
      "Import rollback",
      "import rollback",
      "/datasets/new?fixture=valid-12",
      "Validate and confirm; nothing commits. Retry deliberately.",
    ],
    [
      "Uncertain import completion",
      "uncertain import",
      "/datasets/new?fixture=valid-12",
      "Confirm, then Check import status. Only one dataset is created.",
    ],
    [
      "ML unavailable",
      "ML unavailable",
      "/datasets/dataset-1",
      "Start a new prediction; it fails without results.",
    ],
    [
      "Malformed prediction response",
      "malformed predictions",
      "/datasets/dataset-1",
      "Start a new prediction; invalid output is rejected.",
    ],
    [
      "Slow prediction",
      "slow prediction",
      "/datasets/dataset-1",
      "Start a new run to see persisted running state for 12 seconds.",
    ],
    [
      "Connection loss after run start",
      "connection loss",
      "/datasets/dataset-1",
      "Start a run, then Check run status to reconcile its saved ID.",
    ],
    [
      "Completed run recovery",
      "normal",
      "/prediction-runs/run-1",
      "Reload the page; saved results remain unchanged.",
    ],
    [
      "Undefined evaluation metric",
      "normal",
      "/evaluations/one-class",
      "No positive examples means precision and recall are undefined.",
    ],
    [
      "Evaluation unavailable",
      "evaluation unavailable",
      "/evaluations/demo-eval-v1",
      "Use Retry evaluation to recover the read.",
    ],
    [
      "Missing evaluation",
      "normal",
      "/evaluations/missing",
      "Use Open evaluation to recover.",
    ],
    [
      "Failed download preparation",
      "download",
      "/evaluations/demo-eval-v1",
      "Click Download report. The one-shot failure preserves data.",
    ],
    [
      "Failed review save",
      "review",
      "/datasets/dataset-1/records/STU-007",
      "Write a review and save. The draft stays editable after failure.",
    ],
  ];
  return (
    <details>
      <summary>Run a reproducible scenario</summary>
      <p className="fine">
        Use Maya for record scenarios. Trigger expiry with the controls above;
        revisit a consumed preview using browser Back to inspect duplicate
        confirmation.
      </p>
      {items.map(([title, scenario, path, hint]) => (
        <div className="scenario-item" key={title}>
          <button
            onClick={() => {
              D.config(scenario, D.latency);
              close();
              nav(path);
              notify(hint);
            }}
          >
            {title}
            <ArrowUpRight size={13} />
          </button>
          <small>{hint}</small>
        </div>
      ))}
      <button
        onClick={() =>
          act(() => D.restore({ version: 999 } as unknown as D.Store))
        }
      >
        Test corrupt backup rejection
      </button>
      <button
        onClick={() =>
          act(async () => {
            const a = {
              id: D.uid(),
              name: "Empty demo teacher",
              email: "empty-" + D.uid().slice(0, 8) + "@demo.example",
              role: "teacher",
              enabled: true,
            };
            D.db.accounts.push(a);
            await D.persist();
            await D.login(a.email, "DemoOnly!2026");
            close();
            nav("/datasets");
            notify("A new synthetic teacher has no datasets.");
          })
        }
      >
        Explore empty teacher workspace
      </button>
    </details>
  );
}
createRoot(document.getElementById("root")!).render(
  <RouterProvider
    router={createBrowserRouter([{ path: "*", element: <App /> }])}
  />,
);
