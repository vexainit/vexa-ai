"""Deterministic generator for the 3 realistic Indian demo CSV presets (PRD Ch. 14.2)."""
from __future__ import annotations

import csv
import os
import random
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SAMPLE_DIR = ROOT / "sample_data"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

FIRST_NAMES = [
    "Rohan", "Aarav", "Priya", "Neha", "Vikram", "Ananya", "Karan", "Meera",
    "Siddharth", "Pooja", "Harsh", "Divya", "Nikhil", "Kavita", "Manish",
    "Sneha", "Rajesh", "Isha", "Amit", "Ritu", "Dev", "Tanvi", "Suresh", "Komal",
]
LAST_NAMES = [
    "Patel", "Shah", "Mehta", "Desai", "Joshi", "Trivedi", "Parekh", "Modi",
    "Sharma", "Verma", "Nair", "Kulkarni", "Gupta", "Agarwal", "Bhatt", "Soni",
]
STREETS = [
    "SG Highway", "CG Road", "Satellite Road", "Prahlad Nagar", "Ring Road",
    "Vesu Main Road", "Piplod Lane", "Alkapuri Circle", "Kalawad Road", "University Road",
    "MG Road", "Station Road", "Navrangpura Cross", "Maninagar East",
]
TIER2_CITIES = ["Rajkot", "Vadodara", "Bhavnagar", "Jamnagar", "Nashik", "Nagpur", "Indore", "Udaipur"]
TIER1_CITIES = ["Ahmedabad", "Mumbai", "Pune", "Bengaluru", "Delhi", "Surat"]
UPI_HANDLES = ["okhdfcbank", "oksbi", "okaxis", "ybl", "paytm", "ibl"]


def _fake_phone(rng: random.Random) -> str:
    prefix = rng.choice(["98", "99", "97", "96", "94", "93", "91", "88", "87", "79", "70"])
    rest = "".join(str(rng.randint(0, 9)) for _ in range(8))
    fmt = rng.choice(["+91 ", "+91-", ""])
    if fmt == "+91 ":
        return f"+91 {prefix}{rest[:3]} {rest[3:]}"
    return f"{fmt}{prefix}{rest}"


def _fake_email(first: str, last: str, idx: int, rng: random.Random) -> str:
    dom = rng.choice(["example.in", "maildemo.co.in", "shopper.in", "inbox.in"])
    return f"{first.lower()}.{last.lower()}{idx}@{dom}"


def _fake_gstin(rng: random.Random) -> str:
    letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    pan = (
        "".join(rng.choice(letters) for _ in range(5))
        + "".join(str(rng.randint(0, 9)) for _ in range(4))
        + rng.choice(letters)
    )
    return f"24{pan}1Z5"


