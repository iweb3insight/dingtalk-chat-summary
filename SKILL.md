---
name: dingtalk-chat-summary
description: Operate DingTalk App or DingTalk web, when an accessible session/tool is available, to collect and summarize recent 7-day work conversations; also handle exported chat files, copied chat text, screenshots/transcripts, or DingTalk Open Platform message data. Use when Codex needs to open/search DingTalk chats, collect visible recent messages with user permission, clean/filter them, and summarize into Chinese briefs, action items, decisions, blockers, follow-ups, and per-person/per-group digests.
---

# DingTalk Chat Summary

## Overview

Use this skill to operate DingTalk App or DingTalk web when tooling and user permission allow, collect recent chat content, and turn the last 7 days of messages into a concise Chinese work summary with decisions, tasks, risks, and follow-ups.

Prefer an already authenticated DingTalk App/web session. Do not claim direct access to DingTalk unless a working GUI/browser connector, API credential, or user-provided export/transcript is explicitly available.

## Workflow

1. Establish the source:
   - If an accessible DingTalk App or DingTalk web session is available, operate it directly to collect chat text. Read `references/app-operation.md` first.
   - If the user already provided files or pasted chat text, process those directly.
   - If no app/web/API access is available, ask the user to provide a DingTalk export, pasted transcript, screenshots, or API-accessible message data.
   - If using DingTalk Open Platform or browser automation, confirm the user has permission to access the relevant chats.
   - When the user names a specific chat/group, keep the scope narrow and verify the visible chat title before collecting content.

2. Normalize and filter:
   - Use `scripts/prepare_chat_digest.py` for `.txt`, `.csv`, `.json`, or `.jsonl` exports when possible.
   - Default the window to the most recent 7 days unless the user specifies a different date range.
   - Preserve sender, timestamp, chat/group name, and message text when available.
   - Remove obvious noise: system joins/leaves, reactions-only rows, recall notices, duplicate pasted blocks, and empty messages.

3. Summarize in Chinese unless the user asks otherwise:
   - Start with an executive summary of the week.
   - Group by project/topic when the same topic appears across multiple chats.
   - Include decisions, action items, owners, deadlines, blockers, unanswered questions, and important links/files mentioned.
   - Highlight anything urgent or overdue separately.
   - Mention data coverage and limitations, such as missing private chats or unreadable screenshots.

4. Preserve long-form knowledge when useful:
   - If the chat contains long articles, study notes, project reviews, prompt outputs, or knowledge summaries, ask or infer whether these should be preserved separately from the weekly digest.
   - Create a dedicated directory under the current workspace when asked to keep detailed source material, for example `dingtalk-<chat>-large-articles-YYYY-MM-DD_YYYY-MM-DD/`.
   - Store each long item as a separate Markdown file with a date-prefixed, topic-oriented filename, plus a `README.md` index describing source, time range, included files, and limitations.
   - Prefer cleaned, readable preservation over raw UI dumps: remove obvious UI labels, recall notices, duplicate copied blocks, and link-preview noise, while keeping the substantive content intact.
   - Do not download or open attachments unless the user explicitly asks. If an attachment is only visible by filename, record only the filename and visible metadata.

5. Protect sensitive information:
   - Do not expose raw chat logs unless requested.
   - Mask phone numbers, ID numbers, tokens, passwords, and customer-sensitive data in summaries.
   - When uncertain whether a detail is sensitive, summarize at a higher level.

## Lessons From DingTalk Desktop Operation

When operating the macOS DingTalk App through accessibility automation:

- First test access lightly: activate DingTalk, list windows, and confirm the target chat title. If macOS reports that the automation process is not allowed assistive access, stop and ask the user for exports/pastes/screenshots or to grant permission.
- Do not rely on one large AppleScript pass. DingTalk may refresh its UI and invalidate window references, causing AppleEvent or window-handle failures. Re-bind the window before each small collection step.
- If a script hangs or the user interrupts a run, clear stale `osascript` collection processes before retrying.
- Prefer stable, incremental collection:
  - Read visible rows first.
  - Collect static text and text-area values row by row.
  - Scroll the message area in small increments.
  - Deduplicate repeated overlaps after collection.
- If direct scrollbar value changes or PageUp/PageDown do not move the chat, use native wheel events focused over the message area. On macOS, Swift/CoreGraphics wheel events can be more reliable than accessibility scrollbar actions.
- Record collection coverage honestly: visible date range, operated chat name, unreadable attachments, recall notices, OCR uncertainty, and any likely gaps caused by UI loading or scroll jumps.
- When producing a final answer after long collection, include both the summary and where preserved files were written if files were requested.

## Preparing Chat Data

Run the helper script when the chat data is file-based:

```bash
python3 ~/.codex/skills/dingtalk-chat-summary/scripts/prepare_chat_digest.py \
  --input /path/to/dingtalk-export \
  --days 7 \
  --output /tmp/dingtalk-chat-digest.md
```

Supported inputs:
- A single `.txt`, `.csv`, `.json`, or `.jsonl` file.
- A directory containing those file types.
- TXT lines that look like `[2026-05-08 09:30] 张三: 今天上线` or `2026-05-08 09:30 张三：今天上线`.
- CSV columns with common names such as `time`, `timestamp`, `date`, `sender`, `from`, `name`, `chat`, `group`, `content`, `message`, or `text`.
- JSON objects containing common timestamp/sender/content fields.

If parsing fails or the export format is unusual, inspect a small sample and adapt manually. Do not invent missing timestamps, senders, or owners.

## Output Format

Use this structure by default:

```markdown
## 最近 7 天钉钉聊天摘要

### 一句话概览
- ...

### 关键进展
- ...

### 已确认决策
- ...

### 待办事项
| 事项 | 负责人 | 截止时间 | 来源/群聊 |
|---|---|---|---|

### 风险与阻塞
- ...

### 需要跟进的问题
- ...

### 重要链接和文件
- ...

### 覆盖范围
- 数据来源：
- 时间范围：
- 可能遗漏：
```

For very large chats, first summarize per day or per group, then merge into a final weekly digest.

## References

Read `references/app-operation.md` before operating DingTalk App/web directly.

Read `references/summary-rules.md` when the user asks for a polished recurring weekly report, a management-facing summary, or a stricter extraction standard.
