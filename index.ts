import { Type } from "@sinclair/typebox";
import { Text } from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

// === 配置与常量 ===
const GLOBAL_MEMORY_DIR = path.join(os.homedir(), ".pi-hippocampus");
const DB_PATH = path.join(GLOBAL_MEMORY_DIR, "hippocampus.db");
const CACHE_DIR = path.join(GLOBAL_MEMORY_DIR, ".cache");

const CONFIG = {
  embeddingModel: "Xenova/nomic-embed-text-v1",
  embeddingDimensions: 768,
  maxDistance: 1.2,
  maxMemories: 500,
  defaultDecayRate: 0.05,
  consolidation: {
    minFragmentsForMerge: 2,
    similarityThreshold: 0.75,
    autoPromoteAccessCount: 3,
    fragmentMaxAgeDays: 7,
  },
  context: {
    recentProjectDays: 7,
    staleProjectDays: 30,
    recentProjectFactor: 0.7,
    staleProjectFactor: 0.3,
    alienBreakthroughFactor: 0.8,
  },
  spreading: {
    maxHops: 1,
    minLinkStrength: 0.5,
    spreadDecay: 0.7,
  },
  
  // V5.6.0 启动唤醒配置 (Startup Recall)
  startupRecall: {
    enabled: true,                    // 是否开启启动唤醒
    lookbackHours: 24,                // 回溯时间窗口（小时）
    minImportance: 8,                 // 核心记忆的最小权重阈值
    maxTokens: 8000,                  // Token 硬限制（无 Ollama 时）
    maxMemories: 50,                  // 最大记忆条数（硬限制）
    useLLMSummary: true,              // 有 Ollama 时生成压缩摘要（默认关闭，可手动开启）
    summaryMaxTokens: 500,            // 摘要最大 Token 数
  },
  
  // V5.6.0 智能检索配置 (RAG with Rerank)
  ragSearch: {
    enabled: true,                    // 是否开启智能检索
    vectorSearchLimit: 100,           // 向量搜索数量（第一阶段）
    rerankWithLLM: true,              // 使用本地 LLM 重排序（默认关闭，因为会导致每次对话延迟）
    rerankOutputLimit: 10,            // 重排后输出数量
    hardLimitNoLLM: 20,               // 无 Ollama 时的硬截断数量
    includeGlobalCore: true,          // 是否强制包含全局核心记忆
    globalCoreMinImportance: 7,       // 全局核心记忆的最小重要性
    globalCoreLimit: 5,               // 全局核心记忆数量限制
    queryEnhancement: true,           // 使用本地 LLM 增强短查询（默认关闭，会增加延迟）
    queryEnhancementThreshold: 20,    // 消息长度低于此值时触发查询增强
  },
  
  // V5.4.1 本地 LLM 分析配置 (Enhanced)
  localLLM: {
    enabled: true,                    // Enable local LLM analysis
    provider: 'ollama' as const,      // Currently only supports Ollama
    baseUrl: 'http://localhost:11434',
    model: 'auto',                    // Auto-detects best available model (e.g., qwen2.5, llama3)
    timeout: 20000,                   // Timeout (ms) - Increased to 20s for CPU inference/cold boot
    fallbackToRegex: true,            // Fall back to regex if LLM is unavailable
    maxInputLength: 2000,             // Max input length - Increased for better context awareness
    
    // Model parameters
    temperature: 0,                   // 0 = deterministic
    maxTokens: 256,                   // Limit output length
    
    // Thresholds
    minImportanceToSave: 3,           // Skip if importance is below this
    confidenceThreshold: 0.7,         // LLM confidence threshold (reserved)
    
    // Output control
    preferUserContent: true,          // true = save original user text, false = save LLM summary
    maxContentLength: 200,            // Max content length
    
    // Exclude rules
    excludePatterns: [
      /^(好的|ok|嗯|哦|谢谢|thanks|thank you|got it|understood|明白|收到)[\s,!.。！]*/i,
      /^(帮我|请|help me|can you|could you)/i,
    ],
    
    // Sensitive information filtering
    sensitivePatterns: [
      /password\s*[:=]/i,
      /密码\s*[:=：]/i,
      /api[_-]?key\s*[:=]/i,
      /secret\s*[:=]/i,
      /token\s*[:=]/i,
      /credential/i,
      /private[_-]?key/i,
      /-----BEGIN/i,
      /ghp_[a-zA-Z0-9]{20,}/i,        // GitHub token
      /sk-[a-zA-Z0-9]{20,}/i,         // OpenAI key
      /AKIA[A-Z0-9]{16}/i,            // AWS key
      /xox[baprs]-[a-zA-Z0-9-]+/i,    // Slack token
    ],
    
    // Prompt template config
    promptStyle: 'concise' as 'concise' | 'detailed',  // Concise is better for small models
    language: 'auto' as 'auto' | 'zh' | 'en',          // Output language
  },
  
  // V5.4.1 自动编码配置 (正则回退方案)
  autoEncode: {
    enabled: true,
    minMessageLength: 0, // 杜总指示：0门槛，全量分析
    
    // ========== 修正/纠错模式 (新增) ==========
    // 这种信息价值极高，通常是对错误认知的修正
    correctionPatterns: [
      // 中文
      /不对|错了|搞错了|弄错了|不是.*而是/i,
      /其实是|实际上是|应该是|准确说是/i,
      /更正一下|修正一下|改一下/i,
      
      // 英文
      /incorrect|wrong|mistake|not.*but/i,
      /actually|in fact|should be|meant to say/i,
      /correction|let me correct/i,
    ],

    // ========== 计划/愿景模式 (新增) ==========
    // 捕捉未来的规划和目标
    goalPatterns: [
      // 中文
      /计划|打算|准备|想要|希望|目标/i,
      /下一步|接下来|未来|roadmap|里程碑/i,
      /长期来看|最终效果|愿景/i,
      
      // 英文
      /plan to|going to|intend to|aim to|goal is/i,
      /next step|roadmap|milestone|future/i,
      /long term|vision|ultimate goal/i,
    ],

    // ========== 定义/概念模式 (新增) ==========
    // 捕捉用户对特定概念的解释
    definitionPatterns: [
      // 中文
      /所谓.*就是|.*是指|.*的意思是/i,
      /定义为|理解为|看作是/i,
      
      // 英文
      /means that|refers to|defined as/i,
      /is essentially|basically is/i,
    ],
    
    // ========== 规则/偏好模式 (扩充) ==========
    // 用户表达个人偏好、编码规范、工作流程时触发
    rulePatterns: [
      // 中文：禁止/必须类
      /不要|不用|别用|禁止|不许|不能|不可以|严禁|避免|杜绝/i,
      /必须|一定要|务必|要求|强制|只能|只用|只准/i,
      /别整|别搞|少弄|别给我/i, // 口语化
      
      // 中文：偏好类
      /偏好|喜欢|习惯|倾向|更愿意|比较喜欢|我觉得.*好/i,
      /讨厌|不喜欢|反感|烦|受不了|恶心|难用/i,
      /一般|通常|平时|往往|大多数时候/i, // 习惯
      
      // 中文：时间标记（表示持久规则）
      /以后|今后|从现在起|之后都|以后都|永远|一直/i,
      /记住|记得|别忘了|提醒我|刻在DNA里/i,
      
      // 中文：规范/标准类
      /规范|标准|约定|惯例|风格|格式|命名/i,
      /统一用|统一使用|一律|全部用|都用/i,
      /最佳实践|best practice|原则/i,
      
      // 英文：Prohibition/Must
      /don't|dont|do not|never|avoid|stop using|quit/i,
      /must|always|shall|should|have to|need to|required/i,
      // 英文：Preference
      /prefer|like to|rather|better to|fan of|love using/i,
      /hate|dislike|can't stand|annoying/i,
      /usually|typically|generally|habit/i,
      // 英文：Time markers
      /from now on|going forward|in the future|from here on/i,
      /remember|keep in mind|don't forget|note that/i,
      // 英文：Standards
      /convention|standard|pattern|style guide|best practice/i,
      /always use|stick to|follow the|principle/i,
    ],
    
    // ========== 事实/配置模式 (扩充) ==========
    // 技术栈、配置信息、环境变量等
    factPatterns: [
      // 中文：技术栈
      /用的是|使用的是|基于|采用|技术栈|框架是/i,
      /版本|v\d+|@\d+/i,
      /依赖|库|package|包/i,
      
      // 中文：配置
      /配置|设置|参数|选项|环境变量|env/i,
      /地址|路径|目录|文件夹|位置|path/i,
      /端口|port|host|域名|url|uri|链接/i,
      
      // 中文：凭证（注意：自动编码时会跳过敏感信息）
      /账号|用户名|user|id/i,
      // (密码/key等敏感词由过滤器处理，这里只匹配非敏感描述)
      
      // 中文：数据库/存储
      /数据库|database|db|mysql|postgres|mongo|redis|sqlite/i,
      /表名|字段|schema|集合|collection|存储/i,
      /s3|oss|bucket|存储桶/i,
      
      // 中文：部署/环境
      /服务器|server|vps|云|aws|azure|gcp|阿里云|腾讯云/i,
      /环境|environment|dev|prod|staging|test/i,
      /docker|容器|k8s|kubernetes|nginx|pm2/i,
      /ci|cd|流水线|pipeline|action/i,
      
      // 英文：Tech stack
      /using|powered by|built with|based on|running on/i,
      /version|v\d+\.\d+|dependency|lib/i,
      // 英文：Configuration
      /config|setting|option|parameter|env var/i,
      /path|directory|folder|location|file/i,
      /port|host|domain|url|endpoint/i,
      // 英文：Infrastructure
      /server|instance|container|cluster|node/i,
      /deployed on|hosted on|running on/i,
      /database|db|store|storage/i,
    ],
    
    // ========== 事件模式 ==========
    // 完成的任务、解决的问题、里程碑
    eventPatterns: [
      // 中文：完成类
      /完成了|搞定了|做完了|弄好了|实现了|写完了/i,
      /成功|ok了|可以了|没问题了|通过了/i,
      // 中文：修复类
      /修复了|修好了|解决了|处理了|搞定.*bug|fix.*了/i,
      /终于.*了|花了.*时间|折腾.*久/i,
      // 中文：部署/发布
      /部署了|发布了|上线了|推送了|提交了|合并了/i,
      /deploy|release|publish|push|merge|commit/i,
      // 中文：问题/踩坑
      /踩坑|踩了.*坑|遇到.*问题|碰到.*bug/i,
      /报错|error|异常|exception|失败|fail/i,
      /原来是|发现是|问题在于|根本原因/i,
      // 中文：学习/发现
      /学到了|发现了|原来|才知道|没想到/i,
      /技巧|窍门|诀窍|方法|思路/i,
      
      // 英文：Completion
      /finished|completed|done with|wrapped up|shipped/i,
      /works now|working now|succeeded|passed/i,
      // 英文：Fixing
      /fixed|resolved|solved|patched|debugged/i,
      /finally|after.*hours|took.*to figure out/i,
      // 英文：Deployment
      /deployed|released|published|pushed|merged/i,
      /went live|in production|rolled out/i,
      // 英文：Problems
      /ran into|encountered|hit a|stumbled upon/i,
      /bug|error|issue|problem|crash|exception/i,
      /turns out|realized|figured out|root cause/i,
      // 英文：Learning
      /learned|discovered|found out|til:|today i learned/i,
      /trick|tip|hack|workaround|solution/i,
    ],
    
    // ========== 身份/个人信息模式 ==========
    // 用户的个人信息、身份、联系方式
    identityPatterns: [
      // 中文
      /我是|我叫|我的名字|本人|我自己/i,
      /我的.*是|我.*住在|我在.*工作/i,
      /电话|手机|邮箱|email|微信|qq/i,
      /生日|年龄|岁/i,
      
      // 英文
      /my name is|i am|i'm called|call me/i,
      /i live in|i work at|i'm from/i,
      /my.*is|my phone|my email/i,
    ],
    
    // ========== 项目信息模式 ==========
    // 当前项目的关键信息
    projectPatterns: [
      // 中文
      /这个项目|本项目|当前项目|这个仓库|这个repo/i,
      /项目名|项目叫|repo名/i,
      /主要功能|核心功能|用来做|目的是/i,
      /架构|结构|目录结构|文件结构/i,
      // 中文：话题焦点（新增）
      /.*的事|关于.*|.*开发|.*计划|.*任务|.*目标/i,
      /正在弄|正在搞|处理.*|解决.*/i,
      
      // 英文
      /this project|this repo|current project/i,
      /project name|repo name|codebase/i,
      /main feature|core function|purpose is|used for/i,
      /architecture|structure|layout/i,
      // 英文：Topic Focus (New)
      /working on|focusing on|dealing with|regarding/i,
    ],
  }
};

