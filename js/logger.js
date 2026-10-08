/**
 * Submission logger.
 * Each submission becomes one entry with timestamped lines.
 * Entries are mirrored to the browser console and kept in
 * localStorage on this device (until the database is connected).
 */
(function () {
  const KEY = "cleanmage.submissionLog.v1";
  const listEl = () => document.getElementById("logList");
  const emptyEl = () => document.getElementById("logEmpty");

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save(entries) {
    const max = (window.APP_CONFIG && window.APP_CONFIG.maxLogEntries) || 200;
    try { localStorage.setItem(KEY, JSON.stringify(entries.slice(0, max))); } catch { /* storage unavailable */ }
  }

  let entries = load();

  function ts(d = new Date()) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function render() {
    const ul = listEl();
    if (!ul) return;
    ul.innerHTML = entries.map((e) => {
      const tag = e.status === "SENT" ? "sent" : e.status === "DEMO" ? "demo" : e.status === "FAILED" ? "failed" : "demo";
      const label = e.status === "DEMO" ? "DEMO · NOT SENT" : e.status || "IN PROGRESS";
      const lines = e.lines.map((l) => {
        const cls = l.level === "ok" ? "lv-ok" : l.level === "warn" ? "lv-warn" : l.level === "err" ? "lv-err" : "";
        return `<span class="${cls}">[${esc(l.t.slice(11))}] ${esc(l.msg)}</span>`;
      }).join("\n");
      return `<li class="log-entry">
        <div class="log-entry__head"><strong>${esc(e.reportNo)} · ${esc(e.startedAt)}</strong><span class="tag tag--${tag}">${esc(label)}</span></div>
        <pre class="log-lines">${lines}</pre>
      </li>`;
    }).join("");
    emptyEl().hidden = entries.length > 0;
  }

  function start(reportNo) {
    const entry = { reportNo, startedAt: ts(), status: null, lines: [] };
    entries.unshift(entry);
    const add = (level, msg) => {
      entry.lines.push({ t: ts(), level, msg });
      const fn = level === "err" ? console.error : level === "warn" ? console.warn : console.log;
      fn(`[ServiceReport ${reportNo}] ${msg}`);
      save(entries); render();
    };
    return {
      info: (m) => add("info", m),
      ok: (m) => add("ok", m),
      warn: (m) => add("warn", m),
      err: (m) => add("err", m),
      finish(status) { entry.status = status; save(entries); render(); },
    };
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `submission-log-${ts().replace(/[: ]/g, "-")}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function clear() {
    entries = [];
    save(entries); render();
  }

  window.SubmissionLog = { start, render, exportJson, clear };
})();
