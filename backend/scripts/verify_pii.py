#!/usr/bin/env python3
# Automated Zero-Leak PII Verification Gate for Vexa Bridge masked CSVs.
import re, sys
import pandas as pd

PATTERNS = {
    "IN_MOBILE": re.compile(r"(?:\+91[\-\s]?)?[6-9]\d{9}\b"),
    "EMAIL":     re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"),
    "UPI_ID":    re.compile(r"\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{3,32}\b"),
    "PAN":       re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b"),
    "AADHAAR":   re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b"),
}


def verify_csv(path: str) -> int:
    df = pd.read_csv(path, dtype=str).fillna("")
    violations = []
    for col in df.columns:
        for rule_name, regex in PATTERNS.items():
            hits = df[col].str.contains(regex, regex=True).sum()
            if hits > 0:
                violations.append(f"{col}: {hits} {rule_name} match(es)")
    if violations:
        print("FAIL — PII LEAK DETECTED:", "; ".join(violations))
        return 1
    print(f"PASS — 0 PII leaks across {len(df)} rows and {len(df.columns)} columns.")
    return 0


if __name__ == "__main__":
    sys.exit(verify_csv(sys.argv[1]))
