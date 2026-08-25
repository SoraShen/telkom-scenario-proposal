# Telkom · Choose One Non-Network Journey

Customer review page: pick **either International Roaming or SIM & Account Security** to replace **network troubleshooting**.  
Purpose: validate **experience design** and confirm whether Telkom can **provide the listed APIs**. Not a production go-live.

Brand colours follow [telkom.co.za](https://www.telkom.co.za/) (`#0099FF` / `#91E200` / `#003F6A`).

## Why not “BSS-first”?

| Candidate | Domain |
|-----------|--------|
| International Roaming | BSS/CRM + OCS/charging + CDR |
| SIM & Account Security | CRM/RICA + SIM lifecycle / self-care (reuse WhatsApp path) — **not pure BSS** |

Page framing: **non-network** (outside RAN / core optimisation).

## Choose one

Keep: balance & bill, recharge, packages, FAQs, human agent transfer.  
Replace troubleshooting with **one** of the two candidates after design + API readiness review.

Each option includes highlights, a 5-turn journey, an API checklist, and a live assistant demo (Huawei Cloud MaaS, mocked backends).

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
- `POST /api/chat` `{ "scenario": "roaming|security", "messages": [{role, content}] }`
