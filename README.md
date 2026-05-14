# Reposocpe

Chat with any codebase using RAG (Retrieval-Augmented Generation). Index a GitHub repository, then ask questions in plain English with full conversation history.

## Features

- **Semantic Code Search** — Ask "how does auth work?" and get answers with file references
- **Conversation History** — Multi-turn chat that remembers context across questions
- **AST-Based Chunking** — Uses tree-sitter to split code by functions, classes, and methods
- **CLI + Web UI** — Terminal-first with an optional Next.js interface
- **Fast Inference** — Groq LLM for sub-second responses

## Stack

| Component  | Technology |
|------------|-----------------|
| Embeddings | Jina AI `jina-embeddings-v3` |
| LLM        | Groq (Llama 3.3 70B) |
| Vector DB  | ChromaDB (local, persistent) |
| History    | SQLite |
| Backend    | FastAPI (embedded in CLI) |
| CLI        | Click + Rich |
| Web UI     | Next.js + Tailwind CSS |

## Installation

```bash
# Clone and setup
git clone https://github.com/whoknowsasaint/reposcope.git
cd reposcope

# Create virtual environment (Windows)
python -m venv venv
venv\Scripts\activate

# Install in editable mode
pip install -e .

# Add your API keys
copy .env.local .env
# Edit .env with your OPENAI_API_KEY and GROQ_API_KEY
```

## Usage

### Index a repository
```bash
reposcope index https://github.com/user/repo
```

### List indexed repos
```bash
reposcope list
```

## Analyse a repo
```bash
reposcope analyze <repo-id>
```

### Export analysis
```bash
reposcope export <repo-id>
```

### Ask a one-shot question
```bash
reposcope ask <repo-id> "how does the payment flow work?"
```

### Interactive chat with history
```bash
reposcope chat <repo-id>
```

Commands in chat mode:
- `/quit` — exit
- `/history` — show conversation history

### Remove a repo
```bash
reposcope rm <repo-id>
```

## Web UI

```bash
cd web
npm install
npm run dev
```

Then open http://localhost:3000

## Live Demo

[Watch the demo](https://raw.githubusercontent.com/whoknowsasaint/reposcope/main/web/public/demo.mp4)

**Frontend:** [reposcope.vercel.app](https://reposcope.vercel.app)  
**Backend:** Self-hosted locally (`reposcope server`)

The web UI is deployed for demonstration. The backend runs on your machine

## Architecture

```
reposcope/
├── reposcope/
│   ├── cli.py          # Click CLI (starts embedded server)
│   ├── server.py       # FastAPI backend
│   ├── core/
│   │   ├── indexer.py  # Clone + chunk + embed pipeline
│   │   ├── chunker.py  # AST-based code splitting
│   │   ├── embedder.py # OpenAI embeddings
│   │   ├── retriever.py # ChromaDB search
│   │   └── llm.py      # Groq Q&A with history
│   └── db/
│       ├── connection.py # SQLite setup
│       └── history.py    # Conversation CRUD
└── web/                # Next.js frontend
```

## Data Storage

All data is stored locally in `~/.reposcope/`:
- `chroma/` — Vector embeddings
- `reposcope.db` — Conversation history
- `repos/` — Cloned repositories

## License

MIT
