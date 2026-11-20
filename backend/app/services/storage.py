"""Isolated Raw vs. Masked Storage Service (Google Cloud Storage + Local Fallback, PRD Ch. 3.5 & 21.2)."""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from app.config import settings

BucketKind = Literal["raw", "masked"]


class StorageService:
    """Routes raw CSVs to private bucket/dir and masked CSVs to builder-safe bucket/dir."""

    def __init__(self) -> None:
        self.raw_bucket = settings.gcs_bucket_raw.strip()
        self.masked_bucket = settings.gcs_bucket_masked.strip()
        self.local_root = Path(settings.local_storage_dir)
        (self.local_root / "raw").mkdir(parents=True, exist_ok=True)
        (self.local_root / "masked").mkdir(parents=True, exist_ok=True)
        self._gcs_client = None

    def _get_gcs_client(self):
        if self._gcs_client is None:
            from google.cloud import storage  # lazy import so local dev works without GCP creds
            self._gcs_client = storage.Client()
        return self._gcs_client

    def write_bytes(self, kind: BucketKind, filename: str, data: bytes) -> str:
        bucket_name = self.raw_bucket if kind == "raw" else self.masked_bucket
        if bucket_name:
            client = self._get_gcs_client()
            blob = client.bucket(bucket_name).blob(filename)
            blob.upload_from_string(data, content_type="text/csv")
            return f"gs://{bucket_name}/{filename}"

        target = self.local_root / kind / filename
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        return str(target)

    def read_bytes(self, stored_path: str) -> bytes:
        if stored_path.startswith("gs://"):
            _, _, rest = stored_path.partition("gs://")
            bucket_name, _, blob_name = rest.partition("/")
            client = self._get_gcs_client()
            return client.bucket(bucket_name).blob(blob_name).download_as_bytes()
        return Path(stored_path).read_bytes()

    def delete_if_exists(self, stored_path: str) -> None:
        if stored_path.startswith("gs://"):
            _, _, rest = stored_path.partition("gs://")
            bucket_name, _, blob_name = rest.partition("/")
            client = self._get_gcs_client()
            blob = client.bucket(bucket_name).blob(blob_name)
            if blob.exists():
                blob.delete()
            return
        p = Path(stored_path)
        if p.exists():
            p.unlink()


storage_service = StorageService()
