# 钉钉聊天摘要 (DingTalk Chat Summary)

自动采集并汇总最近 7 天钉钉聊天消息，生成结构化中文工作周报的 Codex Skill。

## 兼容性

| 平台 | 状态 | 备注 |
|------|------|------|
| Codex (ChatGPT) | ✅ 已验证 | Codex 26.506.21252 (2575) + GPT-5.5 |
| Claude Code CLI | ⚡ 理论支持 | 通过 MCP 协议接入，需手动配置 `.mcp.json` |
| Claude Desktop | ⚡ 理论支持 | 通过 MCP 协议接入，需手动配置 `.mcp.json` |

> 本项目以 Codex Skill 形式开发，核心能力基于 MCP (Model Context Protocol) 的 `applescript_execute` 工具。任何支持 MCP 的 AI 客户端均可通过接入该工具实现钉钉操作。

## 功能亮点

- **自动采集** — 通过 AppleScript 自动操控钉钉桌面端，滚动读取消息
- **多格式解析** — 支持钉钉导出的 TXT、CSV、JSON、JSONL 文件
- **智能过滤** — 去除系统消息、表情回复、入退群通知等噪音，自动去重
- **隐私脱敏** — 自动遮盖手机号、API Key、Token、密码等敏感信息
- **明细保留** — 汇总同时保存完整聊天记录，便于回溯
- **结构化输出** — 生成含决策、待办、风险、阻塞、跟进事项的周报

## 快速安装

```bash
# 克隆到 Codex skills 目录
gh repo clone iweb3insight/dingtalk-chat-summary ~/.codex/skills/dingtalk-chat-summary

# 安装 MCP 服务器依赖
cd ~/.codex/skills/dingtalk-chat-summary/applescript-mcp
npm install
```

## 使用方式

### Codex (ChatGPT)

在 Codex 中输入：

```
$dingtalk-chat-summary
```

或使用自然语言：

```
帮我汇总最近7天的钉钉消息
```

### Claude Code CLI / Claude Desktop

将以下配置添加到 `~/.claude.json` 或 Claude Desktop 的 MCP 设置中：

```json
{
  "mcpServers": {
    "dingtalk-summary": {
      "command": "node",
      "args": ["~/.codex/skills/dingtalk-chat-summary/applescript-mcp/server.js"]
    }
  }
}
```

配置完成后，直接在对话中说：

```
帮我汇总钉钉最近7天的聊天消息
```

### 执行流程

Skill 会自动完成以下步骤：
1. 检测并连接正在运行的钉钉桌面端
2. 采集可见群聊的最近 7 天消息
3. 保存明细到 `dingtalk-detail-YYYY-MM-DD.md`
4. 生成结构化摘要到 `dingtalk-summary-YYYY-MM-DD.md`

### 文件导入模式

如果有钉钉导出文件，可直接处理：

```bash
python3 scripts/prepare_chat_digest.py \
  --input /path/to/dingtalk-export \
  --days 7 \
  --output /tmp/dingtalk-chat-digest.md
```

支持格式：`.txt`、`.csv`、`.json`、`.jsonl`

## 项目结构

```
dingtalk-chat-summary/
├── SKILL.md                    # Codex Skill 定义（触发条件 + 工作流）
├── agents/
│   └── openai.yaml             # Codex UI 元数据和 MCP 依赖声明
├── .mcp.json                   # MCP 服务器注册
├── scripts/
│   └── prepare_chat_digest.py  # 聊天导出预处理脚本
├── references/
│   ├── app-operation.md        # 钉钉桌面端操作指南
│   └── summary-rules.md        # 提取规则和格式标准
├── applescript-mcp/            # AppleScript MCP 服务器 (Node.js)
│   ├── server.js               # 入口文件 — 暴露 applescript_execute 工具
│   └── src/                    # Python 备用实现
└── mcp-applescript-server/     # 轻量 MCP 服务器版本
```

**工作原理：**

1. **Codex Skill 层** (`SKILL.md` + `agents/openai.yaml`) — 定义触发条件和工作流程
2. **MCP 服务器** (`applescript-mcp/server.js`) — 提供 `applescript_execute` 工具，控制钉钉桌面端
3. **预处理脚本** (`scripts/prepare_chat_digest.py`) — 将导出文件标准化为干净的 Markdown

## 输出格式

摘要默认结构：

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

## 环境要求

- **macOS** — AppleScript 自动化仅支持 macOS
- **Node.js** >= 18 — MCP 服务器运行环境
- **Python** >= 3.10 — 聊天导出预处理脚本
- **钉钉桌面端** — 需已安装并登录

## macOS 权限配置（重要）

本 Skill 通过 AppleScript 操控钉钉桌面端，macOS 要求授予 Codex **完全磁盘访问权限**和**辅助功能权限**。未授权将导致无法读取钉钉窗口内容。

### 1. 辅助功能权限

允许 Codex 通过 AppleScript 控制其他应用（钉钉）：

```
系统设置 > 隐私与安全性 > 辅助功能
```

点击 `+` 按钮，添加以下应用：
- **Codex**（ChatGPT Codex 桌面版）
- **Terminal**（如通过终端运行）

### 2. 完全磁盘访问权限

允许 Codex 读取应用窗口和 UI 元素：

```
系统设置 > 隐私与安全性 > 完全磁盘访问权限
```

点击 `+` 按钮，添加 **Codex**。

### 3. 自动化权限

首次运行时，macOS 会弹窗询问「是否允许 Codex 控制钉钉？」，请点击 **允许**。

如需手动管理：

```
系统设置 > 隐私与安全性 > 自动化
```

确认 Codex 下已勾选 **钉钉**。

> ⚠️ 授权后需重启 Codex 才能生效。

## License

MIT