// === 辅助函数 ===
function getProjectHash(cwd: string): string {
  return crypto.createHash("md5").update(cwd).digest("hex");
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// === V5.4.1 本地 LLM 分析器 (Enhanced) ===
let ollamaAvailable: boolean | null = null;
let lastOllamaStatus: boolean | null = null;  // 追踪上次状态，用于检测变化
let uiContext: any = null;  // 保存 ctx.ui 引用，用于实时通知
let currentLLMMode: string = 'Regex';  // 当前模式：模型名或 'Regex'
let lastRecallCount: number = 0;  // 上次召回数量

// 更新底部状态栏（合并显示）
const STATUS_VERSION = "v5.7.1";
function updateStatusBar(ctx: any) {
  const modelDisplay = currentLLMMode === 'Regex' ? 'Regex' : currentLLMMode;
  const recallText = lastRecallCount >= 1000 ? '999+' : lastRecallCount.toString();
  const recallDisplay = lastRecallCount > 0 ? ` | Recall: ${recallText}` : '';
  // 简化状态显示，避免太长
  const displayVersion = STATUS_VERSION.replace('v', '');
  ctx.ui.setStatus("hippocampus", `🧠 ${displayVersion} ${modelDisplay}${recallDisplay}`);
}

interface LocalLLMAnalysisResult {
  should_save: boolean;
  type: 'fact' | 'rule' | 'event';
  importance: number;
  scope: 'global' | 'local';
  content: string;
  tags: string[];
  reason: string;
}

// 检测 Ollama 是否可用（实时检测，不缓存）
async function checkOllamaAvailable(forceRefresh: boolean = false): Promise<boolean> {
  if (!forceRefresh && ollamaAvailable !== null) return ollamaAvailable;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    // Request /api/tags to get model list
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/tags`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      ollamaAvailable = true;
      
      // Auto-detect model if set to 'auto'
      if (CONFIG.localLLM.model === 'auto') {
        try {
          const data = await response.json();
          const models = (data.models || []).map((m: any) => m.name);
          
          // Filter out embedding models to avoid selecting them for chat
          const chatModels = models.filter((m: string) => !m.includes('embed') && !m.includes('nomic'));
          
          if (chatModels.length > 0) {
            // Priority list for Chinese/Coding context
            const priorities = ['qwen2.5', 'deepseek', 'llama3', 'mistral', 'qwen', 'gemma'];
            
            let selected = '';
            for (const p of priorities) {
              const match = chatModels.find((m: string) => m.toLowerCase().includes(p));
              if (match) {
                selected = match;
                break;
              }
            }
            
            // Fallback to first available chat model
            if (!selected) selected = chatModels[0];
            
            CONFIG.localLLM.model = selected;
            console.log(`[Hippocampus] Auto-selected model: ${selected}`);
            
            // Update mode display immediately if waiting
            if (currentLLMMode === 'Regex') currentLLMMode = selected;
          }
        } catch (e) {
          // JSON parse failed, keep 'auto'
        }
      }
      
      return true;
    } else {
      ollamaAvailable = false;
      return false;
    }
  } catch (e) {
    ollamaAvailable = false;
    return false;
  }
}

// 检测并通知 Ollama 状态变化 (v5.7.0: 静默模式，移除 Warning)
async function checkAndNotifyOllamaStatus(ctx: any): Promise<boolean> {
  const currentStatus = await checkOllamaAvailable(true);
  
  // 检测状态变化
  if (lastOllamaStatus !== null && currentStatus !== lastOllamaStatus) {
    if (currentStatus) {
      // 从离线变为在线：提示一下（好事可以简单提示）
      currentLLMMode = CONFIG.localLLM.model;
      // ctx.ui.notify(`🧠 LLM Connected: ${CONFIG.localLLM.model}`, "success");
    } else {
      // 从在线变为离线：静默降级，不打扰用户
      currentLLMMode = 'Regex';
      console.log(`[Hippocampus] LLM disconnected, silently falling back to Regex`);
      // 移除警告弹窗
      // ctx.ui.notify(`⚠️ LLM disconnected, using Regex`, "warning");
    }
    updateStatusBar(ctx);
  }
  
  lastOllamaStatus = currentStatus;
  return currentStatus;
}

// 检测语言
function detectLanguage(text: string): 'zh' | 'en' {
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
  return chineseChars.length > text.length * 0.1 ? 'zh' : 'en';
}

// 检查是否匹配排除模式
function matchesExcludePattern(text: string): boolean {
  return CONFIG.localLLM.excludePatterns.some(pattern => pattern.test(text));
}

// 检查是否包含敏感信息
function hasSensitiveInfo(text: string): boolean {
  return CONFIG.localLLM.sensitivePatterns.some(pattern => pattern.test(text));
}

// V5.4.1 Enhanced: 构建优化的分析 Prompt
function buildAnalysisPrompt(recentHistory: Array<{role: string, content: string}>, lang: 'zh' | 'en'): string {
  // 杜总指示：提供上下文，让 LLM 理解诸如 "好" 这种短语的真实含义
  
  // 将历史记录格式化为文本
  const conversationText = recentHistory.map(msg => {
    const role = msg.role === 'user' ? (lang === 'zh' ? '用户' : 'User') : (lang === 'zh' ? '助手' : 'Assistant');
    return `${role}: ${msg.content}`;
  }).join('\n');
  
  if (CONFIG.localLLM.promptStyle === 'concise') {
    return buildConcisePrompt(conversationText, lang);
  } else {
    return buildDetailedPrompt(conversationText, lang);
  }
}

// 简洁 Prompt（推荐用于 7B 模型）
function buildConcisePrompt(conversationText: string, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `分析这段对话，提取值得记忆的信息。

🚨 杜总指示：结合上下文理解简短回复（如"好"、"行"）。全量分析，构建大脑记忆。

对话历史:
${conversationText}

判断标准:
✅ 保存: 用户偏好/规则、技术配置、完成的任务、踩坑经验、当前关注焦点、基于上下文推断出的意图
❌ 不保存: 纯粹的寒暄，无实际意义的确认（除非代表了重要决策）

输出格式(JSON):
{"save":true/false,"type":"rule/fact/event","imp":1-10,"scope":"global/local","content":"基于上下文的完整摘要","tags":["标签"]}

示例:
[对话历史]
用户: 把MAX_BUY_PRICE改成0.65
助手: 好的，已修改。
用户: 好
[输出]
{"save":true,"type":"event","imp":6,"scope":"local","content":"确认修改 MAX_BUY_PRICE 为 0.65","tags":["配置","策略"]}

现在分析上面的对话，输出JSON:`;
  } else {
    return `Analyze conversation history. Extract memories based on context.

Context is KEY. "Ok" might mean "Deploy to Prod" depending on history.

Conversation History:
${conversationText}

Save: preferences, rules, configs, tasks, decisions inferred from context
Skip: empty chitchat

Format (JSON):
{"save":true/false,"type":"rule/fact/event","imp":1-10,"scope":"global/local","content":"Context-aware summary","tags":["tag"]}

Example:
[History]
User: Change MAX_BUY_PRICE to 0.65
Assistant: Done.
User: Good
[Output]
{"save":true,"type":"event","imp":6,"scope":"local","content":"Confirmed change of MAX_BUY_PRICE to 0.65","tags":["config","strategy"]}

Now analyze and output JSON:`;
  }
}

// 详细 Prompt（用于更大的模型）
function buildDetailedPrompt(conversationText: string, lang: 'zh' | 'en'): string {
  return `You are a memory analyzer. Analyze the following CONVERSATION HISTORY to extract long-term memories.

## CRITICAL: Context Awareness
You are provided with a conversation history. You must use this context to interpret short or ambiguous messages like "yes", "no", "do it".
- "Yes" after "Should I deploy?" -> Event: User authorized deployment.
- "No" after "Do you like dark mode?" -> Rule: User dislikes dark mode.

## Conversation History
${conversationText}

## Classification Guide
(Same as before...)

Analyze and output JSON:`;
}

// 调用 Ollama 进行分析
async function analyzeWithLocalLLM(recentHistory: Array<{role: string, content: string}>): Promise<LocalLLMAnalysisResult | null> {
  if (!CONFIG.localLLM.enabled) return null;
  
  const lastUserMsg = recentHistory.filter(m => m.role === 'user').pop();
  if (!lastUserMsg) return null;
  
  // 快速过滤：排除模式 (仅检查最新一条)
  if (matchesExcludePattern(lastUserMsg.content)) {
    return { should_save: false, type: 'fact', importance: 0, scope: 'local', content: '', tags: [], reason: 'Excluded by pattern' };
  }
  
  // 快速过滤：敏感信息
  if (hasSensitiveInfo(lastUserMsg.content)) {
    return { should_save: false, type: 'fact', importance: 0, scope: 'local', content: '', tags: [], reason: 'Contains sensitive info' };
  }
  
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) return null;
  
  try {
    const lang = CONFIG.localLLM.language === 'auto' ? detectLanguage(lastUserMsg.content) : CONFIG.localLLM.language;
    const prompt = buildAnalysisPrompt(recentHistory, lang);
    
    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), CONFIG.localLLM.timeout);
    
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.localLLM.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: CONFIG.localLLM.temperature,
          num_predict: CONFIG.localLLM.maxTokens,
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const text = data.response?.trim() || '';
    
    // 解析 JSON（处理可能的 markdown 包裹）
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const raw = JSON.parse(jsonStr);
    
    // 适配简化格式（save/imp）和标准格式（should_save/importance）
    const result: LocalLLMAnalysisResult = {
      should_save: raw.save ?? raw.should_save ?? false,
      type: raw.type || 'fact',
      importance: raw.imp ?? raw.importance ?? 3,
      scope: raw.scope || 'local',
      content: raw.content || '',
      tags: raw.tags || [],
      reason: raw.reason || ''
    };
    
    // 验证和修正
    if (typeof result.should_save !== 'boolean') result.should_save = false;
    if (!['fact', 'rule', 'event'].includes(result.type)) result.type = 'fact';
    if (!['global', 'local'].includes(result.scope)) result.scope = 'local';
    if (!Array.isArray(result.tags)) result.tags = [];
    
    result.importance = Math.max(1, Math.min(10, Number(result.importance) || 3));
    
    // 应用重要性阈值
    if (result.should_save && result.importance < CONFIG.localLLM.minImportanceToSave) {
      result.should_save = false;
      result.reason = `Importance ${result.importance} below threshold ${CONFIG.localLLM.minImportanceToSave}`;
    }
    
    // 处理内容
    if (result.should_save) {
      if (!result.content || result.content.length < 5) {
        // 如果 LLM 没有生成好的摘要，使用用户原文
        result.content = userMessage.substring(0, CONFIG.localLLM.maxContentLength).replace(/\n+/g, ' ').trim();
      } else if (result.content.length > CONFIG.localLLM.maxContentLength) {
        result.content = result.content.substring(0, CONFIG.localLLM.maxContentLength) + '...';
      }
    }
    
    return result;
  } catch (e) {
    // 静默失败，回退到正则
    return null;
  }
}

// === 延迟加载模块 ===
let Database: any = null;
let sqliteVec: any = null;
let pipeline: any = null;
let transformersEnv: any = null;
let embeddingPipeline: any = null;
let db: any = null;

async function loadDependencies() {
  if (Database && sqliteVec && pipeline) return;
  const betterSqlite = await import("better-sqlite3");
  Database = betterSqlite.default;
  sqliteVec = await import("sqlite-vec");
  const transformers = await import("@xenova/transformers");
  pipeline = transformers.pipeline;
  transformersEnv = transformers.env;
  transformersEnv.allowLocalModels = true;
  transformersEnv.allowRemoteModels = true;
  transformersEnv.cacheDir = CACHE_DIR;
}

// === 数据库初始化 (V5.4.1 Schema) ===
async function initDB() {
  if (db) return db;
  await loadDependencies();
  ensureDir(GLOBAL_MEMORY_DIR);
  db = new Database(DB_PATH);
  sqliteVec.load(db);

  // 1. Memories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      tags TEXT,
      scope TEXT DEFAULT 'local',
      project_id TEXT,
      status TEXT DEFAULT 'active',
      parent_id TEXT,
      change_reason TEXT,
      source TEXT DEFAULT 'user',
      type TEXT DEFAULT 'fact',
      importance INTEGER DEFAULT 1,
      decay_rate REAL DEFAULT 0.05,
      access_count INTEGER DEFAULT 0,
      last_accessed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 2. Associative Links
  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_links (
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      type TEXT DEFAULT 'association',
      strength REAL DEFAULT 1.0,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (source_id, target_id)
    );
  `);

  // 3. Vector Table
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS vec_memories USING vec0(
      memory_id TEXT PRIMARY KEY,
      embedding FLOAT[${CONFIG.embeddingDimensions}]
    );
  `);

  // 4. Projects Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT,
      path TEXT UNIQUE,
      last_active_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 5. V5.4.1 新增：对话缓冲区（用于自动编码分析）
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_buffer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
  `);

  // Schema Migration
  try {
    const tableInfo = db.pragma("table_info(memories)");
    const hasType = tableInfo.some((col: any) => col.name === "type");
    if (!hasType) {
      console.log("🧠 Migrating to V5.4.1...");
      const columns = [
        "ADD COLUMN type TEXT DEFAULT 'fact'",
        "ADD COLUMN importance INTEGER DEFAULT 1",
        "ADD COLUMN decay_rate REAL DEFAULT 0.05"
      ];
      for (const col of columns) {
        try { db.exec(`ALTER TABLE memories ${col};`); } catch (e) {}
      }
    }
  } catch (e) {}

  return db;
}

