"""Embedding generation with multiple provider support."""

from typing import List, Optional

import httpx
from openai import OpenAI

from reposcope.config import settings

_client: Optional[OpenAI] = None


def _get_openai_client() -> OpenAI:
    """Lazy initialization of OpenAI client."""
    global _client
    if _client is None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY not set.")
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def _embed_openai(texts: List[str]) -> List[List[float]]:
    """OpenAI embeddings."""
    client = _get_openai_client()
    all_embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=batch,
        )
        batch_embeddings = [item.embedding for item in response.data]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def _embed_jina(texts: List[str]) -> List[List[float]]:
    """Jina AI embeddings."""
    if not settings.jina_api_key:
        raise ValueError(
            "JINA_API_KEY not set. Get a free key at https://jina.ai/embeddings/"
        )

    all_embeddings = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        
        # Jina v3 specific format
        payload = {
            "model": "jina-embeddings-v3",
            "input": batch,
            "embedding_type": "float",
            "truncate": True,
            "task": "text-matching",
        }
        
        response = httpx.post(
            "https://api.jina.ai/v1/embeddings",
            headers={
                "Authorization": f"Bearer {settings.jina_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60.0,
        )
        
        if not response.is_success:
            print(f"Jina API error: {response.status_code} - {response.text}")
            response.raise_for_status()
            
        data = response.json()
        batch_embeddings = [item["embedding"] for item in data["data"]]
        all_embeddings.extend(batch_embeddings)

    return all_embeddings


def _embed_local(texts: List[str]) -> List[List[float]]:
    """Local embeddings using sentence-transformers."""
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        raise ImportError(
            "Local embeddings require: pip install sentence-transformers\n"
            "Or use Jina AI (free): set EMBEDDING_PROVIDER=jina and JINA_API_KEY"
        )

    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = model.encode(texts, show_progress_bar=True)
    return embeddings.tolist()


def embed_chunks(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of text chunks."""
    provider = settings.embedding_provider.lower()

    if provider == "jina":
        return _embed_jina(texts)
    elif provider == "local":
        return _embed_local(texts)
    elif provider == "openai":
        return _embed_openai(texts)
    else:
        raise ValueError(
            f"Unknown EMBEDDING_PROVIDER: '{settings.embedding_provider}'. "
            f"Use 'openai', 'jina', or 'local'."
        )


def embed_query(text: str) -> List[float]:
    """Generate embedding for a single query."""
    provider = settings.embedding_provider.lower()

    if provider == "jina":
        return _embed_jina([text])[0]
    elif provider == "local":
        return _embed_local([text])[0]
    elif provider == "openai":
        client = _get_openai_client()
        response = client.embeddings.create(
            model=settings.embedding_model,
            input=[text],
        )
        return response.data[0].embedding
    else:
        raise ValueError(
            f"Unknown EMBEDDING_PROVIDER: '{settings.embedding_provider}'. "
            f"Use 'openai', 'jina', or 'local'."
        )
