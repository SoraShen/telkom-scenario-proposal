(() => {
  const dataNode = document.getElementById("scenario-data");
  /** @type {Array<any>} */
  const scenarios = dataNode ? JSON.parse(dataNode.textContent || "[]") : [];
  const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  const basePath = (document.body?.dataset?.basePath || "").replace(/\/$/, "");
  const apiChat = `${basePath}/api/chat`;

  const GREETINGS = {
    roaming:
      "Hi — I’m the Telkom roaming assistant. Ask about a trip, compare bundles, or tap Play journey on the page.",
    security:
      "Hi — I can help with SIM security: block, unblock, PUK, or SIM swap. I’ll verify identity first.",
  };

  let activeScenario = scenarios[0]?.id || "roaming";
  /** @type {Record<string, {role:string, content:string}[]>} */
  const histories = {};
  /** @type {Record<string, boolean>} */
  const busy = {};
  let playing = false;

  const panel = document.getElementById("chat-panel");
  const fab = document.getElementById("chat-fab");
  const closeBtn = document.getElementById("chat-close");
  const messages = document.getElementById("chat-messages");
  const chipsBox = document.getElementById("chat-chips");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const statusEl = document.getElementById("chat-status");

  function isOpen() {
    return panel?.classList.contains("is-open");
  }

  function openChat() {
    if (!panel || !fab) return;
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    fab.classList.add("is-hidden");
    fab.setAttribute("aria-expanded", "true");
  }

  function closeChat() {
    if (!panel || !fab) return;
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    fab.classList.remove("is-hidden");
    fab.setAttribute("aria-expanded", "false");
  }

  function markStep(scenario, index, state) {
    const steps = document.querySelectorAll(`#steps-${scenario} .timeline-step`);
    steps.forEach((node, i) => {
      node.classList.remove("active", "done");
      if (state === "reset") return;
      if (i < index) node.classList.add("done");
      if (i === index && (state === "active" || state === "done")) {
        node.classList.add(state === "done" ? "done" : "active");
      }
      if (state === "all-done") node.classList.add("done");
    });
  }

  function appendBubble(role, text, extraClass, highlight) {
    const div = document.createElement("div");
    div.className = `bubble ${role}${extraClass ? " " + extraClass : ""}`;
    if (highlight && role === "bot") {
      const tag = document.createElement("div");
      tag.className = "hl-tag";
      tag.textContent = highlight;
      div.appendChild(tag);
    }
    const body = document.createElement("div");
    body.textContent = text;
    div.appendChild(body);
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  function renderChips(scenario) {
    const sc = byId[scenario];
    chipsBox.innerHTML = "";
    (sc?.chips || []).forEach((text) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = text;
      btn.addEventListener("click", () => {
        const step = sc.journey?.find((j) => j.user === text);
        const idx = sc.journey?.findIndex((j) => j.user === text);
        if (typeof idx === "number" && idx >= 0) markStep(scenario, idx, "active");
        send(text, { highlight: step?.highlight || null }).then((ok) => {
          if (ok && typeof idx === "number" && idx >= 0) markStep(scenario, idx, "done");
        });
      });
      chipsBox.appendChild(btn);
    });
  }

  function resetConversation(scenario, opts = {}) {
    histories[scenario] = [];
    markStep(scenario, 0, "reset");
    if (scenario === activeScenario) {
      messages.innerHTML = "";
      appendBubble("bot", GREETINGS[scenario] || "How can I help?");
      renderChips(scenario);
      if (statusEl) {
        const label = byId[scenario]?.short || scenario;
        statusEl.textContent = `Online · ${label}`;
      }
      document.querySelectorAll(".play-journey").forEach((btn) => {
        if (btn.dataset.play === scenario) {
          btn.disabled = false;
          btn.textContent = "Play journey";
        }
      });
    }
    if (opts.open) openChat();
  }

  async function send(text, opts = {}) {
    const scenario = activeScenario;
    const trimmed = (text || "").trim();
    if (!trimmed || busy[scenario]) return null;
    busy[scenario] = true;

    const sendBtn = form?.querySelector(".chat-send");
    if (input && !opts.keepInput) input.value = "";
    if (sendBtn) sendBtn.disabled = true;

    appendBubble("user", trimmed);
    histories[scenario] = histories[scenario] || [];
    histories[scenario].push({ role: "user", content: trimmed });

    const typing = appendBubble("bot", "Thinking with GLM-5.2…", "typing");

    try {
      const res = await fetch(apiChat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, messages: histories[scenario] }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok) {
        appendBubble("system", data.error || `Error ${res.status}`);
        return null;
      }
      const reply = data.reply || "(empty reply)";
      appendBubble("bot", reply, null, opts.highlight || null);
      histories[scenario].push({ role: "assistant", content: reply });
      return reply;
    } catch (err) {
      typing.remove();
      appendBubble("system", String(err?.message || err));
      return null;
    } finally {
      busy[scenario] = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }

  async function playJourney(scenario) {
    const sc = byId[scenario];
    if (!sc || playing || busy[scenario]) return;
    if (scenario !== activeScenario) switchScenario(scenario);
    playing = true;

    const playBtns = document.querySelectorAll(`.play-journey[data-play="${scenario}"]`);
    playBtns.forEach((b) => {
      b.disabled = true;
      b.textContent = "Playing…";
    });

    openChat();
    histories[scenario] = [];
    messages.innerHTML = "";
    renderChips(scenario);
    appendBubble("system", `Playing ${sc.journey.length}-turn ${sc.short} journey…`);

    for (let i = 0; i < sc.journey.length; i += 1) {
      if (!playing) break;
      const step = sc.journey[i];
      markStep(scenario, i, "active");
      document
        .querySelector(`#steps-${scenario} .timeline-step[data-step-index="${i}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      appendBubble("system", `Highlight: ${step.highlight}`);
      const reply = await send(step.user, { highlight: step.highlight });
      markStep(scenario, i, reply ? "done" : "active");
      if (!reply) break;
      await new Promise((r) => setTimeout(r, 280));
    }

    if (playing) {
      markStep(scenario, sc.journey.length, "all-done");
      appendBubble("system", "Journey complete — keep chatting or switch option.");
    }
    playing = false;
    playBtns.forEach((b) => {
      b.disabled = false;
      b.textContent = "Replay journey";
    });
  }

  function switchScenario(id) {
    if (!byId[id] || id === activeScenario) {
      // still ensure panel visible
      if (byId[id]) activeScenario = id;
    }
    const prev = activeScenario;
    if (playing && id !== prev) {
      playing = false;
    }
    activeScenario = id;

    document.querySelectorAll(".switcher-btn").forEach((btn) => {
      const on = btn.dataset.scenario === id;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".scenario-panel").forEach((panelEl) => {
      const on = panelEl.dataset.scenario === id;
      panelEl.classList.toggle("is-active", on);
      if (on) panelEl.removeAttribute("hidden");
      else panelEl.setAttribute("hidden", "");
    });

    // restore or init conversation for this scenario
    if (!histories[id] || histories[id].length === 0) {
      resetConversation(id);
    } else {
      messages.innerHTML = "";
      histories[id].forEach((m) => {
        appendBubble(m.role === "user" ? "user" : "bot", m.content);
      });
      renderChips(id);
      if (statusEl) statusEl.textContent = `Online · ${byId[id].short}`;
    }
  }

  // init
  scenarios.forEach((s) => {
    histories[s.id] = [];
  });
  resetConversation(activeScenario);

  document.querySelectorAll(".switcher-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchScenario(btn.dataset.scenario));
  });

  document.querySelectorAll(".play-journey").forEach((btn) => {
    btn.addEventListener("click", () => playJourney(btn.dataset.play));
  });

  fab?.addEventListener("click", () => openChat());
  closeBtn?.addEventListener("click", () => closeChat());

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    send(String(new FormData(form).get("text") || ""));
  });
})();
