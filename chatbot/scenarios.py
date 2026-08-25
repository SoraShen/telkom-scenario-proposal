"""Scenario catalogue for the Telkom BSS-first proposal demos."""

from __future__ import annotations

import json

SCENARIOS: dict[str, dict] = {
    "roaming": {
        "id": "roaming",
        "title": "International Roaming Assistant",
        "short": "Roaming",
        "tag": "Option 1 · Recommended · P0",
        "verdict": "Strong fit · BSS / OCS only",
        "verdict_tone": "go",
        "pain": "Unclear roaming costs and running out of data abroad",
        "value": "Pre-trip sell → in-trip top-up → post-trip bill clarity",
        "systems": ["BSS/CRM", "OCS / charging", "CDR retrieval"],
        "network_touch": "None — no radio or core involvement",
        "highlights": [
            {
                "title": "Trip-aware discovery",
                "body": "Detects destination + duration and maps to the right roaming product.",
            },
            {
                "title": "Cost-saving recommendation",
                "body": "Compares daily vs weekly passes so the customer sees savings before buy.",
            },
            {
                "title": "One-tap BSS activation",
                "body": "Activates the bundle via BSS and returns a confirmation reference.",
            },
            {
                "title": "In-trip control",
                "body": "Remaining data check + instant extra top-up while abroad.",
            },
            {
                "title": "Post-trip bill clarity",
                "body": "Itemised roaming charges from CDR — no bill shock.",
            },
        ],
        "journey": [
            {
                "label": "1 · Destination",
                "highlight": "Trip-aware discovery",
                "user": "I'm going to the UK for a week next month",
            },
            {
                "label": "2 · Compare",
                "highlight": "Cost-saving recommendation",
                "user": "Which option saves me more money for 7 days?",
            },
            {
                "label": "3 · Activate",
                "highlight": "One-tap BSS activation",
                "user": "Please activate the UK 7-Day Pass for me",
            },
            {
                "label": "4 · In-trip",
                "highlight": "In-trip control",
                "user": "I'm in London now — how much data do I have left? Top up 1GB if low",
            },
            {
                "label": "5 · Bill",
                "highlight": "Post-trip bill clarity",
                "user": "I'm home — break down my roaming charges",
            },
        ],
        "chips": [
            "I'm going to the UK for a week next month",
            "Which option saves me more money for 7 days?",
            "Please activate the UK 7-Day Pass for me",
            "I'm in London now — how much data do I have left? Top up 1GB if low",
            "I'm home — break down my roaming charges",
        ],
        "mock_bss": {
            "msisdn": "0812345678",
            "plan": "FreeMe 10GB",
            "account_type": "postpaid",
            "home_balance_zar": 186.40,
            "roaming_destination": "United Kingdom",
            "suggested_bundles": [
                {
                    "id": "uk-day-99",
                    "name": "UK Daily Pass",
                    "price_zar": 99,
                    "allowance": "1GB/day · calls & SMS included",
                    "week_cost_if_7_days": 693,
                },
                {
                    "id": "uk-week-499",
                    "name": "UK 7-Day Pass",
                    "price_zar": 499,
                    "allowance": "5GB · 7 days",
                    "saving_vs_daily_zar": 194,
                },
                {
                    "id": "payg",
                    "name": "Pay-as-you-go",
                    "price_zar": 0,
                    "allowance": "~R2.50/MB",
                },
            ],
            "active_roaming_bundle": {
                "id": "uk-week-499",
                "name": "UK 7-Day Pass",
                "data_left_mb": 820,
                "days_left": 4,
            },
            "topup_1gb_zar": 99,
            "post_trip_charges": [
                {"item": "UK 7-Day Pass", "amount_zar": 499.00},
                {"item": "Extra data top-up 1GB", "amount_zar": 99.00},
                {"item": "Total", "amount_zar": 598.00},
            ],
        },
    },
    "security": {
        "id": "security",
        "title": "SIM & Account Security",
        "short": "Security",
        "tag": "Option 2 · Recommended · P0",
        "verdict": "Strong fit · reuse existing SIM self-care APIs",
        "verdict_tone": "go",
        "pain": "Lost phone, PIN lock, urgent SIM protection without a store visit",
        "value": "Verify → block / unblock / PUK / SIM swap in one chat thread",
        "systems": ["CRM + RICA IDV", "SIM lifecycle / self-care APIs", "WhatsApp SIM-swap path"],
        "network_touch": "No new HLR project — same lifecycle APIs already used by WhatsApp",
        "highlights": [
            {
                "title": "Identity-first gate",
                "body": "RICA / ID check before any sensitive action — fraud-safe by design.",
            },
            {
                "title": "Instant SIM protect",
                "body": "Block a lost SIM in seconds; confirmation reference returned in chat.",
            },
            {
                "title": "Find & restore",
                "body": "Unblock when the phone is found — no call centre queue.",
            },
            {
                "title": "PUK without the queue",
                "body": "Secure PUK retrieval after identity proof.",
            },
            {
                "title": "Guided SIM swap",
                "body": "Hands the customer onto the same self-care path Telkom already runs on WhatsApp.",
            },
        ],
        "journey": [
            {
                "label": "1 · Panic",
                "highlight": "Identity-first gate",
                "user": "I lost my phone — please block my SIM right now",
            },
            {
                "label": "2 · Verify",
                "highlight": "Identity-first gate",
                "user": "My ID number is 9001015800085",
            },
            {
                "label": "3 · Block",
                "highlight": "Instant SIM protect",
                "user": "Yes, block it now",
            },
            {
                "label": "4 · Restore",
                "highlight": "Find & restore",
                "user": "I found my phone — please unblock the SIM",
            },
            {
                "label": "5 · Extra",
                "highlight": "PUK + SIM swap path",
                "user": "Also send my PUK, and tell me how to start a SIM swap if needed",
            },
        ],
        "chips": [
            "I lost my phone — please block my SIM right now",
            "My ID number is 9001015800085",
            "Yes, block it now",
            "I found my phone — please unblock the SIM",
            "Also send my PUK, and tell me how to start a SIM swap if needed",
        ],
        "mock_bss": {
            "msisdn": "0812345678",
            "rica_name": "Thandi Mokoena",
            "id_number": "9001015800085",
            "id_last4": "0085",
            "sim_status": "active",
            "puk": "12345678",
            "security_question": "What suburb did you RICA in?",
            "security_answer": "Sandton",
            "ticket_prefix": "SIM",
            "sim_swap_channel": "WhatsApp self-care (existing Telkom path)",
        },
    },
}


