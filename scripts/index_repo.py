#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from apps.worker.tasks.indexing import start_indexing_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Index a GitHub repository into CodeLens")
    parser.add_argument("--url", required=True, help="GitHub repo URL to index")
    parser.add_argument("--repo-id", default="test-repo-001", help="Unique repo identifier")

    args = parser.parse_args()

    # Queue the indexing task
    task = start_indexing_pipeline.delay(args.repo_id, args.url)

    print(f"✓ Indexing task queued: {task.id}")
    print(f"  Repository: {args.url}")
    print(f"  Repo ID: {args.repo_id}")
    print("\n📊 Monitor progress:")
    print("  - Celery Flower: http://localhost:5555")
    print("  - Qdrant Dashboard: http://localhost:6333/dashboard")


if __name__ == "__main__":
    main()
