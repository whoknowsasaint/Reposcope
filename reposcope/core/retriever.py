"""ChromaDB vector storage and retrieval."""

from pathlib import Path
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings

from reposcope.config import settings
from reposcope.core.chunker import CodeChunk
from reposcope.core.embedder import embed_query

_chroma_client: Optional[chromadb.Client] = None


def _get_chroma_client() -> chromadb.Client:
    """Lazy initialization of ChromaDB client."""
    global _chroma_client
    if _chroma_client is None:
        persist_dir = Path(settings.chroma_persist_dir).expanduser()
        persist_dir.mkdir(parents=True, exist_ok=True)

        _chroma_client = chromadb.PersistentClient(
            path=str(persist_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def _collection_name(repo_id: str) -> str:
    """Generate a valid ChromaDB collection name."""
    return f"repo_{repo_id}"


def add_chunks_to_collection(
    repo_id: str,
    repo_name: str,
    chunks: List[CodeChunk],
    embeddings: List[List[float]],
) -> None:
    """Add chunks to a ChromaDB collection."""
    client = _get_chroma_client()
    collection_name = _collection_name(repo_id)

    # Delete existing collection if present
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"repo_name": repo_name, "repo_id": repo_id},
    )

    ids = [f"{repo_id}_{i}" for i in range(len(chunks))]
    documents = [c.content for c in chunks]
    metadatas = [
        {
            "file_path": c.file_path,
            "start_line": c.start_line,
            "end_line": c.end_line,
            "chunk_type": c.chunk_type,
            "name": c.name,
            "language": c.language,
            "repo_id": repo_id,
            "repo_name": repo_name,
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def retrieve_chunks(repo_id: str, query: str, top_k: Optional[int] = None) -> List[dict]:
    """Retrieve top-k chunks for a query."""
    client = _get_chroma_client()
    collection_name = _collection_name(repo_id)

    try:
        collection = client.get_collection(collection_name)
    except Exception:
        return []

    query_embedding = embed_query(query)
    k = top_k or settings.top_k_retrieval

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    chunks = []
    if results["documents"] and results["documents"][0]:
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            distance = results["distances"][0][i] if results["distances"] else 0.0
            chunks.append(
                {
                    "content": doc,
                    "metadata": meta,
                    "distance": distance,
                }
            )


    # Filter out markdown files
    chunks = [
        c for c in chunks
        if not c.get("metadata", {}).get("file_path", "").endswith(".md")
    ]

    return chunks


def delete_collection(repo_id: str) -> None:
    """Delete a collection."""
    client = _get_chroma_client()
    collection_name = _collection_name(repo_id)
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass


def list_collections() -> List[dict]:
    """List all indexed repositories."""
    client = _get_chroma_client()
    collections = client.list_collections()

    repos = []
    for coll in collections:
        meta = coll.metadata or {}
        repos.append(
            {
                "repo_id": meta.get("repo_id", ""),
                "repo_name": meta.get("repo_name", coll.name),
                "collection_name": coll.name,
            }
        )

    return repos
