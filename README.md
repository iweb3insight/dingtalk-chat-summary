# DingTalk Chat Summary

A Codex skill that automatically collects and summarizes your DingTalk (钉钉) chat messages from the past 7 days into structured Chinese work reports.

## Features

- **Auto Collection** — Operates DingTalk desktop app via AppleScript to scroll and read messages in batches
- **Multi-format Parsing** — Processes DingTalk exports in TXT, CSV, JSON, and JSONL formats
- **Smart Filtering** — Removes noise (system messages, emoji-only replies, join/leave notices) and deduplicates
- **Privacy Masking** — Auto-redacts phone numbers, API keys, tokens, and passwords in output
- **Detail Preservation** — Saves full chat records alongside the summary for reference
- **Structured Output** — Generates weekly reports with decisions, action items, risks, blockers, and follow-ups

## Quick Start

### Install

```bash
# Clone into your Codex skills directory
gh repo clone iweb3insight/dingtalk-chat-summary ~/.codex/skills/dingtalk-chat-summary

# Install MCP server dependencies
cd ~/.codex/skills/dingtalk-chat-summary/applescript-mcp
npm install
```

### Use

In Codex (ChatGPT), type:

```
$dingtalk-chat-summary
```

Or use natural language:

```
帮我汇总最近7天的钉钉消息
```

The skill will:
1. Detect and connect to your running DingTalk desktop app
2. Collect messages from visible chats (last 7 days)
3. Save detailed records to `dingtalk-detail-YYYY-MM-DD.md`
4. Generate a structured summary to `dingtalk-summary-YYYY-MM-DD.md`

### File-based Input

If you have DingTalk chat exports, point the skill to your files:

```bash
python3 scripts/prepare_chat_digest.py \
  --input /path/to/dingtalk-export \
  --days 7 \
  --output /tmp/dingtalk-chat-digest.md
```

Supported formats: `.txt`, `.csv`, `.json`, `.jsonl`

## Architecture

```
dingtalk-chat-summary/
├── SKILL.md                    # Codex skill definition (trigger + workflow)
├── agents/
│   └── openai.yaml             # Codex UI metadata and MCP dependency
├── .mcp.json                   # MCP server registration
├── scripts/
│   └── prepare_chat_digest.py  # Chat export preprocessor
├── references/
│   ├── app-operation.md        # DingTalk desktop operation guide
│   └── summary-rules.md        # Extraction and formatting rules
├── applescript-mcp/            # AppleScript MCP server (Node.js)
│   ├── server.js               # Main entry — exposes applescript_execute tool
│   └── src/                    # Python fallback implementation
└── mcp-applescript-server/     # Lightweight MCP server variant
```

**How it works:**

1. **Codex Skill Layer** (`SKILL.md` + `agents/openai.yaml`) — Tells Codex when to activate and what workflow to follow
2. **MCP Server** (`applescript-mcp/server.js`) — Provides `applescript_execute` tool for controlling DingTalk desktop
3. **Preprocessor** (`scripts/prepare_chat_digest.py`) — Normalizes file-based chat exports into clean Markdown

## Output Format

The summary follows this structure:

```markdown
## 最近 7 天钉钉聊天摘要

### 一句话概览
### 关键进展
### 已确认决策
### 待办事项
| 事项 | 负责人 | 截止时间 | 来源/群聊 |
|---|---|---|---|
### 风险与阻塞
### 需要跟进的问题
### 重要链接和文件
### 覆盖范围
```

## Requirements

- **macOS** — AppleScript automation requires macOS
- **Node.js** >= 18 — For the MCP server
- **Python** >= 3.10 — For the chat export preprocessor
- **Accessibility Permission** — Grant Terminal/Codex accessibility access in System Settings > Privacy & Security > Accessibility
- **DingTalk Desktop** — Must be installed and logged in

## License

MIT
