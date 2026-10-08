/**
 * Cleanmage Service Report — configuration
 * ------------------------------------------------------------
 * This is the ONLY file you need to edit to go live.
 *
 * While the three EmailJS values below are blank, the app runs in
 * DEMO MODE: everything works (form, signatures, PDF, logs), and the
 * log shows exactly who the email WOULD go to — but nothing is sent.
 *
 * Fill them in (see README.md, "Turn on real emails") and the app
 * switches to LIVE MODE automatically.
 *
 * Note: EmailJS public keys are designed to be exposed in browser
 * code. Lock it down with the "Allowed origins" setting in EmailJS
 * (Account → Security) so only your GitHub Pages URL can use it.
 */
window.APP_CONFIG = {
  version: "1.4",

  company: {
    name: "CLEANMAGE PTE. LTD.",
    division: "PEST MANAGEMENT DIVISION",
    email: "operations@cleanmage.com.sg",
    tel: "6515 8754",
  },

  // Every report is CC'd to this address.
  companyCcEmail: "cleanmageco@gmail.com",

  // Prefix for auto-generated report numbers, e.g. B-20261008-153012
  reportPrefix: "B",

  emailjs: {
    publicKey: "",   // EmailJS → Account → API keys → Public Key
    serviceId: "",   // EmailJS → Email Services → Service ID
    templateId: "",  // EmailJS → Email Templates → Template ID
  },

  // Attach the signed PDF to the email.
  // A signed PDF is ~300 KB. The EmailJS free plan caps each request
  // at 50 KB, so leave this false on the free plan — the email still
  // contains the full report as formatted HTML. Turn on with a paid
  // EmailJS plan (see README).
  attachPdf: false,

  // How many log entries to keep on this device.
  maxLogEntries: 200,
};
