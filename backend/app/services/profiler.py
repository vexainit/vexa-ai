"""Vectorized Pandas/NumPy deterministic profiler (PRD Ch. 9 & 17.3)."""
from __future__ import annotations

import io
import time
from typing import Any

import numpy as np
import pandas as pd

DELAY_KEYWORDS = ("delayed", "late", "overdue", "sla_breach", "pending_48h")
RETURN_KEYWORDS = ("returned", "rto", "refund", "cancelled", "canceled")
MAX_ROWS = 25_000


def load_dataframe_from_bytes(content: bytes, filename: str) -> pd.DataFrame:
    """Decode CSV (utf-8-sig -> cp1252 -> latin1) or XLSX cleanly."""
    lower = filename.lower()
    if lower.endswith(".xlsx"):
        df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    elif lower.endswith(".csv"):
        last_err: Exception | None = None
        df = None
        for enc in ("utf-8-sig", "cp1252", "latin1"):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=enc)
                break
            except Exception as exc:
                last_err = exc
        if df is None:
            raise ValueError(f"Unable to parse CSV across utf-8-sig/cp1252/latin1: {last_err}")
    else:
        raise ValueError("Unsupported file extension. Upload .csv or .xlsx.")

    df.columns = [str(c).strip() for c in df.columns]
    if len(df) == 0:
        raise ValueError("Uploaded file contains zero rows.")
    if len(df) > MAX_ROWS:
        raise ValueError(f"Row limit exceeded ({len(df)} > {MAX_ROWS}).")
    return df


def _infer_semantic_type(series: pd.Series, col_name: str) -> str:
    low = col_name.lower()
    if any(k in low for k in ("date", "time", "timestamp", "_at")):
        return "date"
    if any(k in low for k in ("inr", "amount", "value", "quote", "price", "revenue")):
        return "currency_inr"
    if any(k in low for k in ("status", "state", "converted")):
        return "status"
    if pd.api.types.is_numeric_dtype(series):
        return "numeric"
    if series.nunique(dropna=True) <= 25:
        return "category"
    return "text"


def _detect_peak_segment(df: pd.DataFrame, issue_mask: pd.Series) -> str:
    if issue_mask.sum() == 0:
        return "No dominant anomaly segment detected"

    cols_lower = {c.lower().strip(): c for c in df.columns}
    issue_df = df[issue_mask]

    # Check payment_mode / channel / city / category
    parts: list[str] = []
    for key in ("payment_mode", "channel", "city", "category", "fabric_sku"):
        col = next((orig for low, orig in cols_lower.items() if key in low), None)
        if col and issue_df[col].notna().any():
            top_val = str(issue_df[col].value_counts().index[0])
            parts.append(top_val)
            if len(parts) == 2:
                break

    # Check day-of-week clustering on date columns
    date_col = next(
        (orig for low, orig in cols_lower.items() if any(k in low for k in ("order_date", "received_at", "date", "timestamp"))),
        None,
    )
    if date_col:
        dt = pd.to_datetime(issue_df[date_col], errors="coerce")
        if dt.notna().sum() > 5:
            top_days = dt.dt.day_name().value_counts().head(3).index.tolist()
            short_days = [d[:3] for d in top_days]
            parts.append(f"Peak {'/'.join(short_days)}")

    return " · ".join(parts) if parts else "High-Exception Operational Segment"


