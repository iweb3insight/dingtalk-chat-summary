#!/usr/bin/env python3
"""Prepare DingTalk-like chat exports for summarization.

Reads TXT, CSV, JSON, or JSONL files; extracts common timestamp/sender/chat/text
fields; filters to a recent day window; removes obvious noise; and writes a
Markdown digest grouped by day.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
from pathlib import Path
from typing import Any, Iterable


SUPPORTED_SUFFIXES = {".txt", ".csv", ".json", ".jsonl"}
TIME_KEYS = ("time", "timestamp", "datetime", "date", "send_time", "sendTime", "created_at", "createTime")
SENDER_KEYS = ("sender", "from", "from_name", "fromName", "name", "user", "user_name", "userName", "nick")
CHAT_KEYS = ("chat", "group", "conversation", "conversation_title", "conversationTitle", "room", "title")
TEXT_KEYS = ("content", "message", "msg", "text", "body", "plain_text", "plainText")
NOISE_PATTERNS = (
    "加入群聊",
    "退出群聊",
    "撤回了一条消息",
    "拍了拍",
    "已读",
    "未读",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare DingTalk chat exports for summarization.")
    parser.add_argument("--input", required=True, help="Input file or directory.")
    parser.add_argument("--output", required=True, help="Output Markdown path.")
    parser.add_argument("--days", type=int, default=7, help="Number of recent days to keep.")
    parser.add_argument("--end-date", help="Inclusive end date or datetime. Defaults to latest message time or now.")
    return parser.parse_args()


def input_files(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    return sorted(p for p in path.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED_SUFFIXES)


def first_value(row: dict[str, Any], keys: Iterable[str]) -> Any:
    lower_map = {str(k).lower(): v for k, v in row.items()}
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
        value = lower_map.get(key.lower())
        if value not in (None, ""):
            return value
    return None


def parse_time(value: Any) -> dt.datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
        if number > 10_000_000_000:
            number /= 1000
        return dt.datetime.fromtimestamp(number)

    text = str(value).strip()
    if not text:
        return None
    text = text.replace("T", " ").replace("Z", "")
    text = re.sub(r"\s+", " ", text)
    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y.%m.%d %H:%M:%S",
        "%Y.%m.%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%Y.%m.%d",
    )
    for fmt in formats:
        try:
            return dt.datetime.strptime(text[: len(dt.datetime.now().strftime(fmt))], fmt)
        except ValueError:
            pass
    try:
        return dt.datetime.fromisoformat(text)
    except ValueError:
        return None


def clean_text(value: Any) -> str:
    text = "" if value is None else str(value)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"1\d{2}[- ]?\d{4}[- ]?\d{4}", "[手机号已脱敏]", text)
    text = re.sub(r"(?i)(api[_-]?key|token|password|secret)\s*[:=]\s*\S+", r"\1=[已脱敏]", text)
    return text


def is_noise(text: str) -> bool:
    if not text:
        return True
    if text in {"OK", "ok", "收到", "好的", "嗯", "是", "否"}:
        return True
    return any(pattern in text for pattern in NOISE_PATTERNS)


def normalize_record(row: dict[str, Any], source: Path) -> dict[str, Any] | None:
    when = parse_time(first_value(row, TIME_KEYS))
    text = clean_text(first_value(row, TEXT_KEYS))
    if not when or is_noise(text):
        return None
    return {
        "time": when,
        "sender": clean_text(first_value(row, SENDER_KEYS)) or "未知",
        "chat": clean_text(first_value(row, CHAT_KEYS)) or source.stem,
        "text": text,
        "source": source.name,
    }


TXT_PATTERNS = (
    re.compile(r"^\[?(?P<time>\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(?P<sender>[^:：]{1,80})[:：]\s*(?P<text>.+)$"),
    re.compile(r"^\[?(?P<time>\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?P<text>.+)$"),
)


def read_txt(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        for pattern in TXT_PATTERNS:
            match = pattern.match(line)
            if match:
                row = match.groupdict()
                row.setdefault("sender", "未知")
                record = normalize_record(row, path)
                if record:
                    records.append(record)
                break
    return records


def read_csv(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8-sig", errors="ignore", newline="") as handle:
        for row in csv.DictReader(handle):
            record = normalize_record(row, path)
            if record:
                records.append(record)
    return records


def flatten_json_items(data: Any) -> Iterable[dict[str, Any]]:
    if isinstance(data, dict):
        for key in ("messages", "data", "items", "records", "list"):
            if isinstance(data.get(key), list):
                for item in data[key]:
                    if isinstance(item, dict):
                        yield item
                return
        yield data
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, dict):
                yield item


def read_json(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    if path.suffix.lower() == ".jsonl":
        items = []
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if line:
                items.append(json.loads(line))
    else:
        items = list(flatten_json_items(json.loads(path.read_text(encoding="utf-8", errors="ignore"))))
    for item in items:
        record = normalize_record(item, path)
        if record:
            records.append(record)
    return records


def read_records(files: list[Path]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in files:
        suffix = path.suffix.lower()
        try:
            if suffix == ".txt":
                records.extend(read_txt(path))
            elif suffix == ".csv":
                records.extend(read_csv(path))
            elif suffix in {".json", ".jsonl"}:
                records.extend(read_json(path))
        except Exception as exc:  # Keep batch processing useful across mixed exports.
            records.append({
                "time": dt.datetime.now(),
                "sender": "解析警告",
                "chat": path.stem,
                "text": f"{path.name} 解析失败: {exc}",
                "source": path.name,
            })
    return records


def filter_window(records: list[dict[str, Any]], days: int, end_date: str | None) -> tuple[list[dict[str, Any]], dt.datetime, dt.datetime]:
    if end_date:
        end = parse_time(end_date)
        if not end:
            raise SystemExit(f"Could not parse --end-date: {end_date}")
    elif records:
        end = max(record["time"] for record in records)
    else:
        end = dt.datetime.now()
    start = end - dt.timedelta(days=max(days, 1))
    kept = [record for record in records if start <= record["time"] <= end]
    kept.sort(key=lambda record: record["time"])
    return kept, start, end


def write_markdown(records: list[dict[str, Any]], start: dt.datetime, end: dt.datetime, output: Path) -> None:
    lines = [
        "# DingTalk Chat Digest Source",
        "",
        f"- Time window: {start:%Y-%m-%d %H:%M} to {end:%Y-%m-%d %H:%M}",
        f"- Message count after filtering: {len(records)}",
        "",
        "Use this as source material for a concise Chinese summary. Extract decisions, action items, owners, deadlines, risks, and follow-ups.",
        "",
    ]
    current_day = None
    seen: set[tuple[str, str, str]] = set()
    for record in records:
        day = record["time"].strftime("%Y-%m-%d")
        if day != current_day:
            current_day = day
            lines.extend(["", f"## {day}", ""])
        key = (record["time"].strftime("%Y-%m-%d %H:%M"), record["sender"], record["text"])
        if key in seen:
            continue
        seen.add(key)
        lines.append(f"- `{record['time']:%H:%M}` [{record['chat']}] {record['sender']}: {record['text']}")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main() -> None:
    args = parse_args()
    files = input_files(Path(args.input).expanduser())
    if not files:
        raise SystemExit("No supported input files found.")
    records = read_records(files)
    kept, start, end = filter_window(records, args.days, args.end_date)
    write_markdown(kept, start, end, Path(args.output).expanduser())
    print(f"Wrote {len(kept)} messages from {len(files)} file(s) to {args.output}")


if __name__ == "__main__":
    main()