SYSTEM_PREAMBLE = """You are Telkom SA's digital assistant in a Huawei Cloud customer demo.
Speak concise, warm South African English. Never invent real backend outages.
This is a DEMO: use the provided MOCK_BSS JSON as ground truth and simulate successful BSS actions.
When you activate, block, unblock, or retrieve PUK, invent a short confirmation reference like TK-ROAM-4821 or TK-SIM-1194.
Keep replies short (2–5 sentences). Prefer clear next steps and one question at a time.
Surface the SCENARIO HIGHLIGHTS naturally in your wording (savings, confirmation refs, identity gate, etc.).
If the user asks something outside this scenario, answer briefly then steer back, or offer human agent transfer.
Do not mention being an AI model unless asked. Do not mention CTO or network teams.
Do not say you are calling HLR/HSS — say SIM lifecycle / self-care systems.
Format lightly: short paragraphs or bullets. No markdown tables. No code fences. Avoid heavy markdown bold.
"""


def system_prompt(scenario_id: str) -> str:
    sc = SCENARIOS[scenario_id]
    focus = {
        "roaming": (
            "MULTI-TURN ARC to honour:\n"
            "1) Destination + duration discovery.\n"
            "2) Compare UK Daily Pass R99/day (R693/week) vs UK 7-Day Pass R499 — highlight R194 saving.\n"
            "3) Activate 7-Day Pass via BSS; give confirmation ref; update mental state as active.\n"
            "4) In-trip: report data left from MOCK_BSS.active_roaming_bundle; if user asks top-up, sell 1GB at R99 and confirm.\n"
            "5) Post-trip: itemise post_trip_charges clearly.\n"
            "Always name the highlight you are delivering in plain language."
        ),
        "security": (
            "MULTI-TURN ARC to honour:\n"
            "1) Empathise + refuse to block until identity verified (ask ID number or last 4 digits).\n"
            "2) Accept ID 9001015800085 (or last4 0085) as verified for Thandi Mokoena.\n"
            "3) On confirm, block SIM via self-care API; status becomes blocked; give TK-SIM-xxxx ref.\n"
            "4) On unblock request, restore service; give new ref.\n"
            "5) PUK only after verified identity; explain SIM swap uses existing WhatsApp self-care path.\n"
            "Never claim to touch the radio network."
        ),
    }[scenario_id]

    highlights = "\n".join(f"- {h['title']}: {h['body']}" for h in sc["highlights"])

    return (
        SYSTEM_PREAMBLE
        + f"\nSCENARIO: {sc['title']}\n"
        + f"HIGHLIGHTS TO SHOWCASE:\n{highlights}\n"
        + f"{focus}\n"
        + f"MOCK_BSS = {json.dumps(sc['mock_bss'], ensure_ascii=False)}\n"
    )
