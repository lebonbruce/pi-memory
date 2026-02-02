<div align="center">

# 🧠 pi-hippocampus

**Give your AI a hippocampus. Cure its amnesia.**

[![Pi Agent Extension](https://img.shields.io/badge/Pi%20Agent-Extension-blueviolet)](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
[![Version](https://img.shields.io/badge/version-5.7.1-blue)](https://github.com/lebonbruce/pi-hippocampus/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[**English**](README.md) | [**简体中文**](README_ZH.md) | [**日本語**](README_JA.md)

</div>

---

## 🚀 What's New in V5.7.1

### Zero-Friction Performance
- **Non-Blocking Startup**: The UI loads instantly. Memory summarization happens quietly in the background after your first interaction.
- **Auto-Metabolism**: Memory consolidation now runs silently in the background. No more manual cleanup tasks.

### Smarter Retrieval (Local LLM)
- **Rerank**: Vector search retrieves 100 candidates, then Local LLM selects the top 10 most relevant ones based on true intent.
- **Query Enhancement**: Automatically expands short queries like "how to use?" into full context-aware searches.
- **Morning Briefing**: Generates a concise summary of your core memories and recent work when you start a session.

---

## Why I Built This

I've been using AI coding tools (Cursor, Windsurf, Claude) for a while. They're powerful, but there's one thing that drives me crazy: **they have the memory of a goldfish**.

Close the session? Forgotten. Switch projects? Forgotten. That API gotcha I explained yesterday? Forgotten.

I got tired of repeating myself.

So I built this extension for **[pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)**. The goal is simple: **make AI actually remember stuff**.

Not the dumb way of dumping conversations into files (that's just noise). But like a human brain—with filtering, consolidation, forgetting, and association.

---

## ✨ Core Features

### 🔇 Completely Invisible

Install it and forget about it. Seriously.

Just chat normally. When you say "don't use var anymore" or "the database password changed", it figures out that's important and quietly saves it.

**Invisible is the best UX.**

### 🧠 Works Like a Brain

- **Memory Types**: Distinguishes Facts, Rules, and Events
- **Forgetting Curve**: Unimportant stuff naturally fades over time
- **Gets Stronger with Use**: Frequently recalled memories gain weight (LTP)
- **Associative Recall**: Searches spread along connection links to find related memories (Bidirectional)

### 💤 Sleep Consolidation (It Actually Tidies Up)

Like how humans need sleep to consolidate memories:
- Automatically triggers "memory consolidation" when you close a session
- Similar fragments get merged into cleaner facts
- High-frequency memories get promoted
- **Zero LLM tokens consumed**—pure local computation

### 🌐 Cross-Project "Intuition"

That bug I hit in Project A? When I encounter something similar in Project B, the AI actually warns me.

Because it doesn't just search the current project. It looks at semantic similarity and importance to surface those "deeply-ingrained" memories.

Feels less like database queries, more like AI having intuition.

---

## ⚡️ Quick Install

### 🍎 Mac / Linux

```bash
mkdir -p ~/.pi/agent/extensions && \
cd ~/.pi/agent/extensions && \
rm -rf pi-hippocampus && \
git clone https://github.com/lebonbruce/pi-hippocampus.git && \
cd pi-hippocampus && \
npm install && \
echo "✅ Done! Restart pi to activate."
```

### 🪟 Windows (PowerShell)

```powershell
$p="$env:USERPROFILE\.pi\agent\extensions"
New-Item -ItemType Directory -Force -Path $p
cd $p
Remove-Item pi-hippocampus -Recurse -Force -ErrorAction SilentlyContinue
git clone https://github.com/lebonbruce/pi-hippocampus.git
cd pi-hippocampus
npm install
Write-Host "✅ Done! Restart pi to activate."
```

### 🪟 Windows (CMD)

```cmd
cd /d "%USERPROFILE%" && ^
if not exist ".pi\agent\extensions" mkdir ".pi\agent\extensions" && ^
cd ".pi\agent\extensions" && ^
if exist "pi-hippocampus" rmdir /s /q pi-hippocampus && ^
git clone https://github.com/lebonbruce/pi-hippocampus.git && ^
cd pi-hippocampus && ^
npm install && ^
echo Done! Restart pi to activate.
```

---

## 🤖 Setting Up Local LLM (Recommended)

Local LLM makes memory decisions much smarter. If you skip this, the plugin falls back to regex—still works, just less intelligent.

### 1. Install Ollama

**Mac**
```bash
brew install ollama
```

**Linux**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**

Download from [ollama.com/download](https://ollama.com/download)

### 2. Pull a Model

```bash
# You can pull any model supported by Ollama
ollama pull qwen3:8b
```

### 3. Start the Service

Ollama usually auto-starts. If not:
```bash
ollama serve
```

### 4. Verify

Restart pi. If you see this, you're good:
```
🧠 Hippocampus V5.7.1 Online (Local LLM: qwen2.5:7b)
```

If you see `Regex Mode`, Ollama wasn't detected—but the plugin still works.

---

## 🛠️ Available Tools

After installation, the AI can use these tools:

| Tool | Description |
|------|-------------|
| `save_memory` | Save a memory (with type, importance, scope) |
| `search_memory` | Search memories (supports cross-project) |
| `connect_memories` | Link related memories |
| `consolidate_memories` | Manually trigger memory consolidation |
| `list_projects` | List all known projects |
| `memory_status` | View system status and config |

---

## ⚙️ Advanced Configuration

To customize, edit the `CONFIG` object in `index.ts`.

### Memory Retrieval Settings

```typescript
const CONFIG = {
  maxMemories: 500,                 // Max memories to return per search (default: 500)
  maxDistance: 1.2,                 // Vector search distance threshold
  defaultDecayRate: 0.05,           // Memory decay rate
  // ...
}
```

> 💡 **Tip**: As your memory database grows, you can increase `maxMemories` to allow AI to retrieve more relevant memories. Be aware that more memories consume more tokens.

### Local LLM Settings

```typescript
localLLM: {
  enabled: true,                    // Enable/disable local LLM
  provider: 'ollama',               // Currently supports 'ollama'
  baseUrl: 'http://localhost:11434',// Ollama endpoint
  model: 'qwen3:8b',                // Model name
  timeout: 10000,                   // Timeout in ms
  fallbackToRegex: true,            // Fall back if unavailable
  maxInputLength: 800,              // Max input chars for analysis
  
  temperature: 0,                   // 0 = deterministic
  maxTokens: 256,                   // Limit output length
  minImportanceToSave: 3,           // Skip low-importance items
  
  preferUserContent: true,          // true = save original user text
  maxContentLength: 200,            // Max summary length
  
  promptStyle: 'concise',           // 'concise' or 'detailed'
  language: 'auto',                 // 'auto' | 'zh' | 'en'
}
```

---

## 🧩 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    Hippocampus V5.7.1                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Session Start                                              │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_start (NEW!)                     │               │
│  │  • Load core memories (importance ≥ 8)   │               │
│  │  • Load recent 24h memories              │               │
│  │  • LLM generates summary (if available)  │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  User Input                                                 │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ before_agent_start (ENHANCED!)           │               │
│  │  • Vector search Top 100 memories        │               │
│  │  • LLM reranks to Top 10 (if available)  │               │
│  │  • Fallback: Top 20 by similarity        │               │
│  │  • Inject into System Prompt             │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ Main LLM (Claude/GPT/Gemini)             │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ turn_end                                 │               │
│  │  • Local Ollama analyzes if worth saving │               │
│  │  • Or falls back to regex matching       │               │
│  │  • Saves to vector database              │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_shutdown                         │               │
│  │  • Auto-consolidate fragment memories    │               │
│  │  • Merge similar content                 │               │
│  │  • Build associative links               │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Data Storage

Everything stays local:

```
~/.pi-hippocampus/
├── hippocampus.db   # SQLite database (memories + vectors)
└── .cache/          # Embedding model cache
```

**Privacy**:
- Nothing uploads anywhere
- Embeddings computed locally (Xenova/transformers)
- Local LLM analysis stays local

---

## 🐛 FAQ

### Q: Nothing happens after install?

Make sure you restarted pi-agent. The extension loads at startup.

### Q: It says "Regex Mode"?

Ollama wasn't detected. Check:
1. Ollama installed: `ollama --version`
2. Service running: `ollama serve`
3. Model downloaded: `ollama list`

Regex Mode still works, just less smart.

### Q: Too many messy memories?

Ask the AI to call `consolidate_memories`. It'll tidy up.

### Q: How to check status?

Ask the AI to call `memory_status`.

### Q: How to reset everything?

Delete `~/.pi-hippocampus/hippocampus.db` and restart pi.

---

## 🤝 About

I'm an indie developer. Built this for myself first.

If you're also tired of AI amnesia, give it a try. All data stays local, no subscriptions, no tracking.

Got issues? Open one. I'll respond when I can.

---

## 📜 License

MIT - Do whatever you want with it.

---

<div align="center">
  <sub>Just a tool built by a dev who got tired of repeating himself to AI.</sub>
</div>
