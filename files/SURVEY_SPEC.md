# AI 辅助决策行为调查问卷 — 项目开发规格

> 这是一份给 AI 编程工具（Cursor / Claude Code / v0 等）的完整开发文档。
> 目标：搭出一个单页问卷网站，部署到 GitHub Pages，匿名收集数据。
> 把整份文档贴给编程 AI，让它一次性生成项目；不清楚处按本文默认值执行。

---

## 0. 总览

**做什么**：一个三部分的在线问卷，研究"年轻群体（学生）如何用 AI 做决策"，核心是对比**对话式 AI（Copilot，如 ChatGPT 网页版）**与 **AI 搜索（如 Perplexity）**两种模式。

**关键特色**：第三部分不是自陈式问题，而是一个**真实可操作的任务**——页面内嵌两个真实可用的 AI 界面（一个对话式、一个搜索式），用户实际去完成一个购买决策，系统在后台记录其全部行为（用了哪个、用了几次、每条输入原文、停留时长、最终决定）。

**技术栈**：
- React + Vite（单页应用，纯前端）
- 纯前端，无需自建后端即可跑（数据先支持本地下载 JSON；预留上传接口）
- 部署到 **GitHub Pages**
- 第三部分两个 AI 面板通过 **Anthropic Messages API** 真实驱动

**整体长度**：面向学生，目标填写时长 8–10 分钟。

---

## 1. 技术与部署要求

### 1.1 项目结构
```
/
├─ index.html
├─ package.json
├─ vite.config.js          # 注意 base 路径，见 1.3
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx              # 问卷主流程（三部分串联）
│  ├─ parts/
│  │  ├─ Part1Demographics.jsx
│  │  ├─ Part2Usage.jsx
│  │  └─ Part3Task.jsx     # 核心：行为任务（已有原型，见第 5 节）
│  ├─ lib/
│  │  ├─ store.js          # 汇总三部分答案 + 提交/下载
│  │  └─ api.js            # 调用 Anthropic API 的封装
│  └─ styles.css
└─ README.md
```

### 1.2 数据流
- 三个部分各自把答案写入一个全局 `responses` 对象（用 React state 或 Context，**不要用 localStorage**）。
- 全程用一个匿名 `sessionId` 串联（生成方式见 4.1）。
- 用户走到最后点"提交"时：
  - 若配置了上传地址 `UPLOAD_URL` → POST 整个 `responses` 到后端。
  - 否则 → 触发浏览器下载一个 `{sessionId}.json` 文件（测试 / 无后端时用）。

### 1.3 GitHub Pages 部署要点（重要，容易踩坑）
- 在 `vite.config.js` 设 `base: '/<仓库名>/'`（如仓库叫 `ai-survey`，则 `base: '/ai-survey/'`）。否则 Pages 上资源 404。
- 提供一个 GitHub Actions 工作流（`.github/workflows/deploy.yml`），push 到 main 时自动 `npm run build` 并发布 `dist/` 到 Pages。
- README 写清楚：仓库 Settings → Pages → Source 选 "GitHub Actions"。

### 1.4 Anthropic API 调用（第三部分两个面板用）
- 调用 `https://api.anthropic.com/v1/messages`，模型用 `claude-sonnet-4-20250514`，`max_tokens: 1000`。
- **API key 不要硬编码进前端**（公开仓库会泄露）。开发文档需向用户说明两种方案：
  1. **推荐**：搭一个极简代理（如 Cloudflare Worker / Vercel Function）保管 key，前端调代理。
  2. 仅本地测试时，可临时用环境变量，但**绝不能 commit 进公开仓库**。
- `api.js` 封装一个 `callClaude(messages, system)` 函数，返回拼接后的文本。

---

## 2. 第一部分：基本信息（精简版）

单选除非注明。所有题答案存进 `responses.part1`。

1. **年龄段**：18 岁以下 / 18–22 / 23–26 / 27–30 / 30 岁以上
2. **当前身份**：本科在读 / 研究生在读 / 刚毕业（3 年内）/ 其他
3. **专业大类**：理工 / 人文社科 / 商科经管 / 医学 / 艺术设计 / 其他
4. **对新科技的接受程度**：总是第一批尝鲜 / 比较愿意试 / 看大家用了再用 / 不太爱折腾

