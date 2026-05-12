"""Conversation history management."""

from dataclasses import dataclass
from typing import List, Optional

from reposcope.db.connection import get_connection


@dataclass
class Message:
    """A single message in a conversation."""
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: str


@dataclass
class Conversation:
    """A conversation thread."""
    id: int
    repo_id: str
    title: str
    created_at: str
    updated_at: str


def create_conversation(repo_id: str, title: str = "New Chat") -> int:
    """Create a new conversation and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (repo_id, title) VALUES (?, ?)",
        (repo_id, title),
    )
    conn.commit()
    conversation_id = cursor.lastrowid
    conn.close()
    return conversation_id


def get_conversation(conversation_id: int) -> Optional[Conversation]:
    """Get a conversation by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM conversations WHERE id = ?",
        (conversation_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return Conversation(
            id=row["id"],
            repo_id=row["repo_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
    return None


def list_conversations(repo_id: Optional[str] = None) -> List[Conversation]:
    """List all conversations, optionally filtered by repo."""
    conn = get_connection()
    cursor = conn.cursor()

    if repo_id:
        cursor.execute(
            "SELECT * FROM conversations WHERE repo_id = ? ORDER BY updated_at DESC",
            (repo_id,),
        )
    else:
        cursor.execute("SELECT * FROM conversations ORDER BY updated_at DESC")

    rows = cursor.fetchall()
    conn.close()

    return [
        Conversation(
            id=row["id"],
            repo_id=row["repo_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def delete_conversation(conversation_id: int) -> None:
    """Delete a conversation and all its messages."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()


def add_message(conversation_id: int, role: str, content: str) -> int:
    """Add a message to a conversation. Returns message ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        (conversation_id, role, content),
    )
    message_id = cursor.lastrowid

    # Update conversation timestamp
    cursor.execute(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (conversation_id,),
    )

    conn.commit()
    conn.close()
    return message_id


def get_messages(conversation_id: int, limit: int = 50) -> List[Message]:
    """Get messages for a conversation, oldest first."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        """,
        (conversation_id, limit),
    )
    rows = cursor.fetchall()
    conn.close()

    return [
        Message(
            id=row["id"],
            conversation_id=row["conversation_id"],
            role=row["role"],
            content=row["content"],
            created_at=row["created_at"],
        )
        for row in rows
    ]


def add_retrieved_chunk(
    message_id: int,
    file_path: str,
    start_line: int,
    end_line: int,
    chunk_type: str,
    name: str,
    content: str,
    distance: float,
) -> None:
    """Record which chunks were retrieved for a message."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO retrieved_chunks
        (message_id, file_path, start_line, end_line, chunk_type, name, content, distance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (message_id, file_path, start_line, end_line, chunk_type, name, content, distance),
    )
    conn.commit()
    conn.close()


def get_retrieved_chunks(message_id: int) -> List[dict]:
    """Get chunks retrieved for a specific message."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM retrieved_chunks WHERE message_id = ?",
        (message_id,),
    )
    rows = cursor.fetchall()
    conn.close()

    return [
        {
            "file_path": row["file_path"],
            "start_line": row["start_line"],
            "end_line": row["end_line"],
            "chunk_type": row["chunk_type"],
            "name": row["name"],
            "content": row["content"],
            "distance": row["distance"],
        }
        for row in rows
    ]


def delete_conversations_by_repo(repo_id: str) -> int:
    """Delete all conversations for a given repo. Returns count deleted."""
    from reposcope.db.connection import get_connection

    db = get_connection()
    count = 0
    conversations = db.execute(
        "SELECT id FROM conversations WHERE repo_id = ?", (repo_id,)
    ).fetchall()

    for (conv_id,) in conversations:
        db.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
        db.execute("DELETE FROM retrieved_chunks WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)", (conv_id,))
        db.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        count += 1

    db.commit()
    db.close()
    return count