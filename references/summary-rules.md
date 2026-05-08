# DingTalk Summary Rules

## Extraction Priorities

Prefer concrete, attributable work facts:
- Decisions: explicit approvals, final choices, accepted plans, changed priorities.
- Actions: commitments, assignments, requests, reminders, deadlines.
- Risks: blockers, incidents, delays, dependencies, unanswered questions.
- Deliverables: documents, links, launches, releases, meetings, customer updates.

Avoid over-weighting:
- Greetings, acknowledgements, emoji-only replies, repeated reminders, and side conversations.
- Ambiguous ownership. If no owner is stated, write `未明确`.
- Vague deadlines. If no deadline is stated, write `未明确`.

## Chinese Style

Write concise professional Chinese. Prefer:
- `已完成...`
- `正在推进...`
- `需跟进...`
- `风险在于...`

Avoid:
- Long raw quotes from chats.
- Emotional characterization of people.
- Claims that are not supported by the provided records.

## Recurring Weekly Report Shape

Use this management-facing order when the user wants a weekly report:

```markdown
## 本周钉钉沟通摘要

### 本周重点
1. ...

### 项目进展
- 项目/主题：
  - 进展：
  - 决策：
  - 下一步：

### 待办追踪
| 优先级 | 事项 | 负责人 | 截止时间 | 状态 |
|---|---|---|---|---|

### 风险与需要支持
- ...

### 下周关注
- ...
```

## Privacy Handling

Mask common sensitive values in the final answer:
- Phone numbers: keep at most the last 4 digits.
- ID numbers, bank cards, tokens, passwords, API keys: replace with `[已脱敏]`.
- Customer names or deal details: keep only when essential to the task and user permission is clear.

When the summary is for broad sharing, prefer role/team labels over individual names unless owners are needed for follow-up.