---

## 3. 第二部分：AI 使用情况

存进 `responses.part2`。

5. **用过哪些 AI 工具**（多选）：ChatGPT、Claude、Gemini、豆包、Kimi、文心一言、DeepSeek、Perplexity、秘塔搜索、夸克 AI、必应 AI、其他（填空）、都没用过
6. **总体使用频率**（单选）：每天好几次 / 基本每天 / 每周几次 / 偶尔 / 几乎不用
7. **用了多久**（单选）：不到 3 个月 / 3–6 个月 / 半年到一年 / 1–2 年 / 2 年以上
8. **主要在哪用**（多选）：手机 App / 电脑网页 / 浏览器插件 / 微信小程序 / 语音助手
9. **主要用途**（多选）：写作业论文、查资料、写代码、做生活决定、规划安排、情感倾诉、闲聊娱乐、其他（填空）
10. **对 AI 建议的信任度**（1–5 量表）：1 完全不信 — 5 完全信任
11. **过去一个月因 AI 建议改变决定的次数**（单选）：0 次 / 1–2 次 / 3–5 次 / 6 次以上

---

## 4. 第三部分：对话式 AI vs AI 搜索（行为任务）

> 这是问卷的核心与重点。先给一段概念说明，再让用户做一个真实任务，全程记录行为。
> 存进 `responses.part3`。完整交互逻辑见第 5 节，已有可用的 React 原型代码（`ai_decision_task.jsx`），直接整合即可。

### 4.1 会话 ID
进入问卷时生成一次，贯穿全程：
```
const sessionId = "S-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,7);
```

### 4.2 概念说明（展示给用户）
> **A. 对话式 AI（Copilot）**：像 ChatGPT 网页版、Claude、豆包，你和它来回聊、追问、让它帮你分析。
> **B. AI 搜索**：像 Perplexity、秘塔、夸克 AI，你输入一个问题，它快速给你带来源的答案摘要。

### 4.3 任务（可一行替换成其它场景）
- **标题**：帮自己挑一台笔记本电脑
- **场景**：你最近想换一台笔记本电脑，预算 6000 元左右，主要用来写论文、跑代码、偶尔剪点视频。请用下面两个 AI 工具去研究一下，最后告诉我们你倾向于买什么、以及为什么。
- **提示**：两个工具你都试试看——左边可以来回追问，右边一问一答给你带来源的结果。
- 任务定义抽成一个常量 `TASK`，方便日后换成"选课决策""实习 offer 取舍"等。

### 4.4 两个面板（页面内并排）
- **左：对话式 AI 面板** —— 多轮对话框，可连续追问。system prompt：扮演帮学生做购买决策的对话式助手，鼓励追问、分析利弊。
- **右：AI 搜索面板** —— 一问一答，输入问题后给一段简洁摘要 + 结尾【参考来源】列 3 个来源名。system prompt：扮演 AI 搜索引擎，简洁、客观、带来源、不多轮。

### 4.5 任务后追问（用户完成研究后回答）
- **Q1（单选）这次哪个工具更帮到你**：明显是对话式 AI / 偏对话式 / 差不多 / 偏 AI 搜索 / 明显是 AI 搜索
- **Q2（填空）你最终倾向于买什么**
- **Q3（填空）为什么这么选（哪个工具帮你想清楚的）**

### 4.6 后台记录的行为指标（关键数据）
每个被试需记录：
| 字段 | 含义 |
|---|---|
| `firstUsed` | 首次点开的是 chat 还是 search（不被引导时的本能选择） |
| `chatTurns` | 对话式总轮次 |
| `searchQueries` | 搜索总次数 |
| `sequence` | 两者交替的完整顺序，如 `["search","chat","chat"]` |
| `entries` | 每条输入：`{ tool, text(原文), t(距开始的毫秒) }` ← **研究金矿** |
| `totalSeconds` | 任务总耗时 |
| `preferred` / `decision` / `reason` | 4.5 的三个答案 |

