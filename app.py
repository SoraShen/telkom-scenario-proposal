"""Telkom scenario proposal + GLM-5.2 live demos."""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from chatbot.scenarios import SCENARIOS, system_prompt

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env")

MAAS_BASE = os.environ.get("HUAWEI_MAAS_BASE_URL", "https://api-ap-southeast-1.modelarts-maas.com/v2").rstrip("/")
MAAS_KEY = os.environ.get("HUAWEI_MAAS_API_KEY", "")
MAAS_MODEL = os.environ.get("HUAWEI_MAAS_GLM_MODEL", "glm-5.2")

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/")
    def index():
        return render_template("index.html", scenarios=list(SCENARIOS.values()))

    @app.get("/healthz")
    def healthz():
        return jsonify(status="ok", model=MAAS_MODEL, maas_configured=bool(MAAS_KEY))

    @app.post("/api/chat")
    def api_chat():
        data = request.get_json(silent=True) or {}
        scenario_id = str(data.get("scenario") or "").strip()
        if scenario_id not in SCENARIOS:
            return jsonify(error="unknown scenario"), 400

        messages_in = data.get("messages") or []
        if not isinstance(messages_in, list) or not messages_in:
            return jsonify(error="messages required"), 400

        history = []
        for m in messages_in[-12:]:
            role = str(m.get("role") or "")
            content = str(m.get("content") or "").strip()[:2000]
            if role in ("user", "assistant") and content:
                history.append({"role": role, "content": content})
        if not history or history[-1]["role"] != "user":
            return jsonify(error="last message must be from user"), 400

        if not MAAS_KEY:
            return jsonify(
                reply=(
                    "GLM-5.2 is not configured on this host. "
                    "Set HUAWEI_MAAS_API_KEY in .env.local to enable live demos."
                ),
                model=None,
            )

        payload = {
            "model": MAAS_MODEL,
            "messages": [{"role": "system", "content": system_prompt(scenario_id)}, *history],
            "temperature": 0.4,
            "max_tokens": 700,
            "thinking": {"type": "disabled"},
        }
        try:
            reply = call_maas(payload)
        except Exception as exc:  # noqa: BLE001
            return jsonify(error=f"GLM call failed: {exc}"), 502

        return jsonify(reply=reply, model=MAAS_MODEL, scenario=scenario_id)

    return app


def call_maas(payload: dict) -> str:
    url = f"{MAAS_BASE}/chat/completions"
    body = json.dumps(payload).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {MAAS_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90, context=SSL_CTX) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:400]
        raise RuntimeError(f"HTTP {e.code}: {detail}") from e

    choice = (raw.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    content = (msg.get("content") or "").strip()
    if not content:
        raise RuntimeError("empty model response")
    return content


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5090"))
    app.run(host="0.0.0.0", port=port, debug=True)
