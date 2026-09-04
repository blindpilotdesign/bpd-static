document.addEventListener("DOMContentLoaded", () => {
// HERO toggle (ARIA-correct)
const buttons = document.querySelectorAll(".role-btn");
const panels = document.querySelectorAll(".hero-copy");

function setRole(role) {
  buttons.forEach((b) => {
    const active = b.dataset.role === role;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  panels.forEach((p) => {
    const show = p.dataset.hero === role;
    p.classList.toggle("is-visible", show);
    p.setAttribute("aria-hidden", show ? "false" : "true");
  });
}

buttons.forEach((b) =>
  b.addEventListener("click", () => setRole(b.dataset.role))
);

setRole("agency"); // default

  // Smooth scroll to contact with header offset
  const HEADER_OFFSET = 160; // header height (149) + breathing space
  document.querySelectorAll('[data-scroll-to="contact"]').forEach((el) => {
    el.addEventListener("click", (e) => {
      // allow normal anchor behavior if JS off
      e.preventDefault();

      const target = document.querySelector("#contact");
      if (!target) return;

      const y = target.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) window.scrollTo(0, y);
      else window.scrollTo({ top: y, behavior: "smooth" });

      // focus first input after scroll
      setTimeout(() => {
        const first = target.querySelector("input, textarea");
        if (first) first.focus();
      }, 600);
    });
  });
});

// SVG BPD logo
document.querySelectorAll("[data-svg]").forEach(el => {
  fetch(el.dataset.svg)
    .then(res => res.text())
    .then(svg => {
      el.innerHTML = svg;

      const svgEl = el.querySelector("svg");
      if (svgEl) {
        svgEl.setAttribute("aria-hidden", "true");
        svgEl.setAttribute("focusable", "false");
        svgEl.removeAttribute("width");
        svgEl.removeAttribute("height");
      }
    });
});


/* Audiences background parallax (safe version) */
(() => {
  const root = document.querySelector("#audiences");
  if (!root) return;

  const boxes = root.querySelectorAll(".aud-box[data-depth]");
  if (!boxes.length) return;

  let raf = null;
  let mx = 0, my = 0;

  const onMove = (e) => {
    const r = root.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    mx = (e.clientX - cx) / (r.width / 2);
    my = (e.clientY - cy) / (r.height / 2);

    mx = Math.max(-1, Math.min(1, mx));
    my = Math.max(-1, Math.min(1, my));

    if (!raf) raf = requestAnimationFrame(tick);
  };

  const tick = () => {
    boxes.forEach((box) => {
      const depth = parseFloat(box.dataset.depth || "0.1");
      const x = mx * 18 * depth;
      const y = my * 18 * depth;

      box.style.setProperty("--px", `${x}px`);
      box.style.setProperty("--py", `${y}px`);
    });
    raf = null;
  };

  window.addEventListener("mousemove", onMove, { passive: true });

  window.addEventListener("mouseleave", () => {
    boxes.forEach((box) => {
      box.style.setProperty("--px", "0px");
      box.style.setProperty("--py", "0px");
    });
  });
})();

// CONTACT FORM -> mailto fallback (no-backend)
(() => {
  const form = document.querySelector("#contact-form");
  if (!form) return;

  const lang = document.documentElement.lang || "lv";
  const msgs = {
    lv: {
      validation: "Lūdzu aizpildiet vārdu/uzņēmumu, e-pastu un brīfu.",
      success:    "Nosūtīts. Atbildēsim 12–24 stundu laikā.",
      error:      "Neizdevās nosūtīt. Pamēģiniet vēlreiz vai rakstiet uz info@bpd.lv.",
    },
    en: {
      validation: "Please fill in your name/company, email and brief.",
      success:    "Sent. We will respond within 12–24 hours.",
      error:      "Failed to send. Please try again or email info@bpd.lv.",
    },
  };
  const t = msgs[lang] || msgs.lv;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);

    const name  = (fd.get("name")  || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const brief = (fd.get("brief") || "").toString().trim();

    if (!name || !email || !brief) {
      alert(t.validation);
      return;
    }

    try {
      const res  = await fetch(form.action, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Request failed");
      }

      form.reset();
      alert(t.success);
    } catch (err) {
      alert(t.error);
    }
  });
})();