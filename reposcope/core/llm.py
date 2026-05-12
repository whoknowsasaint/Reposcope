"""Groq LLM integration for Q&A with conversation history."""

import asyncio
import json
from concurrent.futures import ThreadPoolExecutor
from typing import AsyncIterator, Iterator, List, Optional

from groq import Groq

from reposcope.config import settings
from reposcope.core.retriever import retrieve_chunks
from reposcope.db.history import (
    add_message,
    add_retrieved_chunk,
    get_messages,
)

_groq_client: Groq | None = None
_groq_executor = ThreadPoolExecutor(max_workers=4)


def _get_groq_client() -> Groq:
    """Lazy initialization of Groq client."""
    global _groq_client
    if _groq_client is None:
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY not set. Add it to your .env file.")
        _groq_client = Groq(api_key=settings.groq_api_key)
    return _groq_client


SYSTEM_PROMPT = """You are a codebase assistant. Your job is to answer questions about code repositories.

You will be provided with:
1. Relevant code snippets retrieved from the repository
2. Conversation history (if any)

Rules:
- Answer based ONLY on the provided code context
- Cite file paths and line numbers when referencing code
- If the context doesn't contain the answer, say so honestly
- Be concise but thorough
- Use markdown code blocks for code references
- Never assume a tool uses yt-dlp or gallery-dl unless the code explicitly imports or references them. Describe the actual code you see, not what similar tools typically use.
- When describing how something works, distinguish between the PRIMARY method and fallback/optional methods. Do not present a fallback as the main approach.

Format your response with clear citations like:
- In `src/auth.py:45-52`, the login function handles...
- The `User` class in `models/user.py:12-30` defines...
"""


def _diversify_chunks(chunks: List[dict], max_per_file: int = 3, max_total: int = 10) -> List[dict]:
    """Diversify retrieved chunks to avoid one file dominating results.
    
    Limits each file to max_per_file chunks, then fills remaining slots
    with the best chunks from other files.
    """
    if not chunks:
        return chunks
    
    by_file: dict[str, list] = {}
    for c in chunks:
        path = c["metadata"].get("file_path", "unknown")
        if path not in by_file:
            by_file[path] = []
        by_file[path].append(c)
    
    diverse: list = []
    for path, file_chunks in by_file.items():
        diverse.extend(file_chunks[:max_per_file])
    
    diverse.sort(key=lambda c: c.get("distance", 999))
    return diverse[:max_total]


def _build_context(chunks: List[dict]) -> str:
    """Build a context string from retrieved chunks."""
    parts = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk["metadata"]
        file_path = meta.get("file_path", "unknown")
        start = meta.get("start_line", 0)
        end = meta.get("end_line", 0)
        chunk_type = meta.get("chunk_type", "code")
        name = meta.get("name", "")

        header = f"[{i}] {chunk_type.upper()}: {name} in {file_path}:{start}-{end}"
        parts.append(f"{header}\n```\n{chunk['content']}\n```")

    return "\n\n".join(parts)


def _build_messages(
    query: str,
    chunks: List[dict],
    history: Optional[List] = None,
) -> List[dict]:
    """Build the messages list for the LLM."""
    context = _build_context(chunks)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Here is the relevant code context:\n\n{context}\n\nNow answer this question: {query}",
        },
    ]

    if history:
        history_messages = []
        for msg in history:
            history_messages.append({
                "role": msg.role,
                "content": msg.content,
            })

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
        ] + history_messages + [
            {
                "role": "user",
                "content": f"Here is the relevant code context for my current question:\n\n{context}\n\nQuestion: {query}",
            },
        ]

    return messages


