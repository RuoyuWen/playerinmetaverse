from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
import uvicorn
import os
import logging
from datetime import datetime
import json
import httpx
from pathlib import Path

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Inner Child Chatbot API",
    description="AI-powered therapeutic chatbot for inner child healing",
    version="1.0.0"
)

# 确保中文字符正确显示
class UnicodeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            content,
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")

app.default_response_class = UnicodeJSONResponse

# CORS设置
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    allowed_origins = [
        "https://playerinmetaverse.tech",
        "https://www.playerinmetaverse.tech",
        "https://chi-frontend.onrender.com",
        "https://chi-backend.onrender.com",
        "https://chi-backend-jif6.onrender.com",
        "https://chi-backend-git.onrender.com",
    ]
else:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 基础数据模型
class ChatRequest(BaseModel):
    message: str
    api_key: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    timestamp: str

class SurveyClaudeRequest(BaseModel):
    messages: List[Dict[str, str]]
    system: str

class SurveySubmitPayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    sessionId: str
    submittedAt: str
    locale: Optional[str] = None

SURVEY_DATA_DIR = Path(os.getenv("SURVEY_DATA_DIR", "survey_submissions"))

# Survey AI — anthropic (direct) or relay (薛丁猫 OpenAI-compatible gateway)
SURVEY_AI_PROVIDER = os.getenv("SURVEY_AI_PROVIDER", "auto").lower()  # auto | anthropic | relay
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
RELAY_API_KEY = os.getenv("RELAY_API_KEY", "") or os.getenv("XUEDINGMAO_API_KEY", "")
RELAY_BASE_URL = os.getenv("RELAY_BASE_URL", "https://xuedingmao.top/v1")
RELAY_MODEL = os.getenv("RELAY_MODEL", "gpt-5.4-mini")
SURVEY_MAX_TOKENS = int(os.getenv("SURVEY_MAX_TOKENS", "1000"))


def _relay_chat_completions_url() -> str:
    """Normalize 薛丁猫 base URL to OpenAI chat/completions endpoint."""
    base = RELAY_BASE_URL.rstrip("/")
    if base.endswith("/chat/completions"):
        return base
    if base.endswith("/v1"):
        return f"{base}/chat/completions"
    return f"{base}/v1/chat/completions"


def _resolve_survey_provider() -> Optional[str]:
    """Pick provider: explicit env, or auto (relay first, then anthropic)."""
    if SURVEY_AI_PROVIDER == "anthropic":
        return "anthropic" if ANTHROPIC_API_KEY else None
    if SURVEY_AI_PROVIDER == "relay":
        return "relay" if RELAY_API_KEY else None
    if RELAY_API_KEY:
        return "relay"
    if ANTHROPIC_API_KEY:
        return "anthropic"
    return None


def _survey_model(provider: str) -> str:
    return RELAY_MODEL if provider == "relay" else ANTHROPIC_MODEL


async def _call_anthropic(messages: List[Dict[str, str]], system: str) -> str:
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": SURVEY_MAX_TOKENS,
                "system": system,
                "messages": messages,
            },
        )
    if response.status_code != 200:
        logger.error(f"Anthropic API error: {response.status_code} {response.text}")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")
    data = response.json()
    return "".join(
        block.get("text", "")
        for block in data.get("content", [])
        if block.get("type") == "text"
    )


async def _call_relay(messages: List[Dict[str, str]], system: str) -> str:
    """薛丁猫中转 — OpenAI Chat Completions 格式。"""
    openai_messages: List[Dict[str, str]] = [{"role": "system", "content": system}]
    openai_messages.extend(messages)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            _relay_chat_completions_url(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {RELAY_API_KEY}",
            },
            json={
                "model": RELAY_MODEL,
                "messages": openai_messages,
                "max_tokens": SURVEY_MAX_TOKENS,
            },
        )
    if response.status_code != 200:
        logger.error(f"Relay API error: {response.status_code} {response.text}")
        detail = response.text[:200] if response.text else "unknown error"
        raise HTTPException(
            status_code=502,
            detail=f"薛丁猫 API 错误 ({response.status_code}): {detail}",
        )
    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise HTTPException(status_code=502, detail="AI relay returned empty response")
    return (choices[0].get("message") or {}).get("content") or ""

