"""Zero-Leak PII Isolation & Formula Injection Tests (PRD Ch. 14.3 TC-02 & Ch. 24.1)."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.services.pii_scrubber import scrub_pii, verify_masked_dataframe

SAMPLE_DIR = Path(__file__).resolve().parents[2] / "sample_data"


def test_zero_indian_pii_leakage():
    raw = pd.DataFrame([
        {
            "order_id": "ORD-101",
            "customer_name": "Rohan Patel",
            "phone": "+91 98250 44192",
            "email": "rohan.patel@example.in",
            "upi_id": "rohan@okhdfcbank",
            "address": "42 SG Highway, Ahmedabad",
            "pan": "ABCDE1234F",
            "notes": "=cmd|' /C calc'!A0",
            "order_value_inr": 2450,
            "status": "RTO",
        }
    ])
    masked, cols, diff, rules = scrub_pii(raw)
    serialized = masked.to_csv(index=False)
    assert "Rohan Patel" not in serialized
    assert "98250" not in serialized
    assert "rohan.patel@example.in" not in serialized
    assert "rohan@okhdfcbank" not in serialized
    assert "SG Highway" not in serialized
    assert "ABCDE1234F" not in serialized
    assert "CUST_" in serialized
    assert "'=cmd" in serialized
    assert len(diff) == 1
    assert set(cols) >= {"customer_name", "phone", "email", "upi_id", "address", "pan"}
    assert "NAME_SALTED_SHA256" in rules


def test_all_three_demo_presets_zero_pii_leak(tmp_path: Path):
    for name in ("ahmedabad_d2c.csv", "surat_wholesale.csv", "personal_upi_30d.csv"):
        df = pd.read_csv(SAMPLE_DIR / name)
        masked, cols, diff, _ = scrub_pii(df)
        verify_masked_dataframe(masked)
        out = tmp_path / f"masked_{name}"
        masked.to_csv(out, index=False)
        assert len(cols) >= 1
        assert len(diff) == 3
