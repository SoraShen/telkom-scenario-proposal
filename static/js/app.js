(() => {
  const dataNode = document.getElementById("scenario-data");
  /** @type {Array<any>} */
  const scenarios = dataNode ? JSON.parse(dataNode.textContent || "[]") : [];
  const byId = Object.fromEntries(scenarios.map((s) => [s.id, s]));
  const basePath = (document.body?.dataset?.basePath || "").replace(/\/$/, "");
  const apiChat = `${basePath}/api/chat`;

  const GREETINGS = {
    roaming:
      "Hi — I can help with international roaming from trip planning to your bill. Tap Play journey for a 5-turn demo, or pick a prompt.",
    security:
      "Hi — I can help protect your SIM: block, unblock, PUK, or SIM swap. I’ll verify your identity first. Tap Play journey for the full arc.",
  };

  /** @type {Record<string, {role:string, content:string}[]>} */
  const histories = {};
  /** @type {Record<string, boolean>} */
  const busy = {};
  /** @type {Record<string, boolean>} */
  const playing = {};

  function el(id) {
    return document.getElementById(id);
  }

  function setTurn(scenario, text) {
    const pill = el(`turn-${scenario}`);
    if (!pill) return;
    if (!text) {
      pill.hidden = true;
      pill.textContent = "";
      return;
    }
    pill.hidden = false;
    pill.textContent = text;
  }

  function markStep(scenario, index, state) {
    const steps = document.querySelectorAll(`#steps-${scenario} li`);
    steps.forEach((node, i) => {
      node.classList.remove("active", "done");
      if (state === "reset") return;
      if (i < index) node.classList.add("done");
      if (i === index && state === "active") node.classList.add("active");
      if (i === index && state === "done") node.classList.add("done");
      if (state === "all-done") node.classList.add("done");
    });
  }

  function appendBubble(scenario, role, text, extraClass, highlight) {
    const box = el(`msg-${scenario}`);
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
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
  }

  function reset(scenario) {
    playing[scenario] = false;
    histories[scenario] = [];
    const box = el(`msg-${scenario}`);
    box.innerHTML = "";
    setTurn(scenario, "");
    markStep(scenario, 0, "reset");
    appendBubble(scenario, "bot", GREETINGS[scenario] || "How can I help?");
    const playBtn = document.querySelector(`.play-journey[data-play="${scenario}"]`);
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = "Play journey";
    }
  }

  async function send(scenario, text, opts = {}) {
    const trimmed = (text || "").trim();
    if (!trimmed || busy[scenario]) return null;
    busy[scenario] = true;

    const form = document.querySelector(`form.composer[data-scenario="${scenario}"]`);
    const input = form?.querySelector('input[name="text"]');
    const btn = form?.querySelector("button.send");
    if (input && !opts.keepInput) input.value = "";
    if (btn) btn.disabled = true;

    appendBubble(scenario, "user", trimmed);
    histories[scenario] = histories[scenario] || [];
    histories[scenario].push({ role: "user", content: trimmed });

    const typing = appendBubble(scenario, "bot", "Thinking with GLM-5.2…", "typing");

    try {
      const res = await fetch(apiChat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          messages: histories[scenario],
        }),
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok) {
        appendBubble(scenario, "system", data.error || `Error ${res.status}`);
        return null;
      }
      const reply = data.reply || "(empty reply)";
      appendBubble(scenario, "bot", reply, null, opts.highlight || null);
      histories[scenario].push({ role: "assistant", content: reply });
      return reply;
    } catch (err) {
      typing.remove();
      appendBubble(scenario, "system", String(err?.message || err));
      return null;
    } finally {
      busy[scenario] = false;
      if (btn) btn.disabled = false;
      if (input && !playing[scenario]) input.focus();
    }
  }

  async function playJourney(scenario) {
    const sc = byId[scenario];
    if (!sc || playing[scenario] || busy[scenario]) return;
    playing[scenario] = true;
    const playBtn = document.querySelector(`.play-journey[data-play="${scenario}"]`);
    if (playBtn) {
      playBtn.disabled = true;
      playBtn.textContent = "Playing…";
    }

    // Fresh arc
    histories[scenario] = [];
    el(`msg-${scenario}`).innerHTML = "";
    appendBubble(
      scenario,
      "system",
      `Playing ${sc.journey.length}-turn journey — watch the highlights light up.`
    );

    for (let i = 0; i < sc.journey.length; i += 1) {
      if (!playing[scenario]) break;
      const step = sc.journey[i];
      markStep(scenario, i, "active");
      setTurn(scenario, `${step.label} · ${step.highlight}`);
      appendBubble(scenario, "system", `Highlight: ${step.highlight}`);
      const reply = await send(scenario, step.user, { highlight: step.highlight });
      markStep(scenario, i, reply ? "done" : "active");
      if (!reply) break;
      await new Promise((r) => setTimeout(r, 350));
    }

    if (playing[scenario]) {
      markStep(scenario, sc.journey.length, "all-done");
      setTurn(scenario, "Journey complete");
      appendBubble(scenario, "system", "Journey complete — reset anytime or keep chatting.");
    }
    playing[scenario] = false;
    if (playBtn) {
      playBtn.disabled = false;
      playBtn.textContent = "Replay journey";
    }
  }

  document.querySelectorAll(".option").forEach((node) => {
    reset(node.dataset.scenario);
  });

  document.querySelectorAll(".reset-btn").forEach((btn) => {
    btn.addEventListener("click", () => reset(btn.dataset.reset));
  });

  document.querySelectorAll(".play-journey").forEach((btn) => {
    btn.addEventListener("click", () => playJourney(btn.dataset.play));
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const scenario = chip.dataset.scenario;
      const sc = byId[scenario];
      const step = sc?.journey?.find((j) => j.user === chip.dataset.text);
      send(scenario, chip.dataset.text, { highlight: step?.highlight || null });
    });
  });

  document.querySelectorAll("form.composer").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const scenario = form.dataset.scenario;
      const text = new FormData(form).get("text");
      send(scenario, String(text || ""));
    });
  });
})();
