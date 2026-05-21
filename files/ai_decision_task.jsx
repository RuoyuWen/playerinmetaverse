import React, { useState, useRef, useEffect } from "react";

// =============================================================
//  AI 辅助决策 · 行为观察任务 (问卷第三部分)
//  对比"对话式 AI (Copilot)" vs "AI 搜索" 两种模式
//  - 两个面板均通过站内 Anthropic API 真实运行
//  - 完整记录: 使用次数/轮次/停留时长/首次顺序/每条输入内容/最终决策
//  - 数据可一键下载(JSON)，并预留 submitData() 上传接口
// =============================================================

// ★ 想换任务场景？只改这一处即可（选课 / 实习 offer / 买电子产品…）
const TASK = {
  title: "帮自己挑一台笔记本电脑",
  scenario:
    "你最近想换一台笔记本电脑，预算 6000 元左右，主要用来写论文、跑代码、偶尔剪点视频。请用下面两个 AI 工具去研究一下，最后告诉我们你倾向于买什么、以及为什么。",
  hint: "两个工具你都试试看——左边可以来回追问，右边一问一答给你带来源的结果。",
};

// ★ 部署时把数据发到你的后端：填上 URL 即可自动上传，留空则仅本地下载
const UPLOAD_URL = ""; // 例如 "https://your-survey-backend.com/api/submit"

