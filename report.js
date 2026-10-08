/**
 * Report content: option lists (from the paper form) and the two
 * renderings of a submitted report — the PDF layout and the email body.
 */
(function () {
  const OPTIONS = {
    serviceType: ["Ad-hoc", "Weekly", "Fortnightly", "Monthly", "Bi-Monthly", "Quarterly", "Annually", "Follow up", "Others"],
    pests: [
      "Mosquitoes", "Rodents", "Cockroaches", "Termites", "Flies", "Lizards / Spiders", "Bedbugs",
      "Booklice", "Bees / Wasps / Hornets", "Snakes", "Ticks / Fleas", "Others",
    ],
    areas: [
      "Roof Top / Gutters", "Pantry", "Toilet", "Drainage / Sewerage / Manholes", "Car Park",
      "Landscaped Area / Compound / Outdoor", "Common Corridors / Indoor", "Gully Traps", "Staircases",
      "Risers / Pump Room / M&E Room", "Ceiling / Skirting Boards", "Others",
    ],
    actions: ["Residual Spraying", "Gelling", "Baiting", "Oiling / Larviciding", "Fogging", "Misting", "Dusting", "Others"],
  };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nl2br = (s) => esc(s).replace(/\n/g, "<br>");

  /** Selected values with "Others" replaced by "Others: <text>". */
  function withOther(values, other) {
    return values.map((v) => (v === "Others" ? `Others${other ? ": " + other : ""}` : v));
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }

  // ---------- PDF layout (follows the original paper form) ----------
  const asset = (f) => new URL(`assets/${f}`, document.baseURI).href;

  function box(checked) {
    return `<span style="display:inline-block;width:10px;height:10px;border:1px solid #222;margin-right:5px;vertical-align:-1px;text-align:center;line-height:9px;font-size:9.5px;font-weight:700;">${checked ? "✓" : ""}</span>`;
  }
  // Inline row of options (Type of Services / Action Taken)
  function inlineOptions(list, selected, other) {
    const main = list.filter((o) => o !== "Others").map((o) => {
      const on = selected.includes(o);
      return `<span style="white-space:nowrap;margin-right:10px;${on ? "font-weight:700;" : ""}">${box(on)}${esc(o)}</span>`;
    }).join(" ");
    const onO = selected.includes("Others");
    return `<div style="line-height:1.75;">${main}</div>
      <div style="${onO ? "font-weight:700;" : ""}">${box(onO)}Others: <span style="display:inline-block;min-width:330px;border-bottom:1px solid #222;">${esc(onO ? other : "")}&nbsp;</span></div>`;
  }
  // Vertical list (Type of Pest / Areas)
  function listOptions(list, selected, other) {
    return list.map((o) => {
      const on = selected.includes(o);
      if (o === "Others") {
        return `<div style="padding-left:20px;${on ? "font-weight:700;" : ""}">${box(on)}Others:</div>
          <div style="margin:2px 0 0 38px;border-bottom:1px solid #222;min-height:15px;">${esc(on ? other : "")}</div>`;
      }
      return `<div style="padding-left:20px;line-height:1.55;${on ? "font-weight:700;" : ""}">${box(on)}${esc(o)}</div>`;
    }).join("");
  }
  // Remarks written over ruled lines, like the paper form
  function ruledRemarks(text) {
    const LINES = 6, LH = 19;
    const body = esc(text).replace(/\n/g, "<br>");
    const rules = Array.from({ length: LINES }, (_, i) =>
      `<div style="position:absolute;left:0;right:0;top:${(i + 1) * LH - 1}px;border-bottom:1px solid #444;"></div>`).join("");
    return `<div style="position:relative;min-height:${LINES * LH}px;">
      ${rules}
      <div style="position:relative;line-height:${LH}px;">${body}</div>
    </div>`;
  }

  function buildPrintHtml(d) {
    const C = window.APP_CONFIG.company;
    const B = "1px solid #222";
    const td = `border:${B};padding:5px 8px;vertical-align:top;`;
    const lab = td + "text-align:center;width:84px;";
    const lab2 = td + "text-align:center;width:118px;";
    return `
<div style="font-family:Calibri,Carlito,'Segoe UI',Arial,sans-serif;color:#111;font-size:12px;width:794px;box-sizing:border-box;background:#fff;padding:30px 70px 30px 78px;">

  <!-- Header: logo + registrations -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;height:78px;">
    <img src="${asset("cleanmage-logo.png")}" style="width:192px;height:auto;margin-top:12px;" alt="Cleanmage">
    <div style="text-align:left;">
      <div style="font-style:italic;font-size:11.5px;margin:0 0 4px 4px;">Registered with:</div>
      <div style="display:flex;align-items:flex-end;gap:6px;">
        <img src="${asset("nea-logo.png")}" style="width:112px;height:auto;" alt="National Environment Agency">
        <img src="${asset("bizsafe-star.png")}" style="width:56px;height:auto;" alt="bizSAFE Star">
      </div>
    </div>
  </div>

  <!-- Company block -->
  <div style="margin-top:6px;line-height:1.4;">
    <div style="font-weight:700;font-size:14px;">${esc(C.name)}</div>
    <div style="display:flex;justify-content:space-between;">
      <span>${esc(C.division)}</span>
      <span style="font-size:14px;">No.: <span style="color:#1f63c6;">${esc(d.reportNo)}</span></span>
    </div>
    <div>Email: <span style="color:#1f63c6;text-decoration:underline;">${esc(C.email)}</span></div>
    <div>Tel: ${esc(C.tel)}</div>
  </div>

  <div style="text-align:center;font-weight:700;font-size:14px;margin:8px 0 10px;">SERVICE REPORT</div>

  <!-- Particulars -->
  <table style="width:100%;border-collapse:collapse;">
    <tr><td style="${lab}">Client</td><td style="${td}">${esc(d.client)}</td><td style="${lab2}">Date</td><td style="${td}width:106px;">${esc(fmtDate(d.date))}</td></tr>
    <tr><td style="${lab}">Contact No.</td><td style="${td}">${esc(d.contactNo)}</td><td style="${lab2}">Time in</td><td style="${td}">${esc(d.timeIn)}</td></tr>
    <tr><td style="${lab}">Email</td><td style="${td}">${esc(d.clientEmail)}</td><td style="${lab2}">Time out</td><td style="${td}">${esc(d.timeOut)}</td></tr>
    <tr><td style="${lab}">Site Address</td><td style="${td}">${nl2br(d.siteAddress)}</td><td style="${lab2}">Service by:</td><td style="${td}">${esc(d.serviceBy)}</td></tr>
  </table>

  <!-- Type of services -->
  <div style="border:${B};border-top:0;padding:5px 6px;">
    <div style="font-weight:700;">Type of Services:</div>
    ${inlineOptions(OPTIONS.serviceType, d.serviceType, d.serviceTypeOther)}
  </div>

  <!-- Pests | Areas -->
  <div style="display:flex;border:${B};border-top:0;">
    <div style="width:47%;padding:5px 6px 8px;border-right:${B};">
      <div style="font-weight:700;">Type of Pest:</div>
      ${listOptions(OPTIONS.pests, d.pests, d.pestsOther)}
    </div>
    <div style="flex:1;padding:5px 6px 8px;">
      <div style="font-weight:700;">Inspection and Treatment Areas:</div>
      ${listOptions(OPTIONS.areas, d.areas, d.areasOther)}
    </div>
  </div>

  <!-- Action taken -->
  <div style="border:${B};border-top:0;padding:5px 6px;">
    <div style="font-weight:700;">ACTION TAKEN</div>
    ${inlineOptions(OPTIONS.actions, d.actions, d.actionsOther)}
  </div>

  <!-- Remarks -->
  <div style="border:${B};border-top:0;padding:5px 6px 6px;">
    <div style="font-weight:700;margin-bottom:2px;">Recommendations / Remarks:</div>
    ${ruledRemarks(d.remarks)}
  </div>

  <!-- Acknowledgement -->
  <div style="margin-top:22px;">Acknowledgement of above service satisfactorily rendered:</div>
  <table style="width:100%;border-collapse:collapse;margin-top:2px;">
    <tr>
      <td style="${td}width:57%;height:118px;">
        <div>Client’s Name / Signature / Co Stamp (if applicable)</div>
        <div style="display:flex;align-items:flex-end;gap:10px;height:68px;margin-top:4px;">
          ${d.clientSig ? `<img src="${d.clientSig}" style="max-height:66px;max-width:58%;">` : ""}
          ${d.stamp ? `<img src="${d.stamp}" style="max-height:66px;max-width:38%;">` : ""}
        </div>
        <div style="font-weight:700;">${esc(d.clientSignName)}</div>
      </td>
      <td style="${td}">
        <div>Technician’s Name / Signature</div>
        <div style="display:flex;align-items:flex-end;height:68px;margin-top:4px;">
          ${d.techSig ? `<img src="${d.techSig}" style="max-height:66px;max-width:90%;">` : ""}
        </div>
        <div style="font-weight:700;">${esc(d.techSignName)}</div>
      </td>
    </tr>
  </table>

  <div style="margin-top:10px;font-size:9.5px;color:#666;">
    Electronically signed and submitted ${esc(d.submittedAt)} · Report ${esc(d.reportNo)} · Copy emailed to ${esc(d.clientEmail)}
  </div>
</div>`;
  }

  // ---------- Email body (inline styles; no images, so it renders in every mail client) ----------
  function buildEmailHtml(d) {
    const C = window.APP_CONFIG.company;
    const row = (k, v) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e5e9e8;color:#5f6d69;width:170px;vertical-align:top;">${k}</td><td style="padding:6px 10px;border-bottom:1px solid #e5e9e8;vertical-align:top;">${v}</td></tr>`;
    const list = (arr) => arr.length ? arr.map(esc).join(", ") : "—";
    return `
<div style="font-family:Arial,Helvetica,sans-serif;color:#1b2422;max-width:640px;">
  <table style="width:100%;border-collapse:collapse;border:1px solid #d9e0de;border-bottom:3px solid #0f5c4d;border-radius:8px 8px 0 0;">
    <tr>
      <td style="padding:14px 16px;vertical-align:middle;"><img src="${asset("cleanmage-logo.png")}" alt="${esc(C.name)}" width="170" style="display:block;"></td>
      <td style="padding:10px 16px;text-align:right;vertical-align:middle;font-size:11px;color:#5f6d69;">
        <i>Registered with:</i><br>
        <img src="${asset("nea-logo.png")}" alt="National Environment Agency" width="92" style="vertical-align:middle;">
        <img src="${asset("bizsafe-star.png")}" alt="bizSAFE Star" width="46" style="vertical-align:middle;">
      </td>
    </tr>
    <tr><td colspan="2" style="padding:0 16px 12px;font-size:13px;"><b>${esc(C.name)}</b> · ${esc(C.division)} · Service Report <b>${esc(d.reportNo)}</b></td></tr>
  </table>
  <div style="border:1px solid #d9e0de;border-top:0;padding:16px 18px;border-radius:0 0 8px 8px;">
    <p style="margin:0 0 12px;">Dear ${esc(d.clientSignName || d.client)},</p>
    <p style="margin:0 0 14px;">Thank you for engaging ${esc(C.name)}. Below is the service report for our visit on <b>${esc(fmtDate(d.date))}</b>, acknowledged and signed on site.</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;">
      ${row("Report No.", `<b>${esc(d.reportNo)}</b>`)}
      ${row("Client", esc(d.client))}
      ${row("Contact No.", esc(d.contactNo))}
      ${row("Site Address", nl2br(d.siteAddress))}
      ${row("Date", esc(fmtDate(d.date)))}
      ${row("Time in / out", `${esc(d.timeIn)} – ${esc(d.timeOut)}`)}
      ${row("Service by", esc(d.serviceBy))}
      ${row("Type of Service", list(withOther(d.serviceType, d.serviceTypeOther)))}
      ${row("Type of Pest", list(withOther(d.pests, d.pestsOther)))}
      ${row("Areas Inspected / Treated", list(withOther(d.areas, d.areasOther)))}
      ${row("Action Taken", list(withOther(d.actions, d.actionsOther)))}
      ${row("Recommendations / Remarks", nl2br(d.remarks) || "—")}
      ${row("Acknowledged by (client)", `${esc(d.clientSignName)} — signed electronically`)}
      ${row("Technician", `${esc(d.techSignName)} — signed electronically`)}
      ${row("Submitted", esc(d.submittedAt))}
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#5f6d69;">For any queries, contact us at ${esc(C.email)} or ${esc(C.tel)}, quoting report ${esc(d.reportNo)}.</p>
  </div>
</div>`;
  }

  function buildEmailText(d) {
    const L = (a, o) => withOther(a, o).join(", ") || "-";
    return [
      `Service Report ${d.reportNo}`,
      `Client: ${d.client}`, `Contact: ${d.contactNo}`, `Site: ${d.siteAddress}`,
      `Date: ${fmtDate(d.date)}  Time: ${d.timeIn}-${d.timeOut}`, `Service by: ${d.serviceBy}`,
      `Service type: ${L(d.serviceType, d.serviceTypeOther)}`, `Pests: ${L(d.pests, d.pestsOther)}`,
      `Areas: ${L(d.areas, d.areasOther)}`, `Action: ${L(d.actions, d.actionsOther)}`,
      `Remarks: ${d.remarks || "-"}`, `Acknowledged by: ${d.clientSignName}`, `Technician: ${d.techSignName}`,
    ].join("\n");
  }

  window.Report = { OPTIONS, buildPrintHtml, buildEmailHtml, buildEmailText, fmtDate };
})();
