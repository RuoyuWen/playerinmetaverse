from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
import uvicorn
import os
import logging
from datetime import datetime
import json

# 配置日志记录
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 导入后端服务（如果存在）
try:
    from backend.services.document_processor import DocumentProcessor
    from backend.services.persona_generator import PersonaGenerator
    from backend.services.chat_service import ChatService
    from backend.models.schemas import (
        ChatRequest, ChatResponse, PersonaRequest, PersonaResponse,
        MBTIType, DocumentAnalysis
    )
    from backend.services.ai_model_service import AIModelService
    from backend.services.prompt_loader import prompt_loader
    BACKEND_AVAILABLE = True
except ImportError:
    logger.warning("Backend services not available. Running in demo mode.")
    BACKEND_AVAILABLE = False

app = FastAPI(
    title="Inner Child Chatbot API",
    description="AI-powered therapeutic chatbot for inner child healing",
    version="1.0.0"
)

# 确保中文字符正确显示
import json
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

class UnicodeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(
            jsonable_encoder(content),
            ensure_ascii=False,
            allow_nan=False,
            indent=None,
            separators=(",", ":"),
        ).encode("utf-8")

app.default_response_class = UnicodeJSONResponse

# CORS设置 - 更安全的生产环境配置
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

if ENVIRONMENT == "production":
    # 生产环境只允许指定域名
    allowed_origins = [
        "https://playerinmetaverse.tech",
        "https://chi-frontend.onrender.com",
        "https://chi-backend.onrender.com"
    ]
else:
    # 开发环境允许所有来源
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 创建必要的目录
os.makedirs("uploads", exist_ok=True)
os.makedirs("sessions", exist_ok=True)

# 初始化服务（如果后端可用）
if BACKEND_AVAILABLE:
    document_processor = DocumentProcessor()
    chat_service = ChatService()

@app.get("/")
async def root():
    return {
        "message": "Inner Child Chatbot API",
        "version": "1.0.0",
        "status": "running",
        "environment": ENVIRONMENT,
        "backend_available": BACKEND_AVAILABLE
    }

@app.get("/health")
async def health_check():
    """健康检查端点，用于云平台监控"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "backend_available": BACKEND_AVAILABLE,
        "environment": ENVIRONMENT
    }

@app.get("/api/config")
async def get_config():
    """获取前端配置信息"""
    return {
        "backend_available": BACKEND_AVAILABLE,
        "environment": ENVIRONMENT,
        "requires_api_key": True,
        "supported_models": [
            "gpt-4o-mini",
            "gpt-4o",
            "gpt-3.5-turbo"
        ] if BACKEND_AVAILABLE else [],
        "demo_mode": not BACKEND_AVAILABLE
    }

# 如果后端可用，包含完整API
if BACKEND_AVAILABLE:
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
        """处理聊天请求"""
        try:
            response = await chat_service.process_message(request)
            return response
        except Exception as e:
            logger.error(f"Chat error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/api/upload-documents")
    async def upload_documents(
        questionnaire: UploadFile = File(...),
        letter: UploadFile = File(...),
        mbti_type: str = Form(...),
        api_key: str = Form(...)
    ):
        """上传并处理文档"""
        try:
            # 验证API密钥
            if not api_key or not api_key.startswith('sk-'):
                raise HTTPException(status_code=400, detail="Invalid API key")
            
            # 处理文档
            result = await document_processor.process_documents(
                questionnaire, letter, mbti_type, api_key
            )
            return result
        except Exception as e:
            logger.error(f"Document processing error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

else:
    # 演示模式 API
    @app.get("/api/mbti-types")
    async def get_mbti_types_demo():
        """演示模式：获取MBTI类型"""
        return {
            "message": "演示模式 - 请下载完整版本以使用全部功能",
            "demo": True,
            "mbti_types": [
                {"code": "ENFJ", "name": "教导者"},
                {"code": "INFP", "name": "调解者"},
                {"code": "INTJ", "name": "建筑师"}
            ]
        }

    @app.post("/api/chat")
    async def chat_demo(request: dict):
        """演示模式：模拟聊天"""
        return {
            "message": "这是演示模式。要使用完整的AI聊天功能，请：",
            "instructions": [
                "1. 下载完整项目到本地",
                "2. 配置您的OpenAI API密钥", 
                "3. 运行本地服务器",
                "4. 或者部署到支持后端的云平台"
            ],
            "demo": True
        }

# 启动服务器
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=port,
        reload=ENVIRONMENT == "development"
    ) 