async function submitData(payload) {
  if (!UPLOAD_URL) return { ok: false, reason: "no_url" };
  try {
    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

// 给每个被试一个匿名会话 ID，便于和问卷前两部分对应
const SESSION_ID =
  "S-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);

// 调色板: 暖陶土 + 墨绿 + 奶油纸感，避开通用 AI 紫渐变
const C = {
  paper: "#F4EFE6",
  ink: "#2A2A26",
  inkSoft: "#6B675E",
  clay: "#C2542A",
  clayDim: "#E8C9B8",
  forest: "#3A5A40",
  forestDim: "#C8D5C2",
  line: "#DAD2C2",
  white: "#FCFAF5",
};

function useElapsed(active) {
  const [ms, setMs] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (active) {
      const start = Date.now() - ms;
      ref.current = setInterval(() => setMs(Date.now() - start), 250);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => ref.current && clearInterval(ref.current);
    // eslint-disable-next-line
  }, [active]);
  return ms;
}

async function callClaude(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ----------------------- 对话式 AI 面板 -----------------------
function ChatPanel({ onActivity, focused, onFocus }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const elapsed = useElapsed(focused);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const next = [...msgs, userMsg];
    setMsgs(next);
    setInput("");
    setLoading(true);
    onActivity("chat", userMsg.content);
    try {
      const reply = await callClaude(
        next,
        "你是一个对话式 AI 助手，正在帮一位学生做购买决策。可以追问、分析利弊、给出权衡建议。回答自然、有条理，鼓励对方继续追问。用中文。"
      );
      setMsgs([...next, { role: "assistant", content: reply }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: "（请求出错了，请重试）" }]);
    }
    setLoading(false);
  };

  return (
    <div
      onClick={onFocus}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: C.white,
        border: `2px solid ${focused ? C.forest : C.line}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color .25s",
        minHeight: 460,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          background: C.forestDim,
          borderBottom: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: C.forest, fontSize: 15 }}>对话式 AI</div>
          <div style={{ fontSize: 11.5, color: C.inkSoft }}>来回对话 · 可追问 · 帮你权衡</div>
        </div>
        <div style={{ fontSize: 11, color: C.inkSoft, fontVariantNumeric: "tabular-nums" }}>
          {(elapsed / 1000).toFixed(0)}s · {msgs.filter((m) => m.role === "user").length} 轮
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {msgs.length === 0 && (
          <div style={{ color: C.inkSoft, fontSize: 13.5, lineHeight: 1.7, paddingTop: 8 }}>
            试着问我，比如：<br />
            “6000 预算，写代码 + 剪视频，买 Mac 还是 Windows？”<br />
            然后你可以继续追问细节。
          </div>
        )}
        {msgs.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "10px 13px",
                borderRadius: 12,
                fontSize: 13.5,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                background: m.role === "user" ? C.forest : C.paper,
                color: m.role === "user" ? C.white : C.ink,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ color: C.inkSoft, fontSize: 13 }}>思考中…</div>}
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${C.line}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="输入问题，回车发送…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 9,
            border: `1px solid ${C.line}`,
            fontSize: 13.5,
            outline: "none",
            background: C.paper,
            color: C.ink,
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 9,
            border: "none",
            background: C.forest,
            color: C.white,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
}

// ----------------------- AI 搜索面板 -----------------------
function SearchPanel({ onActivity, focused, onFocus }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const elapsed = useElapsed(focused);

  const search = async () => {
    if (!query.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setCount((c) => c + 1);
    onActivity("search", query.trim());
    try {
      const reply = await callClaude(
        [
          {
            role: "user",
            content:
              "请像 AI 搜索引擎那样，针对以下问题给出一段简洁的答案摘要，并在结尾用【参考来源】列出 3 个看起来可信的信息来源名称（如媒体/评测站/官网，无需真实链接）。问题：" +
              query.trim(),
          },
        ],
        "你是一个 AI 搜索引擎，特点是：一次性给出简洁、客观、带信息来源的答案摘要，不与用户多轮对话。用中文。"
      );
      setResult(reply);
    } catch (e) {
      setResult("（请求出错了，请重试）");
    }
    setLoading(false);
  };

  return (
    <div
      onClick={onFocus}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: C.white,
        border: `2px solid ${focused ? C.clay : C.line}`,
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color .25s",
        minHeight: 460,
      }}
    >
      <div
        style={{
          padding: "14px 18px",
          background: C.clayDim,
          borderBottom: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: C.clay, fontSize: 15 }}>AI 搜索</div>
          <div style={{ fontSize: 11.5, color: C.inkSoft }}>一问一答 · 带来源 · 快速摘要</div>
        </div>
        <div style={{ fontSize: 11, color: C.inkSoft, fontVariantNumeric: "tabular-nums" }}>
          {(elapsed / 1000).toFixed(0)}s · {count} 次
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: 12, borderBottom: `1px solid ${C.line}` }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="搜索一个问题，回车…"
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 9,
            border: `1px solid ${C.line}`,
            fontSize: 13.5,
            outline: "none",
            background: C.paper,
            color: C.ink,
          }}
        />
        <button
          onClick={search}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 9,
            border: "none",
            background: C.clay,
            color: C.white,
            fontWeight: 600,
            fontSize: 13.5,
            cursor: "pointer",
          }}
        >
          搜索
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {!result && !loading && (
          <div style={{ color: C.inkSoft, fontSize: 13.5, lineHeight: 1.7, paddingTop: 8 }}>
            试着搜：<br />
            “6000 元价位 适合编程剪辑的笔记本推荐”<br />
            它会给你带来源的答案摘要。
          </div>
        )}
        {loading && <div style={{ color: C.inkSoft, fontSize: 13 }}>检索中…</div>}
        {result && (
          <div style={{ fontSize: 13.5, lineHeight: 1.7, color: C.ink, whiteSpace: "pre-wrap" }}>
            {result}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------- 主组件 -----------------------
export default function App() {
  const [started, setStarted] = useState(false);
  const [focused, setFocused] = useState(null); // 'chat' | 'search'
  const [log, setLog] = useState({
    chatTurns: 0,
    searchQueries: 0,
    firstUsed: null,
    sequence: [],
    entries: [], // 每条输入: { tool, text, t(ms相对开始) }
    startedAt: Date.now(),
  });
  const [decision, setDecision] = useState("");
  const [preferred, setPreferred] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [uploadState, setUploadState] = useState(null); // null|'ok'|'fail'|'nourl'

  const onActivity = (tool, text) => {
    setLog((prev) => {
      const firstUsed = prev.firstUsed || tool;
      const sequence = [...prev.sequence, tool];
      const entries = [
        ...prev.entries,
        { tool, text, t: Date.now() - prev.startedAt },
      ];
      return {
        ...prev,
        firstUsed,
        sequence,
        entries,
        chatTurns: prev.chatTurns + (tool === "chat" ? 1 : 0),
        searchQueries: prev.searchQueries + (tool === "search" ? 1 : 0),
      };
    });
  };

  const buildPayload = () => ({
    sessionId: SESSION_ID,
    task: TASK.title,
    firstUsed: log.firstUsed,
    chatTurns: log.chatTurns,
    searchQueries: log.searchQueries,
    sequence: log.sequence,
    entries: log.entries, // 含每条输入原文 + 相对时间戳
    totalSeconds: Math.round((Date.now() - log.startedAt) / 1000),
    preferred,
    decision,
    reason,
    submittedAt: new Date().toISOString(),
  });

  const finish = async () => {
    const payload = buildPayload();
    const r = await submitData(payload);
    setUploadState(r.ok ? "ok" : r.reason === "no_url" ? "nourl" : "fail");
    setDone(true);
  };

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SESSION_ID}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fontStack =
    '"Georgia", "Songti SC", "STSong", serif';

  if (!started) {
    return (
      <div
        style={{
          fontFamily: fontStack,
          background: C.paper,
          minHeight: 560,
          padding: "48px 32px",
          color: C.ink,
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div style={{ fontSize: 12, letterSpacing: 3, color: C.clay, marginBottom: 14 }}>
            问卷 · 第三部分 · 实操任务
          </div>
          <h1 style={{ fontSize: 32, margin: "0 0 20px", lineHeight: 1.25 }}>{TASK.title}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: C.inkSoft, margin: "0 0 16px" }}>
            {TASK.scenario}
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.7, color: C.forest, margin: "0 0 32px" }}>
            {TASK.hint}
          </p>
          <button
            onClick={() => setStarted(true)}
            style={{
              padding: "13px 30px",
              borderRadius: 10,
              border: "none",
              background: C.ink,
              color: C.paper,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: fontStack,
            }}
          >
            开始任务 →
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ fontFamily: fontStack, background: C.paper, minHeight: 560, padding: "48px 32px", color: C.ink }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h1 style={{ fontSize: 28, margin: "0 0 12px" }}>感谢完成任务 ✓</h1>
          <div
            style={{
              fontSize: 13,
              marginBottom: 24,
              color:
                uploadState === "ok" ? C.forest : uploadState === "fail" ? C.clay : C.inkSoft,
            }}
          >
            {uploadState === "ok" && "✓ 数据已上传至研究后端"}
            {uploadState === "fail" && "⚠ 自动上传失败，请用下方按钮下载并发给研究者"}
            {uploadState === "nourl" && "（未配置上传地址，当前为测试模式——可手动下载数据）"}
          </div>

          <div
            style={{
              background: C.white,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: 24,
              fontSize: 14,
              lineHeight: 1.9,
            }}
          >
            <Row k="会话 ID" v={SESSION_ID} />
            <Row k="首次选用的工具" v={log.firstUsed === "chat" ? "对话式 AI" : log.firstUsed === "search" ? "AI 搜索" : "—"} />
            <Row k="对话式 AI 使用轮次" v={log.chatTurns} />
            <Row k="AI 搜索使用次数" v={log.searchQueries} />
            <Row k="使用顺序" v={log.sequence.map((s) => (s === "chat" ? "对话" : "搜索")).join(" → ") || "—"} />
            <Row k="总耗时" v={Math.round((Date.now() - log.startedAt) / 1000) + " 秒"} />
            <Row k="自评更偏好" v={preferred || "—"} />
            <Row k="最终购买决定" v={decision || "—"} />
            <Row k="理由" v={reason || "—"} />
          </div>

          {log.entries.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.inkSoft }}>
                输入内容明细（研究分析用）
              </div>
              <div style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16 }}>
                {log.entries.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", fontSize: 12.5, borderBottom: `1px dashed ${C.line}` }}>
                    <span style={{ color: e.tool === "chat" ? C.forest : C.clay, fontWeight: 600, whiteSpace: "nowrap" }}>
                      {e.tool === "chat" ? "对话" : "搜索"} · {(e.t / 1000).toFixed(0)}s
                    </span>
                    <span style={{ color: C.ink }}>{e.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={downloadJSON}
            style={{
              marginTop: 22,
              padding: "11px 24px",
              borderRadius: 10,
              border: `1.5px solid ${C.ink}`,
              background: "transparent",
              color: C.ink,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: fontStack,
            }}
          >
            ↓ 下载本次数据 (JSON)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: fontStack, background: C.paper, padding: "28px 24px", color: C.ink }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div
          style={{
            background: C.ink,
            color: C.paper,
            borderRadius: 12,
            padding: "16px 22px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 11.5, letterSpacing: 2, color: C.clayDim, marginBottom: 4 }}>你的任务</div>
          <div style={{ fontSize: 15.5, lineHeight: 1.6 }}>{TASK.scenario}</div>
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <ChatPanel onActivity={onActivity} focused={focused === "chat"} onFocus={() => setFocused("chat")} />
          <SearchPanel onActivity={onActivity} focused={focused === "search"} onFocus={() => setFocused("search")} />
        </div>

        <div
          style={{
            background: C.white,
            border: `1px solid ${C.line}`,
            borderRadius: 12,
            padding: 24,
          }}
        >
          <h3 style={{ margin: "0 0 18px", fontSize: 18 }}>用完之后，告诉我们：</h3>

          <Label>1. 这次任务里，你觉得哪个工具更帮到你？</Label>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            {["明显是对话式 AI", "偏对话式", "差不多", "偏 AI 搜索", "明显是 AI 搜索"].map((o) => (
              <Chip key={o} active={preferred === o} onClick={() => setPreferred(o)}>
                {o}
              </Chip>
            ))}
          </div>

          <Label>2. 你最终倾向于买什么？</Label>
          <input
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            placeholder="例如：MacBook Air M3 / 某款 Windows 轻薄本…"
            style={inputStyle}
          />

          <Label>3. 为什么这么选？（说说哪个工具帮你想清楚了）</Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          <button
            onClick={finish}
            style={{
              marginTop: 18,
              padding: "13px 30px",
              borderRadius: 10,
              border: "none",
              background: C.clay,
              color: C.white,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: fontStack,
            }}
          >
            提交任务
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 13px",
  borderRadius: 9,
  border: `1px solid ${C.line}`,
  fontSize: 14,
  marginBottom: 20,
  background: C.paper,
  color: C.ink,
  fontFamily: "inherit",
  outline: "none",
};

function Label({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: C.ink }}>{children}</div>;
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 15px",
        borderRadius: 20,
        border: `1.5px solid ${active ? C.forest : C.line}`,
        background: active ? C.forest : C.white,
        color: active ? C.white : C.inkSoft,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}

function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px dashed ${C.line}`, padding: "4px 0" }}>
      <span style={{ color: C.inkSoft }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{String(v)}</span>
    </div>
  );
}
