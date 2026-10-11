import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Clock3,
  Copy,
  Flag,
  Gem,
  Link2,
  ListChecks,
  Users,
  TriangleAlert,
} from "lucide-react";
import { DATA, type Planner } from "./runtime.js";
import { completionProblem, inScope } from "./model";

function Tile({
  title,
  icon,
  children,
  className = "",
  id,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`card plan-tile ${className}`} id={id}>
      <div className="plan-tile-heading">
        <h3>{title}</h3>
        <span className="plan-tile-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      {children}
    </section>
  );
}
const hours = (range: number[]) => `${range[0]}–${range[1]}h`;
const bullets = (items: string[]) => (
  <ul className="plan-detail-list">
    {items.map((text, i) => (
      <li key={i}>{text}</li>
    ))}
  </ul>
);

export function PlanDetail({
  id,
  planner,
  open,
  back,
}: {
  id: string;
  planner: Planner;
  open: (id: string) => void;
  back?: () => void;
}) {
  const task = DATA.tasks.find((task) => task.id === id)!;
  const progress = planner.getProgress();
  const status = progress.cards[id] || "Backlog";
  const scoped = inScope(task, progress);
  const doneSteps = task.steps.filter(
    (_, i) => progress.checks[`${id}:step:${i}`],
  ).length;
  const doneCriteria = task.accept.filter(
    (_, i) => progress.checks[`${id}:accept:${i}`],
  ).length;
  const doneDeps = task.depends.filter(
    (id) => progress.cards[id] === "Done",
  ).length;
  const evidence = progress.evidence[id] || { artifact: "", reviewed: false };
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copying, setCopying] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const el = heading.current;
    const dialog = el?.closest("dialog");
    if (dialog) dialog.scrollTop = 0;
    el?.focus({ preventScroll: true });
    return () => {
      mounted.current = false;
    };
  }, []);
  const change = (action: () => string | void, success: string) => {
    try {
      const result = action();
      setError(result || "");
      if (!result) setMessage(success);
    } catch {
      setError(
        "This change could not be saved. Try again; export progress to keep a backup.",
      );
    }
  };
  const related = (ids: string[]) =>
    ids.length ? (
      <div className="plan-related">
        {ids.map((id) => {
          const related = DATA.tasks.find((t) => t.id === id)!;
          return (
            <button
              key={id}
              className="plan-related-row"
              onClick={() => open(id)}
              title={related.title}
            >
              <span
                className={`plan-dep-marker ${progress.cards[id] === "Done" ? "complete" : ""}`}
                aria-hidden="true"
              >
                {progress.cards[id] === "Done" ? "✓" : "↗"}
              </span>
              <span>
                <b>{id}</b>
                <small>{related.title}</small>
              </span>
              <span className="plan-related-status">
                {progress.cards[id] || "Backlog"}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <p className="plan-detail-muted">None. This card has no prerequisite.</p>
    );
  const effort = [
    { label: "Owner", values: [task.hours.low, task.hours.high] },
    { label: "Pairing", values: task.pair.hours },
    { label: "Review", values: task.reviewHours },
  ];
  const maxHours = Math.max(...effort.map((item) => item.values[1]), 1);
  const readiness = completionProblem(task, "In Progress", progress);
  return (
    <div className="plan-detail">
      <div className="plan-detail-utilities">
        {back ? (
          <button onClick={back}>
            <ArrowLeft size={15} /> Back to previous card
          </button>
        ) : (
          <span className="plan-detail-muted">
            Full guided brief · Saved in this browser
          </span>
        )}
        <button
          disabled={copying}
          onClick={async () => {
            setCopying(true);
            setError("");
            try {
              const text = await planner.copy(id);
              if (mounted.current) setMessage(text);
            } catch {
              if (mounted.current)
                setError("Copy and download failed. Try again.");
            } finally {
              if (mounted.current) setCopying(false);
            }
          }}
        >
          <Copy size={15} />
          {copying ? "Preparing…" : "Copy full card"}
        </button>
      </div>
      <div className="plan-detail-hero">
        <div className="plan-detail-crumb">
          {task.sprint ? `Sprint ${task.sprint}` : "Unscheduled"} <span>→</span>{" "}
          {status} <span>→</span> {id}
        </div>
        <h2 ref={heading} tabIndex={-1} data-plan-title>
          {task.title}
        </h2>
        <p className="plan-detail-objective">{task.objective}</p>
        <div className="plan-detail-head-bottom">
          <div className="plan-detail-chips">
            <span className="dark">{id}</span>
            <span className="lime">{task.priority}</span>
            <span>{task.sp} SP</span>
            <span>{task.kind}</span>
            <span>
              {!task.sprint
                ? "Excluded"
                : task.priority === "Must"
                  ? "Core forecast"
                  : scoped
                    ? "Selected stretch"
                    : "Unselected stretch"}
            </span>
          </div>
          <div
            className="plan-status-group"
            role="group"
            aria-label="Task status"
          >
            {["Backlog", "In Progress", "Done"].map((next) => (
              <button
                key={next}
                aria-pressed={status === next}
                disabled={!scoped && next !== "Backlog"}
                onClick={() =>
                  change(
                    () => planner.status(id, next),
                    `${id} moved to ${next}.`,
                  )
                }
              >
                {next}
              </button>
            ))}
          </div>
        </div>
        <p className="plan-detail-muted plan-gate-note">
          {readiness ||
            "Prerequisites complete. Finish steps and acceptance checks before Done."}
        </p>
        {["Should", "Could"].includes(task.priority) && task.sprint > 0 && (
          <label className="plan-stretch-choice">
            <input
              type="checkbox"
              checked={scoped}
              onChange={(event) =>
                change(
                  () => planner.select(id, event.target.checked),
                  "Scope updated, including required optional prerequisites. Check team capacity for affected sprints.",
                )
              }
            />{" "}
            Select this stretch card for its forecast sprint
          </label>
        )}
        {error && (
          <p className="plan-detail-error" role="alert">
            {error}
          </p>
        )}
        {planner.getNotice() && (
          <p className="plan-detail-error" role="status">
            {planner.getNotice()}
          </p>
        )}
        <p className="plan-detail-message" role="status" aria-live="polite">
          {message}
        </p>
      </div>
      <div className="plan-detail-layout">
        <nav className="plan-detail-rail" aria-label="Card sections">
          {[
            ["effort", "Effort", <Clock3 size={18} />],
            ["steps", "Steps", <ListChecks size={18} />],
            ["evidence", "Done when", <CheckCheck size={18} />],
            ["learn", "Resources", <BookOpen size={18} />],
          ].map(([key, label, icon]) => (
            <a
              key={String(key)}
              href={`#plan-${id}-${key}`}
              aria-label={String(label)}
              title={String(label)}
            >
              {icon}
            </a>
          ))}
        </nav>
        <div className="plan-detail-grid">
          <Tile
            title="Effort"
            icon={<Clock3 size={19} />}
            id={`plan-${id}-effort`}
          >
            <p className="plan-detail-muted">Focused owner hours</p>
            <p className="plan-detail-big">
              {task.hours.low}–{task.hours.high}
              <small>h</small>
            </p>
            <div className="plan-effort-bars" aria-label="Estimated effort">
              {effort.map((item, i) => (
                <div
                  className={`plan-effort-bar ${i === 0 ? "owner" : ""}`}
                  key={item.label}
                >
                  <span>{hours(item.values)}</span>
                  <div
                    className="plan-effort-track"
                    style={{
                      height: `${Math.max((item.values[1] / maxHours) * 92, 6)}px`,
                    }}
                  >
                    <i
                      style={{
                        height: `${item.values[1] ? (item.values[0] / item.values[1]) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <small>{item.label}</small>
                </div>
              ))}
            </div>
            <p className="plan-detail-muted plan-effort-basis">
              {task.hours.basis}
            </p>
          </Tile>
          <Tile title="Start after" icon={<Link2 size={19} />}>
            <p className="plan-detail-muted">Prerequisites done</p>
            <p className="plan-detail-big">
              {doneDeps}
              <small> / {task.depends.length}</small>
            </p>
            <span className={`plan-readiness ${!readiness ? "ready" : ""}`}>
              {!scoped
                ? "Outside selected scope"
                : doneDeps === task.depends.length
                  ? "Prerequisites complete"
                  : "Blocked"}
            </span>
            {related(task.depends)}
            {task.unlocks.length > 0 && (
              <>
                <h4>Unblocks next</h4>
                <div className="plan-unlocks">
                  {task.unlocks.map((id) => (
                    <button key={id} onClick={() => open(id)}>
                      {id}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </Tile>
          <Tile title="People" icon={<Users size={19} />} className="mint">
            {[
              [task.owner, "Current owner"],
              [task.reviewer, "Reviewer"],
              ...(task.pair.member
                ? [[task.pair.member, "Pairing partner"]]
                : []),
            ].map(([person, role]) => (
              <div className="plan-person" key={role}>
                <span className="plan-person-avatar">{person}</span>
                <div>
                  <b>{planner.getName(person)}</b>
                  <small>
                    {role} · {person}
                  </small>
                </div>
              </div>
            ))}
            <p className="plan-detail-muted">{task.pair.plan}</p>
            <p className="plan-detail-muted">
              {task.pair.mode} · {hours(task.pair.hours)} additional helper
              hours; {hours(task.reviewHours)} reviewer hours.
            </p>
          </Tile>
          <Tile
            title="Steps"
            icon={<ListChecks size={19} />}
            className="steps-tile"
            id={`plan-${id}-steps`}
          >
            <p className="plan-detail-muted">
              Progress, not proof of completion
            </p>
            <p className="plan-detail-big">
              {doneSteps}
              <small> / {task.steps.length}</small>
            </p>
            <div
              className="plan-step-progress"
              role="progressbar"
              aria-label="Steps ticked"
              aria-valuemin={0}
              aria-valuemax={task.steps.length}
              aria-valuenow={doneSteps}
            >
              <i
                style={{ width: `${(doneSteps / task.steps.length) * 100}%` }}
              />
            </div>
            <ol className="plan-detail-checks">
              {task.steps.map((text, i) => (
                <li key={i}>
                  <label>
                    <input
                      type="checkbox"
                      checked={progress.checks[`${id}:step:${i}`] === true}
                      onChange={(event) =>
                        change(
                          () =>
                            planner.check(
                              `${id}:step:${i}`,
                              event.target.checked,
                            ),
                          "Checklist saved locally. Keep actual artifacts and independent review.",
                        )
                      }
                    />
                    <span>
                      <small className="plan-step-number">
                        {String(i + 1).padStart(2, "0")}
                      </small>
                      {text}
                    </span>
                  </label>
                </li>
              ))}
            </ol>
          </Tile>
          <Tile
            title="Start small"
            icon={<Gem size={28} />}
            className="lavender start-tile"
          >
            <p className="plan-start-callout">{task.starterExercise}</p>
            <pre className="plan-pattern">
              <code>{task.snippet.code}</code>
            </pre>
            <p className="plan-detail-muted">
              {task.snippet.language} · {task.snippet.note}
            </p>
          </Tile>
          <Tile
            title="Done when"
            icon={<CheckCheck size={19} />}
            className="evidence-tile"
            id={`plan-${id}-evidence`}
          >
            <div className="plan-evidence-top">
              <div className="plan-acceptance">
                {task.accept.map((text, i) => (
                  <label key={i}>
                    <input
                      type="checkbox"
                      checked={progress.checks[`${id}:accept:${i}`] === true}
                      onChange={(event) =>
                        change(
                          () =>
                            planner.check(
                              `${id}:accept:${i}`,
                              event.target.checked,
                            ),
                          "Acceptance check saved. Keep review evidence.",
                        )
                      }
                    />
                    <span>{text}</span>
                  </label>
                ))}
              </div>
              <div
                className="plan-evidence-bubble"
                aria-label={`${doneCriteria} of ${task.accept.length} acceptance checks complete`}
              >
                <span>
                  {Math.round((doneCriteria / task.accept.length) * 100)}
                  <small>%</small>
                </span>
                <b>
                  {doneCriteria}/{task.accept.length}
                </b>
              </div>
            </div>
            <h4>Concrete output</h4>
            <p>{task.outcome}</p>
            <label className="plan-artifact-field">
              Artifact, command, fixture or PR/report path{" "}
              <input
                value={evidence.artifact}
                maxLength={2000}
                placeholder="Keep the reproducible evidence here"
                onChange={(event) =>
                  planner.evidence(id, { artifact: event.target.value })
                }
              />
            </label>
            <label className="plan-review-check">
              <input
                type="checkbox"
                checked={evidence.reviewed}
                onChange={(event) =>
                  change(
                    () =>
                      planner.evidence(id, { reviewed: event.target.checked }),
                    "Review note saved.",
                  )
                }
              />
              Reviewer replayed a successful and failing case
            </label>
            <p className="plan-detail-muted">
              Review notes are optional planning records. Done still requires
              every step, acceptance check and prerequisite.
            </p>
          </Tile>
          <Tile
            title="Learn from"
            icon={<BookOpen size={19} />}
            id={`plan-${id}-learn`}
          >
            {task.resources.map((resource, i) => (
              <div className="plan-resource" key={i}>
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resource.label}
                  <ArrowUpRight size={15} />
                </a>
                <p>{resource.focus}</p>
              </div>
            ))}
            <div className="plan-detail-chips">
              {task.tools.map((tool) => (
                <span key={tool}>{tool}</span>
              ))}
            </div>
          </Tile>
          <Tile title="Watch out" icon={<TriangleAlert size={19} />}>
            <p>{task.avoid}</p>
            <p className="plan-detail-muted">{task.troubleshooting}</p>
            <h4>Drawbacks / limits</h4>
            {bullets(task.drawbacks)}
          </Tile>
          <Tile title="Best practice" icon={<Flag size={19} />}>
            {bullets(task.bestPractices)}
            <h4>Explain back</h4>
            <p className="plan-explain">{task.learn}</p>
          </Tile>
          <Tile
            title="Scope & readiness"
            icon={<Flag size={19} />}
            className="plan-scope-tile"
          >
            <div>
              <h4>Why this priority</h4>
              <p>{task.priorityReason}</p>
            </div>
            <div>
              <h4>Initial readiness</h4>
              <p>{task.readiness}</p>
            </div>
            <div>
              <h4>Stable board labels</h4>
              <p>
                {task.labels.join(" · ")} · Initial selection: {task.selection}
              </p>
              <p className="plan-detail-muted">
                Card IDs stay stable; the current owner above is authoritative.
                A proposed assignment is not a skills assessment.
              </p>
            </div>
          </Tile>
        </div>
      </div>
    </div>
  );
}