def generate_ahmedabad_d2c() -> Path:
    """500 rows: ~28.4% delayed (142 rows) clustered Thu-Sat, ~19.2% COD RTO (96 rows), ~1.48L/mo leak."""
    rng = random.Random(202601)
    path = SAMPLE_DIR / "ahmedabad_d2c.csv"
    base_date = datetime(2026, 9, 1)

    # Create a pool of repeat customers so salted hashing shows referential integrity
    customer_pool = []
    for i in range(180):
        fn = rng.choice(FIRST_NAMES)
        ln = rng.choice(LAST_NAMES)
        city = rng.choice(TIER2_CITIES if i < 110 else TIER1_CITIES)
        customer_pool.append({
            "name": f"{fn} {ln}",
            "phone": _fake_phone(rng),
            "email": _fake_email(fn, ln, i + 1, rng),
            "address": f"{rng.randint(10, 499)} {rng.choice(STREETS)}, {city}",
            "city": city,
        })

    # Exact target counts out of 500:
    # 96 RTO (19.2%), 142 Delayed (28.4%), 262 Delivered On-Time (52.4%)
    statuses = (["RTO"] * 96) + (["Delayed"] * 142) + (["Delivered"] * 262)
    rng.shuffle(statuses)

    rows = []
    for i, status in enumerate(statuses, start=1):
        # Cluster delayed orders on Thu(3), Fri(4), Sat(5)
        day_offset = rng.randint(0, 29)
        order_dt = base_date + timedelta(days=day_offset)
        if status == "Delayed":
            # Shift to Thu/Fri/Sat 80% of the time
            if rng.random() < 0.80:
                while order_dt.weekday() not in (3, 4, 5):
                    order_dt += timedelta(days=1)

        promised_dt = order_dt + timedelta(days=2)
        if status == "Delayed":
            dispatch_dt = promised_dt + timedelta(days=rng.randint(2, 5))
        elif status == "RTO":
            dispatch_dt = promised_dt + timedelta(days=rng.choice([0, 1, 2]))
        else:
            dispatch_dt = order_dt + timedelta(days=rng.choice([1, 2]))

        if status == "RTO":
            # Concentrate in Tier-2 COD orders > INR 1,500
            cust = rng.choice(customer_pool[:110])
            payment_mode = "COD" if rng.random() < 0.90 else "Prepaid"
            order_val = rng.choice([1050, 1180, 1290, 1450, 1520])
        elif status == "Delayed":
            cust = rng.choice(customer_pool)
            payment_mode = rng.choice(["COD", "Prepaid", "UPI"])
            order_val = rng.choice([850, 1150, 1250, 1400, 1650])
        else:
            cust = rng.choice(customer_pool)
            payment_mode = rng.choice(["Prepaid", "UPI", "COD"])
            order_val = rng.choice([799, 1099, 1499, 1899, 2299, 2450])

        # Plant ~14% missing AWB/dispatch nuance (null dispatch_date on a handful of delayed rows)
        dispatch_str = dispatch_dt.strftime("%Y-%m-%d")
        if status == "Delayed" and i % 13 == 0:
            dispatch_str = ""

        # Make row 1 iconic for PII Shield Diff Drawer
        if i == 1:
            cust = {
                "name": "Rohan Patel",
                "phone": "+91 98250 44192",
                "email": "rohan.patel@example.in",
                "address": "42 SG Highway, Ahmedabad",
                "city": "Ahmedabad",
            }
            order_val = 2450

        rows.append({
            "order_id": f"AHD-{1000 + i}",
            "order_date": order_dt.strftime("%Y-%m-%d"),
            "promised_date": promised_dt.strftime("%Y-%m-%d"),
            "dispatch_date": dispatch_str,
            "customer_name": cust["name"],
            "phone": cust["phone"],
            "email": cust["email"],
            "address": cust["address"],
            "city": cust["city"],
            "payment_mode": payment_mode,
            "order_value_inr": order_val,
            "status": status,
        })

    # Tune leak math so sum(RTO) + 0.15*sum(Delayed) is right around INR 1,48,500
    fieldnames = [
        "order_id", "order_date", "promised_date", "dispatch_date",
        "customer_name", "phone", "email", "address", "city",
        "payment_mode", "order_value_inr", "status",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return path


def generate_surat_wholesale() -> Path:
    """400 rows: 41% WhatsApp inquiries wait >24h (pending_48h/delayed), ~2.1L/mo missed pipeline."""
    rng = random.Random(202602)
    path = SAMPLE_DIR / "surat_wholesale.csv"
    base_dt = datetime(2026, 9, 1, 9, 0)

    skus = [
        "SUR-SILK-440", "SUR-COT-210", "SUR-GEORG-88", "SUR-BANARASI-12",
        "SUR-RAYON-305", "SUR-CHIFFON-77", "SUR-LINEN-91",
    ]

    rows = []
    # 164 out of 400 = 41.0% slow >24h inquiries
    for i in range(1, 401):
        fn = rng.choice(FIRST_NAMES)
        ln = rng.choice(LAST_NAMES)
        buyer_name = f"{fn} {ln} Textiles" if i > 1 else "Mahesh Parekh"
        phone = _fake_phone(rng) if i > 1 else "+91 98251 77420"
        gstin = _fake_gstin(rng)
        received = base_dt + timedelta(days=rng.randint(0, 29), hours=rng.randint(0, 10), minutes=rng.randint(0, 59))

        is_slow = i <= 164
        if is_slow:
            channel = "WhatsApp" if rng.random() < 0.85 else "Phone"
            reply_hours = rng.randint(26, 54)
            converted = "Yes" if rng.random() < 0.09 else "pending_48h"
            quote_inr = rng.choice([8500, 9200, 11000, 12500, 14000])
        else:
            channel = rng.choice(["WhatsApp", "IndiaMART", "Walk-in", "Referral"])
            reply_hours = rng.randint(1, 14)
            converted = "Yes" if rng.random() < 0.38 else "No"
            quote_inr = rng.choice([12000, 15500, 18000, 22000, 28500])

        first_reply = received + timedelta(hours=reply_hours)
        rows.append({
            "inquiry_id": f"SUR-{2000 + i}",
            "received_at": received.strftime("%Y-%m-%d %H:%M"),
            "first_reply_at": first_reply.strftime("%Y-%m-%d %H:%M"),
            "buyer_name": buyer_name,
            "whatsapp_phone": phone,
            "gstin": gstin,
            "fabric_sku": rng.choice(skus),
            "quote_inr": quote_inr,
            "converted": converted,
            "channel": channel,
        })

    rng.shuffle(rows)
    fieldnames = [
        "inquiry_id", "received_at", "first_reply_at", "buyer_name",
        "whatsapp_phone", "gstin", "fabric_sku", "quote_inr", "converted", "channel",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return path


def generate_personal_upi_30d() -> Path:
    """180 rows: 64 micro-txns (<300) totaling ~11,400, ~32% late-night food delivery, 4 recurring subs."""
    rng = random.Random(202603)
    path = SAMPLE_DIR / "personal_upi_30d.csv"
    base_dt = datetime(2026, 9, 1)

    rows = []
    # 1) 4 unused auto-pay subscriptions (recurring)
    subs = [
        ("CloudFit Pro Pass", "cloudfit@okhdfcbank", "Subscription", 999),
        ("StreamBox Ultra", "streambox@okaxis", "Subscription", 649),
        ("NewsDesk Digital", "newsdesk@ybl", "Subscription", 499),
        ("QuickDrive Storage", "quickdrive@oksbi", "Subscription", 743),
    ]
    for idx, (merchant, upi, cat, amt) in enumerate(subs, start=1):
        ts = base_dt + timedelta(days=idx * 5, hours=10, minutes=15)
        rows.append({
            "txn_id": f"UPI-{3000 + idx}",
            "timestamp_ist": ts.strftime("%Y-%m-%d %H:%M"),
            "merchant": merchant,
            "upi_id": upi,
            "category": cat,
            "amount_inr": amt,
            "is_recurring": "true",
        })

    # 2) Exactly 64 micro-transactions (< INR 300) totaling ~INR 11,400 (~178 avg)
    micro_merchants = [
        ("Chai Point Express", "chaipoint@okhdfcbank", "Snacks & Coffee"),
        ("Swiggy Instamart", "swiggyim@okaxis", "Quick Commerce"),
        ("Blinkit Mini", "blinkit@ybl", "Quick Commerce"),
        ("Zomato Late Bites", "zomato@oksbi", "Food Delivery"),
        ("Metro Tap Cafe", "metrotap@paytm", "Snacks & Coffee"),
        ("AutoRickshaw Pay", "driver982@ibl", "Commute"),
    ]
    micro_amounts = [178] * 56 + [180] * 4 + [178] * 4  # sums to 11,400 exactly!
    # Adjust exact sum: 56*178=9968, 4*180=720, 4*178=712 => 11400!
    # Add variety while preserving exact sum 11,400 and all < 300:
    varied_micro = []
    for k in range(32):
        delta = rng.randint(15, 95)
        varied_micro.append(178 - delta)
        varied_micro.append(178 + delta)
    # Fix sum delta to hit 11,400 (32 pairs of 356 = 11392 -> add +8 across 4 items)
    for k in range(4):
        varied_micro[k] += 2

    for idx, amt in enumerate(varied_micro, start=5):
        m, upi, cat = rng.choice(micro_merchants)
        day = rng.randint(0, 29)
        # Plant late-night food delivery timestamps between 22:00 and 02:59 IST
        if cat == "Food Delivery" or (idx % 3 == 0):
            hour = rng.choice([22, 23, 0, 1, 2])
            cat = "Food Delivery"
            m = rng.choice(["Zomato Late Bites", "Swiggy Midnight"])
        else:
            hour = rng.randint(8, 21)
        ts = base_dt + timedelta(days=day, hours=hour, minutes=rng.randint(0, 59))
        rows.append({
            "txn_id": f"UPI-{3000 + idx}",
            "timestamp_ist": ts.strftime("%Y-%m-%d %H:%M"),
            "merchant": m,
            "upi_id": upi,
            "category": cat,
            "amount_inr": amt,
            "is_recurring": "false",
        })

    # 3) Remaining 112 normal transactions (>= INR 300) to reach 180 rows
    normal_merchants = [
        ("D-Mart Ready", "dmart@okhdfcbank", "Groceries", (450, 2400)),
        ("Zomato Dinner", "zomato@oksbi", "Food Delivery", (320, 890)),
        ("Swiggy Orders", "swiggy@okaxis", "Food Delivery", (340, 950)),
        ("HPCL Fuel Station", "hpcl@ybl", "Fuel & Travel", (500, 1800)),
        ("Apollo Pharmacy", "apollo@paytm", "Healthcare", (350, 1200)),
        ("Torrent Power Bill", "torrent@oksbi", "Utilities", (1400, 3200)),
        ("JioFiber Broadband", "jiofiber@okaxis", "Utilities", (825, 1179)),
        ("Myntra Apparel", "myntra@okhdfcbank", "Shopping", (699, 2899)),
    ]
    for idx in range(69, 181):
        m, upi, cat, (lo, hi) = rng.choice(normal_merchants)
        day = rng.randint(0, 29)
        if cat == "Food Delivery" and rng.random() < 0.45:
            hour = rng.choice([22, 23, 0, 1, 2])
        else:
            hour = rng.randint(9, 21)
        ts = base_dt + timedelta(days=day, hours=hour, minutes=rng.randint(0, 59))
        rows.append({
            "txn_id": f"UPI-{3000 + idx}",
            "timestamp_ist": ts.strftime("%Y-%m-%d %H:%M"),
            "merchant": m,
            "upi_id": upi,
            "category": cat,
            "amount_inr": rng.randint(lo, hi),
            "is_recurring": "false",
        })

    rows.sort(key=lambda r: r["timestamp_ist"])
    fieldnames = [
        "txn_id", "timestamp_ist", "merchant", "upi_id",
        "category", "amount_inr", "is_recurring",
    ]
    with path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    return path


def main() -> None:
    p1 = generate_ahmedabad_d2c()
    p2 = generate_surat_wholesale()
    p3 = generate_personal_upi_30d()
    print(f"Generated presets:\n - {p1}\n - {p2}\n - {p3}")


if __name__ == "__main__":
    main()