function closeDB() {
  if (db) {
    try { db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } catch (e) {}
    db = null;
  }
}

async function getEmbedding(text: string, type: 'query' | 'document' = 'document'): Promise<Float32Array> {
  await loadDependencies();
  if (!embeddingPipeline) {
    embeddingPipeline = await pipeline("feature-extraction", CONFIG.embeddingModel);
  }
  
  let inputText = text;
  if (CONFIG.embeddingModel.includes("nomic")) {
    if (!text.startsWith("search_query:") && !text.startsWith("search_document:")) {
      inputText = type === 'query' ? `search_query: ${text}` : `search_document: ${text}`;
    }
  }

  const output = await embeddingPipeline(inputText, { pooling: "mean", normalize: true });
  return new Float32Array(output.data);
}

// === 项目注册 ===
async function registerProject(projectId: string, cwd: string) {
  const database = await initDB();
  const now = Date.now();
  const projectName = path.basename(cwd);
  
  database.prepare(`
    INSERT INTO projects (id, name, path, last_active_at, created_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_active_at = ?, name = COALESCE(name, ?)
  `).run(projectId, projectName, cwd, now, now, now, projectName);
}

async function findProjectByName(name: string): Promise<{ id: string; path: string } | null> {
  const database = await initDB();
  const row = database.prepare(`
    SELECT id, path FROM projects 
    WHERE LOWER(name) LIKE ? OR LOWER(path) LIKE ?
    ORDER BY last_active_at DESC LIMIT 1
  `).get(`%${name.toLowerCase()}%`, `%${name.toLowerCase()}%`);
  return row || null;
}

async function getProjectActivity(projectId: string): Promise<'current' | 'recent' | 'stale' | 'unknown'> {
  const database = await initDB();
  const row = database.prepare(`SELECT last_active_at FROM projects WHERE id = ?`).get(projectId);
  if (!row) return 'unknown';
  
  const daysAgo = (Date.now() - row.last_active_at) / (1000 * 60 * 60 * 24);
  if (daysAgo < CONFIG.context.recentProjectDays) return 'recent';
  if (daysAgo < CONFIG.context.staleProjectDays) return 'stale';
  return 'stale';
}

// === V5.4.1 核心：对话缓冲区管理 ===
async function bufferConversation(projectId: string, role: string, content: string) {
  const database = await initDB();
  database.prepare(`
    INSERT INTO conversation_buffer (project_id, role, content, timestamp)
    VALUES (?, ?, ?, ?)
  `).run(projectId, role, content, Date.now());
  
  // 只保留最近 20 条
  database.prepare(`
    DELETE FROM conversation_buffer 
    WHERE project_id = ? AND id NOT IN (
      SELECT id FROM conversation_buffer WHERE project_id = ? ORDER BY timestamp DESC LIMIT 20
    )
  `).run(projectId, projectId);
}

async function getRecentConversation(projectId: string, limit: number = 10): Promise<Array<{role: string, content: string}>> {
  const database = await initDB();
  return database.prepare(`
    SELECT role, content FROM conversation_buffer 
    WHERE project_id = ? 
    ORDER BY timestamp DESC LIMIT ?
  `).all(projectId, limit).reverse();
}

async function clearConversationBuffer(projectId: string) {
  const database = await initDB();
  database.prepare(`DELETE FROM conversation_buffer WHERE project_id = ?`).run(projectId);
}

// === V5.4.1 核心：智能自动编码分析器 ===
interface AutoEncodeResult {
  shouldSave: boolean;
  type?: 'fact' | 'event' | 'rule';
  importance?: number;
  scope?: 'global' | 'local';
  content?: string;
  reason?: string;
  tags?: string[];
}

// 检测是否匹配任一模式
function matchesAnyPattern(text: string, patterns: RegExp[]): { matched: boolean; pattern?: RegExp } {
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      return { matched: true, pattern };
    }
  }
  return { matched: false };
}

// 智能判断 scope
function detectScope(text: string): 'global' | 'local' {
  const globalIndicators = /全局|global|所有项目|all projects|everywhere|任何地方|通用|universal|总是|always/i;
  const localIndicators = /这个项目|this project|这里|here|当前|current|本项目|这个仓库/i;
  
  if (globalIndicators.test(text)) return 'global';
  if (localIndicators.test(text)) return 'local';
  
  // 默认：编程风格/偏好类的规则通常是 global
  const stylePatterns = /代码|code|命名|naming|格式|format|风格|style|缩进|indent|注释|comment/i;
  if (stylePatterns.test(text)) return 'global';
  
  return 'local';
}

// 智能判断重要性
function detectImportance(text: string, type: 'fact' | 'event' | 'rule'): number {
  let base = type === 'rule' ? 7 : type === 'event' ? 4 : 3;
  
  // 强调词加分
  const emphasisPatterns = [
    { pattern: /非常重要|very important|critical|关键|crucial|必须|must|绝对/i, boost: 2 },
    { pattern: /重要|important|注意|note|记住|remember/i, boost: 1 },
    { pattern: /永远|always|never|绝不|严禁|forbidden/i, boost: 2 },
    { pattern: /小心|careful|警告|warning|危险|danger/i, boost: 1 },
  ];
  
  for (const { pattern, boost } of emphasisPatterns) {
    if (pattern.test(text)) {
      base += boost;
    }
  }
  
  // 踩坑经验加分（经验教训很宝贵）
  if (/踩坑|坑|bug|花了.*时间|折腾|终于|finally|after.*hours/i.test(text)) {
    base += 2;
  }
  
  return Math.min(base, 10);
}

// 智能提取标签
function extractTags(text: string): string[] {
  const tags: string[] = [];
  
  // 技术栈标签
  const techPatterns: Record<string, RegExp> = {
    'react': /react/i,
    'vue': /vue/i,
    'angular': /angular/i,
    'node': /node\.?js|nodejs/i,
    'python': /python|py|pip/i,
    'typescript': /typescript|ts/i,
    'javascript': /javascript|js/i,
    'docker': /docker/i,
    'kubernetes': /k8s|kubernetes/i,
    'git': /git|github|gitlab/i,
    'database': /mysql|postgres|mongo|redis|sqlite|数据库/i,
    'api': /api|rest|graphql|接口/i,
    'css': /css|sass|scss|tailwind|样式/i,
    'testing': /test|jest|mocha|pytest|测试/i,
    'deploy': /deploy|部署|发布|ci\/cd/i,
  };
  
  for (const [tag, pattern] of Object.entries(techPatterns)) {
    if (pattern.test(text)) {
      tags.push(tag);
    }
  }
  
  return tags.slice(0, 5); // 最多 5 个标签
}

// 智能内容提取和清理
function extractContent(userMsg: string, assistantMsg: string, type: 'fact' | 'event' | 'rule'): string {
  let content = userMsg;
  
  // 移除常见的无意义前缀
  content = content.replace(/^(好的|ok|嗯|哦|那|所以|然后|接下来|请|帮我|麻烦)[，,。.：:\s]*/i, '');
  content = content.replace(/^(hey|hi|hello|so|well|okay|alright)[,.\s]*/i, '');
  
  // 根据类型调整长度
  const maxLength = type === 'rule' ? 300 : type === 'event' ? 200 : 250;
  
  if (content.length > maxLength) {
    // 尝试在句号处截断
    const truncated = content.substring(0, maxLength);
    const lastPeriod = Math.max(
      truncated.lastIndexOf('。'),
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('！'),
      truncated.lastIndexOf('!'),
    );
    if (lastPeriod > maxLength * 0.5) {
      content = truncated.substring(0, lastPeriod + 1);
    } else {
      content = truncated + '...';
    }
  }
  
  return content.replace(/\n+/g, ' ').trim();
}

