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
    const row = document.createElement("div");
    row.className = `chat-row ${role}`;

    if (role === "bot") {
      const av = document.createElement("div");
      av.className = "chat-avatar bot";
      av.innerHTML = `<img src="${basePath}/static/img/bot-avatar.gif" alt="" width="36" height="42" />`;
      row.appendChild(av);
    }

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
    row.appendChild(div);

    if (role === "user") {
      const av = document.createElement("div");
      av.className = "chat-avatar user";
      av.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#ffffff"/><circle cx="24" cy="19" r="7.6" fill="#0a97ff"/><path d="M8.6 40.4a15.8 15.8 0 0 1 30.8 0 24 24 0 0 1-30.8 0z" fill="#0a97ff"/></svg>`;
      row.appendChild(av);
    }

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
  }

  function appendTyping() {
    const row = document.createElement("div");
    row.className = "chat-row bot thinking";
    row.setAttribute("aria-label", "Assistant is thinking");

    const av = document.createElement("div");
    av.className = "chat-avatar bot";
    av.innerHTML = `<img src="${basePath}/static/img/bot-avatar.gif" alt="" width="36" height="42" />`;
    row.appendChild(av);

    const shimmer = document.createElement("div");
    shimmer.className = "thinking-shimmer";
    shimmer.setAttribute("aria-hidden", "true");
    shimmer.innerHTML = `
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="wave"></span>
    `;
    row.appendChild(shimmer);

    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
    return row;
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
    if (typeof syncSendBtn === "function") syncSendBtn();
    if (sendBtn) sendBtn.disabled = true;

    appendBubble("user", trimmed);
    histories[scenario] = histories[scenario] || [];
    histories[scenario].push({ role: "user", content: trimmed });

    const typing = appendTyping();

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

  const sendBtn = form?.querySelector(".chat-send");

  function syncSendBtn() {
    if (!sendBtn || !input) return;
    const has = Boolean(input.value.trim());
    sendBtn.classList.toggle("is-active", has);
  }

  // init
  scenarios.forEach((s) => {
    histories[s.id] = [];
  });
  resetConversation(activeScenario);
  syncSendBtn();

  document.querySelectorAll(".switcher-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchScenario(btn.dataset.scenario));
  });

  document.querySelectorAll(".play-journey").forEach((btn) => {
    btn.addEventListener("click", () => playJourney(btn.dataset.play));
  });

  fab?.addEventListener("click", () => openChat());
  closeBtn?.addEventListener("click", () => closeChat());

  input?.addEventListener("input", syncSendBtn);

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    send(input?.value || "").then(() => syncSendBtn());
  });
})();