def ask_question(
    repo_id: str,
    query: str,
    conversation_id: Optional[int] = None,
) -> dict:
    """Ask a question about a repo. Optionally continue a conversation."""
    client = _get_groq_client()

    chunks = retrieve_chunks(repo_id, query)
    chunks = _diversify_chunks(chunks, max_per_file=3, max_total=10)

    if not chunks:
        return {
            "answer": "I couldn't find any relevant code for that question. Try rephrasing or checking if the repo is indexed.",
            "chunks": [],
            "conversation_id": conversation_id,
        }

    history = None
    if conversation_id:
        history = get_messages(conversation_id)

    messages = _build_messages(query, chunks, history)

    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        temperature=0.2,
        max_tokens=8192,
    )

    answer = response.choices[0].message.content

    if conversation_id:
        user_msg_id = add_message(conversation_id, "user", query)
        assistant_msg_id = add_message(conversation_id, "assistant", answer)

        for chunk in chunks:
            meta = chunk["metadata"]
            add_retrieved_chunk(
                message_id=assistant_msg_id,
                file_path=meta.get("file_path", ""),
                start_line=meta.get("start_line", 0),
                end_line=meta.get("end_line", 0),
                chunk_type=meta.get("chunk_type", ""),
                name=meta.get("name", ""),
                content=chunk["content"],
                distance=chunk["distance"],
            )

    return {
        "answer": answer,
        "chunks": [
            {
                "file_path": c["metadata"].get("file_path", ""),
                "start_line": c["metadata"].get("start_line", 0),
                "end_line": c["metadata"].get("end_line", 0),
                "name": c["metadata"].get("name", ""),
                "chunk_type": c["metadata"].get("chunk_type", ""),
                "content": c["content"],
            }
            for c in chunks
        ],
        "conversation_id": conversation_id,
    }


async def ask_question_stream(
    repo_id: str,
    query: str,
    conversation_id: Optional[int] = None,
) -> AsyncIterator[dict]:
    """Stream a question response token by token.

    Yields dicts with keys:
    - "type": "token" | "done" | "error"
    - "content": str (token text or full answer)
    - "chunks": list (only on "done", includes content field)
    - "conversation_id": int (only on "done")
    """
    client = _get_groq_client()

    chunks = retrieve_chunks(repo_id, query)
    chunks = _diversify_chunks(chunks, max_per_file=3, max_total=10)

    if not chunks:
        yield {"type": "error", "content": "No relevant code found for that question."}
        return

    history = None
    if conversation_id:
        history = get_messages(conversation_id)

    messages = _build_messages(query, chunks, history)

    # Run sync Groq call in thread pool so we don't block the event loop
    loop = asyncio.get_event_loop()

    def _start_stream():
        return client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.2,
            max_tokens=8192,
            stream=True,
        )

    stream = await loop.run_in_executor(_groq_executor, _start_stream)

    full_answer = ""

    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            full_answer += delta
            yield {"type": "token", "content": delta}
            # CRITICAL: Yield control back to event loop so FastAPI can flush immediately
            await asyncio.sleep(0.02)

    # Save to history after stream completes
    if conversation_id:
        user_msg_id = add_message(conversation_id, "user", query)
        assistant_msg_id = add_message(conversation_id, "assistant", full_answer)

        for chunk in chunks:
            meta = chunk["metadata"]
            add_retrieved_chunk(
                message_id=assistant_msg_id,
                file_path=meta.get("file_path", ""),
                start_line=meta.get("start_line", 0),
                end_line=meta.get("end_line", 0),
                chunk_type=meta.get("chunk_type", ""),
                name=meta.get("name", ""),
                content=chunk["content"],
                distance=chunk["distance"],
            )

    yield {
        "type": "done",
        "content": full_answer,
        "chunks": [
            {
                "file_path": c["metadata"].get("file_path", ""),
                "start_line": c["metadata"].get("start_line", 0),
                "end_line": c["metadata"].get("end_line", 0),
                "name": c["metadata"].get("name", ""),
                "chunk_type": c["metadata"].get("chunk_type", ""),
                "content": c["content"],
            }
            for c in chunks
        ],
        "conversation_id": conversation_id,
    }

def ask_question_stream_sync(
    repo_id: str,
    query: str,
    conversation_id: Optional[int] = None,
) -> Iterator[dict]:
    """Synchronous wrapper for CLI use. Runs async generator in event loop."""
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        async_gen = ask_question_stream(repo_id, query, conversation_id)
        while True:
            try:
                yield loop.run_until_complete(async_gen.__anext__())
            except StopAsyncIteration:
                break
    finally:
        loop.close()

