"""Export every book and post from the Law Business API to a JSON file.

Usage: python scripts/backup.py OUTPUT_PATH [--api BASE_URL]

Uses only the public read endpoints, so it needs no database credentials.
Refuses to write anything if the export looks incomplete, so a failed or
partial run can never overwrite a good backup with bad data.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

DEFAULT_API = "https://booklibrary-api-5sxd.onrender.com"
PAGE_SIZE = 100  # the API's maximum page size
ATTEMPTS = 6


def fetch_json(url):
    # Render's free tier sleeps when idle, and the first request after waking
    # can fail, so retry with backoff before giving up.
    for attempt in range(1, ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(url, timeout=120) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            if attempt == ATTEMPTS:
                raise RuntimeError(f"{url} failed after {ATTEMPTS} attempts: {err}") from err
            wait = 10 * attempt
            print(f"  attempt {attempt} failed ({err}); retrying in {wait}s", file=sys.stderr)
            time.sleep(wait)


def fetch_books(api):
    books, offset = [], 0
    while True:
        page = fetch_json(f"{api}/api/books?limit={PAGE_SIZE}&offset={offset}")
        books.extend(page["items"])
        if not page["has_more"]:
            return books, page["total"]
        offset += len(page["items"])


def validate(books, books_total, posts):
    problems = []
    if not books:
        problems.append("no books returned")
    if len(books) != books_total:
        problems.append(f"fetched {len(books)} books but the API reports {books_total}")
    book_ids = {b["id"] for b in books}
    orphans = [p["id"] for p in posts if p["book_id"] not in book_ids]
    if orphans:
        problems.append(f"{len(orphans)} posts reference missing books (e.g. post {orphans[0]})")
    expected_posts = sum(b.get("post_count", 0) for b in books)
    if len(posts) != expected_posts:
        problems.append(f"fetched {len(posts)} posts but the books report {expected_posts}")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("output")
    parser.add_argument("--api", default=DEFAULT_API)
    args = parser.parse_args()
    api = args.api.rstrip("/")

    books, books_total = fetch_books(api)
    posts = fetch_json(f"{api}/api/posts")

    problems = validate(books, books_total, posts)
    if problems:
        for p in problems:
            print(f"ERROR: {p}", file=sys.stderr)
        print("Backup NOT written.", file=sys.stderr)
        sys.exit(1)

    backup = {
        "exported_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "source": api,
        "counts": {"books": len(books), "posts": len(posts)},
        "books": sorted(books, key=lambda b: b["id"]),
        "posts": sorted(posts, key=lambda p: p["id"]),
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Backed up {len(books)} books and {len(posts)} posts to {args.output}")


if __name__ == "__main__":
    main()