// 检测是否包含敏感信息
function containsSensitiveInfo(text: string): boolean {
  const sensitivePatterns = [
    /password\s*[:=]/i,
    /密码\s*[:=：]/i,
    /api.?key\s*[:=]/i,
    /secret\s*[:=]/i,
    /token\s*[:=]/i,
    /credential/i,
    /private.?key/i,
    /-----BEGIN/i,  // PEM 格式
    /ghp_[a-zA-Z0-9]+/i,  // GitHub token
    /sk-[a-zA-Z0-9]+/i,   // OpenAI key
  ];
  
  return sensitivePatterns.some(p => p.test(text));
}

function analyzeForAutoEncode(userMessage: string, assistantMessage: string): AutoEncodeResult[] {
  const results: AutoEncodeResult[] = [];
  
  // 太短的消息不分析
  if (userMessage.length < CONFIG.autoEncode.minMessageLength) {
    return results;
  }
  
  // 包含敏感信息时不自动保存
  if (containsSensitiveInfo(userMessage) || containsSensitiveInfo(assistantMessage)) {
    return results;
  }
  
  const combined = `${userMessage} ${assistantMessage}`;
  let hasMatch = false;
  
  // 0. 检查修正模式 (优先级最高)
  const correctionMatch = matchesAnyPattern(userMessage, CONFIG.autoEncode.correctionPatterns);
  if (correctionMatch.matched) {
    results.push({
      shouldSave: true,
      type: 'fact',
      importance: 9, // 修正通常很重要
      scope: 'local',
      content: extractContent(userMessage, assistantMessage, 'fact'),
      reason: 'User corrected information',
      tags: ['correction', 'fact', ...extractTags(combined)]
    });
    hasMatch = true;
  }

  // 1. 检查身份/个人信息模式（优先级最高，设为 global）
  const identityMatch = matchesAnyPattern(userMessage, CONFIG.autoEncode.identityPatterns);
  if (identityMatch.matched) {
    results.push({
      shouldSave: true,
      type: 'fact',
      importance: 8,
      scope: 'global',
      content: extractContent(userMessage, assistantMessage, 'fact'),
      reason: 'Personal identity information',
      tags: ['identity', 'personal']
    });
    hasMatch = true;
  }
  
  // 1.5. 检查计划/目标模式
  if (!hasMatch) {
    const goalMatch = matchesAnyPattern(userMessage, CONFIG.autoEncode.goalPatterns);
    if (goalMatch.matched) {
      results.push({
        shouldSave: true,
        type: 'event',
        importance: 6,
        scope: 'local',
        content: extractContent(userMessage, assistantMessage, 'event'),
        reason: 'User plan/goal detected',
        tags: ['plan', 'goal', ...extractTags(combined)]
      });
      hasMatch = true;
    }
  }
  
  // 1.6. 检查定义模式
  if (!hasMatch) {
    const defMatch = matchesAnyPattern(combined, CONFIG.autoEncode.definitionPatterns);
    if (defMatch.matched) {
      results.push({
        shouldSave: true,
        type: 'fact',
        importance: 6,
        scope: 'local',
        content: extractContent(userMessage, assistantMessage, 'fact'),
        reason: 'Concept definition detected',
        tags: ['definition', 'knowledge', ...extractTags(combined)]
      });
      hasMatch = true;
    }
  }

  // 2. 检查规则模式
  if (!hasMatch) {
    const ruleMatch = matchesAnyPattern(userMessage, CONFIG.autoEncode.rulePatterns);
    if (ruleMatch.matched) {
      const scope = detectScope(userMessage);
      const importance = detectImportance(userMessage, 'rule');
      results.push({
        shouldSave: true,
        type: 'rule',
        importance,
        scope,
        content: extractContent(userMessage, assistantMessage, 'rule'),
        reason: 'User expressed preference/rule',
        tags: extractTags(combined)
      });
      hasMatch = true;
    }
  }
  
  // 3. 检查项目信息模式
  if (!hasMatch) {
    const projectMatch = matchesAnyPattern(userMessage, CONFIG.autoEncode.projectPatterns);
    if (projectMatch.matched) {
      results.push({
        shouldSave: true,
        type: 'fact',
        importance: 5,
        scope: 'local',
        content: extractContent(userMessage, assistantMessage, 'fact'),
        reason: 'Project-specific information',
        tags: ['project', ...extractTags(combined)]
      });
      hasMatch = true;
    }
  }
  
  // 4. 检查事件模式
  if (!hasMatch) {
    const eventMatch = matchesAnyPattern(combined, CONFIG.autoEncode.eventPatterns);
    if (eventMatch.matched) {
      const importance = detectImportance(combined, 'event');
      results.push({
        shouldSave: true,
        type: 'event',
        importance,
        scope: 'local',
        content: extractContent(userMessage, assistantMessage, 'event'),
        reason: 'Significant event detected',
        tags: extractTags(combined)
      });
      hasMatch = true;
    }
  }
  
  // 5. 检查事实模式（最后检查，避免误触发）
  if (!hasMatch) {
    const factMatch = matchesAnyPattern(combined, CONFIG.autoEncode.factPatterns);
    if (factMatch.matched) {
      results.push({
        shouldSave: true,
        type: 'fact',
        importance: detectImportance(combined, 'fact'),
        scope: 'local',
        content: extractContent(userMessage, assistantMessage, 'fact'),
        reason: 'Technical/config information detected',
        tags: extractTags(combined)
      });
    }
  }
  
  return results;
}

// === 核心：记忆存储 ===
interface MemoryOptions {
  tags?: string[];
  scope?: "global" | "local";
  projectId?: string;
  parentId?: string;
  changeReason?: string;
  source?: string;
  type?: "fact" | "event" | "rule";
  importance?: number;
}