@app.get("/", response_class=HTMLResponse)
async def root():
    """返回一个简单的HTML界面"""
    html_content = """
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Inner Child Chatbot - 内在小孩疗愈聊天机器人</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
            }
            .header h1 { font-size: 2.5rem; margin-bottom: 10px; font-weight: 300; }
            .header p { font-size: 1.1rem; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .status { background: #e7f3ff; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
            .api-section { background: #f8f9fa; padding: 25px; border-radius: 15px; margin: 20px 0; }
            .endpoint { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 10px; margin: 10px 0; font-family: monospace; }
            .button { 
                background: #6366f1; color: white; padding: 12px 24px; border-radius: 25px; 
                text-decoration: none; display: inline-block; margin: 10px 5px; transition: all 0.3s;
            }
            .button:hover { background: #4f46e5; transform: translateY(-2px); }
            .demo-form { background: #f0f4f8; padding: 25px; border-radius: 15px; margin-top: 20px; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .form-group input, .form-group textarea { 
                width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; 
            }
            .chat-response { background: #e8f5e8; padding: 15px; border-radius: 10px; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🌟 Inner Child Chatbot</h1>
                <p>内在小孩疗愈聊天机器人 - AI驱动的心理治疗辅助工具</p>
            </div>
            
            <div class="content">
                <div class="status">
                    <h3>🎉 服务状态：在线运行</h3>
                    <p>您的Inner Child Chatbot API现在完全可用！用户可以通过API接口或下方的简单界面体验功能。</p>
                </div>
                
                <div class="api-section">
                    <h3>📋 API 端点</h3>
                    <div class="endpoint">GET /health - 健康检查</div>
                    <div class="endpoint">GET /api/config - API配置</div>
                    <div class="endpoint">GET /api/mbti-types - MBTI类型列表</div>
                    <div class="endpoint">POST /api/chat - 聊天对话</div>
                    <div class="endpoint">POST /api/upload-documents - 文档上传</div>
                    
                    <a href="/health" class="button" target="_blank">测试健康检查</a>
                    <a href="/api/config" class="button" target="_blank">查看API配置</a>
                    <a href="/api/mbti-types" class="button" target="_blank">查看MBTI数据</a>
                    <a href="/docs" class="button" target="_blank">API文档</a>
                </div>
                
                <div class="demo-form">
                    <h3>💬 快速聊天测试</h3>
                    <p>输入您的OpenAI API密钥和消息来测试聊天功能：</p>
                    <div class="form-group">
                        <label>OpenAI API 密钥:</label>
                        <input type="password" id="apiKey" placeholder="sk-your-api-key-here" />
                    </div>
                    <div class="form-group">
                        <label>消息:</label>
                        <textarea id="message" rows="3" placeholder="请输入您想说的话..."></textarea>
                    </div>
                    <button onclick="sendMessage()" class="button">发送消息</button>
                    <div id="response" class="chat-response" style="display: none;"></div>
                </div>
                
                <div class="api-section">
                    <h3>🔗 相关链接</h3>
                    <a href="https://playerinmetaverse.tech/chi" class="button">项目展示页</a>
                    <a href="https://platform.openai.com/api-keys" class="button" target="_blank">获取API密钥</a>
                    <a href="https://github.com/RuoyuWen/playerinmetaverse" class="button" target="_blank">GitHub源码</a>
                </div>
            </div>
        </div>
        
        <script>
            async function sendMessage() {
                const apiKey = document.getElementById('apiKey').value;
                const message = document.getElementById('message').value;
                const responseDiv = document.getElementById('response');
                
                if (!apiKey) {
                    alert('请输入OpenAI API密钥');
                    return;
                }
                
                if (!message) {
                    alert('请输入消息');
                    return;
                }
                
                responseDiv.style.display = 'block';
                responseDiv.innerHTML = '正在发送消息...';
                
                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            message: message,
                            api_key: apiKey,
                            session_id: 'demo-session'
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        responseDiv.innerHTML = `
                            <strong>AI回复:</strong><br>
                            ${data.response}<br><br>
                            <small>会话ID: ${data.session_id} | 时间: ${data.timestamp}</small>
                        `;
                    } else {
                        responseDiv.innerHTML = `<strong>错误:</strong> ${data.detail}`;
                    }
                } catch (error) {
                    responseDiv.innerHTML = `<strong>错误:</strong> ${error.message}`;
                }
            }
        </script>
    </body>
    </html>
    """
    return html_content

