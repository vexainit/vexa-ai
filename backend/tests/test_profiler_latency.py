"""Profiler Latency & Accuracy Tests (<1.5s SLA, PRD Ch. 9 & 14.3)."""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from app.services.profiler import profile_dataframe

SAMPLE_DIR = Path(__file__).resolve().parents[2] / "sample_data"


def test_ahmedabad_d2c_profiler_latency_and_metrics():
    df = pd.read_csv(SAMPLE_DIR / "ahmedabad_d2c.csv")
    stats = profile_dataframe(df, "SMB")
    assert stats["row_count"] == 500
    assert stats["profiling_ms"] < 1500
    assert stats["delayed_order_pct"] >= 20.0
    assert stats["cod_rto_pct"] >= 15.0
    assert stats["est_monthly_leak_inr"] > 100000


def test_surat_wholesale_profiler_latency_and_metrics():
    df = pd.read_csv(SAMPLE_DIR / "surat_wholesale.csv")
    stats = profile_dataframe(df, "SMB")
    assert stats["row_count"] == 400
    assert stats["profiling_ms"] < 1500
    assert stats["delayed_order_pct"] >= 35.0
    assert stats["est_monthly_leak_inr"] > 100000


def test_personal_upi_profiler_latency_and_metrics():
    df = pd.read_csv(SAMPLE_DIR / "personal_upi_30d.csv")
    stats = profile_dataframe(df, "PERSONAL")
    assert stats["row_count"] == 180
    assert stats["profiling_ms"] < 1500
    assert stats["micro_txn_count"] == 64
    assert stats["recurring_sub_count"] == 4
    assert stats["late_night_impulse_pct"] > 15.0