> `entries` 记录每条输入原文，用于分析"问对话式 AI 的方式"（完整句子/追问）与"喂给搜索的关键词"（名词堆叠）的差异——这是本研究最有价值的对比维度，务必保留。

---

## 5. 第三部分原型代码

已有一份可直接运行的 React 单文件原型（文件名 `ai_decision_task.jsx`，随本文档一起提供）。它已实现：
- 任务展示 → 两个真实 AI 面板（站内 API）→ 任务后追问 → 完成屏
- 完整行为记录（含每条输入原文 + 时间戳）
- `UPLOAD_URL` 上传接口 + JSON 下载兜底
- 暖陶土 + 墨绿纸感配色（避开通用 AI 紫渐变）

**整合指引**：把它改造成 `Part3Task.jsx`，把任务后追问的三个答案、以及行为 `log` 一起写入全局 `responses.part3`；`callClaude` 抽到 `src/lib/api.js`；`TASK`、`UPLOAD_URL`、`sessionId` 提到全局配置。

---

## 6. 最终数据结构（提交 / 下载的 JSON）

```json
{
  "sessionId": "S-xxxx-xxxxx",
  "submittedAt": "2026-05-21T10:00:00.000Z",
  "part1": {
    "age": "18–22",
    "identity": "本科在读",
    "major": "理工",
    "techAdoption": "比较愿意试"
  },
  "part2": {
    "toolsUsed": ["ChatGPT", "豆包", "Perplexity"],
    "frequency": "基本每天",
    "tenure": "半年到一年",
    "devices": ["手机 App", "电脑网页"],
    "useCases": ["查资料", "写代码", "做生活决定"],
    "trust": 4,
    "changedDecisions": "3–5 次"
  },
  "part3": {
    "task": "帮自己挑一台笔记本电脑",
    "firstUsed": "search",
    "chatTurns": 3,
    "searchQueries": 2,
    "sequence": ["search", "chat", "chat", "search", "chat"],
    "entries": [
      { "tool": "search", "text": "6000元 编程剪辑笔记本推荐", "t": 8200 },
      { "tool": "chat", "text": "Mac 还是 Windows 更适合我？", "t": 41000 }
    ],
    "totalSeconds": 240,
    "preferred": "偏对话式",
    "decision": "MacBook Air M3",
    "reason": "搜索帮我列了候选，对话帮我权衡了系统选择"
  }
}
```

---

## 7. UI / 设计要求

- 单页、分步推进（第一部分 → 第二部分 → 第三部分 → 完成），顶部一个进度指示。
- 移动端友好（学生多半用手机填）：第三部分两个面板在窄屏下上下堆叠，宽屏并排。
- 配色沿用原型：纸感米色背景 + 墨绿（对话式）+ 陶土橙（AI 搜索），两个面板用颜色区分。**不要**用通用的紫色渐变白底风格。
- 中文字体优先衬线（如 Songti / 思源宋体），呼应"调研/学术"调性。
- 完成页展示本次记录摘要 + 一个"下载数据 JSON"按钮（测试用）。

---

## 8. 给开发 AI 的执行清单

1. 用 Vite + React 初始化项目，按第 1.1 节结构搭骨架。
2. 实现全局 `responses` 状态与 `sessionId`。
3. 按第 2、3 节实现前两部分（普通表单题）。
4. 整合第 5 节原型为 `Part3Task.jsx`，接入全局状态。
5. 实现 `store.js`：提交时按第 6 节结构组装 JSON，POST 到 `UPLOAD_URL` 或下载。
6. 配置 GitHub Pages 部署（第 1.3 节，含 Actions 工作流），并在 README 写清部署与 API key 安全注意事项。
7. 自检：三部分数据是否都正确进入最终 JSON；窄屏布局是否正常；未配 key 时第三部分要有友好降级提示。

---

## 9. 重要提醒

- **API key 安全**：公开仓库绝不能含真实 key。优先用代理方案。
- **不要用 localStorage / sessionStorage**：用内存状态即可。
- **隐私**：问卷开头加一句匿名声明；数据仅用于研究。
- 第三部分的 `entries`（输入原文）是研究核心，整合时务必不要弄丢。
