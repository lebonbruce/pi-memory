<div align="center">

# 🧠 pi-hippocampus

**给 AI 装个海马体，治好它的健忘症。**

[![Pi Agent Extension](https://img.shields.io/badge/Pi%20Agent-Extension-blueviolet)](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
[![Version](https://img.shields.io/badge/version-5.7.1-blue)](https://github.com/lebonbruce/pi-hippocampus/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[**English**](README.md) | [**简体中文**](README_ZH.md) | [**日本語**](README_JA.md)

</div>

---

## 🚀 V5.7.1 新特性

### 零摩擦体验
- **秒级启动**：UI 界面瞬间加载，绝不阻塞。记忆摘要任务在您第一次输入后悄悄在后台进行。
- **自动代谢**：彻底移除了手动整理任务。系统会在后台静默合并碎片记忆，保持大脑清晰。

### 更聪明的本地检索 (Local LLM)
- **智能重排 (Rerank)**：先用向量检索 Top 100，再用本地 LLM 挑选出真正相关的 Top 10，准确率大幅提升。
- **意图理解**：即使只问一句“怎么用？”，系统也能结合上下文补全为完整的技术问题。
- **记忆晨报**：每次会话开始时，自动为您生成一份简报，回顾核心规则和昨天的进度。

---

## 为什么写这个？

说真的，我用 AI Coding 工具（Cursor、Windsurf、Claude）用了挺久，它们确实强，但有个毛病让我快疯了：**记性像金鱼**。

关掉会话？忘了。换个项目？忘了。昨天刚教它的 API 坑点？忘了。

我不想每次都当复读机。

所以我给我日常使用的 **[pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)** 写了这个插件。目的很简单：**让 AI 真正记住事儿**。

不是那种把对话存成文件的傻办法（那全是噪音），而是像人脑一样——有过滤、有沉淀、有遗忘、有联想。

---

## ✨ 核心特性

### 🔇 彻底隐形，零打扰

安装完你就不用管了。真的。

你正常聊天，它在后台默默观察。当你说"以后别用 var"或者"数据库密码改了"时，它会自己判断这是重要信息，然后悄悄记下来。

**无感才是最好的交互。**

### 🧠 像人脑一样工作

- **记忆分类**：区分事实（Fact）、规则（Rule）、经历（Event）
- **遗忘曲线**：不重要的信息会随时间自然淡化
- **越用越强**：常被回忆的记忆权重会增加（LTP 长时增强）
- **联想激活**：搜索时会沿着关联链接扩散，找到相关记忆

### 💤 睡眠整理（真的会整理）

就像人需要睡觉来整理记忆一样：
- 关闭会话时自动触发"记忆整理"
- 相似的碎片会被合并成更精炼的事实
- 高频访问的记忆会自动提升重要性
- **完全不消耗 LLM Token**，纯本地计算

### 🌐 跨项目的"直觉"

我在 A 项目里踩过的坑，在 B 项目遇到类似问题时，AI 居然能提醒我。

因为它不只是搜索当前项目，还会根据相似度和重要性，把那些"刻骨铭心"的记忆提取出来。

这感觉不像查数据库，更像是 AI 有了直觉。

---

## ⚡️ 一键安装

### 🍎 Mac / Linux

```bash
mkdir -p ~/.pi/agent/extensions && \
cd ~/.pi/agent/extensions && \
rm -rf pi-hippocampus && \
git clone https://github.com/lebonbruce/pi-hippocampus.git && \
cd pi-hippocampus && \
npm install && \
echo "✅ 搞定！重启 pi 试试吧。"
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
Write-Host "✅ 搞定！重启 pi 试试吧。"
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
echo ✅ 搞定！重启 pi 试试吧。
```

---

## 🤖 配置本地 LLM（推荐）

本地 LLM 能让记忆判断更智能。如果你不配置，插件会自动使用正则匹配，也能用。

### 1. 安装 Ollama

**Mac**
```bash
brew install ollama
```

**Linux**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows**

去 [ollama.com/download](https://ollama.com/download) 下载安装包。

### 2. 下载模型

```bash
# 你可以下载任何 Ollama 支持的模型
ollama pull qwen3:8b
```

### 3. 启动服务

Ollama 通常会自动启动。如果没有：
```bash
ollama serve
```

### 4. 验证

重启 pi，如果看到这个提示就说明成功了：
```
🧠 Hippocampus V5.7.1 Online (Local LLM: qwen2.5:7b)
```

如果看到 `Regex Mode`，说明 Ollama 没检测到，但插件仍然可以正常工作。

---

## 🛠️ 可用工具

安装后，AI 可以使用这些工具：

| 工具 | 说明 |
|------|------|
| `save_memory` | 保存记忆（支持类型、重要性、范围） |
| `search_memory` | 搜索记忆（支持跨项目） |
| `connect_memories` | 建立记忆之间的关联 |
| `consolidate_memories` | 手动触发记忆整理 |
| `list_projects` | 列出所有已知项目 |
| `memory_status` | 查看系统状态和配置 |

---

## ⚙️ 高级配置

如果你想自定义配置，需要直接修改 `index.ts` 中的 `CONFIG` 对象。

### 记忆检索配置

```typescript
const CONFIG = {
  maxMemories: 500,                 // 搜索时最多返回多少条记忆（默认 500）
  maxDistance: 1.2,                 // 向量搜索的最大距离阈值
  defaultDecayRate: 0.05,           // 记忆衰减速率
  // ...
}
```

### 本地 LLM 配置

```typescript
localLLM: {
  enabled: true,                    // 启用/禁用本地 LLM
  provider: 'ollama',               // 目前支持 'ollama'
  baseUrl: 'http://localhost:11434',// Ollama 地址
  model: 'qwen3:8b',                // 模型名称
  timeout: 10000,                   // 超时时间 (ms)
  fallbackToRegex: true,            // 不可用时回退到正则
  maxInputLength: 800,              // 用于分析的最大输入长度
  
  temperature: 0,                   // 0 = 确定性输出
  maxTokens: 256,                   // 限制输出长度
  minImportanceToSave: 3,           // 重要性低于此值不保存
  
  preferUserContent: true,          // true = 保存用户原文
  maxContentLength: 200,            // 摘要最大长度
  
  promptStyle: 'concise',           // 'concise' 适合 7B, 'detailed' 适合大模型
  language: 'auto',                 // 'auto' | 'zh' | 'en'
}
```

---

## 🧩 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                    Hippocampus V5.7.1                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  会话启动 (Session Start)                                   │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_start (新!)                      │               │
│  │  • 加载核心记忆 (重要性 ≥ 8)              │               │
│  │  • 加载最近 24h 记忆                      │               │
│  │  • LLM 生成晨报摘要 (若可用)              │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  用户输入                                                   │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ before_agent_start (增强!)               │               │
│  │  • 向量搜索 Top 100 相关记忆              │               │
│  │  • LLM 重排选出 Top 10 (若可用)           │               │
│  │  • 回退：仅按相似度取 Top 20              │               │
│  │  • 注入到 System Prompt                  │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ 主 LLM 处理 (Claude/GPT/Gemini)          │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ turn_end                                 │               │
│  │  • 本地 Ollama 分析是否保存              │               │
│  │  • 或回退到正则匹配                       │               │
│  │  • 保存到向量数据库                       │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_shutdown                         │               │
│  │  • 自动整理碎片记忆                       │               │
│  │  • 合并相似内容                          │               │
│  │  • 建立关联链接                          │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 数据存储

所有数据都在本地：

```
~/.pi-hippocampus/
├── hippocampus.db   # SQLite 数据库（记忆 + 向量）
└── .cache/          # Embedding 模型缓存
```

**隐私安全**：
- 数据不会上传到任何地方
- 向量化在本地完成（使用 Xenova/transformers）
- 本地 LLM 分析也在本地完成

---

## 🐛 常见问题

### Q: 安装后没反应？

确保重启了 pi-agent。插件在启动时加载。

### Q: 提示 "Regex Mode"？

说明没检测到 Ollama。检查：
1. Ollama 是否安装：`ollama --version`
2. 服务是否运行：`ollama serve`
3. 模型是否下载：`ollama list`

不过 Regex Mode 也能用，只是没那么智能。

### Q: 记忆太多太乱？

让 AI 调用 `consolidate_memories` 工具，它会帮你整理。

### Q: 想看当前状态？

让 AI 调用 `memory_status` 工具。

### Q: 如何清空所有记忆？

删除 `~/.pi-hippocampus/hippocampus.db` 文件，重启 pi。

---

## 🤝 碎碎念

我是个独立开发者，这东西最初就是写给自己用的。

如果你也受够了 AI 的健忘症，试试这个。数据全在本地，不用担心隐私，也没人收你订阅费。

有问题直接开 Issue 就行，我看到会回。

---

## 📜 License

MIT - 随便用，不用问我。

---

<div align="center">
  <sub>Just a tool built by a dev who got tired of repeating himself to AI.</sub>
</div>
