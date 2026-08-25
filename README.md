# Telkom BSS-First Scenario Proposal

Customer-facing proposal page to replace **network troubleshooting** with two BSS/CRM/charging journeys, each with highlights, a **5-turn user journey**, and a **GLM-5.2** live demo (Huawei Cloud MaaS). Brand colours follow [telkom.co.za](https://www.telkom.co.za/) (`#0099FF` / `#91E200` / `#003F6A`).

## Verdict (short)

| Option | Fit | Note |
|--------|-----|------|
| International Roaming | **Ship (P0)** | Pure BSS/OCS |
| SIM & Account Security | **Ship (P0)** | Reuse existing SIM self-care APIs — do not pitch new HLR/HSS work |

Keep: balance & bill, recharge, packages, FAQs, human agent transfer.

## Run locally

```bash
cd telkom-scenario-proposal
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local   # then set HUAWEI_MAAS_API_KEY
python app.py
```

Open http://127.0.0.1:5090

## API

- `GET /healthz`
- `POST /api/chat` `{ "scenario": "roaming|security|sharing", "messages": [{role, content}] }`
