import { completionProblem, reconcileProgress } from "./model";
import DATA from "./data.json";
import PANELS from "./panels.json";
import SHELL from "./shell.json";
export { DATA, PANELS };
const byId = Object.fromEntries(DATA.tasks.map((t) => [t.id, t]));
const member = (id) => DATA.members.find((m) => m.id === id);
function record(o) {
  return o && typeof o === "object" && !Array.isArray(o);
}
export function validateState(o) {
  if (!record(o) || o.version !== 3)
    throw Error(
      "Use a reduced-plan v3 progress backup. Earlier-plan backups have different tasks and checklist positions and cannot be restored here.",
    );
  const r = {
    version: 3,
    names: {},
    cards: {},
    checks: {},
    selected: {},
    skills: {},
    capacity: {},
  };
  for (const k of Object.keys(r).filter((k) => k !== "version"))
    if (!record(o[k])) throw Error("Missing or invalid " + k + " section.");
  for (const [k, v] of Object.entries(o.names)) {
    if (!member(k) || typeof v !== "string" || v.length > 80)
      throw Error("Invalid member name.");
    r.names[k] = v;
  }
  for (const [k, v] of Object.entries(o.cards)) {
    if (
      !byId[k] ||
      !["Backlog", "In Progress", "Done"].includes(v) ||
      (!byId[k].sprint && v !== "Backlog")
    )
      throw Error("Invalid card/status.");
    r.cards[k] = v;
  }
  for (const [k, v] of Object.entries(o.checks)) {
    const p = k.split(":"),
      t = byId[p[0]],
      i = Number(p[2]);
    if (
      p.length !== 3 ||
      !t ||
      !["step", "accept"].includes(p[1]) ||
      !Number.isInteger(i) ||
      i < 0 ||
      i >= (p[1] === "step" ? t.steps.length : t.accept.length) ||
      typeof v !== "boolean"
    )
      throw Error("Invalid checklist item.");
    r.checks[k] = v;
  }
  for (const [k, v] of Object.entries(o.selected)) {
    if (
      !byId[k] ||
      !byId[k].sprint ||
      !["Should", "Could"].includes(byId[k].priority) ||
      typeof v !== "boolean"
    )
      throw Error("Invalid stretch selection.");
    r.selected[k] = v;
  }
  for (const [k, v] of Object.entries(o.skills)) {
    if (
      !member(k) ||
      !record(v) ||
      !record(v.scores) ||
      typeof v.evidence !== "string" ||
      v.evidence.length > 500
    )
      throw Error("Invalid skills record.");
    const scores = {};
    for (const [a, b] of Object.entries(v.scores)) {
      if (
        !Object.hasOwn(DATA.skillsCheck.areas, a) ||
        !Number.isInteger(b) ||
        b < 0 ||
        b > 3
      )
        throw Error("Invalid skills score.");
      scores[a] = b;
    }
    r.skills[k] = { scores, evidence: v.evidence };
  }
  for (const [s, owners] of Object.entries(o.capacity)) {
    if (!["1", "2", "3", "4", "5"].includes(s) || !record(owners))
      throw Error("Invalid sprint capacity.");
    r.capacity[s] = {};
    for (const [id, h] of Object.entries(owners)) {
      if (
        !member(id) ||
        typeof h !== "number" ||
        !Number.isFinite(h) ||
        h < 0 ||
        h > 280
      )
        throw Error("Invalid available hours.");
      r.capacity[s][id] = h;
    }
  }
  r.evidence = {};
  if (o.evidence !== undefined) {
    if (!record(o.evidence)) throw Error("Invalid evidence section.");
    for (const [id, entry] of Object.entries(o.evidence)) {
      if (
        !Object.hasOwn(byId, id) ||
        !record(entry) ||
        typeof entry.artifact !== "string" ||
        entry.artifact.length > 2000 ||
        typeof entry.reviewed !== "boolean"
      )
        throw Error("Invalid evidence record.");
      r.evidence[id] = { artifact: entry.artifact, reviewed: entry.reviewed };
    }
  }
  return r;
}
export function mountPlan(root, downloadArtifact, onOpen, onChange) {
  root.innerHTML = SHELL;
  let active = true;
  const events = [];
  function listen(el, event, handler) {
    el.addEventListener(event, handler);
    events.push(() => el.removeEventListener(event, handler));
  }
  const KEY = "student-performance-roadmap-v3-reduced";
  const tasks = DATA.tasks,
    byId = Object.fromEntries(tasks.map((t) => [t.id, t]));
  const state = {
    version: 3,
    names: {},
    cards: {},
    checks: {},
    selected: {},
    skills: {},
    capacity: {},
    evidence: {},
  };
  let tab = "roadmap",
    readyOnly = false,
    capacitySprint = 1;
  const $ = (id) => root.querySelector(`#${id}`),
    esc = (s) =>
      String(s).replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  const member = (id) => DATA.members.find((m) => m.id === id),
    name = (id) => state.names[id] || member(id).name;
  const cardState = (t) => state.cards[t.id] || "Backlog",
    checked = (k) => state.checks[k] === true;
  const included = (t) =>
    t.sprint > 0 && (t.priority === "Must" || state.selected[t.id] === true);
  const unmet = (t) => t.depends.filter((id) => cardState(byId[id]) !== "Done");
  const ready = (t) =>
    included(t) && cardState(t) === "Backlog" && !unmet(t).length;
  const fmt = (n) => Number(n.toFixed(2)).toString(),
    range = (a) => `${fmt(a[0])}–${fmt(a[1])}`;
  function announce(s) {
    if (active) $("status").textContent = s;
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      $("storage-notice").textContent =
        "Browser storage is unavailable or full. Changes remain in this session only; export progress to keep them.";
    }
    onChange();
  }

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(state, validateState(JSON.parse(raw)));

  } catch (e) {
    $("storage-notice").textContent =
      "Saved progress could not be loaded. The saved copy was not overwritten; restore a valid reduced-plan v3 backup or export before closing.";
  }
  function reconcile() {
    reconcileProgress(state);
  }
  const navs = [['roadmap','Roadmap'],['moscow','MoSCoW & scope'],['board','Three-list board'],['team','Team & capacity'],['proposal','Project idea'],['git','Git strategy'],['architecture','Architecture'],['structure','Project structure'],['api','Routes & contracts'],['frontend','Frontend spec'],['syncs','Syncs & cuts'],['contracts','Integration contracts'],['docs','Documentation']];
  function legend() {
    $("legend").innerHTML = DATA.members
      .map(
        (m) =>
          `<span><i class="dot" style="background:${m.color}"></i><b>${m.id}</b> ${esc(name(m.id))}</span>`,
      )
      .join("");
    const v = $("ownerFilter").value;
    $("ownerFilter").innerHTML =
      '<option value="all">All five members</option>' +
      DATA.members
        .map(
          (m) =>
            `<option value="${m.id}">${m.id} · ${esc(name(m.id))}</option>`,
        )
        .join("");
    $("ownerFilter").value = v || "all";
  }
  function renderNav() {
    $("nav").innerHTML = navs
      .map(
        ([k, n]) =>
          `<button data-tab="${k}" aria-current="${tab === k}">${n}</button>`,
      )
      .join("");
  }
  function stats() {
    const core = tasks.filter((t) => t.priority === "Must"),
      scope = tasks.filter(included);
    $("stats").innerHTML = [
      ...["Must", "Should", "Could", "Won’t"].map((p) => [
        tasks.filter((t) => t.priority === p).length,
        p + " · all work",
      ]),
      [
        `${core.filter((t) => cardState(t) === "Done").length}/${core.length}`,
        "core done",
      ],
      [
        tasks.filter((t) => t.priority !== "Must" && included(t)).length,
        "selected stretch",
      ],
      [scope.filter(ready).length, "ready to start"],
    ]
      .map(
        ([v, l]) =>
          `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`,
      )
      .join("");
  }
  function selected() {
    const q = $("search").value.trim().toLowerCase(),
      scope = $("scopeFilter").value;
    return tasks.filter(
      (t) =>
        ($("ownerFilter").value === "all" ||
          t.owner === $("ownerFilter").value) &&
        ($("sprintFilter").value === "all" ||
          String(t.sprint) === $("sprintFilter").value) &&
        ($("priorityFilter").value === "all" ||
          t.priority === $("priorityFilter").value) &&
        ($("kindFilter").value === "all" || t.kind === $("kindFilter").value) &&
        (!readyOnly || ready(t)) &&
        (scope === "all" ||
          (scope === "core" && t.priority === "Must") ||
          (scope === "selected" && included(t)) ||
          (scope === "stretch" &&
            t.sprint > 0 &&
            t.priority !== "Must" &&
            !included(t)) ||
          (scope === "excluded" && t.priority === "Won’t")) &&
        (!q ||
          [
            t.id,
            t.title,
            t.objective,
            t.learn,
            t.tools.join(" "),
            t.steps.join(" "),
          ]
            .join(" ")
            .toLowerCase()
            .includes(q)),
    );
  }
  function card(t) {
    const m = member(t.owner),
      status = cardState(t),
      count = t.steps.filter((_, i) => checked(`${t.id}:step:${i}`)).length;
    return `<article class="card plan-task" id="card-${t.id}" data-card="${t.id}" style="--lane:${m.color}"><button class="plan-card-open" data-open-task="${t.id}" aria-haspopup="dialog" aria-label="Open ${t.id}: ${esc(t.title)}"><div class="card-id"><span>${t.id}</span><span>${esc(status)}</span></div><h3>${esc(t.title)}</h3><div class="tags"><span class="tag ${t.priority === "Won’t" ? "wont" : t.priority.toLowerCase()}">${esc(t.priority)}</span><span class="tag sp">SP:${t.sp}</span></div><p class="card-preview">${esc(t.objective)}</p><div class="effort-preview">${t.hours.low}–${t.hours.high}h owner${t.pair.member ? ` · pair ${t.pair.member}` : ""}</div><div class="card-hint">${t.kind} · ${count}/${t.steps.length} steps · ${!t.sprint ? "Outside sprint scope" : t.priority === "Must" ? "Core forecast" : included(t) ? "Selected stretch" : "Unselected stretch"}<br><span>Open card detail ↗</span></div></button></article>`;
  }
  function laneHTML(cards, m) {
    const core = cards
        .filter((t) => t.priority === "Must")
        .reduce((a, t) => a + t.sp, 0),
      stretch = cards
        .filter((t) => t.priority !== "Must")
        .reduce((a, t) => a + t.sp, 0);
    return `<section class="lane" style="--lane:${m.color}"><div class="lane-title"><span>${m.id} · ${esc(name(m.id))}</span><span>${core} core SP${stretch ? ` + ${stretch} stretch` : ""}</span></div>${cards.map(card).join("") || '<p class="muted">No matching tasks.</p>'}</section>`;
  }
  function renderRoadmap(cards) {
    let out = "";
    for (const s of [
      ...DATA.sprints,
      {
        id: 0,
        title: "Unscheduled extensions & explicit Won’t decisions",
        weeks: "Outside this release forecast",
        goal: "Make scope choices visible to the professor.",
        gate: "Implement no excluded feature without a new scope decision.",
        lab: "Explain the smaller delivered alternative and when this feature might become useful.",
        failure:
          "Do not label an excluded feature as a failed or completed implementation.",
      },
    ]) {
      const a = cards.filter((t) => t.sprint === s.id);
      if (!a.length) continue;
      out += `<section class="phase"><div class="phase-head"><div class="phase-index">${s.id ? String(s.id).padStart(2, "0") : "—"}</div><div><h2>${esc(s.title)}</h2><p class="muted">${esc(s.goal)}</p></div><div class="phase-meta">${esc(s.weeks)} · ${a.length} cards shown</div></div><div class="gate"><b>Core increment target:</b> ${esc(s.gate)}${s.id ? "<br>Professor review still happens at the two-week checkpoint if work is unfinished: record the gap and replan." : ""}</div><div class="lane-scroll"><div class="lanes">${DATA.members
        .filter(
          (m) =>
            $("ownerFilter").value === "all" || m.id === $("ownerFilter").value,
        )
        .map((m) =>
          laneHTML(
            a.filter((t) => t.owner === m.id),
            m,
          ),
        )
        .join(
          "",
        )}</div></div><p class="sprint-cadence">${esc(s.cadence || s.weeks)}</p><div class="labrow"><div><strong>Design lab</strong>${esc(s.lab)}</div><div><strong>Failure / recovery exercise</strong>${esc(s.failure)}</div></div></section>`;
    }
    return out;
  }
  function renderBoard(cards) {
    return (
      '<p class="section-note">Exactly three lists. Optional selection is separate from status; Won’t cards remain visibly excluded. No live Trello synchronization.</p><div class="lane-scroll"><div class="kanban">' +
      ["Backlog", "In Progress", "Done"]
        .map((s) => {
          const a = cards.filter((t) => cardState(t) === s);
          return `<section class="kanban-lane"><h2>${s}<small>${a.length}</small></h2>${a.map(card).join("") || '<div class="empty">No matching cards.</div>'}</section>`;
        })
        .join("") +
      "</div></div>"
    );
  }
  function effort(s, id) {
    const r = {
      owner: [0, 0],
      pair: [0, 0],
      review: [0, 0],
      meetings: DATA.capacityPolicy.meetingHours.map(
        (h) => h + (s === 1 ? 1 : 0),
      ),
    };
    for (const t of tasks.filter((t) => t.sprint === s && included(t))) {
      if (t.owner === id) {
        r.owner[0] += t.hours.low;
        r.owner[1] += t.hours.high;
      }
      if (t.pair.member === id) {
        r.pair[0] += t.pair.hours[0];
        r.pair[1] += t.pair.hours[1];
      }
      if (t.reviewer === id) {
        r.review[0] += t.reviewHours[0];
        r.review[1] += t.reviewHours[1];
      }
    }
    r.total = [
      r.owner[0] + r.pair[0] + r.review[0] + r.meetings[0],
      r.owner[1] + r.pair[1] + r.review[1] + r.meetings[1],
    ];
    return r;
  }
  function capacityHTML() {
    const s = capacitySprint;
    return `<h2>Capacity check — Sprint ${s}</h2><label class="field">Two-week sprint<select id="capacitySprint" data-capacity-sprint="true">${DATA.sprints.map((s) => `<option value="${s.id}" ${s.id === capacitySprint ? "selected" : ""}>Sprint ${s.id}</option>`).join("")}</select></label><p>Choose Must plus only selected stretch. Owner estimates include reading/building/checking and their pairing time; helpers and reviewers add separate time. Shared ceremonies add ${range(DATA.capacityPolicy.meetingHours.map((h) => h + (s === 1 ? 1 : 0)))} hours per person (Sprint 1 includes one extra hour for the practical skills check). These ranges are provisional; actual availability is not yet known.</p><div class="table-wrap"><table class="team-table"><thead><tr><th>Member</th><th>Owner work</th><th>Pair support</th><th>Review</th><th>Total incl. meetings</th><th>Available hours / 2 weeks</th><th>80% planning ceiling</th><th>Decision</th></tr></thead><tbody>${DATA.members
      .map((m) => {
        const e = effort(s, m.id),
          a = state.capacity[s]?.[m.id],
          ceiling = a === undefined ? null : a * 0.8;
        return `<tr><th>${m.id}</th><td>${range(e.owner)}</td><td>${range(e.pair)}</td><td>${range(e.review)}</td><td><b>${range(e.total)}h</b></td><td><label class="visually-hidden" for="cap-${m.id}">${m.id} available hours in Sprint ${s}</label><input class="hours-input" type="number" min="0" max="280" step="0.5" id="cap-${m.id}" data-capacity="${m.id}" value="${a === undefined ? "" : a}" placeholder="Enter hours"></td><td>${ceiling === null ? "Unknown" : fmt(ceiling) + "h"}</td><td>${ceiling === null ? "Enter availability" : e.total[1] <= ceiling ? "Fits estimate + 20% reserve" : `Over planning ceiling by ${fmt(e.total[1] - ceiling)}h at upper estimate. Cut stretch / reassign / adjust scope.`}</td></tr>`;
      })
      .join(
        "",
      )}</tbody></table></div><p>Most members have one guided deliverable per sprint; AI has two ordered cards in Sprint 3. Card count is not a workload guarantee. If W1’s coaching load is high, reassign bounded work, schedule shorter pairs or obtain support. Dependency-path SP is not elapsed duration.</p>`;
  }
  function renderTeam() {
    return `<article class="prose"><h1>People, learning support & capacity</h1><p>Assignments are provisional experience profiles. Complete a 45–60 minute practical check before mapping actual names. No person has been assessed by this file.</p><div class="roster">${DATA.members
      .map((m) => {
        const skill = state.skills[m.id] || { scores: {}, evidence: "" };
        return `<section class="member" style="--lane:${m.color}"><h3>${m.id} · ${esc(m.name)}</h3><p>${esc(m.role)}</p><label for="name-${m.id}">Actual member name</label><input id="name-${m.id}" data-name="${m.id}" maxlength="80" value="${esc(state.names[m.id] || "")}" placeholder="Enter actual name"><details class="skills-detail"><summary>Record observed skills</summary>${Object.entries(
          DATA.skillsCheck.areas,
        )
          .map(
            ([a, prompt]) =>
              `<label for="skill-${m.id}-${a}">${esc(a)}: ${esc(prompt)}</label><select id="skill-${m.id}-${a}" data-skill="${m.id}:${a}">${DATA.skillsCheck.scale.map((v, i) => `<option value="${i}" ${(skill.scores[a] || 0) === i ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`,
          )
          .join(
            "",
          )}<label for="evidence-${m.id}">Evidence / observed gap / preferred work</label><input id="evidence-${m.id}" data-skill-evidence="${m.id}" value="${esc(skill.evidence)}" maxlength="500" placeholder="Example link and what they demonstrated"></details></section>`;
      })
      .join(
        "",
      )}</div><p class="notice-inset">For W1, confirm backend, database and security leadership through a real exercise. A self-selected score is not an assessment result. If nobody can lead those boundaries, arrange mentor/professor support and simplify scope; do not assign them silently to a beginner.</p>${capacityHTML()}<h2>Skills check and planning policy</h2><p>${esc(DATA.skillsCheck.duration)}</p><p>${esc(DATA.skillsCheck.decision)}</p><p>${esc(DATA.capacityPolicy.note)}</p><h2>Process recording: seven cards each</h2><p>Five individual summaries + one planning record + one review record per person. ST remains Product Owner and W2 Scrum Master; the recorder duty rotates.</p><div class="table-wrap"><table class="team-table"><thead><tr><th>Sprint</th><th>Planning recorder</th><th>Review recorder</th><th>Professor checkpoint</th></tr></thead><tbody>${DATA.sprints.map((s) => `<tr><th>${s.id}</th><td>${byId[`S${s.id}-PLAN`].owner}</td><td>${byId[`S${s.id}-REVIEW`].owner}</td><td>End of week 2; record actual date</td></tr>`).join("")}</tbody></table></div><details class="team-guide"><summary>Full allocation and skills-check guidance</summary>${PANELS.teamGuide}</details></article>`;
  }
  function render() {
    renderNav();
    stats();
    const work = ["roadmap", "board"].includes(tab);
    $("toolbar").hidden = !work;
    $("stats").hidden = !work;
    if (work) {
      const a = selected();
      $("resultCount").textContent = `${a.length} of ${tasks.length} cards`;
      $("clearSearch").hidden = !$("search").value;
      $("content").innerHTML = a.length
        ? tab === "roadmap"
          ? renderRoadmap(a)
          : renderBoard(a)
        : '<div class="empty"><h2>No matching tasks</h2><p>Clear search or filters to see the plan.</p><button id="resetFilters">Clear all filters</button></div>';
    } else
      $("content").innerHTML =
        tab === "team"
          ? renderTeam()
          : `<article class="prose">${PANELS[tab]}</article>`;
  }
  function resetFilters() {
    for (const id of [
      "ownerFilter",
      "sprintFilter",
      "priorityFilter",
      "kindFilter",
      "scopeFilter",
    ])
      $(id).value = "all";
    $("search").value = "";
    readyOnly = false;
    $("readyFilter").setAttribute("aria-pressed", "false");
  }
  function goTo(id) {
    onOpen(id);
  }
  function cardText(t) {
    return `${t.id} — ${t.title}\n\nCURRENT OWNER: ${name(t.owner)} (${t.owner})\nReviewer: ${name(t.reviewer)} (${t.reviewer})\nStable ID; current owner overrides ID letters.\nSprint: ${t.sprint || "Unscheduled"}\nList: ${cardState(t)}\nLabels (exactly two): ${t.labels.join(", ")}\nSelection: ${included(t) ? "Core / selected stretch" : "Not selected / excluded"}\nPriority rationale: ${t.priorityReason}\nDepends on: ${t.depends.join(", ") || "None"}\nUnlocks: ${t.unlocks.join(", ") || "None"}\n\nOBJECTIVE\n${t.objective}\n\nEFFORT\n${t.hours.low}–${t.hours.high} owner hours. ${t.hours.basis}\nPair: ${t.pair.member || "none prescribed"}; ${range(t.pair.hours)} helper hours. ${t.pair.plan}\nReview: ${range(t.reviewHours)}h.\n\nLEARN FROM\n${t.resources.map((r) => `${r.label}: ${r.url}\n${r.focus}`).join("\n\n")}\n\nTOOLS\n${t.tools.join(", ")}\n\nSTART SMALL\n${t.starterExercise}\n\nORDERED CHECKLIST\n${t.steps.map((s, i) => `${checked(`${t.id}:step:${i}`) ? "[x]" : "[ ]"} ${i + 1}. ${s}`).join("\n")}\n\nWORKED PATTERN\n${t.snippet.note}\n${t.snippet.code}\n\nOUTPUT\n${t.outcome}\n\nACCEPTANCE\n${t.accept.map((a, i) => `${checked(`${t.id}:accept:${i}`) ? "[x]" : "[ ]"} ${a}`).join("\n")}\n\nPITFALL / TROUBLESHOOTING\n${t.avoid}\n${t.troubleshooting}\n\nDRAWBACKS\n${t.drawbacks.join("\n")}\n\nBEST PRACTICES\n${t.bestPractices.join("\n")}\n\nEXPLAIN BACK\n${t.learn}\n\nEVIDENCE\n[Attach actual artifact and review; record actual hours.]\n\nREVIEW NOTES\n${state.evidence[t.id]?.artifact || "No artifact recorded"}\nReviewer replay: ${state.evidence[t.id]?.reviewed ? "Recorded" : "Not recorded"}`;
  }
  function download(filename, text, type = "text/plain") {
    downloadArtifact(filename, text, type);
  }
  function selectWithPrerequisites(id, added = []) {
    const t = byId[id];
    for (const p of t.depends)
      if (
        byId[p].sprint > 0 &&
        byId[p].priority !== "Must" &&
        !state.selected[p]
      )
        selectWithPrerequisites(p, added);
    if (!state.selected[id]) {
      state.selected[id] = true;
      added.push(id);
    }
    return added;
  }
  listen(root, "click", async (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (
      [
        "exportText",
        "exportProgress",
        "importProgress",
        "clearSearch",
        "readyFilter",
      ].includes(b.id)
    ) {
      try {
        toolbarAction(b.id);
      } catch (err) {
        announce(
          "Download failed: " + err.message + " Retry using the same action.",
        );
      }
      return;
    }
    if (b.dataset.openTask) {
      goTo(b.dataset.openTask);
      return;
    }
    if (b.dataset.tab) {
      tab = b.dataset.tab;
      render();
      return;
    }
    if (b.dataset.dep) {
      goTo(b.dataset.dep);
      return;
    }
    if (b.dataset.copy) {
      const t = byId[b.dataset.copy];
      try {
        await navigator.clipboard.writeText(cardText(t));
        announce(
          `Copied the full ${t.id} brief, including resources and support.`,
        );
      } catch (err) {
        download(t.id + ".txt", cardText(t));
        announce(`Clipboard unavailable; downloaded the full ${t.id} brief.`);
      }
      return;
    }
    if (b.id === "resetFilters") {
      resetFilters();
      render();
    }
  });
  listen(root, "change", (e) => {
    const el = e.target;
    if (el.dataset.name) {
      state.names[el.dataset.name] = el.value.trim();
      save();
      legend();
      announce("Name saved. Confirm allocation from observed skills.");
      return;
    }
    if (el.dataset.skill) {
      const [id, area] = el.dataset.skill.split(":");
      state.skills[id] ??= { scores: {}, evidence: "" };
      state.skills[id].scores[area] = Number(el.value);
      save();
      announce("Observed-skill score saved. Include exercise evidence.");
      return;
    }
    if (el.dataset.skillEvidence) {
      const id = el.dataset.skillEvidence;
      state.skills[id] ??= { scores: {}, evidence: "" };
      state.skills[id].evidence = el.value.trim();
      save();
      announce("Skills evidence saved locally.");
      return;
    }
    if (el.dataset.capacitySprint) {
      capacitySprint = Number(el.value);
      render();
      $("capacitySprint").focus();
      return;
    }
    if (el.dataset.capacity) {
      const id = el.dataset.capacity;
      state.capacity[capacitySprint] ??= {};
      if (el.value === "") delete state.capacity[capacitySprint][id];
      else {
        const h = Number(el.value);
        if (!Number.isFinite(h) || h < 0 || h > 280) {
          announce(
            "Enter available hours from 0 to 280 for the two-week sprint.",
          );
          el.value = state.capacity[capacitySprint][id] ?? "";
          return;
        }
        state.capacity[capacitySprint][id] = h;
      }
      save();
      render();
      $("cap-" + id).focus();
      announce(
        "Capacity updated; the planning ceiling preserves 20% uncommitted.",
      );
    }
  });
  for (const id of [
    "ownerFilter",
    "sprintFilter",
    "priorityFilter",
    "kindFilter",
    "scopeFilter",
  ])
    listen($(id), "change", () => {
      if (id === "scopeFilter" && $("scopeFilter").value === "excluded") {
        $("kindFilter").value = "all";
        $("priorityFilter").value = "all";
        $("sprintFilter").value = "all";
      }
      if (id === "priorityFilter" && $("priorityFilter").value === "Won’t") {
        $("kindFilter").value = "all";
        $("scopeFilter").value = "all";
        $("sprintFilter").value = "all";
      }
      render();
    });
  listen($("search"), "input", render);
  function toolbarAction(id) {
    if (id === "clearSearch") {
      $("search").value = "";
      render();
      $("search").focus();
    }
    if (id === "readyFilter") {
      readyOnly = !readyOnly;
      if (readyOnly) $("kindFilter").value = "all";
      $("readyFilter").setAttribute("aria-pressed", String(readyOnly));
      render();
    }
    if (id === "exportText") {
      download(
        "team-project-cards-v3-reduced.md",
        "# Reduced team project cards — revision 3\n\n" +
          tasks.map((t) => "## " + cardText(t)).join("\n\n---\n\n"),
      );
      announce(
        "Downloaded all 80 full briefs. Set exactly two labels and current owners in the real board.",
      );
    }
    if (id === "exportProgress") {
      download(
        "team-project-progress-v3-reduced.json",
        JSON.stringify(
          {
            format: "student-performance-roadmap-reduced",
            exportedAt: new Date().toISOString(),
            state,
          },
          null,
          2,
        ),
        "application/json",
      );
      announce("Exported reduced-plan v3 progress, scope selections, skills and capacity.");
    }
    if (id === "importProgress") $("restoreFile").click();
  }
  listen($("restoreFile"), "change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 2000000) throw Error("Backup too large; maximum 2 MB.");
      const data = JSON.parse(await f.text());
      if (!active) return;
      if (data.format !== "student-performance-roadmap-reduced")
        throw Error("Choose a reduced-plan v3 backup. Earlier-plan backups cannot be restored here.");
      const fresh = validateState(data.state);
      download(
        "team-project-before-restore-v3-reduced.json",
        JSON.stringify(
          { format: "student-performance-roadmap-reduced", state },
          null,
          2,
        ),
        "application/json",
      );
      Object.assign(state, fresh);
      reconcile();
      save();
      legend();
      render();
      announce(
        "Restored reduced-plan v3 progress. A backup of the previous state was downloaded first.",
      );
    } catch (err) {
      announce("Restore failed: " + err.message + " Current progress kept.");
    }
    e.target.value = "";
  });
  reconcile();
  legend();
  render();

  const changed = () => {
    reconcile();
    save();
    render();
  };
  return {
    destroy() {
      active = false;
      events.forEach((remove) => remove());
      root.replaceChildren();
    },
    getProgress() {
      return state;
    },
    getName: name,
    getNotice() {
      return $("storage-notice").textContent || "";
    },
    focusCard(id) {
      ($("card-" + id)?.querySelector("button") || $("search")).focus();
    },
    check(key, value) {
      state.checks[key] = value;
      changed();
    },
    status(id, next) {
      const error = completionProblem(byId[id], next, state);
      if (error) return error;
      state.cards[id] = next;
      changed();
      return "";
    },
    select(id, value) {
      const task = byId[id];
      if (!value) {
        const users = tasks.filter(
          (x) => state.selected[x.id] && x.depends.includes(id),
        );
        if (cardState(task) !== "Backlog" || users.length)
          return (
            "Return this card to Backlog and deselect dependent stretch cards first: " +
            users.map((x) => x.id).join(", ")
          );
        state.selected[id] = false;
      } else selectWithPrerequisites(id);
      changed();
      return "";
    },
    evidence(id, patch) {
      state.evidence[id] = {
        ...(state.evidence[id] || { artifact: "", reviewed: false }),
        ...patch,
      };
      save();
    },
    async copy(id) {
      const text = cardText(byId[id]);
      try {
        await navigator.clipboard.writeText(text);
        return "Full card copied.";
      } catch {
        download(id + ".txt", text);
        return "Clipboard unavailable; full card downloaded.";
      }
    },
  };
}
