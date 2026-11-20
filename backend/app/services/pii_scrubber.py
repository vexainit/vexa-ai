"""Two-pass Indian PII Scrubber, Salted SHA-256 Hasher, Formula Neutralizer & Zero-Leak Gate (PRD Ch. 9 & 17.4)."""
from __future__ import annotations

import hashlib
import re
import secrets
from typing import Any

import pandas as pd

PHONE_RE = re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b")
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
UPI_RE = re.compile(r"\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{3,32}\b")
PAN_RE = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")
GSTIN_RE = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b")
AADHAAR_RE = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")

NAME_HEADERS = ("name", "customer", "buyer", "client", "recipient", "contact_person")
ADDR_HEADERS = ("address", "street", "flat", "house", "landmark")
ID_HEADERS = ("pan", "aadhaar", "gstin", "account_no")
PHONE_HEADERS = ("phone", "mobile", "whatsapp", "contact", "tel")
EMAIL_HEADERS = ("email", "mail", "e_mail")
UPI_HEADERS = ("upi", "vpa", "payer_id", "payee")

FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

VERIFY_PATTERNS = {
    "IN_MOBILE": PHONE_RE,
    "EMAIL": EMAIL_RE,
    "UPI_ID": UPI_RE,
    "PAN": PAN_RE,
    "AADHAAR": AADHAAR_RE,
}


class PIILeakageViolationError(RuntimeError):
    """Raised when the automated zero-leak verification gate detects surviving PII."""


def scrub_pii(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str], list[dict[str, Any]], list[str]]:
    """
    Returns (masked_df, redacted_columns, diff_rows, rules_triggered).
    Guarantees zero raw Indian PII and neutralizes CSV formula injection.
    """
    salt = secrets.token_hex(16)
    masked = df.copy()
    redacted_cols: list[str] = []
    rules_triggered: set[str] = set()

    def hash_name(val: Any) -> str:
        s = "" if pd.isna(val) else str(val).strip()
        if not s or s.lower() == "nan":
            return "CUST_000000"
        digest = hashlib.sha256(f"{salt}:{s}".encode("utf-8")).hexdigest()[:6].upper()
        return f"CUST_{digest}"

    for col in masked.columns:
        low = col.lower().strip()
        col_modified = False

        if any(k in low for k in NAME_HEADERS):
            masked[col] = masked[col].apply(hash_name)
            redacted_cols.append(col)
            rules_triggered.add("NAME_SALTED_SHA256")
            continue

        if any(k in low for k in ADDR_HEADERS):
            masked[col] = "[REDACTED_ADDR]"
            redacted_cols.append(col)
            rules_triggered.add("ADDR_HEADER")
            continue

        if any(k in low for k in ID_HEADERS):
            masked[col] = "[REDACTED_ID]"
            redacted_cols.append(col)
            rules_triggered.add("GOV_ID_HEADER")
            continue

        if any(k in low for k in PHONE_HEADERS):
            masked[col] = "[REDACTED_PHONE]"
            redacted_cols.append(col)
            rules_triggered.add("IN_MOBILE_REGEX")
            continue

        if any(k in low for k in EMAIL_HEADERS):
            masked[col] = "[REDACTED_EMAIL]"
            redacted_cols.append(col)
            rules_triggered.add("EMAIL_REGEX")
            continue

        if any(k in low for k in UPI_HEADERS):
            masked[col] = "[REDACTED_UPI]"
            redacted_cols.append(col)
            rules_triggered.add("UPI_REGEX")
            continue

        # Pass 2: Cell-level regex sweep across all string/object columns
        if masked[col].dtype == object or pd.api.types.is_string_dtype(masked[col]):
            series = masked[col].fillna("").astype(str)
            orig = series.copy()

            if series.str.contains(EMAIL_RE, regex=True).any():
                series = series.str.replace(EMAIL_RE, "[REDACTED_EMAIL]", regex=True)
                rules_triggered.add("EMAIL_REGEX")
                col_modified = True
            if series.str.contains(UPI_RE, regex=True).any():
                series = series.str.replace(UPI_RE, "[REDACTED_UPI]", regex=True)
                rules_triggered.add("UPI_REGEX")
                col_modified = True
            if series.str.contains(PHONE_RE, regex=True).any():
                series = series.str.replace(PHONE_RE, "[REDACTED_PHONE]", regex=True)
                rules_triggered.add("IN_MOBILE_REGEX")
                col_modified = True
            if series.str.contains(GSTIN_RE, regex=True).any():
                series = series.str.replace(GSTIN_RE, "[REDACTED_ID]", regex=True)
                rules_triggered.add("GSTIN_REGEX")
                col_modified = True
            if series.str.contains(PAN_RE, regex=True).any():
                series = series.str.replace(PAN_RE, "[REDACTED_ID]", regex=True)
                rules_triggered.add("PAN_REGEX")
                col_modified = True
            if series.str.contains(AADHAAR_RE, regex=True).any():
                series = series.str.replace(AADHAAR_RE, "[REDACTED_ID]", regex=True)
                rules_triggered.add("AADHAAR_REGEX")
                col_modified = True

            # Neutralize CSV formula injection (=, +, -, @, tab, CR)
            series = series.apply(lambda v: f"'{v}" if v.startswith(FORMULA_PREFIXES) else v)

            if col_modified or not series.equals(orig):
                if col_modified:
                    redacted_cols.append(col)
            masked[col] = series

    # Run in-memory zero-leak verification gate before returning
    verify_masked_dataframe(masked)

    # Capture 3-row diff for Owner PII Shield Diff Drawer
    diff_rows: list[dict[str, Any]] = []
    for idx in range(min(3, len(df))):
        diff_rows.append({
            "row_index": idx + 1,
            "original": {c: ("" if pd.isna(df.iloc[idx][c]) else str(df.iloc[idx][c])) for c in df.columns},
            "masked": {c: ("" if pd.isna(masked.iloc[idx][c]) else str(masked.iloc[idx][c])) for c in masked.columns},
        })

    return masked, sorted(set(redacted_cols)), diff_rows, sorted(rules_triggered)


def verify_masked_dataframe(df: pd.DataFrame) -> None:
    """Automated zero-leak gate matching verify_pii.py."""
    violations: list[str] = []
    for col in df.columns:
        s = df[col].fillna("").astype(str)
        for rule_name, regex in VERIFY_PATTERNS.items():
            hits = int(s.str.contains(regex, regex=True).sum())
            if hits > 0:
                violations.append(f"{col}: {hits} {rule_name} match(es)")
    if violations:
        raise PIILeakageViolationError("; ".join(violations))