async function saveMemory(content: string, options: MemoryOptions = {}): Promise<string> {
  const database = await initDB();
  const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  
  const scope = options.scope || "local";
  const projectId = scope === "local" ? (options.projectId || "unknown") : null;
  const tagsStr = options.tags?.length ? options.tags.map(t => t.toLowerCase()).join(",") : null;
  
  const type = options.type || "fact";
  let importance = options.importance || 1;
  let decayRate = CONFIG.defaultDecayRate;

  if (type === 'rule') {
    importance = Math.max(importance, 5); 
    decayRate = 0.01;
  }
  if (importance >= 8) {
    decayRate = 0.0;
  }

  // 检查是否已有高度相似的记忆（去重）
  const existing = await searchMemoriesInternal(content, projectId || "", 1, null, true);
  if (existing.length > 0 && existing[0].similarity > 0.85) {
    // 非常相似，只更新访问计数而不创建新记忆
    database.prepare(`
      UPDATE memories SET access_count = access_count + 1, last_accessed_at = ?
      WHERE id = ?
    `).run(now, existing[0].id);
    return existing[0].id;
  }

  if (options.parentId) {
    database.prepare(`
      UPDATE memories 
      SET status = 'archived', updated_at = ?, change_reason = ?
      WHERE id = ?
    `).run(now, options.changeReason || "Evolved", options.parentId);
    
    database.prepare(`
      INSERT OR IGNORE INTO memory_links (source_id, target_id, type, strength, created_at)
      SELECT ?, target_id, type, strength, ? FROM memory_links WHERE source_id = ?
    `).run(id, now, options.parentId);
  }

  const embedding = await getEmbedding(content, 'document');
  const embeddingBuffer = Buffer.from(embedding.buffer);

  database.prepare(`
    INSERT INTO memories (
      id, content, tags, scope, project_id, status, parent_id, source, 
      type, importance, decay_rate,
      created_at, updated_at, last_accessed_at
    ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, content, tagsStr, scope, projectId, options.parentId || null, options.source || "user_explicit",
    type, importance, decayRate,
    now, now, now
  );

  database.prepare(`
    INSERT INTO vec_memories (memory_id, embedding) VALUES (?, ?)
  `).run(id, embeddingBuffer);

  // 自动连接
  if (!options.parentId) {
    try {
      const similar = await searchMemoriesInternal(content, projectId || "", 3, null, true);
      for (const mem of similar) {
        if (mem.id !== id && mem.similarity > 0.7) {
          const strength = Math.min(1.0, mem.similarity * 0.8);
          
          // Link New -> Old
          database.prepare(`
            INSERT OR IGNORE INTO memory_links (source_id, target_id, type, strength, created_at)
            VALUES (?, ?, 'auto_association', ?, ?)
          `).run(id, mem.id, strength, now);

          // Link Old -> New (Bidirectional)
          database.prepare(`
            INSERT OR IGNORE INTO memory_links (source_id, target_id, type, strength, created_at)
            VALUES (?, ?, 'auto_association', ?, ?)
          `).run(mem.id, id, strength, now);
        }
      }
    } catch(e) {}
  }

  return id;
}

// === 核心：混合检索 + 激活扩散 ===
async function searchMemoriesInternal(
  query: string, 
  currentProjectId: string, 
  limit: number = CONFIG.maxMemories,
  targetProjectId: string | null = null,
  disableSpread: boolean = false
) {
  const database = await initDB();
  const queryEmbedding = await getEmbedding(query, 'query');
  const queryBuffer = Buffer.from(queryEmbedding.buffer);
  const now = Date.now();

  const vecResults = database.prepare(`
    SELECT memory_id, distance
    FROM vec_memories
    WHERE embedding MATCH ? AND k = ?
    ORDER BY distance
  `).all(queryBuffer, limit * 5);

  if (vecResults.length === 0) return [];

  const ids = vecResults.map((r: any) => r.memory_id);
  const placeholders = ids.map(() => "?").join(",");

  const rows = database.prepare(`
    SELECT * FROM memories 
    WHERE id IN (${placeholders})
    AND status = 'active'
  `).all(...ids);

  const effectiveProjectId = targetProjectId || currentProjectId;
  
  const results = await Promise.all(rows.map(async (row: any) => {
    const vec = vecResults.find((v: any) => v.memory_id === row.id);
    const distance = vec ? vec.distance : 1.0;
    const similarity = Math.max(0, 1 - (distance * distance / 2));
    
    const daysElapsed = (now - (row.last_accessed_at || row.created_at)) / (1000 * 60 * 60 * 24);
    const retention = 1 / (1 + (row.decay_rate || 0.05) * daysElapsed);
    
    const importanceBoost = 1 + (row.importance || 1) * 0.1; 
    const accessBoost = 1 + Math.log1p(row.access_count || 0) * 0.1;

    let contextFactor = 1.0;
    const isLocalContext = (row.scope === 'local' && row.project_id === effectiveProjectId);
    const isGlobal = (row.scope === 'global');
    
    if (!isGlobal && !isLocalContext) {
      const activity = await getProjectActivity(row.project_id);
      
      if (activity === 'recent') {
        contextFactor = CONFIG.context.recentProjectFactor;
      } else if (activity === 'stale') {
        contextFactor = CONFIG.context.staleProjectFactor;
      } else {
        if (similarity > 0.85 && (row.importance || 0) >= 7) {
          contextFactor = CONFIG.context.alienBreakthroughFactor;
        } else {
          contextFactor = 0.2;
        }
      }
    }

    const finalScore = similarity * retention * importanceBoost * accessBoost * contextFactor;

    return {
      ...row,
      distance,
      similarity,
      retention,
      contextFactor,
      finalScore,
      isAlien: (!isGlobal && !isLocalContext),
      spreadSource: null as string | null
    };
  }));

  // 激活扩散
  let spreadResults: any[] = [];
  if (!disableSpread && results.length > 0) {
    const topIds = results
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 2)
      .map(r => r.id);
    
    if (topIds.length > 0) {
      const linkPlaceholders = topIds.map(() => "?").join(",");
      const links = database.prepare(`
        SELECT source_id, target_id, strength FROM memory_links 
        WHERE source_id IN (${linkPlaceholders}) AND strength >= ?
      `).all(...topIds, CONFIG.spreading.minLinkStrength);
      
      const linkedIds = links
        .map((l: any) => l.target_id)
        .filter((id: string) => !ids.includes(id));
      
      if (linkedIds.length > 0) {
        const linkedPlaceholders = linkedIds.map(() => "?").join(",");
        const linkedRows = database.prepare(`
          SELECT * FROM memories 
          WHERE id IN (${linkedPlaceholders}) AND status = 'active'
        `).all(...linkedIds);
        
        for (const row of linkedRows) {
          const link = links.find((l: any) => l.target_id === row.id);
          const sourceResult = results.find(r => r.id === link?.source_id);
          
          if (sourceResult && link) {
            const spreadScore = sourceResult.finalScore * link.strength * CONFIG.spreading.spreadDecay;
            spreadResults.push({
              ...row,
              distance: 999,
              similarity: 0,
              retention: 1,
              contextFactor: 1,
              finalScore: spreadScore,
              isAlien: row.scope === 'local' && row.project_id !== effectiveProjectId,
              spreadSource: link.source_id
            });
          }
        }
      }
    }
  }

  const allResults = [...results, ...spreadResults]
    .filter(r => r.finalScore > 0.25)
    .sort((a, b) => b.finalScore - a.finalScore);
  
  const seen = new Set<string>();
  const uniqueResults = allResults.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  }).slice(0, limit);

  // 更新访问统计
  const hitIds = uniqueResults.filter(r => !r.spreadSource).map(r => r.id);
  if (hitIds.length > 0) {
    const updatePlaceholders = hitIds.map(() => "?").join(",");
    database.prepare(`
      UPDATE memories 
      SET access_count = access_count + 1, last_accessed_at = ?
      WHERE id IN (${updatePlaceholders})
    `).run(now, ...hitIds);
  }

  return uniqueResults;
}

async function searchMemories(query: string, projectId: string, limit: number = CONFIG.maxMemories) {
  return searchMemoriesInternal(query, projectId, limit, null, false);
}

// === V5.5.0 启动唤醒与智能检索 ===

// 估算 Token 数量（简易版：中文约 0.5 token/字，英文约 0.25 token/字）
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars * 0.7 + otherChars * 0.3);
}

// 获取启动唤醒记忆（核心记忆 + 最近 24h）
async function getStartupMemories(projectId: string): Promise<any[]> {
  if (!CONFIG.startupRecall.enabled) return [];
  
  const database = await initDB();
  const now = Date.now();
  const lookbackMs = CONFIG.startupRecall.lookbackHours * 60 * 60 * 1000;
  const cutoffTime = now - lookbackMs;
  
  // 1. 获取核心记忆（高重要性，不限项目）
  const coreMemories = database.prepare(`
    SELECT *, 'core' as recall_type FROM memories 
    WHERE status = 'active' 
    AND importance >= ?
    ORDER BY importance DESC, access_count DESC
    LIMIT 20
  `).all(CONFIG.startupRecall.minImportance);
  
  // 2. 获取最近 24h 的记忆（包括所有项目，因为用户可能在不同目录工作）
  const recentMemories = database.prepare(`
    SELECT *, 'recent' as recall_type FROM memories 
    WHERE status = 'active' 
    AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(cutoffTime);
  
  // 3. 合并去重
  const seen = new Set<string>();
  const combined: any[] = [];
  
  // 核心记忆优先
  for (const mem of coreMemories) {
    if (!seen.has(mem.id)) {
      seen.add(mem.id);
      combined.push(mem);
    }
  }
  
  // 然后是近期记忆
  for (const mem of recentMemories) {
    if (!seen.has(mem.id)) {
      seen.add(mem.id);
      combined.push(mem);
    }
  }
  
  // 4. 应用硬限制
  return combined.slice(0, CONFIG.startupRecall.maxMemories);
}

// 用本地 LLM 压缩启动记忆为摘要
async function summarizeStartupMemoriesWithLLM(memories: any[]): Promise<string | null> {
  if (!CONFIG.localLLM.enabled || !CONFIG.startupRecall.useLLMSummary) return null;
  
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) return null;
  
  try {
    // 格式化记忆列表
    const memoryList = memories.map((m, i) => {
      const typeIcon = m.type === 'rule' ? '📜' : (m.type === 'event' ? '📅' : '💡');
      const recallType = m.recall_type === 'core' ? '[核心]' : '[近期]';
      return `${i + 1}. ${typeIcon} ${recallType} ${m.content}`;
    }).join('\n');
    
    const prompt = `你是一个记忆整理助手。请将以下记忆压缩成一段简洁的"晨报摘要"，保留最重要的信息。

## 原始记忆列表
${memoryList}

## 要求
1. 用简洁的语言概括核心信息
2. 保留用户的偏好规则和重要事件
3. 输出长度控制在 300 字以内
4. 使用用户的语言（中文/英文）

## 输出格式
直接输出摘要文本，不要加任何前缀或解释。`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.localLLM.timeout * 2); // 给压缩任务更多时间
    
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.localLLM.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: CONFIG.startupRecall.summaryMaxTokens,
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const summary = data.response?.trim();
    
    return summary || null;
  } catch (e) {
    return null;
  }
}

// V5.7.0 后台代谢：用 LLM 总结记忆簇
async function summarizeClusterWithLLM(memories: any[]): Promise<string | null> {
  if (!CONFIG.localLLM.enabled) return null;
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) return null;

  try {
    const memoryList = memories.map(m => `- ${m.content}`).join('\n');
    const prompt = `你是一个记忆整理专家。请将以下相关的碎片记忆整合成一条完整的、高质量的记忆。

## 记忆碎片
${memoryList}

## 要求
1. 提取核心事实、规则或事件
2. 去除重复和琐碎细节
3. 生成一条精炼的总结（建议 50-100 字）
4. 如果包含冲突信息，以最新的为准

## 输出
直接输出整理后的内容，不要解释。`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.localLLM.timeout);
    
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.localLLM.model,
        prompt: prompt,
        stream: false,
        options: { temperature: 0, num_predict: 200 }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response?.trim() || null;
  } catch (e) {
    return null;
  }
}

// V5.5.0 用本地 LLM 增强查询（理解短消息的真实意图）
async function enhanceQueryWithLLM(
  userMessage: string,
  recentHistory: Array<{role: string, content: string}>
): Promise<string | null> {
  if (!CONFIG.localLLM.enabled || !CONFIG.ragSearch.queryEnhancement) return null;
  
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) return null;
  
  try {
    // 格式化最近的对话历史
    const historyText = recentHistory.slice(-6).map(msg => {
      const role = msg.role === 'user' ? '用户' : '助手';
      // 截断太长的消息
      const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
      return `${role}: ${content}`;
    }).join('\n');
    
    const prompt = `分析用户的最新消息，结合对话上下文，提取检索关键词。

## 对话历史
${historyText}

## 用户最新消息
${userMessage}

## 任务
1. 理解用户真正想问/说的是什么
2. 提取 3-5 个用于检索记忆库的关键词
3. 关键词应该覆盖主题、技术栈、操作类型等

## 输出格式（直接输出，不要解释）
关键词1 关键词2 关键词3`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时，保持快速
    
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.localLLM.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 50, // 只需要几个关键词
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const keywords = data.response?.trim();
    
    if (keywords && keywords.length > 0 && keywords.length < 200) {
      console.log(`[Hippocampus] Query enhanced: "${userMessage}" -> "${keywords}"`);
      return keywords;
    }
    
    return null;
  } catch (e) {
    // 超时或其他错误，静默返回 null
    return null;
  }
}

