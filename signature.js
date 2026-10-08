/**
 * Minimal signature pad (no dependencies).
 * Works with finger, stylus and mouse via Pointer Events.
 */
(function () {
  class SignaturePad {
    constructor(container) {
      this.container = container;
      this.canvas = container.querySelector("canvas");
      this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
      this.strokes = [];
      this.current = null;
      this._bind();
      this.resize();
      window.addEventListener("resize", () => this.resize());
    }

    _bind() {
      const c = this.canvas;
      c.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.current = [this._pt(e)];
        this.strokes.push(this.current);
        this._draw();
        // Capture keeps the stroke going if the finger slides off the pad.
        // Some browsers refuse it — drawing must still work without it.
        try { c.setPointerCapture(e.pointerId); } catch (_) { /* not supported */ }
      });
      c.addEventListener("pointermove", (e) => {
        if (!this.current) return;
        e.preventDefault();
        let events = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
        if (!events || !events.length) events = [e];
        for (const ev of events) this.current.push(this._pt(ev));
        this._draw();
      });
      const end = () => {
        if (!this.current) return;
        this.current = null;
        this.container.classList.toggle("has-ink", !this.isEmpty());
        this.container.classList.remove("invalid");
        this.container.dispatchEvent(new CustomEvent("signature-change", { bubbles: true }));
      };
      c.addEventListener("pointerup", end);
      c.addEventListener("pointercancel", end);
      c.addEventListener("pointerleave", end);
    }

    _pt(e) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    }

    resize() {
      const r = this.canvas.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      this.canvas.width = Math.round(r.width * dpr);
      this.canvas.height = Math.round(r.height * dpr);
      this._draw();
    }

    _draw() {
      const { ctx, canvas } = this;
      const w = canvas.width, h = canvas.height;
      const dpr = Math.max(window.devicePixelRatio || 1, 1);
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#10233d";
      ctx.lineWidth = 2.4 * dpr;
      for (const s of this.strokes) {
        ctx.beginPath();
        if (s.length === 1) {
          ctx.arc(s[0].x * w, s[0].y * h, 1.4 * dpr, 0, Math.PI * 2);
          ctx.fillStyle = ctx.strokeStyle;
          ctx.fill();
          continue;
        }
        ctx.moveTo(s[0].x * w, s[0].y * h);
        for (let i = 1; i < s.length - 1; i++) {
          const mx = ((s[i].x + s[i + 1].x) / 2) * w;
          const my = ((s[i].y + s[i + 1].y) / 2) * h;
          ctx.quadraticCurveTo(s[i].x * w, s[i].y * h, mx, my);
        }
        const last = s[s.length - 1];
        ctx.lineTo(last.x * w, last.y * h);
        ctx.stroke();
      }
    }

    isEmpty() {
      return this.strokes.length === 0;
    }

    clear() {
      this.strokes = [];
      this.current = null;
      this._draw();
      this.container.classList.remove("has-ink");
    }

    /** PNG with transparent background, trimmed to the ink. */
    toDataURL() {
      if (this.isEmpty()) return "";
      const src = this.canvas;
      const { data, width, height } = this.ctx.getImageData(0, 0, src.width, src.height);
      let minX = width, minY = height, maxX = 0, maxY = 0;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (data[(y * width + x) * 4 + 3] > 0) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      const pad = 8;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(width, maxX + pad); maxY = Math.min(height, maxY + pad);
      const out = document.createElement("canvas");
      out.width = maxX - minX; out.height = maxY - minY;
      out.getContext("2d").drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
      return out.toDataURL("image/png");
    }
  }

  window.SignaturePad = SignaturePad;
})();
