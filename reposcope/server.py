"""FastAPI server for the backend API."""


import sys
import io

# Fix Windows charmap encoding for the server process
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='ignore')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='ignore')



from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from reposcope.config import settings
from reposcope.core.indexer import delete_repo, index_repo, list_indexed_repos
from reposcope.core.llm import ask_question, ask_question_stream
from reposcope.db.connection import init_db
from reposcope.db.history import (
    Conversation,
    Message,
    add_message,
    create_conversation,
    delete_conversation,
    get_conversation,
    get_messages,
    list_conversations,
)
from fastapi.middleware.cors import CORSMiddleware
from reposcope.core.indexer import get_indexing_progress



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    init_db()
    yield


app = FastAPI(
    title="Reposcope API",
    description="Chat with any codebase using RAG",
    version="0.1.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Request/Response Models ----

class IndexRequest(BaseModel):
    url: str


class IndexResponse(BaseModel):
    repo_id: str
    repo_name: str
    message: str


class AskRequest(BaseModel):
    repo_id: str
    query: str
    conversation_id: Optional[int] = None


class AskResponse(BaseModel):
    answer: str
    chunks: List[dict]
    conversation_id: Optional[int]


class ChatRequest(BaseModel):
    repo_id: str
    query: str
    conversation_id: int


class ConversationCreateRequest(BaseModel):
    repo_id: str
    title: Optional[str] = "New Chat"


class ConversationResponse(BaseModel):
    id: int
    repo_id: str
    title: str
    created_at: str
    updated_at: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


# ---- API Endpoints ----

@app.post("/index", response_model=IndexResponse)
async def index_repository(request: IndexRequest, background_tasks: BackgroundTasks):
    """Index a GitHub repository in the background."""
    import hashlib
    
    def _repo_id(url: str) -> str:
        return hashlib.md5(url.encode()).hexdigest()[:12]
    
    def _run_index_task(url: str, repo_id: str):
        import sys
        import io
        
        old_stdout = sys.stdout
        try:
            if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except Exception:
            pass
        
        try:
            index_repo(url)
        except Exception as e:
            import traceback
            traceback.print_exc()
            from reposcope.core.indexer import _update_progress
            _update_progress(repo_id, "error", str(e), 0, error=str(e))
        finally:
            try:
                sys.stdout = old_stdout
            except Exception:
                pass
    
    repo_name = request.url.rstrip("/").split("/")[-1].replace(".git", "")
    repo_id = _repo_id(request.url)
    
    background_tasks.add_task(_run_index_task, request.url, repo_id)
    
    return IndexResponse(
        repo_id=repo_id,
        repo_name=repo_name,
        message=f"Indexing started for {repo_name}",
    )

    
@app.post("/repos/{repo_id}/update")
async def update_repository(repo_id: str, background_tasks: BackgroundTasks):
    """Pull latest changes and re-index a repository."""
    from reposcope.core.indexer import update_repo
    
    def _run_update_task(repo_id: str):
        import sys
        import io
        
        old_stdout = sys.stdout
        try:
            if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except Exception:
            pass
        
        try:
            update_repo(repo_id)
        except Exception as e:
            import traceback
            traceback.print_exc()
        finally:
            try:
                sys.stdout = old_stdout
            except Exception:
                pass
    
    background_tasks.add_task(_run_update_task, repo_id)
    return {"message": "Update started"}

@app.get("/repos")
async def list_repos():
    """List all indexed repositories."""
    return list_indexed_repos()


@app.delete("/repos/{repo_id}")
async def remove_repo(repo_id: str):
    """Delete a repository from the index."""
    try:
        success = delete_repo(repo_id)
        if not success:
            raise HTTPException(status_code=404, detail="Repository not found")
        return {"message": "Repository deleted"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask", response_model=AskResponse)
async def ask(request: AskRequest):
    """Ask a one-shot question (no history)."""
    result = ask_question(request.repo_id, request.query)
    return AskResponse(
        answer=result["answer"],
        chunks=result["chunks"],
        conversation_id=result["conversation_id"],
    )


@app.post("/chat", response_model=AskResponse)
async def chat(request: ChatRequest):
    """Continue a conversation with history (non-streaming)."""
    conv = get_conversation(request.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.repo_id != request.repo_id:
        raise HTTPException(status_code=400, detail="Conversation does not belong to this repository")

    result = ask_question(request.repo_id, request.query, request.conversation_id)
    return AskResponse(
        answer=result["answer"],
        chunks=result["chunks"],
        conversation_id=result["conversation_id"],
    )


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Stream a conversation response token by token."""
    conv = get_conversation(request.conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if conv.repo_id != request.repo_id:
        raise HTTPException(status_code=400, detail="Conversation does not belong to this repository")

    async def event_generator():
        # old - sync for with async generator
        # for event in ask_question_stream(...):
        
        #  new - async for with async generator
        async for event in ask_question_stream(
            request.repo_id,
            request.query,
            request.conversation_id,
        ):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream",
        },
    )




@app.post("/conversations", response_model=ConversationResponse)
async def create_chat(request: ConversationCreateRequest):
    """Create a new conversation for a repository."""
    conv_id = create_conversation(request.repo_id, request.title or "New Chat")
    conv = get_conversation(conv_id)
    return ConversationResponse(
        id=conv.id,
        repo_id=conv.repo_id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@app.get("/conversations")
async def get_conversations(repo_id: Optional[str] = None):
    """List conversations, optionally filtered by repo."""
    conversations = list_conversations(repo_id)
    return [
        ConversationResponse(
            id=c.id,
            repo_id=c.repo_id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )
        for c in conversations
    ]


@app.get("/conversations/{conversation_id}")
async def get_chat(conversation_id: int):
    """Get a conversation with all messages."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = get_messages(conversation_id)
    return {
        "conversation": ConversationResponse(
            id=conv.id,
            repo_id=conv.repo_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        ),
        "messages": [
            MessageResponse(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
            )
            for m in messages
        ],
    }


@app.delete("/conversations/{conversation_id}")
async def delete_chat(conversation_id: int):
    """Delete a conversation."""
    conv = get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    delete_conversation(conversation_id)
    return {"message": "Conversation deleted"}


@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok"}



@app.get("/index/{repo_id}/status")
async def indexing_status(repo_id: str):
    """Get the current indexing progress for a repo."""
    progress = get_indexing_progress(repo_id)
    if progress is None:
        raise HTTPException(status_code=404, detail="No indexing in progress for this repo")
    return progress