<div align="center">

# 🧠 pi-hippocampus

**给 AI 装个海马体，治好它的健忘症。**

[![Pi Agent Extension](https://img.shields.io/badge/Pi%20Agent-Extension-blueviolet)](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
[![Version](https://img.shields.io/badge/version-5.7.0-blue)](https://github.com/lebonbruce/pi-hippocampus/releases)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

[**English**](README.md) | [**简体中文**](README_ZH.md) | [**日本語**](README_JA.md)

</div>

---

## 为什么写这个？

说真的，我用 AI Coding 工具（Cursor、Windsurf、Claude）用了挺久，它们确实强，但有个毛病让我快疯了：**记性像金鱼**。

关掉会话？忘了。换个项目？忘了。昨天刚教它的 API 坑点？忘了。

我不想每次都当复读机。

所以我给 **[pi-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)** 写了这个插件。目的很简单：**让 AI 真正记住事儿**。

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

### 🌅 V5.6.0: 启动唤醒 & 智能检索

**启动唤醒 (Startup Recall)** - 每次开启新会话，AI 会自动加载：
- **核心记忆** (权重 ≥ 8)：你的身份、规则、偏好
- **近期记忆** (最近 24 小时)：昨天干了什么

**智能检索 (Smart RAG)** - 向量搜索 Top 100，再由本地 LLM 精选出最相关的 10 条。

### 🧬 V5.7.0: 记忆新陈代谢 (实时代谢)

**大脑不只是"增加"记忆，更在不断"更新"记忆。**

- **实时冲突解决**：当学习到新规则（如"强制使用严格模式"）时，系统会立即在后台检查是否有冲突的旧规则。
- **自动淘汰**：旧的、冲突的记忆会被标记为 `outdated` 并软删除。
- **突触进化**：在新旧记忆之间建立连接，保留"为什么改变"的历史脉络。
- **零延迟**：一切在后台异步进行，你完全感觉不到。

### 🤫 零配置 & 静默模式 (Zero-Config)

**无感才是最好的体验。**

- **静默回退**：再也不会弹出烦人的 "Ollama disconnected" 提示。如果没有本地模型，它会悄悄切换到正则模式。
- **自动检测**：一旦你启动 Ollama，它会立即感知并升级到智能模式。
- **深度清理**：`consolidate_memories` 工具现在能自动识别你的意图（如"深度整理"），并调用本地 LLM 进行全库大清洗。

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

## 🤖 配置本地 LLM（可选，但推荐）

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
🧠 Hippocampus v5.7.0 (qwen2.5:7b)
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

> 💡 **提示**：如果你的记忆越来越多，想让 AI 能检索更多相关记忆，可以增加 `maxMemories` 的值。但要注意，太多记忆会占用更多 Token。

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
│                    Hippocampus V5.7.0                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  用户输入                                                    │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_start (启动唤醒)                 │               │
│  │  • 加载核心记忆 (权重 ≥ 8)               │               │
│  │  • 加载最近 24h 记忆                     │               │
│  │  • LLM 生成晨报摘要 (如果可用)            │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ before_agent_start (智能检索)            │               │
│  │  • 向量搜索 Top 100 相关记忆             │               │
│  │  • LLM 重排优选 Top 10 (Rerank)          │               │
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
│  │ turn_end (实时记忆代谢)                  │               │
│  │  • 本地 Ollama 分析是否保存              │               │
│  │  • ⚡️ 异步触发代谢机制                   │               │
│  │  • 检查冲突 -> 解决冲突                   │               │
│  │  • 旧记忆被软删除/标记过时                │               │
│  └─────────────────────────────────────────┘               │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────────┐               │
│  │ session_shutdown (深度整理)              │               │
│  │  • 深度清洗 Deep Clean (如果请求)         │               │
│  │  • 自动整理碎片记忆                       │               │
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