def profile_dataframe(df: pd.DataFrame, workspace_mode: str = "SMB") -> dict[str, Any]:
    """Run vectorized deterministic profiling in <1.5s and emit compact (<4KB) JSON stats."""
    t0 = time.perf_counter()
    row_count, col_count = df.shape
    missing_pct = round(float(df.isna().sum().sum()) / max(1, row_count * col_count) * 100, 2)
    dup_rows = int(df.duplicated().sum())

    cols_lower = {c.lower().strip(): c for c in df.columns}
    schema_types = {c: _infer_semantic_type(df[c], c) for c in df.columns}
    null_pcts = {c: round(float(df[c].isna().mean() * 100), 1) for c in df.columns}

    stats: dict[str, Any] = {
        "row_count": int(row_count),
        "col_count": int(col_count),
        "missing_cell_pct": missing_pct,
        "duplicate_rows": dup_rows,
        "columns": list(df.columns),
        "schema_types": schema_types,
        "null_pct_by_col": null_pcts,
    }

    val_col = next(
        (orig for low, orig in cols_lower.items() if any(k in low for k in ("value", "amount", "quote", "price", "inr"))),
        None,
    )
    status_col = next(
        (orig for low, orig in cols_lower.items() if any(k in low for k in ("status", "state", "converted"))),
        None,
    )

    mode = workspace_mode.upper()
    if mode in ("SMB", "CAMPUS"):
        delayed_mask = pd.Series(False, index=df.index)
        return_mask = pd.Series(False, index=df.index)

        if status_col:
            s_lower = df[status_col].astype(str).str.lower()
            delayed_mask = s_lower.str.contains("|".join(DELAY_KEYWORDS), na=False)
            return_mask = s_lower.str.contains("|".join(RETURN_KEYWORDS), na=False)

        # Also check promised_date vs dispatch_date / actual_delivery_date if available
        promised_col = next((orig for low, orig in cols_lower.items() if "promised" in low), None)
        actual_col = next(
            (orig for low, orig in cols_lower.items() if any(k in low for k in ("dispatch_date", "actual_delivery", "delivered_at"))),
            None,
        )
        if promised_col and actual_col:
            p_dt = pd.to_datetime(df[promised_col], errors="coerce")
            a_dt = pd.to_datetime(df[actual_col], errors="coerce")
            date_delay = (a_dt > p_dt).fillna(False)
            delayed_mask = delayed_mask | (date_delay & ~return_mask)

        # Also check received_at vs first_reply_at > 24h for inquiry logs
        recv_col = next((orig for low, orig in cols_lower.items() if "received" in low), None)
        reply_col = next((orig for low, orig in cols_lower.items() if "first_reply" in low), None)
        if recv_col and reply_col:
            r_dt = pd.to_datetime(df[recv_col], errors="coerce")
            f_dt = pd.to_datetime(df[reply_col], errors="coerce")
            slow_reply = ((f_dt - r_dt).dt.total_seconds() > 24 * 3600).fillna(False)
            delayed_mask = delayed_mask | slow_reply

        delayed_pct = round(float(delayed_mask.mean() * 100), 2)
        rto_pct = round(float(return_mask.mean() * 100), 2)

        leak_inr = 0.0
        if val_col:
            vals = (
                df[val_col]
                .astype(str)
                .str.replace(r"[₹,\sINR]", "", regex=True)
            )
            vals_num = pd.to_numeric(vals, errors="coerce").fillna(0.0)
            if return_mask.sum() > 0:
                leak_inr = float(vals_num[return_mask].sum() + vals_num[delayed_mask].sum() * 0.15)
            else:
                # For inquiry logs where slow replies drop conversion, compute missed pipeline impact
                leak_inr = float(vals_num[delayed_mask].sum() * 0.12)

        # Manual hours lost: 6 min (0.10 hr) per exception + missing-field rework
        missing_rows = int(df.isna().any(axis=1).sum())
        manual_hours = round((int(delayed_mask.sum()) + int(return_mask.sum()) + dup_rows + missing_rows) * 0.10, 1)

        stats.update({
            "delayed_order_pct": delayed_pct,
            "cod_rto_pct": rto_pct,
            "delayed_count": int(delayed_mask.sum()),
            "return_count": int(return_mask.sum()),
            "est_monthly_leak_inr": round(leak_inr, 2),
            "est_manual_hours_lost": manual_hours,
            "peak_bottleneck_segment": _detect_peak_segment(df, delayed_mask | return_mask),
        })
        if mode == "CAMPUS":
            stats["dataset_complexity_score"] = min(100, int(45 + col_count * 3 + missing_pct * 2 + (10 if dup_rows > 0 else 0)))
            stats["edge_case_count"] = int(missing_rows + dup_rows)
    else:
        # PERSONAL S.P.E.N.D. Mode
        if val_col:
            vals_str = df[val_col].astype(str).str.replace(r"[₹,\sINR]", "", regex=True)
            vals_num = pd.to_numeric(vals_str, errors="coerce").fillna(0.0)
        else:
            vals_num = pd.Series(0.0, index=df.index)

        micro_mask = (vals_num > 0) & (vals_num < 300)
        ts_col = next((orig for low, orig in cols_lower.items() if any(k in low for k in ("timestamp", "time", "date"))), None)
        cat_col = next((orig for low, orig in cols_lower.items() if "category" in low), None)
        rec_col = next((orig for low, orig in cols_lower.items() if "recurring" in low), None)

        late_night_pct = 0.0
        if ts_col:
            dt = pd.to_datetime(df[ts_col], errors="coerce")
            hours = dt.dt.hour
            late_mask = ((hours >= 22) | (hours < 4)).fillna(False)
            if cat_col:
                food_mask = df[cat_col].astype(str).str.lower().str.contains("food|dining|snack", na=False)
                denom = max(1, int(food_mask.sum()))
                late_night_pct = round(float((late_mask & food_mask).sum() / denom * 100), 1)
            else:
                late_night_pct = round(float(late_mask.mean() * 100), 1)

        recurring_drain = 0.0
        recurring_count = 0
        if rec_col:
            rec_mask = df[rec_col].astype(str).str.lower().isin(("true", "1", "yes"))
            recurring_count = int(rec_mask.sum())
            recurring_drain = round(float(vals_num[rec_mask].sum()), 2)

        top_categories: dict[str, float] = {}
        if cat_col:
            cat_sums = vals_num.groupby(df[cat_col].astype(str)).sum().sort_values(ascending=False).head(3)
            top_categories = {str(k): round(float(v), 2) for k, v in cat_sums.items()}

        micro_sum = round(float(vals_num[micro_mask].sum()), 2)
        stats.update({
            "total_spend_inr": round(float(vals_num.sum()), 2),
            "micro_txn_count": int(micro_mask.sum()),
            "micro_txn_sum_inr": micro_sum,
            "late_night_impulse_pct": late_night_pct,
            "recurring_sub_count": recurring_count,
            "recurring_drain_inr": recurring_drain,
            "top_categories": top_categories,
            "est_monthly_leak_inr": round(micro_sum + recurring_drain, 2),
            "est_manual_hours_lost": 0.0,
            "peak_bottleneck_segment": f"Micro-Txns (<₹300: {int(micro_mask.sum())}) & Late-Night Food ({late_night_pct}%)",
        })

    stats["profiling_ms"] = int((time.perf_counter() - t0) * 1000)
    return stats
