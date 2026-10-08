/**
 * App wiring: form setup, validation, submission, PDF, email, logs.
 */
(function () {
  const CFG = window.APP_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const form = $("#reportForm");
  const EMAIL_RE = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const TECH_KEY = "cleanmage.lastTechnician";

  const isLive = () => Boolean(CFG.emailjs.publicKey && CFG.emailjs.serviceId && CFG.emailjs.templateId);
  let pads = {};
  let lastPdf = null; // { blob, filename }
  let reportNo = "";

  // ---------- Setup ----------
  function pad2(n) { return String(n).padStart(2, "0"); }
  function nowTime() { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
  function newReportNo() {
    const d = new Date();
    return `${CFG.reportPrefix}-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
  }

  function buildChips() {
    $$(".chips").forEach((wrap) => {
      const group = wrap.dataset.group;
      const type = wrap.dataset.type;
      wrap.innerHTML = Report.OPTIONS[group].map((opt, i) => `
        <label class="chip"><input type="${type}" name="${group}" value="${opt}" id="${group}-${i}"><span>${opt}</span></label>
      `).join("");
      wrap.addEventListener("change", () => {
        wrap.classList.remove("invalid");
        const other = $(`[data-other-for="${group}"]`);
        const on = $$(`input[name="${group}"]`, wrap).some((i) => i.checked && i.value === "Others");
        other.hidden = !on;
        if (on) other.querySelector("input").focus();
      });
    });
  }

  function applyCompany() {
    $$("[data-company]").forEach((el) => { el.textContent = CFG.company[el.dataset.company] || el.textContent; });
    const badge = $("#modeBadge");
    if (isLive()) { badge.textContent = "Live"; badge.classList.add("badge--live"); }
    else { badge.textContent = "Demo mode"; badge.title = "Emails are logged, not sent. Add EmailJS keys in js/config.js."; }
  }

  function resetForm() {
    form.reset();
    $$("[data-other-for]").forEach((el) => (el.hidden = true));
    $$(".invalid").forEach((el) => el.classList.remove("invalid"));
    Object.values(pads).forEach((p) => p.clear());
    form.date.value = today();
    form.timeIn.value = nowTime();
    const lastTech = safeGet(TECH_KEY);
    if (lastTech) { form.serviceBy.value = lastTech; form.techSignName.value = lastTech; }
    reportNo = newReportNo();
    $("#reportNo").textContent = reportNo;
    $("#formError").hidden = true;
    lastPdf = null;
  }

  function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

  // ---------- Read & validate ----------
  function checked(name) { return $$(`input[name="${name}"]:checked`).map((i) => i.value); }

  /** Pull the client email out of the field, tolerating stray spaces/text. */
  function extractEmail(raw) {
    const m = String(raw || "").match(EMAIL_RE);
    return m ? m[0].toLowerCase() : "";
  }

  function validate() {
    const problems = [];
    $$(".invalid").forEach((el) => el.classList.remove("invalid"));

    const req = ["date", "timeIn", "timeOut", "serviceBy", "client", "contactNo", "clientEmail", "siteAddress", "clientSignName", "techSignName"];
    const labels = { date: "Date", timeIn: "Time in", timeOut: "Time out", serviceBy: "Service by", client: "Client", contactNo: "Contact no.", clientEmail: "Client email", siteAddress: "Site address", clientSignName: "Client's name", techSignName: "Technician's name" };
    req.forEach((n) => {
      if (!String(form[n].value).trim()) { form[n].classList.add("invalid"); problems.push(labels[n]); }
    });
    if (form.clientEmail.value.trim() && !extractEmail(form.clientEmail.value)) {
      form.clientEmail.classList.add("invalid"); problems.push("Client email (not a valid address)");
    }
    if (form.timeIn.value && form.timeOut.value && form.timeOut.value < form.timeIn.value) {
      form.timeOut.classList.add("invalid"); problems.push("Time out (earlier than time in)");
    }
    [["serviceType", "Type of service"], ["pests", "Type of pest"], ["areas", "Treatment areas"], ["actions", "Action taken"]].forEach(([g, l]) => {
      if (!checked(g).length) { $(`.chips[data-group="${g}"]`).classList.add("invalid"); problems.push(l); }
    });
    if (pads.client.isEmpty()) { pads.client.container.classList.add("invalid"); problems.push("Client's signature"); }
    if (pads.tech.isEmpty()) { pads.tech.container.classList.add("invalid"); problems.push("Technician's signature"); }
    if (!form.confirm.checked) { form.confirm.closest(".confirm").classList.add("invalid"); problems.push("Client confirmation tick"); }
    return problems;
  }

  async function readStamp() {
    const f = form.stamp.files && form.stamp.files[0];
    if (!f) return "";
    const url = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const max = 500, k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  }

  async function collect() {
    const v = (n) => String(form[n].value || "").trim();
    return {
      reportNo,
      date: v("date"), timeIn: v("timeIn"), timeOut: v("timeOut"), serviceBy: v("serviceBy"),
      client: v("client"), contactNo: v("contactNo"), clientEmailRaw: form.clientEmail.value,
      clientEmail: extractEmail(form.clientEmail.value), siteAddress: v("siteAddress"),
      serviceType: checked("serviceType"), serviceTypeOther: v("serviceTypeOther"),
      pests: checked("pests"), pestsOther: v("pestsOther"),
      areas: checked("areas"), areasOther: v("areasOther"),
      actions: checked("actions"), actionsOther: v("actionsOther"),
      remarks: v("remarks"),
      clientSignName: v("clientSignName"), techSignName: v("techSignName"),
      clientSig: pads.client.toDataURL(), techSig: pads.tech.toDataURL(),
      stamp: await readStamp(),
      submittedAt: new Date().toLocaleString("en-SG", { dateStyle: "medium", timeStyle: "short" }),
    };
  }

  // ---------- PDF ----------
  /**
   * Render the report inside an isolated, off-screen iframe exactly one
   * A4 page wide, capture it with html2canvas, and place it on an A4 PDF.
   * The iframe has its own viewport, so the visitor's screen size and
   * scroll position can't shift or blank the capture.
   */
  async function makePdf(data) {
    const filename = `Service-Report-${data.reportNo}.pdf`;
    const PAGE_W = 794; // A4 width in CSS px at 96 dpi
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:fixed;left:-20000px;top:0;width:${PAGE_W}px;height:1200px;border:0;visibility:hidden;`;
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument;
      doc.open();
      doc.write(`<!doctype html><html><head><meta charset="utf-8"><base href="${document.baseURI}">
        <style>html,body{margin:0;padding:0;background:#fff;}</style></head>
        <body>${Report.buildPrintHtml(data)}</body></html>`);
      doc.close();

      // Wait for logos and signatures to finish loading.
      await Promise.all(Array.from(doc.images).map((img) =>
        img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })));
      if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;

      const el = doc.body.firstElementChild;
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
        width: PAGE_W,
        windowWidth: PAGE_W,
        scrollX: 0,
        scrollY: 0,
      });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      // Fit to one A4 page, keeping proportions.
      let w = pw, h = (canvas.height * pw) / canvas.width;
      if (h > ph) { h = ph; w = (canvas.width * ph) / canvas.height; }
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", (pw - w) / 2, 0, w, h);
      pdf.setProperties({ title: `Service Report ${data.reportNo}`, subject: data.client, creator: CFG.company.name });
      return { blob: pdf.output("blob"), filename };
    } finally {
      frame.remove();
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  }

  function downloadPdf() {
    if (!lastPdf) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(lastPdf.blob);
    a.download = lastPdf.filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- Submit ----------
  function setBusy(on, label) {
    const b = $("#submitBtn");
    b.disabled = on;
    b.innerHTML = on ? `<span class="spinner"></span><span class="btn__label">${label}</span>` : `<span class="btn__label">Submit &amp; email report</span>`;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const problems = validate();
    const errBox = $("#formError");
    if (problems.length) {
      errBox.innerHTML = `<b>Please complete:</b> ${problems.join(", ")}.`;
      errBox.hidden = false;
      const first = $(".invalid");
      if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    errBox.hidden = true;
    setBusy(true, "Preparing report…");

    const log = SubmissionLog.start(reportNo);
    let status = "FAILED";
    let data;
    try {
      data = await collect();
      safeSet(TECH_KEY, data.serviceBy);

      log.info(`App version ${CFG.version || "?"} on ${navigator.userAgent.match(/(iPad|iPhone|Android|Windows|Macintosh|CrOS|Linux)/)?.[0] || "unknown device"}.`);
      log.info(`Submission received — technician "${data.serviceBy}", client "${data.client}".`);
      log.info(`Signatures captured — client: ${data.clientSignName}, technician: ${data.techSignName}${data.stamp ? ", company stamp photo attached" : ""}.`);

      // Dynamic recipient — read from the form, never hard-coded.
      log.info(`Reading recipient from form field "Client email": raw value = "${data.clientEmailRaw}"`);
      log.ok(`Customer email extracted: ${data.clientEmail}`);

      const subject = `Service Report ${data.reportNo} — ${data.client} (${Report.fmtDate(data.date)})`;
      log.info(`Sending report ${data.reportNo}.`);
      log.info(`  TO: ${data.clientEmail}`);
      log.info(`  CC: ${CFG.companyCcEmail}`);
      log.info(`  SUBJECT: ${subject}`);

      setBusy(true, "Generating PDF…");
      if (typeof html2canvas === "function" && window.jspdf) {
        try {
          lastPdf = await makePdf(data);
          log.ok(`PDF generated: ${lastPdf.filename} (${Math.round(lastPdf.blob.size / 1024)} KB).`);
        } catch (pdfErr) {
          log.warn(`PDF could not be generated (${pdfErr.message || pdfErr}). Email will still be sent.`);
        }
      } else {
        const missing = [typeof html2canvas !== "function" && "html2canvas", !window.jspdf && "jsPDF"].filter(Boolean).join(" + ");
        log.warn(`PDF library did not load (${missing} missing — make sure the js/vendor folder is uploaded). Email will still be sent.`);
      }

      if (isLive() && typeof emailjs === "undefined") {
        throw new Error("Email library did not load — check the internet connection and try again.");
      }
      if (isLive()) {
        setBusy(true, "Sending email…");
        const params = {
          to_email: data.clientEmail,
          cc_email: CFG.companyCcEmail,
          to_name: data.clientSignName || data.client,
          subject,
          report_no: data.reportNo,
          client: data.client,
          service_date: Report.fmtDate(data.date),
          report_html: Report.buildEmailHtml(data),
          report_text: Report.buildEmailText(data),
          company_name: CFG.company.name,
        };
        if (CFG.attachPdf && lastPdf) {
          params.report_pdf = await blobToDataUrl(lastPdf.blob);
          log.info(`Attaching PDF to email (${Math.round(lastPdf.blob.size / 1024)} KB).`);
        }
        log.info("Dispatching via EmailJS…");
        const res = await emailjs.send(CFG.emailjs.serviceId, CFG.emailjs.templateId, params, { publicKey: CFG.emailjs.publicKey });
        log.ok(`EMAIL SENT — status ${res.status} ${res.text}. Delivered to ${data.clientEmail}, cc ${CFG.companyCcEmail}.`);
        status = "SENT";
      } else {
        log.warn(`DEMO MODE — EmailJS keys not set in js/config.js, so no email left this device.`);
        log.warn(`Would have sent to ${data.clientEmail} with cc ${CFG.companyCcEmail}.`);
        status = "DEMO";
      }
      log.info("Database: not connected yet — report not stored server-side. Download the PDF to keep a copy.");
    } catch (err) {
      const msg = (err && (err.text || err.message)) || String(err);
      log.err(`ERROR — ${msg}`);
      if (lastPdf) log.info("PDF is still available to download from this screen.");
      status = "FAILED";
    } finally {
      log.finish(status);
      setBusy(false);
    }
    showResult(status, data);
  }

  function showResult(status, data) {
    const r = $("#result");
    r.classList.toggle("is-warn", status !== "SENT");
    const title = { SENT: "Report sent", DEMO: "Report submitted (demo)", FAILED: "Report saved — email not sent" }[status];
    const text = {
      SENT: "The signed report has been emailed to the client, with a copy to the office.",
      DEMO: "Demo mode: nothing was emailed. The log below shows exactly where it would have gone.",
      FAILED: "Something went wrong sending the email. See the log below. Download the PDF and send it manually.",
    }[status];
    $("#resultTitle").textContent = title;
    $("#resultText").textContent = text;
    const esc = (s) => String(s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    $("#resultMeta").innerHTML = data ? `
      <dt>Report</dt><dd>${esc(data.reportNo)}</dd>
      <dt>To</dt><dd>${esc(data.clientEmail)}</dd>
      <dt>CC</dt><dd>${esc(CFG.companyCcEmail)}</dd>` : "";
    $("#downloadPdfBtn").hidden = !lastPdf;
    form.hidden = true;
    r.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Init ----------
  function init() {
    applyCompany();
    buildChips();
    pads.client = new SignaturePad($('[data-sig="client"]'));
    pads.tech = new SignaturePad($('[data-sig="tech"]'));
    $$("[data-clear]").forEach((b) => b.addEventListener("click", () => pads[b.dataset.clear].clear()));
    $$("[data-now]").forEach((b) => b.addEventListener("click", () => { form[b.dataset.now].value = nowTime(); form[b.dataset.now].classList.remove("invalid"); }));

    // Technician sign-off name follows "Service by" unless edited separately.
    let techEdited = false;
    form.techSignName.addEventListener("input", () => { techEdited = true; });
    form.serviceBy.addEventListener("input", () => {
      if (!techEdited) { form.techSignName.value = form.serviceBy.value; form.techSignName.classList.remove("invalid"); }
    });

    // Once the "Please complete" box is showing, keep it in sync as fields are filled.
    const recheck = () => {
      const box = $("#formError");
      if (box.hidden) return;
      const left = validate();
      if (left.length) box.innerHTML = `<b>Please complete:</b> ${left.join(", ")}.`;
      else box.hidden = true;
    };
    form.addEventListener("input", (e) => { e.target.classList && e.target.classList.remove("invalid"); recheck(); });
    form.addEventListener("change", recheck);
    form.addEventListener("signature-change", recheck);
    form.confirm.addEventListener("change", () => form.confirm.closest(".confirm").classList.remove("invalid"));
    form.addEventListener("submit", onSubmit);

    $("#downloadPdfBtn").addEventListener("click", downloadPdf);
    $("#newReportBtn").addEventListener("click", () => {
      $("#result").hidden = true;
      form.hidden = false;
      resetForm();
      requestAnimationFrame(() => Object.values(pads).forEach((p) => p.resize()));
      window.scrollTo({ top: 0 });
    });
    $("#exportLogs").addEventListener("click", SubmissionLog.exportJson);
    $("#clearLogs").addEventListener("click", () => { if (confirm("Clear the submission log on this device?")) SubmissionLog.clear(); });

    resetForm();
    SubmissionLog.render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
