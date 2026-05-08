# DingTalk App Operation

## Preconditions

Operate DingTalk directly only when all are true:
- The user explicitly asks to operate DingTalk App/web or summarize chats from it.
- An authenticated DingTalk session is visible or accessible through an available GUI/browser automation tool.
- The user has permission to access the chats being summarized.

Do not ask the user for passwords, SMS codes, MFA codes, or private credentials. If login is required, ask the user to complete login manually, then continue from the authenticated session.

## Collection Workflow

1. Identify scope:
   - Default date window: recent 7 days.
   - Ask for target chats only when the user has not specified whether to summarize all visible recent chats, one group, one person, or starred/pinned chats.
   - If the UI only exposes a subset of chats, record that limitation.
   - When the user names a specific group, verify the visible chat title before collecting. Do not summarize adjacent chats from the conversation list.

2. Navigate DingTalk:
   - Open DingTalk App or DingTalk web with the available automation tool.
   - Use DingTalk search to find target groups, people, keywords, or date-related messages.
   - Prefer built-in search/filter/export features over manual scrolling when available.
   - For each target chat, collect the chat title, visible message timestamps, senders, and message text.
   - On macOS App automation, first confirm accessibility access by listing DingTalk windows. If the system reports assistive access is not allowed, do not claim access; ask for exports/pasted text/screenshots or for the user to grant permission.

3. Capture recent messages:
   - Scroll/search until the start of the 7-day window is reached or until the UI refuses to load older content.
   - Copy selectable message text when possible.
   - If text cannot be copied, use screenshots/OCR only with user approval and mention OCR uncertainty.
   - Preserve file/link mentions as references, but do not download attachments unless the user asks.
   - For desktop UI collection, prefer small batches. DingTalk can refresh its UI and invalidate AppleScript window references during long runs.
   - If AppleScript reports an AppleEvent handler failure or cannot get the DingTalk window, re-activate DingTalk and re-bind the window before continuing.
   - If direct scrollbar assignment or PageUp/PageDown does not move the chat, click/focus the message area and use native wheel events. On macOS, a Swift/CoreGraphics scroll event posted over the message area may be more reliable than accessibility scrollbar actions.

4. Build a local working transcript:
   - Save only temporary working notes when needed.
   - Normalize each line to `YYYY-MM-DD HH:MM | chat | sender | message` when timestamps are available.
   - Mark missing timestamps, senders, or chat names as `未显示`, not guessed values.
   - Deduplicate overlapping rows from repeated scroll captures.
   - Treat recall notices, empty rows, UI labels, translation prompts, unread counts, and link-preview boilerplate as noise unless they carry useful work context.

5. Summarize:
   - Merge messages from all collected chats.
   - Deduplicate repeated copied blocks and forwarded content.
   - Follow the output format in `SKILL.md`.
   - Include a `覆盖范围` section listing operated chats, visible date range, and inaccessible chats/messages.

6. Preserve detailed knowledge artifacts when requested:
   - Create a dedicated directory in the current workspace.
   - Write one cleaned Markdown file per long article/note/review, using date-prefixed topic filenames.
   - Add a `README.md` index with source chat, time range, file list, and limitations.
   - Keep substantive long-form content; remove obvious UI artifacts and duplicate captures.

## Safety Rules

- Do not send messages, delete messages, mark approvals, change settings, add/remove contacts, or open confidential files unless the user explicitly asks for that specific action.
- Do not summarize chats outside the requested scope just because they are visible.
- Do not expose raw full chat logs in the final response unless requested.
- Stop and ask for confirmation before interacting with external links, downloading files, or switching organizations/workspaces.
- If a collection process is interrupted or appears stuck, stop stale automation processes before retrying. Never leave long-running UI automation sessions active unnecessarily.

## macOS Desktop Automation Notes

Useful operating pattern:

1. Activate DingTalk and confirm `window 1` exists.
2. Verify the target group title is visible.
3. Read the current visible message rows.
4. Scroll the message area upward by wheel event in small increments.
5. Read rows again, preserving overlaps for later deduplication.
6. Stop after reaching the requested start date or an older date.
7. Summarize and report coverage.

Common failure modes:

- `not allowed assistive access`: the automation process lacks macOS Accessibility permission. Fall back to user-provided export, paste, screenshots, or ask the user to grant permission.
- `cannot get window` or AppleEvent handler failure: DingTalk refreshed the UI or the window reference became stale. Re-activate DingTalk, re-bind the window, and continue in smaller batches.
- Scrollbar value does not move: the message list may not be focused or direct scrollbar actions may be ignored. Use a focused mouse wheel event over the message area.
- Large single-pass scripts hang: collect row by row or screen by screen instead of asking for `entire contents` repeatedly.

## Fallbacks

If direct app operation is blocked:
- Ask the user to select the chat and use copy/export, then provide the pasted/exported text.
- Ask for screenshots of the target date range.
- Use DingTalk Open Platform message data only when the user provides valid access and confirms authorization.
- Use `scripts/prepare_chat_digest.py` for file-based transcripts after the user exports or copies records.
