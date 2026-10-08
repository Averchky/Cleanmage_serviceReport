# Cleanmage Digital Service Report (POC)

A mobile-friendly web form that replaces the paper Pest Control Service Report.
The technician fills it in on site, the client signs on the screen, and on submit the app:

1. Reads the client's email from the **Client email** field.
2. Builds a signed PDF that follows the original report: Cleanmage logo, "Registered with" NEA and bizSAFE Star, same sections and order.
3. Emails the report to the client, **CC `cleanmageco@gmail.com`**.
4. Writes a submission log showing the TO / CC / subject and the send result.

It's a static site with no server, so it runs on **GitHub Pages** for free.

---

## 1. Put it on GitHub Pages (about 5 minutes)

1. Create a new repository on GitHub, e.g. `cleanmage-service-report` (Public; Pages on a free account needs a public repo).
2. Upload **everything in this folder** to the root of the repo, keeping the folders as they are:
   ```
   index.html
   .nojekyll
   README.md
   css/styles.css
   js/config.js
   js/app.js
   js/report.js
   js/signature.js
   js/logger.js
   assets/cleanmage-logo.png
   assets/nea-logo.png
   assets/bizsafe-star.png
   ```
   Web upload: **Add file → Upload files**, drag the folder contents in, then commit.
   Or with git:
   ```bash
   cd cleanmage-service-report
   git init && git add . && git commit -m "Service report POC"
   git branch -M main
   git remote add origin https://github.com/<your-user>/cleanmage-service-report.git
   git push -u origin main
   ```
3. In the repo, go to **Settings → Pages → Build and deployment**. Set Source to **Deploy from a branch**, Branch to **main**, folder **/ (root)**, then click Save.
4. After about a minute the site is live at
   `https://<your-user>.github.io/cleanmage-service-report/`

It starts in **Demo mode** (orange badge). Everything works except that no email leaves the device, and the log shows exactly who it *would* have gone to. This is enough to demo that the customer email is picked up from the form.

---

## 2. Turn on real emails (EmailJS, free tier)

GitHub Pages can't send email by itself, so the app uses [EmailJS](https://www.emailjs.com), which sends from the browser through your Gmail account.

1. **Sign up** at emailjs.com.
2. **Email Services → Add New Service → Gmail.** Connect `cleanmageco@gmail.com` (or whichever account should send). Copy the **Service ID**.
3. **Email Templates → Create New Template.** Set these fields:

   | Field | Value |
   |---|---|
   | Subject | `{{subject}}` |
   | To Email | `{{to_email}}` |
   | CC | `{{cc_email}}` |
   | From Name | `Cleanmage Pte. Ltd.` |
   | Reply To | `operations@cleanmage.com.sg` |

   In **Content**, switch to the code/HTML editor and put just:
   ```
   {{{report_html}}}
   ```
   (Use **three** braces so the HTML renders instead of showing as raw text.)
   Save, then copy the **Template ID**.

   > If you don't see a CC field, open the template's settings and check the "Bcc / Cc" section. As a fallback, add `cleanmageco@gmail.com` to **Bcc**.

4. **Account → General** (or API Keys): copy your **Public Key**.
5. **Account → Security**: under **Allowed origins**, add `https://<your-user>.github.io`. This stops other sites from using your key.
6. Open `js/config.js` in GitHub (pencil icon), fill in the three values and commit:
   ```js
   emailjs: {
     publicKey: "xxxxxxxxxxxxxxx",
     serviceId: "service_xxxxxxx",
     templateId: "template_xxxxxxx",
   },
   ```
7. Refresh the site. The badge changes to **Live**. Submit a test report with your own email address in Client email.

**Template variables available:** `to_email`, `cc_email`, `to_name`, `subject`, `report_no`, `client`, `service_date`, `report_html`, `report_text`, `company_name`, and `report_pdf` (only when `attachPdf` is on).

### Attaching the PDF
The email body already contains the full report. The signed PDF is about 300 KB, which is over the EmailJS free-plan request limit (50 KB). On a paid plan:
1. In the template, open **Attachments → Add Attachment → Variable Attachment**. Set the parameter name to `report_pdf`, the filename to `Service-Report-{{report_no}}.pdf`, and the content type to PDF.
2. Set `attachPdf: true` in `js/config.js`.

Until then, the technician can tap **Download PDF** after submitting.

---

## 3. What the log shows

Each submission writes an entry like this. It appears on the page and also in the browser console (F12):

```
[15:41:52] Submission received — technician "Ahmad Bin Ali", client "Sunrise Condominium MCST".
[15:41:52] Signatures captured — client: Jane Tan, technician: Ahmad Bin Ali.
[15:41:52] Reading recipient from form field "Client email": raw value = "Jane.Tan@Example.com"
[15:41:52] Customer email extracted: jane.tan@example.com
[15:41:52] Sending report B-20261008-154148.
[15:41:52]   TO: jane.tan@example.com
[15:41:52]   CC: cleanmageco@gmail.com
[15:41:52]   SUBJECT: Service Report B-20261008-154148 — Sunrise Condominium MCST (08/10/2026)
[15:41:53] PDF generated: Service-Report-B-20261008-154148.pdf (320 KB).
[15:41:53] EMAIL SENT — status 200 OK. Delivered to jane.tan@example.com, cc cleanmageco@gmail.com.
```

Each entry is tagged **SENT**, **DEMO · NOT SENT**, or **FAILED**. Logs are kept in the browser on that device; use **Export** to download them as JSON. Once a database is connected, these logs should be written there too.

---

## 4. Files

| File | What it does |
|---|---|
| `index.html` | The form |
| `css/styles.css` | Styling (phone-first) |
| `js/config.js` | **Edit this.** Company details, CC address, EmailJS keys |
| `js/app.js` | Validation, submit flow, email sending, result screen |
| `js/report.js` | Option lists from the paper form, PDF layout, email layout |
| `js/signature.js` | Finger and stylus signature pad |
| `js/logger.js` | Submission log |
| `assets/` | Cleanmage, NEA and bizSAFE logos, taken from the original service report (used on the form, PDF and email) |
| `.nojekyll` | Tells GitHub Pages to serve files as they are |

The checkbox options (pests, areas, actions) are in `OPTIONS` at the top of `js/report.js`. Edit them there.

---

## 5. Known POC limits / next steps

- **No database yet.** Reports exist only as the email and the downloaded PDF. Next step: on submit, POST the report JSON (with signatures) to a backend, for example Supabase, Firebase, or a Google Apps Script that writes to a Google Sheet and Drive. The hook point is in `onSubmit()` in `js/app.js`, next to the `Database: not connected yet` log line.
- **Report numbers** are timestamp-based (`B-YYYYMMDD-HHMMSS`). Once there's a database, switch to a server-issued running number like the paper `B 000100`.
- **Needs internet** to load the PDF and email libraries and to send. An offline queue could be added later.
- **No login.** Anyone with the URL can open the form. Fine for a POC; add authentication before production.
- EmailJS's free tier has a monthly email cap. Check their pricing page for the current limit.