@app.get("/api")
async def api_info():
    """API信息端点"""
    return {
        "message": "Inner Child Chatbot API",
        "version": "1.0.0",
        "status": "running",
        "environment": ENVIRONMENT,
        "backend_available": True,
        "endpoints": {
            "health": "/health",
            "config": "/api/config", 
            "mbti_types": "/api/mbti-types",
            "chat": "/api/chat",
            "upload": "/api/upload-documents",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查端点，用于云平台监控"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "backend_available": True,
        "environment": ENVIRONMENT
    }

@app.get("/api/config")
async def get_config():
    """获取前端配置信息"""
    return {
        "backend_available": True,
        "environment": ENVIRONMENT,
        "requires_api_key": True,
        "supported_models": [
            "gpt-4o-mini",
            "gpt-4o",
            "gpt-3.5-turbo"
        ],
        "demo_mode": False
    }

@app.get("/api/mbti-types")
async def get_mbti_types():
    """获取所有MBTI类型及其描述"""
    return {
        "mbti_types": [
            {
                "code": "ENFJ",
                "name": "教导者",
                "description": "富有同情心和责任感，能够激励他人发挥潜能",
                "childhood_traits": ["善解人意", "乐于助人", "富有想象力", "渴望和谐"]
            },
            {
                "code": "ENFP", 
                "name": "奋斗者",
                "description": "热情奔放，富有创造力，社交能力强",
                "childhood_traits": ["充满好奇心", "活泼外向", "富有创意", "喜欢交朋友"]
            },
            {
                "code": "ENTJ",
                "name": "统帅",
                "description": "天生的领导者，有强烈的成就动机",
                "childhood_traits": ["喜欢主导", "目标明确", "善于组织", "勇于挑战"]
            },
            {
                "code": "ENTP",
                "name": "发明家", 
                "description": "聪明机智，喜欢探索新的可能性",
                "childhood_traits": ["爱问问题", "思维敏捷", "喜欢辩论", "充满想法"]
            },
            {
                "code": "ESFJ",
                "name": "执政官",
                "description": "热心助人，重视和谐与传统",
                "childhood_traits": ["关心他人", "遵守规则", "喜欢合作", "渴望认可"]
            },
            {
                "code": "ESFP",
                "name": "表演者",
                "description": "热情友好，喜欢成为关注的焦点",
                "childhood_traits": ["活泼开朗", "喜欢表演", "情感丰富", "适应力强"]
            },
            {
                "code": "ESTJ",
                "name": "总经理",
                "description": "实用主义者，重视效率和成果",
                "childhood_traits": ["有组织性", "负责任", "喜欢秩序", "坚持原则"]
            },
            {
                "code": "ESTP",
                "name": "企业家",
                "description": "适应力强，善于解决实际问题",
                "childhood_traits": ["喜欢冒险", "动手能力强", "活在当下", "灵活变通"]
            },
            {
                "code": "INFJ",
                "name": "提倡者",
                "description": "富有理想主义，对他人有深刻的洞察力",
                "childhood_traits": ["内向敏感", "富有想象", "追求意义", "关注他人感受"]
            },
            {
                "code": "INFP",
                "name": "调解者",
                "description": "理想主义者，重视个人价值观",
                "childhood_traits": ["安静内向", "富有创意", "情感深刻", "追求真实自我"]
            },
            {
                "code": "INTJ",
                "name": "建筑师",
                "description": "独立思考，具有远见卓识",
                "childhood_traits": ["喜欢独处", "爱好学习", "有系统思维", "追求完美"]
            },
            {
                "code": "INTP",
                "name": "思想家",
                "description": "理性分析，追求知识和理解",
                "childhood_traits": ["好奇心强", "喜欢思考", "注重逻辑", "独立自主"]
            },
            {
                "code": "ISFJ",
                "name": "守护者",
                "description": "可靠稳重，乐于为他人服务",
                "childhood_traits": ["温柔体贴", "遵守传统", "注重细节", "害怕冲突"]
            },
            {
                "code": "ISFP",
                "name": "探险家",
                "description": "温和友善，重视个人空间",
                "childhood_traits": ["安静温和", "富有艺术天赋", "喜欢探索", "情感细腻"]
            },
            {
                "code": "ISTJ",
                "name": "物流师",
                "description": "实用可靠，重视责任和传统",
                "childhood_traits": ["循规蹈矩", "认真负责", "注重细节", "喜欢稳定"]
            },
            {
                "code": "ISTP",
                "name": "鉴赏家",
                "description": "冷静客观，善于分析和解决问题",
                "childhood_traits": ["喜欢独处", "动手能力强", "冷静观察", "灵活应变"]
            }
        ]
    }

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """处理聊天请求 - 简化版本"""
    try:
        # 验证API密钥格式
        if not request.api_key or not request.api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid API key format")
        
        # 简单回复（实际项目中这里会调用OpenAI API）
        response = {
            "response": f"这是演示回复：{request.message}。要使用完整AI功能，请确保OpenAI API密钥有效。",
            "session_id": request.session_id or "demo-session",
            "timestamp": datetime.now().isoformat()
        }
        
        return response
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/survey/config")
async def survey_config():
    """Survey frontend configuration."""
    provider = _resolve_survey_provider()
    available = provider is not None
    return {
        "claudeAvailable": available,
        "aiAvailable": available,
        "provider": provider,
        "model": _survey_model(provider) if provider else None,
        "submitAvailable": True,
    }

@app.post("/api/survey/claude")
async def survey_claude(request: SurveyClaudeRequest):
    """Proxy survey AI — Anthropic direct or 薛丁猫 relay (key stays server-side)."""
    provider = _resolve_survey_provider()
    if not provider:
        raise HTTPException(
            status_code=503,
            detail="Survey AI not configured (set RELAY_API_KEY or ANTHROPIC_API_KEY)",
        )
    try:
        if provider == "relay":
            text = await _call_relay(request.messages, request.system)
        else:
            text = await _call_anthropic(request.messages, request.system)
        return {"text": text, "provider": provider, "model": _survey_model(provider)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Survey AI proxy error ({provider}): {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/survey/submit")
async def survey_submit(payload: SurveySubmitPayload):
    """Store anonymous survey responses as JSON files."""
    try:
        SURVEY_DATA_DIR.mkdir(parents=True, exist_ok=True)
        safe_id = "".join(c for c in payload.sessionId if c.isalnum() or c in "-_")
        filename = f"{safe_id or 'unknown'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = SURVEY_DATA_DIR / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(payload.model_dump(), f, ensure_ascii=False, indent=2)
        logger.info(f"Survey submitted: {filename}")
        return {"ok": True, "filename": filename}
    except Exception as e:
        logger.error(f"Survey submit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload-documents")
async def upload_documents(
    questionnaire: UploadFile = File(...),
    letter: UploadFile = File(...),
    mbti_type: str = Form(...),
    api_key: str = Form(...)
):
    """上传并处理文档 - 简化版本"""
    try:
        if not api_key or not api_key.startswith('sk-'):
            raise HTTPException(status_code=400, detail="Invalid API key")
        
        return {
            "status": "success",
            "message": "文档上传成功。这是演示模式，完整功能需要完整的后端服务。",
            "questionnaire_size": questionnaire.size,
            "letter_size": letter.size,
            "mbti_type": mbti_type
        }
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 启动服务器
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port,
        reload=ENVIRONMENT == "development"
    ) 