// 用本地 LLM 对搜索结果进行重排序
async function rerankMemoriesWithLLM(
  query: string, 
  memories: any[], 
  outputLimit: number = CONFIG.ragSearch.rerankOutputLimit
): Promise<any[] | null> {
  if (!CONFIG.localLLM.enabled || !CONFIG.ragSearch.rerankWithLLM) return null;
  
  const isAvailable = await checkOllamaAvailable();
  if (!isAvailable) return null;
  
  try {
    // 格式化记忆列表（带编号）
    const memoryList = memories.slice(0, 50).map((m, i) => {
      return `[${i}] ${m.content}`;
    }).join('\n');
    
    const prompt = `你是一个记忆检索助手。根据用户的问题，从以下记忆列表中选出最相关的 ${outputLimit} 条。

## 用户问题
${query}

## 记忆列表
${memoryList}

## 要求
1. 选择与问题最相关的记忆
2. 按相关度从高到低排序
3. 只输出编号，用逗号分隔
4. 例如：0,3,7,2,5

## 输出
直接输出编号列表：`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.localLLM.timeout);
    
    const response = await fetch(`${CONFIG.localLLM.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CONFIG.localLLM.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0,
          num_predict: 100,
        }
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const text = data.response?.trim() || '';
    
    // 解析编号列表
    const indices = text.match(/\d+/g)?.map(Number) || [];
    const validIndices = indices.filter(i => i >= 0 && i < memories.length);
    
    if (validIndices.length === 0) return null;
    
    // 按 LLM 排序返回记忆
    const reranked = validIndices.slice(0, outputLimit).map(i => memories[i]);
    return reranked;
  } catch (e) {
    return null;
  }
}

// 格式化记忆为注入文本（带 Token 限制）
function formatMemoriesForInjection(
  memories: any[], 
  maxTokens: number = CONFIG.startupRecall.maxTokens
): string {
  if (memories.length === 0) return '';
  
  let totalTokens = 0;
  const lines: string[] = [];
  
  for (const m of memories) {
    const typeMark = m.type === 'rule' ? 'RULE' : 'INFO';
    const impMark = (m.importance || 0) > 5 ? '★' : '';
    const coreMark = m.recall_type === 'core' ? ' [CORE]' : '';
    const line = `- [${typeMark}${impMark}] ${m.content}${coreMark} (ID:${m.id})`;
    
    const lineTokens = estimateTokens(line);
    if (totalTokens + lineTokens > maxTokens) break;
    
    totalTokens += lineTokens;
    lines.push(line);
  }
  
  return lines.join('\n');
}

// === 睡眠整理 ===
interface ConsolidationResult {
  merged: number;
  promoted: number;
  pruned: number;
  newLinks: number;
}

async function performConsolidation(projectId?: string): Promise<ConsolidationResult> {
  const database = await initDB();
  const now = Date.now();
  const result: ConsolidationResult = { merged: 0, promoted: 0, pruned: 0, newLinks: 0 };
  
  const maxAge = now - CONFIG.consolidation.fragmentMaxAgeDays * 24 * 60 * 60 * 1000;
  
  let fragmentQuery = `
    SELECT id, content, project_id, type, importance, access_count, created_at
    FROM memories 
    WHERE status = 'active' 
    AND type IN ('event', 'fact') 
    AND importance < 5
    AND created_at > ?
  `;
  const queryParams: any[] = [maxAge];
  
  if (projectId) {
    fragmentQuery += ` AND project_id = ?`;
    queryParams.push(projectId);
  }
  fragmentQuery += ` ORDER BY created_at DESC LIMIT 50`;
  
  const fragments = database.prepare(fragmentQuery).all(...queryParams);
  
  if (fragments.length < CONFIG.consolidation.minFragmentsForMerge) {
    return result;
  }
  
  const embeddings: Map<string, Float32Array> = new Map();
  for (const frag of fragments) {
    const embedding = await getEmbedding(frag.content, 'document');
    embeddings.set(frag.id, embedding);
  }
  
  const clusters: any[][] = [];
  const used = new Set<string>();
  
  for (const frag of fragments) {
    if (used.has(frag.id)) continue;
    
    const cluster = [frag];
    used.add(frag.id);
    const fragEmb = embeddings.get(frag.id)!;
    
    for (const other of fragments) {
      if (used.has(other.id)) continue;
      if (frag.project_id !== other.project_id) continue;
      
      const otherEmb = embeddings.get(other.id)!;
      const similarity = cosineSimilarity(fragEmb, otherEmb);
      
      if (similarity > CONFIG.consolidation.similarityThreshold) {
        cluster.push(other);
        used.add(other.id);
      }
    }
    
    if (cluster.length >= CONFIG.consolidation.minFragmentsForMerge) {
      clusters.push(cluster);
    }
  }
  
  for (const cluster of clusters) {
    const contents = cluster.map(c => c.content);
    let mergedContent: string;
    
    // V5.7.0: 尝试使用 LLM 进行智能融合 (Metabolism)
    const llmSummary = await summarizeClusterWithLLM(cluster);
    
    if (llmSummary) {
      mergedContent = `[LLM Consolidated] ${llmSummary}`;
    } else {
      // Fallback: 简单的文本拼接
      if (contents.length <= 3) {
        mergedContent = `[Consolidated] ${contents.join(' | ')}`;
      } else {
        mergedContent = `[Consolidated from ${contents.length} items] ${contents.sort((a, b) => b.length - a.length)[0]}`;
      }
    }
    
    const avgImportance = Math.ceil(cluster.reduce((sum, c) => sum + (c.importance || 1), 0) / cluster.length) + 1;
    
    const newId = await saveMemory(mergedContent, {
      type: 'fact',
      importance: Math.min(avgImportance, 7),
      scope: 'local',
      projectId: cluster[0].project_id,
      source: 'consolidation_v5.7'
    });
    
    const fragIds = cluster.map(c => c.id);
    const archivePlaceholders = fragIds.map(() => "?").join(",");
    database.prepare(`
      UPDATE memories SET status = 'archived', change_reason = 'Consolidated into ${newId}'
      WHERE id IN (${archivePlaceholders})
    `).run(...fragIds);
    
    for (const fragId of fragIds) {
      database.prepare(`
        INSERT OR IGNORE INTO memory_links (source_id, target_id, type, strength, created_at)
        VALUES (?, ?, 'consolidation', 0.8, ?)
      `).run(newId, fragId, now);
      result.newLinks++;
    }
    
    result.merged += cluster.length;
  }
  
  const promoted = database.prepare(`
    UPDATE memories 
    SET importance = MIN(importance + 2, 10), updated_at = ?
    WHERE status = 'active' 
    AND type = 'event' 
    AND access_count >= ?
    AND importance < 8
  `).run(now, CONFIG.consolidation.autoPromoteAccessCount);
  result.promoted = promoted.changes;
  
  return result;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function consolidateMemories(projectId: string) {
  const database = await initDB();
  const rows = database.prepare(`
    SELECT id, content, type, importance, access_count, created_at FROM memories
    WHERE project_id = ? AND scope = 'local' AND status = 'active'
    AND type IN ('event', 'fact') AND importance < 5
    ORDER BY created_at DESC LIMIT 20
  `).all(projectId);
  
  return rows;
}

// === 插件导出 ===
export default function (pi: any) {
  
  // 当前会话的对话缓存（内存中）
  let sessionBuffer: Array<{role: string, content: string}> = [];
  let currentProjectId: string = "";
  
  // V5.5.0 启动唤醒缓存
  let startupRecallContent: string = "";
  let startupRecallReady: boolean = false;  // 标记启动唤醒是否完成
  
  // Tool 1: Save Memory
  pi.registerTool({
    name: "save_memory",
    description: "存入长期记忆。像人脑一样，支持区分事实/规则/经历，并标记重要性。",
    parameters: Type.Object({
      content: Type.String({ description: "记忆内容" }),
      type: Type.Optional(Type.String({ description: "'fact'(事实), 'rule'(规则/偏好), 'event'(经历/事件)。默认为 fact" })),
      importance: Type.Optional(Type.Number({ description: "重要性 1-10。1=琐事, 10=核心原则。默认为 1" })),
      tags: Type.Array(Type.String(), { default: [] }),
      scope: Type.Optional(Type.String({ description: "'global' 或 'local'" })),
      previous_memory_id: Type.Optional(Type.String({ description: "如果是修正旧记忆，传入旧ID" })),
      change_reason: Type.Optional(Type.String())
    }),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      try {
        const projectId = getProjectHash(ctx.cwd);
        const memId = await saveMemory(params.content, {
          tags: params.tags,
          scope: params.scope || "local",
          projectId: projectId,
          parentId: params.previous_memory_id,
          changeReason: params.change_reason,
          type: params.type as any,
          importance: params.importance
        });
        
        return { 
          content: [{ type: "text", text: `✓ Memory solidified (ID: ${memId})\nType: ${params.type||'fact'} | Importance: ${params.importance||1}` }], 
          details: { id: memId } 
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
      }
    }
  });

  // Tool 2: Search Memory
  pi.registerTool({
    name: "search_memory",
    description: "回忆。基于语义相似度、时间衰减、重要性和访问频率进行混合检索，支持激活扩散。",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Number()),
      project: Type.Optional(Type.String({ description: "指定项目名称进行跨项目搜索" }))
    }),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      const currentProjectId = getProjectHash(ctx.cwd);
      
      let targetProjectId: string | null = null;
      if (params.project) {
        const found = await findProjectByName(params.project);
        if (found) {
          targetProjectId = found.id;
        } else {
          return { content: [{ type: "text", text: `⚠️ Project '${params.project}' not found. Please check the name using 'list_projects'.` }] };
        }
      }
      
      const results = await searchMemoriesInternal(
        params.query, 
        currentProjectId, 
        params.limit || CONFIG.maxMemories,
        targetProjectId,
        false
      );
      
      // 更新状态栏
      if (results.length > 0 && ctx.ui) {
        lastRecallCount = results.length;
        updateStatusBar(ctx);
      }
      
      if (results.length === 0) return { content: [{ type: "text", text: "No relevant memories found." }] };

      const allMemories = results.map((r: any) => {
        let icon = r.scope === 'global' ? '🌍' : '🏠';
        if (r.isAlien) icon = '🛸';
        if (r.spreadSource) icon = '🔗';
        const typeIcon = r.type === 'rule' ? '📜' : (r.type === 'event' ? '📅' : '💡');
        const score = Math.round(r.finalScore * 100);
        return `[${r.id}] ${icon}${typeIcon} (Act:${score}%) ${r.content}`;
      }).join("\n");

      const summary = `🧠 Recalled ${results.length} memories`;

      return { 
        content: [{ type: "text", text: `${summary}\n${allMemories}` }], 
        details: { results, summary, count: results.length } 
      };
    },
    renderResult(result: any, options: any, theme: any) {
      const count = result.details?.count || 0;
      const summary = result.details?.summary || `🧠 Recalled ${count} memories`;
      return new Text(theme.fg("accent", summary), 0, 0);
    }
  });

  // Tool 3: Connect Memories
  pi.registerTool({
    name: "connect_memories",
    description: "手动建立两条记忆之间的关联（突触连接）。",
    parameters: Type.Object({
      source_id: Type.String(),
      target_id: Type.String(),
      relationship: Type.String({ description: "关联描述，如 'causes', 'contradicts', 'relates_to'" }),
      strength: Type.Optional(Type.Number({ description: "0.1 - 1.0" }))
    }),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      const db = await initDB();
      db.prepare(`
        INSERT OR REPLACE INTO memory_links (source_id, target_id, type, strength, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(params.source_id, params.target_id, params.relationship, params.strength || 1.0, Date.now());
      return { content: [{ type: "text", text: `✓ Synapse established: ${params.source_id} <--> ${params.target_id}` }] };
    }
  });

  // Tool 4: Consolidate
  pi.registerTool({
    name: "consolidate_memories",
    description: "触发后台记忆整理（代谢）。自动合并相似的碎片记忆，并提升高频记忆的重要性。这通常在会话结束时自动执行，但也可以手动触发。",
    parameters: Type.Object({}),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      const projectId = getProjectHash(ctx.cwd);
      
      // 直接执行后台整理，而不是列出碎片
      const result = await performConsolidation(projectId);
      
      if (result.merged === 0 && result.promoted === 0) {
        return { content: [{ type: "text", text: "Memory is clean. No consolidation needed right now." }] };
      }
      
      return { 
        content: [{ type: "text", text: `✓ Background Consolidation Complete:\n- Merged: ${result.merged} fragments\n- Promoted: ${result.promoted} important memories\n- New Links: ${result.newLinks} synapses created` }] 
      };
    }
  });

  // Tool 5: List Projects
  pi.registerTool({
    name: "list_projects",
    description: "列出所有已知的项目及其最近活跃时间。",
    parameters: Type.Object({}),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      const database = await initDB();
      const projects = database.prepare(`
        SELECT name, path, last_active_at FROM projects 
        ORDER BY last_active_at DESC LIMIT 20
      `).all();
      
      if (projects.length === 0) {
        return { content: [{ type: "text", text: "No projects registered yet." }] };
      }
      
      const list = projects.map((p: any) => {
        const daysAgo = Math.floor((Date.now() - p.last_active_at) / (1000 * 60 * 60 * 24));
        return `- **${p.name}** (${daysAgo}d ago) → ${p.path}`;
      }).join("\n");
      
      return { content: [{ type: "text", text: `📁 Known Projects:\n${list}` }] };
    }
  });

  // Tool 6: Memory Status (V5.5.0 Enhanced)
  pi.registerTool({
    name: "memory_status",
    description: "查看记忆系统状态：本地 LLM 可用性、记忆统计、配置信息。",
    parameters: Type.Object({}),
    async execute(id: string, params: any, signal: any, onUpdate: any, ctx: any) {
      // Force refresh Ollama status
      ollamaAvailable = null;

      const database = await initDB();
      const projectId = getProjectHash(ctx.cwd);
      
      // 统计信息
      const totalMemories = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active'`).get();
      const localMemories = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active' AND project_id = ?`).get(projectId);
      const globalMemories = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active' AND scope = 'global'`).get();
      const ruleCount = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active' AND type = 'rule'`).get();
      const factCount = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active' AND type = 'fact'`).get();
      const eventCount = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE status = 'active' AND type = 'event'`).get();
      const linkCount = database.prepare(`SELECT COUNT(*) as count FROM memory_links`).get();
      const autoEncoded = database.prepare(`SELECT COUNT(*) as count FROM memories WHERE source IN ('auto_encode', 'local_llm')`).get();
      
      // 检测本地 LLM
      const ollamaStatus = await checkOllamaAvailable();
      
      let status = `## 🧠 Hippocampus V5.6.0 Status\n\n`;
      
      // 本地 LLM 状态
      status += `### 🤖 Local LLM Analyzer\n`;
      if (CONFIG.localLLM.enabled) {
        if (ollamaStatus) {
          status += `| Setting | Value |\n|---------|-------|\n`;
          status += `| Status | ✅ **Online** |\n`;
          status += `| Provider | ${CONFIG.localLLM.provider} |\n`;
          status += `| Model | \`${CONFIG.localLLM.model}\` |\n`;
          status += `| Endpoint | ${CONFIG.localLLM.baseUrl} |\n`;
          status += `| Timeout | ${CONFIG.localLLM.timeout}ms |\n`;
          status += `| Temperature | ${CONFIG.localLLM.temperature} |\n`;
          status += `| Prompt Style | ${CONFIG.localLLM.promptStyle} |\n`;
          status += `| Language | ${CONFIG.localLLM.language} |\n`;
          status += `| Min Importance | ${CONFIG.localLLM.minImportanceToSave} |\n`;
        } else {
          status += `- Status: ⚠️ **Offline** (Ollama not detected at ${CONFIG.localLLM.baseUrl})\n`;
          status += `- Expected Model: \`${CONFIG.localLLM.model}\`\n`;
          status += `- Fallback: ${CONFIG.localLLM.fallbackToRegex ? '✅ Regex matching' : '❌ Disabled'}\n`;
          status += `\n**To enable:** \`ollama serve\` and \`ollama pull ${CONFIG.localLLM.model}\`\n`;
        }
      } else {
        status += `- Status: ⏸️ **Disabled** (CONFIG.localLLM.enabled = false)\n`;
        status += `- Mode: Regex matching only\n`;
      }
      
      // 记忆统计
      status += `\n### 📊 Memory Statistics\n`;
      status += `| Metric | Count |\n|--------|-------|\n`;
      status += `| **Total Active** | **${totalMemories.count}** |\n`;
      status += `| This Project | ${localMemories.count} |\n`;
      status += `| Global | ${globalMemories.count} |\n`;
      status += `| Rules 📜 | ${ruleCount.count} |\n`;
      status += `| Facts 💡 | ${factCount.count} |\n`;
      status += `| Events 📅 | ${eventCount.count} |\n`;
      status += `| Synapse Links 🔗 | ${linkCount.count} |\n`;
      status += `| Auto-Encoded | ${autoEncoded.count} |\n`;
      
      // V5.6.0 启动唤醒配置
      status += `\n### 🌅 Startup Recall (V5.6.0)\n`;
      status += `| Setting | Value |\n|---------|-------|\n`;
      status += `| Enabled | ${CONFIG.startupRecall.enabled ? '✅' : '❌'} |\n`;
      status += `| Lookback Hours | ${CONFIG.startupRecall.lookbackHours}h |\n`;
      status += `| Min Importance | ${CONFIG.startupRecall.minImportance} |\n`;
      status += `| Max Tokens | ${CONFIG.startupRecall.maxTokens} |\n`;
      status += `| Max Memories | ${CONFIG.startupRecall.maxMemories} |\n`;
      status += `| LLM Summary | ${CONFIG.startupRecall.useLLMSummary ? '✅' : '❌'} |\n`;
      
      // V5.6.0 智能检索配置
      status += `\n### 🔍 RAG Search (V5.6.0)\n`;
      status += `| Setting | Value |\n|---------|-------|\n`;
      status += `| Enabled | ${CONFIG.ragSearch.enabled ? '✅' : '❌'} |\n`;
      status += `| Vector Search Limit | ${CONFIG.ragSearch.vectorSearchLimit} |\n`;
      status += `| LLM Rerank | ${CONFIG.ragSearch.rerankWithLLM ? '✅' : '❌'} |\n`;
      status += `| Rerank Output | ${CONFIG.ragSearch.rerankOutputLimit} |\n`;
      status += `| Hard Limit (No LLM) | ${CONFIG.ragSearch.hardLimitNoLLM} |\n`;
      status += `| Include Global Core | ${CONFIG.ragSearch.includeGlobalCore ? '✅' : '❌'} |\n`;
      
      // 配置信息
      status += `\n### ⚙️ Core Configuration\n`;
      status += `| Setting | Value |\n|---------|-------|\n`;
      status += `| Embedding Model | \`${CONFIG.embeddingModel}\` |\n`;
      status += `| Vector Dimensions | ${CONFIG.embeddingDimensions} |\n`;
      status += `| Decay Rate | ${CONFIG.defaultDecayRate}/day |\n`;
      status += `| Max Memories | ${CONFIG.maxMemories} |\n`;
      
      // 自动编码配置
      status += `\n### 🔄 Auto-Encode (Regex Fallback)\n`;
      status += `| Setting | Value |\n|---------|-------|\n`;
      status += `| Enabled | ${CONFIG.autoEncode.enabled ? '✅' : '❌'} |\n`;
      status += `| Min Message Length | ${CONFIG.autoEncode.minMessageLength} chars |\n`;
      status += `| Rule Patterns | ${CONFIG.autoEncode.rulePatterns.length} |\n`;
      status += `| Fact Patterns | ${CONFIG.autoEncode.factPatterns.length} |\n`;
      status += `| Event Patterns | ${CONFIG.autoEncode.eventPatterns.length} |\n`;
      
      return { content: [{ type: "text", text: status }] };
    }
  });

  // === 事件钩子 ===
  
  // before_agent_start: 自动检索 + 潜意识注入
  pi.on("before_agent_start", async (event: any, ctx: any) => {
    const projectId = getProjectHash(ctx.cwd);
    currentProjectId = projectId;
    const prompt = event.prompt;
    
    await registerProject(projectId, ctx.cwd);
    
    // 缓存用户输入
    if (prompt && prompt.length > 0) {
      sessionBuffer.push({ role: 'user', content: prompt });
    }
    
    // V5.5.0 等待启动唤醒完成（最多等待 2 秒，因为现在是非阻塞设计，应该很快）
    if (!startupRecallReady) {
      const startWait = Date.now();
      while (!startupRecallReady && (Date.now() - startWait) < 2000) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // V5.5.0 智能 RAG 检索
    let contextSection = "";
    
    if (CONFIG.ragSearch.enabled && prompt && prompt.trim().length > 0) {
      try {
        // 检测是否有跨项目搜索需求
        let targetProject: string | null = null;
        const projectMatch = prompt.match(/在\s*(\S+?)\s*(项目|那边|里面)/i);
        if (projectMatch) {
          const found = await findProjectByName(projectMatch[1]);
          if (found) targetProject = found.id;
        }
        
        // V5.5.0 查询增强：对短消息用 LLM 理解真实意图
        let searchQuery = prompt;
        const ollamaOnline = await checkOllamaAvailable();
        
        if (ollamaOnline && CONFIG.ragSearch.queryEnhancement && 
            prompt.trim().length < CONFIG.ragSearch.queryEnhancementThreshold) {
          // 短消息，需要 LLM 帮助理解
          const enhanced = await enhanceQueryWithLLM(prompt, sessionBuffer);
          if (enhanced) {
            searchQuery = enhanced;
          }
        }
        
        // 第一阶段：向量搜索 Top N
        const vectorResults = await searchMemoriesInternal(
          searchQuery, 
          projectId, 
          CONFIG.ragSearch.vectorSearchLimit,  // 默认 100
          targetProject, 
          false
        );
        
        let finalResults: any[] = [];
        
        // 第二阶段：LLM Rerank（如果可用且开启）
        if (ollamaOnline && CONFIG.ragSearch.rerankWithLLM && vectorResults.length > CONFIG.ragSearch.rerankOutputLimit) {
          const reranked = await rerankMemoriesWithLLM(prompt, vectorResults, CONFIG.ragSearch.rerankOutputLimit);
          if (reranked && reranked.length > 0) {
            finalResults = reranked;
          }
        }
        
        // 如果 LLM Rerank 失败或不可用，使用硬截断
        if (finalResults.length === 0) {
          finalResults = vectorResults.slice(0, CONFIG.ragSearch.hardLimitNoLLM);
        }
        
        // 强制混入全局核心记忆
        if (CONFIG.ragSearch.includeGlobalCore) {
          try {
            const db = await initDB();
            const globalCoreResults = db.prepare(`
              SELECT * FROM memories 
              WHERE scope = 'global' AND importance >= ? AND status = 'active'
              ORDER BY importance DESC, access_count DESC 
              LIMIT ?
            `).all(CONFIG.ragSearch.globalCoreMinImportance, CONFIG.ragSearch.globalCoreLimit).map((r: any) => ({
              ...r,
              finalScore: 1.0,
              isCore: true
            }));
            
            // 合并去重（核心记忆优先）
            const seen = new Set(finalResults.map(r => r.id));
            for (const core of globalCoreResults) {
              if (!seen.has(core.id)) {
                finalResults.unshift(core); // 插入到开头
              }
            }
          } catch (e) {}
        }
        
        if (finalResults.length > 0) {
          lastRecallCount = finalResults.length;
          updateStatusBar(ctx);
          contextSection = "\n\n### 🧠 CORTEX RECALL (Auto-retrieved):\n" +
            finalResults.map((m: any) => {
              const typeMark = m.type === 'rule' ? 'RULE' : 'INFO';
              const impMark = (m.importance || 0) > 5 ? '★' : '';
              const spreadMark = m.spreadSource ? ' 🔗' : '';
              const coreMark = m.isCore ? ' [CORE]' : '';
              return `- [${typeMark}${impMark}] ${m.content}${spreadMark}${coreMark} (ID:${m.id})`;
            }).join("\n") +
            "\n\n⚠️ **IMPORTANT**: If the above memories contain information relevant to the user's question, USE THEM DIRECTLY instead of searching files or executing commands. Your memories are your knowledge base.";
        }
      } catch (e) {}
    }
    
    // 合并启动唤醒内容（如果有）
    let startupSection = "";
    if (startupRecallContent) {
      console.log(`[Hippocampus] Injecting startup recall (${startupRecallContent.length} chars)`);
      startupSection = startupRecallContent;
      // 清空，只在第一次对话时注入
      startupRecallContent = "";
    } else {
      console.log(`[Hippocampus] No startup recall content available`);
    }

    // V5.4 增强版潜意识 Prompt - 更强的记忆驱动
    const subconscious = `
### 🧠 HIPPOCAMPUS PROTOCOL V5.4.1 — Your Memory is Your Identity

You possess a **persistent memory system** that survives across sessions. This is what makes you truly useful—you can learn, remember, and evolve.

---

#### 📍 CURRENT CONTEXT
- **Project Hash**: \`${projectId}\`
- **Project Path**: \`${ctx.cwd}\`

---

#### 🛠️ MEMORY TOOLS

| Tool | When to Use |
|------|-------------|
| \`save_memory\` | Store facts, rules, events, or any information worth remembering |
| \`search_memory\` | Recall relevant context (add \`project: "name"\` for cross-project) |
| \`connect_memories\` | Link related memories (builds associative network) |
| \`list_projects\` | See all known projects |

---

#### ⚡ MEMORY ENCODING TRIGGERS — ACT IMMEDIATELY

**🔴 CRITICAL (importance: 8-10, scope: global/local based on context)**
- User says: "不要", "禁止", "must", "never", "always", "永远", "绝对"
- User expresses strong preferences or dislikes
- Security/safety rules, coding standards that should never be violated

**🟠 IMPORTANT (importance: 5-7)**
- User preferences: "我喜欢", "prefer", "习惯", "偏好"
- Lessons learned from debugging: "原来是", "发现", "终于"
- Project-specific conventions or patterns

**🟡 USEFUL (importance: 3-5)**
- Technical facts: versions, configs, paths, URLs, ports
- Completed tasks: "搞定了", "finished", "done", "完成"
- Bug fixes and their solutions

**🟢 CONTEXTUAL (importance: 1-3)**
- General observations, minor notes
- Temporary information (may decay naturally)

---

#### 📝 ENCODING BEST PRACTICES

1. **Be Proactive**: Don't wait to be asked. When you notice valuable information, SAVE IT.

2. **Be Concise**: Good memory content is 50-200 characters. Capture the essence.
   - ❌ "用户说他不喜欢使用 var 关键字因为它会导致作用域问题所以以后都要用 let 或 const"
   - ✅ "禁止使用 var，统一用 let/const（避免作用域问题）"

3. **Choose Correct Type**:
   - \`fact\`: Data, configs, versions → "项目使用 Next.js 14 + TypeScript"
   - \`rule\`: Preferences, standards → "函数不超过20行，超过必须拆分"  
   - \`event\`: What happened → "修复了 OAuth 登录 token 过期问题"

4. **Set Appropriate Scope**:
   - \`global\`: Applies everywhere (coding style, personal preferences)
   - \`local\`: Project-specific (this project's tech stack, this repo's conventions)

5. **Use Tags**: Add relevant tags for better retrieval: ["react", "auth", "bug-fix"]

---

#### 🔗 BUILD CONNECTIONS

When you save a new memory that relates to an existing one, use \`connect_memories\` to link them:
- Bug fix → Connect to the original problem description
- New rule → Connect to the reason/event that triggered it
- Related concepts → Build associative network

---

#### 🤫 SILENCE PROTOCOL

- Execute memory operations **without announcing them** unless the user explicitly asks
- If you save something important the user might want to know about, a simple "✓" suffices
- Never say "I've saved this to memory" or "Let me remember this" — just do it

---

#### 💡 CROSS-PROJECT INTELLIGENCE

When user mentions another project:
1. Detect project name: "在 polymarket 那边", "in the api project"
2. Use \`search_memory\` with \`project: "project_name"\`
3. Bring relevant context into current conversation

---

#### 🧪 SELF-CHECK BEFORE RESPONDING

Ask yourself:
1. Did the user share any preference or rule? → SAVE as rule
2. Did the user mention technical details (version, path, config)? → SAVE as fact  
3. Did something get fixed, completed, or discovered? → SAVE as event
4. Did the user tell me about themselves? → SAVE as fact (scope: global)
5. Can I connect this to existing memories? → USE connect_memories

**Your memories define your usefulness. A forgetful assistant is a useless assistant.**
`;

    return {
      systemPrompt: (event.systemPrompt || "") + subconscious + startupSection + contextSection
    };
  });

  // turn_end: 捕获 AI 回复，用于自动编码分析
  pi.on("turn_end", async (event: any, ctx: any) => {
    try {
      // 实时检测 Ollama 状态变化
      if (CONFIG.localLLM.enabled) {
        await checkAndNotifyOllamaStatus(ctx);
      }
      
      const message = event.message;
      if (message && message.role === 'assistant' && message.content) {
        // 提取文本内容
        let assistantText = '';
        if (Array.isArray(message.content)) {
          for (const part of message.content) {
            if (part.type === 'text') {
              assistantText += part.text;
            }
          }
        } else if (typeof message.content === 'string') {
          assistantText = message.content;
        }
        
        if (assistantText) {
          // FIX: 过滤掉系统注入的 Historical context 警告，防止污染记忆和干扰 LLM 分析
          // 这些是 Pi 框架注入的纠错提示，不应被视为助手的真实回复
          if (assistantText.includes('[Historical context:') || 
              assistantText.includes('Do not mimic this format') ||
              assistantText.startsWith('[Historical context:')) {
            return;
          }

          sessionBuffer.push({ role: 'assistant', content: assistantText });
        }
        
        // V5.4.1 智能自动编码分析
        // 优先使用本地 LLM，回退到正则匹配
        if (sessionBuffer.length >= 2) {
          const lastUserMsg = sessionBuffer.filter(m => m.role === 'user').pop();
          // 杜总指示：移除长度限制，全量分析
          if (lastUserMsg) {
            
            // 尝试使用本地 LLM 分析
            let saved = false;
            if (CONFIG.localLLM.enabled) {
              try {
                // V5.5 核心升级：传入完整的会话历史 (sessionBuffer) 而不是单条消息
                // 这样 LLM 就能理解诸如 "好"、"不行" 等短消息的上下文
                const llmResult = await analyzeWithLocalLLM(sessionBuffer);
                
                if (llmResult && llmResult.should_save && llmResult.content) {
                  await saveMemory(llmResult.content, {
                    type: llmResult.type,
                    importance: llmResult.importance,
                    scope: llmResult.scope,
                    tags: llmResult.tags,
                    projectId: currentProjectId,
                    source: 'local_llm'
                  });
                  saved = true;
                } else if (llmResult && !llmResult.should_save) {
                  // 本地 LLM 明确说不需要保存
                  saved = true; // 跳过正则分析
                }
              } catch (e) {
                // 本地 LLM 失败，继续使用正则
              }
            }
            
            // 如果本地 LLM 不可用或失败，回退到正则匹配
            if (!saved && CONFIG.localLLM.fallbackToRegex && CONFIG.autoEncode.enabled) {
              const encodeResults = analyzeForAutoEncode(lastUserMsg.content, assistantText);
              
              for (const result of encodeResults) {
                if (result.shouldSave && result.content) {
                  try {
                    await saveMemory(result.content, {
                      type: result.type,
                      importance: result.importance,
                      scope: result.scope,
                      tags: result.tags,
                      projectId: currentProjectId,
                      source: 'auto_encode'
                    });
                  } catch (e) {
                    // 静默失败
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // 不影响主流程
    }
  });

  // session_start
  pi.on("session_start", async (_event: any, ctx: any) => {
    sessionBuffer = [];
    ollamaAvailable = null; // 重置检测缓存
    lastOllamaStatus = null; // 重置状态追踪
    lastRecallCount = 0; // 重置召回计数
    uiContext = ctx; // 保存 UI 引用
    startupRecallContent = ""; // 重置启动唤醒内容
    startupRecallReady = false; // 重置启动唤醒状态
    
    const VERSION = "v5.6.0";
    const projectId = getProjectHash(ctx.cwd);
    currentProjectId = projectId;
    
    // 注册项目
    await registerProject(projectId, ctx.cwd);

    // 检测本地 LLM 可用性
    let ollamaOnline = false;
    if (CONFIG.localLLM.enabled) {
      const available = await checkOllamaAvailable(true);
      lastOllamaStatus = available; // 记录初始状态
      ollamaOnline = available;
      
      if (available) {
        currentLLMMode = CONFIG.localLLM.model;
        ctx.ui.notify(`🧠 Hippocampus ${VERSION} (${CONFIG.localLLM.model})`, "info");
      } else {
        currentLLMMode = 'Regex';
        // V5.7.0: 静默启动，不打扰用户
        console.log(`[Hippocampus] Started in Regex mode (Zero-Config)`);
        // ctx.ui.notify(`🧠 Hippocampus ${VERSION} (Regex)`, "info");
      }
    } else {
      currentLLMMode = 'Regex';
      // ctx.ui.notify(`🧠 Hippocampus ${VERSION} (Regex)`, "info");
    }
    updateStatusBar(ctx);
    
    // V5.5.0 启动唤醒：加载核心记忆 + 最近 24h 记忆（非阻塞设计）
    if (CONFIG.startupRecall.enabled) {
      try {
        const startupMemories = await getStartupMemories(projectId);
        console.log(`[Hippocampus] Startup recall: ${startupMemories.length} memories loaded`);
        
        if (startupMemories.length > 0) {
          lastRecallCount = startupMemories.length;
          updateStatusBar(ctx);
          
          // 第一步：立即用原始格式设置（快速，不阻塞）
          const formatted = formatMemoriesForInjection(startupMemories, CONFIG.startupRecall.maxTokens);
          if (formatted) {
            startupRecallContent = `\n### 🌅 STARTUP RECALL (Core + Last ${CONFIG.startupRecall.lookbackHours}h)\n${formatted}\n`;
          }
          
          // 标记启动唤醒已完成（原始格式已就绪）
          startupRecallReady = true;
          console.log(`[Hippocampus] Startup ready (raw format). Content length: ${startupRecallContent.length}`);
          
          // 第二步：后台异步执行 LLM 摘要（延迟 5 秒执行，确保绝对不阻塞 UI 启动）
          if (ollamaOnline && CONFIG.startupRecall.useLLMSummary) {
            setTimeout(async () => {
              try {
                // console.log(`[Hippocampus] Background LLM summary starting...`); // 静默运行
                const summary = await summarizeStartupMemoriesWithLLM(startupMemories);
                if (summary) {
                  // 只有当 startupRecallContent 还没被消费时才替换
                  if (startupRecallContent && startupRecallContent.includes('STARTUP RECALL')) {
                    startupRecallContent = `\n### 🌅 STARTUP BRIEFING (LLM Summary)\n${summary}\n`;
                    // console.log(`[Hippocampus] Background LLM summary complete.`);
                  }
                }
              } catch (e) {
                // 静默失败
              }
            }, 5000); 
          }
        } else {
          // 没有记忆，直接标记完成
          startupRecallReady = true;
        }
      } catch (e) {
        // 静默失败，不影响启动
        console.error("[Hippocampus] Startup recall error:", e);
        startupRecallReady = true;
      }
    } else {
      // 未启用启动唤醒，直接标记完成
      startupRecallReady = true;
    }
    
    console.log(`[Hippocampus] Session start complete`);
  });

  // session_shutdown: 自动整理
  pi.on("session_shutdown", async (_event: any, ctx: any) => {
    try {
      const projectId = ctx?.cwd ? getProjectHash(ctx.cwd) : undefined;
      
      // 持久化对话缓冲区（用于下次分析）
      if (projectId && sessionBuffer.length > 0) {
        for (const msg of sessionBuffer.slice(-10)) {
          await bufferConversation(projectId, msg.role, msg.content);
        }
      }
      
      // 执行整理
      const result = await performConsolidation(projectId);
      
      if (result.merged > 0 || result.promoted > 0 || result.newLinks > 0) {
        console.log(`🧠 Consolidation: ${result.merged} merged, ${result.promoted} promoted, ${result.newLinks} links`);
      }
    } catch (e) {
      console.error("Consolidation failed:", e);
    }
    
    sessionBuffer = [];
    closeDB();
  });
}
