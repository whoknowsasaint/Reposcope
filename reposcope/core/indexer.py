import hashlib
import os
import shutil
import sys
import threading
from pathlib import Path
from typing import List, Optional

import git
from rich.console import Console
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
    MofNCompleteColumn,
)

from reposcope.config import settings
from reposcope.core.chunker import CodeChunk, chunk_file
from reposcope.core.embedder import embed_chunks
from reposcope.core.retriever import add_chunks_to_collection

console = Console()

# ─── Progress store for API consumers ───
_progress_store: dict = {}
_progress_lock = threading.Lock()


def get_indexing_progress(repo_id: str) -> Optional[dict]:
    """Get current indexing progress for a repo."""
    with _progress_lock:
        return _progress_store.get(repo_id)


def _update_progress(repo_id: str, stage: str, message: str, percent: float = 0, **kwargs):
    """Update progress for API consumers."""
    with _progress_lock:
        _progress_store[repo_id] = {
            "stage": stage,
            "message": message,
            "percent": percent,
            **kwargs,
        }


def _clear_progress(repo_id: str):
    """Remove progress when done."""
    with _progress_lock:
        _progress_store.pop(repo_id, None)


def _repo_name_from_url(url: str) -> str:
    """Extract repo name from GitHub URL."""
    url = url.rstrip("/").replace(".git", "")
    return url.split("/")[-1]


def _repo_id(url: str) -> str:
    """Generate a unique ID for a repo."""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def clone_repo(url: str) -> Path:
    """Clone a GitHub repo to local storage."""
    repo_name = _repo_name_from_url(url)
    repo_id = _repo_id(url)
    local_path = Path(settings.repos_dir) / f"{repo_name}_{repo_id}"

    if local_path.exists():
        try:
            has_files = any(local_path.iterdir())
        except Exception:
            has_files = False
        
        if has_files:
            console.print(f"[yellow]! Repo already cloned at {local_path}[/yellow]")
            return local_path
        else:
            try:
                shutil.rmtree(local_path)
            except Exception:
                pass

    console.print(f"[blue]>> Cloning {url}...[/blue]")
    local_path.parent.mkdir(parents=True, exist_ok=True)

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Cloning repository...", total=None)
        git.Repo.clone_from(url, str(local_path), depth=1)
        progress.update(task, completed=True)

    console.print(f"[green]OK Cloned to {local_path}[/green]")
    return local_path


def _should_index_file(file_path: Path) -> bool:
    """Check if a file should be indexed."""
    skip_dirs = {
        "node_modules", "venv", ".venv", "env", ".git", "__pycache__",
        ".pytest_cache", "dist", "build", ".next", "out", "target",
        ".idea", ".vscode", "vendor", "bin", "obj", "Debug", "Release",
        ".mypy_cache", ".tox", ".eggs",
    }
    skip_extensions = {
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".woff", ".woff2",
        ".ttf", ".eot", ".mp3", ".mp4", ".wav", ".pdf", ".zip", ".tar",
        ".gz", ".rar", ".exe", ".dll", ".so", ".dylib", ".lock",
        ".min.js", ".min.css", ".map",
    }
    skip_files = {
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
        "Cargo.lock", "Gemfile.lock", "Pipfile.lock",
    }

    parts = file_path.parts
    if any(part in skip_dirs for part in parts):
        return False

    if file_path.name in skip_files:
        return False

    if file_path.suffix.lower() in skip_extensions:
        return False

    try:
        if file_path.stat().st_size > 1_000_000:
            return False
    except OSError:
        return False

    return True


def _read_file(file_path: Path) -> str:
    """Read a file with encoding fallback."""
    encodings = ["utf-8", "latin-1", "cp1252"]
    for enc in encodings:
        try:
            return file_path.read_text(encoding=enc)
        except UnicodeDecodeError:
            continue
    return ""


def index_repo(url: str) -> str:
    """Clone, chunk, embed, and store a repository. Returns repo_id."""
    import time
    
    repo_id = _repo_id(url)
    repo_name = _repo_name_from_url(url)
    timings = {}
    t_start = time.time()

    _update_progress(repo_id, "cloning", "Cloning repository...", 5)

    # Clone
    t0 = time.time()
    local_path = clone_repo(url)
    timings["clone"] = time.time() - t0

    _update_progress(repo_id, "scanning", "Scanning files...", 15)

    # Collect files
    t0 = time.time()
    console.print("[blue]>> Scanning files...[/blue]")
    files_to_index = []
    for file_path in local_path.rglob("*"):
        if file_path.is_file() and _should_index_file(file_path):
            files_to_index.append(file_path)
    timings["scan"] = time.time() - t0

    if not files_to_index:
        _clear_progress(repo_id)
        console.print("[yellow]! No files found to index[/yellow]")
        return repo_id

    console.print(f"[blue]>> Found {len(files_to_index)} files to index[/blue]")

    _update_progress(
        repo_id, "chunking", "Chunking files...", 20,
        files_total=len(files_to_index), files_processed=0,
    )

    # Chunk files
    t0 = time.time()
    all_chunks: List[CodeChunk] = []

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Chunking files...", total=len(files_to_index))

        for i, file_path in enumerate(files_to_index):
            relative_path = str(file_path.relative_to(local_path))
            content = _read_file(file_path)

            if content:
                try:
                    chunks = chunk_file(
                        file_path=relative_path,
                        content=content,
                        chunk_size=settings.chunk_size,
                        overlap=settings.chunk_overlap,
                    )
                    all_chunks.extend(chunks)
                except Exception:
                    pass

            progress.advance(task)
            _update_progress(
                repo_id, "chunking", f"Chunking files... {i + 1}/{len(files_to_index)}",
                20 + int((i + 1) / len(files_to_index) * 30),
                files_total=len(files_to_index), files_processed=i + 1,
                chunks_generated=len(all_chunks),
            )
    timings["chunk"] = time.time() - t0

    console.print(f"[blue]>> Created {len(all_chunks)} chunks[/blue]")

    if not all_chunks:
        _clear_progress(repo_id)
        console.print("[red]X No chunks created. Nothing to index.[/red]")
        return repo_id

    _update_progress(
        repo_id, "embedding", "Generating embeddings...", 50,
        chunks_generated=len(all_chunks),
    )

    # Embed chunks
    t0 = time.time()
    console.print("[blue]>> Embedding chunks...[/blue]")

    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Generating embeddings...", total=1)
        try:
            embeddings = embed_chunks([c.content for c in all_chunks])
        except Exception as e:
            _clear_progress(repo_id)
            console.print(f"[red]X Embedding failed: {e}[/red]")
            raise
        progress.advance(task)
    timings["embed"] = time.time() - t0

    _update_progress(
        repo_id, "storing", "Saving to vector database...", 85,
        chunks_generated=len(all_chunks),
    )

    # Store in vector DB
    t0 = time.time()
    console.print("[blue]>> Storing in vector database...[/blue]")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Saving to ChromaDB...", total=None)
        try:
            add_chunks_to_collection(repo_id, repo_name, all_chunks, embeddings)
        except Exception as e:
            _clear_progress(repo_id)
            console.print(f"[red]X Storage failed: {e}[/red]")
            raise
        progress.update(task, completed=True)
    timings["store"] = time.time() - t0

    timings["total"] = time.time() - t_start

    _update_progress(repo_id, "complete", "Indexing complete", 100,
                     repo_name=repo_name, chunks_generated=len(all_chunks),
                     files_processed=len(files_to_index),
                     files_total=len(files_to_index))

    # Print benchmark summary
    console.print(f"\n[bold green]OK Indexed {repo_name}[/bold green]")
    console.print(f"[dim]  Files: {len(files_to_index)} | Chunks: {len(all_chunks)}[/dim]")
    console.print(f"[dim]  Clone: {timings['clone']:.1f}s | Scan: {timings['scan']:.1f}s | Chunk: {timings['chunk']:.1f}s | Embed: {timings['embed']:.1f}s | Store: {timings['store']:.1f}s[/dim]")
    console.print(f"[dim]  Total: {timings['total']:.1f}s[/dim]")

    return repo_id




def update_repo(repo_id: str) -> str:
    """Pull latest changes and re-index only new/modified files."""
    import time
    
    # Find the repo directory
    repo_dir = Path(settings.repos_dir)
    local_path = None
    for item in repo_dir.iterdir():
        if item.is_dir() and item.name.endswith(f"_{repo_id}"):
            local_path = item
            break
    
    if not local_path:
        _update_progress(repo_id, "error", "Repository not found", 0)
        raise ValueError(f"Repository {repo_id} not found")
    
    repo_name = local_path.name.rsplit("_", 1)[0]
    
    timings = {}
    t_start = time.time()
    
    _update_progress(repo_id, "updating", "Pulling latest changes...", 5)
    
    # Git pull
    t0 = time.time()
    console.print(f"[blue]>> Updating {repo_name}...[/blue]")
    repo = git.Repo(str(local_path))
    before = repo.head.commit.hexsha
    repo.remotes.origin.pull(depth=1)
    after = repo.head.commit.hexsha
    timings["pull"] = time.time() - t0
    
    if before == after:
        _update_progress(repo_id, "complete", "Already up to date", 100,
                         repo_name=repo_name)
        console.print(f"[green]OK {repo_name} is already up to date[/green]")
        return repo_id
    
    # Find changed files
    _update_progress(repo_id, "scanning", "Detecting changes...", 15)
    t0 = time.time()
    changed_files = []
    for item in repo.head.commit.diff(before):
        if item.a_path:
            file_path = local_path / item.a_path
            if file_path.exists() and file_path.is_file() and _should_index_file(file_path):
                changed_files.append(file_path)
    timings["scan"] = time.time() - t0
    
    if not changed_files:
        _update_progress(repo_id, "complete", "No files to re-index", 100,
                         repo_name=repo_name)
        console.print(f"[green]OK No files to re-index[/green]")
        return repo_id
    
    console.print(f"[blue]>> Found {len(changed_files)} changed files to re-index[/blue]")
    
    _update_progress(
        repo_id, "chunking", "Chunking files...", 20,
        files_total=len(changed_files), files_processed=0,
    )
    
    # Chunk changed files
    t0 = time.time()
    all_chunks: List[CodeChunk] = []
    
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        MofNCompleteColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Chunking files...", total=len(changed_files))
        
        for i, file_path in enumerate(changed_files):
            relative_path = str(file_path.relative_to(local_path))
            content = _read_file(file_path)
            
            if content:
                try:
                    chunks = chunk_file(
                        file_path=relative_path,
                        content=content,
                        chunk_size=settings.chunk_size,
                        overlap=settings.chunk_overlap,
                    )
                    all_chunks.extend(chunks)
                except Exception:
                    pass
            
            progress.advance(task)
            _update_progress(
                repo_id, "chunking", f"Chunking files... {i + 1}/{len(changed_files)}",
                20 + int((i + 1) / len(changed_files) * 30),
                files_total=len(changed_files), files_processed=i + 1,
                chunks_generated=len(all_chunks),
            )
    timings["chunk"] = time.time() - t0
    
    console.print(f"[blue]>> Created {len(all_chunks)} chunks[/blue]")
    
    if not all_chunks:
        _update_progress(repo_id, "complete", "No new chunks to index", 100,
                         repo_name=repo_name)
        console.print("[yellow]! No chunks created[/yellow]")
        return repo_id
    
    _update_progress(
        repo_id, "embedding", "Generating embeddings...", 50,
        chunks_generated=len(all_chunks),
    )
    
    # Embed chunks
    t0 = time.time()
    console.print("[blue]>> Embedding chunks...[/blue]")
    
    with Progress(
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TimeElapsedColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("Generating embeddings...", total=1)
        try:
            embeddings = embed_chunks([c.content for c in all_chunks])
        except Exception as e:
            _update_progress(repo_id, "error", str(e), 0, error=str(e))
            console.print(f"[red]X Embedding failed: {e}[/red]")
            raise
        progress.advance(task)
    timings["embed"] = time.time() - t0
    
    _update_progress(
        repo_id, "storing", "Saving to vector database...", 85,
        chunks_generated=len(all_chunks),
    )
    
    # Store in vector DB
    t0 = time.time()
    console.print("[blue]>> Storing in vector database...[/blue]")
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("Saving to ChromaDB...", total=None)
        try:
            add_chunks_to_collection(repo_id, repo_name, all_chunks, embeddings)
        except Exception as e:
            _update_progress(repo_id, "error", str(e), 0, error=str(e))
            console.print(f"[red]X Storage failed: {e}[/red]")
            raise
        progress.update(task, completed=True)
    timings["store"] = time.time() - t0
    
    timings["total"] = time.time() - t_start
    
    _update_progress(repo_id, "complete", "Update complete", 100,
                     repo_name=repo_name, chunks_generated=len(all_chunks),
                     files_processed=len(changed_files),
                     files_total=len(changed_files))
    
    console.print(f"\n[bold green]OK Updated {repo_name}[/bold green]")
    console.print(f"[dim]  Files: {len(changed_files)} | Chunks: {len(all_chunks)}[/dim]")
    console.print(f"[dim]  Pull: {timings['pull']:.1f}s | Scan: {timings['scan']:.1f}s | Chunk: {timings['chunk']:.1f}s | Embed: {timings['embed']:.1f}s | Store: {timings['store']:.1f}s[/dim]")
    console.print(f"[dim]  Total: {timings['total']:.1f}s[/dim]")
    
    return repo_id


def analyze_repo(repo_id: str):
    """Print repository analysis: churn, complexity, contributors."""
    from collections import Counter
    from datetime import datetime
    
    repo_dir = Path(settings.repos_dir)
    local_path = None
    for item in repo_dir.iterdir():
        if item.is_dir() and item.name.endswith(f"_{repo_id}"):
            local_path = item
            break
    
    if not local_path:
        raise ValueError(f"Repository {repo_id} not found")
    
    repo = git.Repo(str(local_path))
    repo_name = local_path.name.rsplit("_", 1)[0]
    
    console.print(f"\n[bold]Analysis for {repo_name}[/bold]\n")
    
    # Contributors
    console.print("[bold]Top Contributors:[/bold]")
    contributors = Counter()
    for commit in repo.iter_commits():
        contributors[commit.author.name] += 1
    for name, count in contributors.most_common(10):
        console.print(f"  [cyan]{name}[/cyan]: {count} commits")
    
    # Code churn (last 30 days)
    console.print(f"\n[bold]Code Churn (last 30 days):[/bold]")
    since = datetime.now().timestamp() - 30 * 24 * 3600
    churn = Counter()
    try:
        for commit in repo.iter_commits(since=since):
            if commit.parents:
                diff = commit.parents[0].diff(commit)
                for d in diff:
                    if d.a_path:
                        churn[d.a_path] += 1

    except Exception:
        pass        

    if churn:
        for path, count in churn.most_commonn(10):
            console.print(f"  [dim]{path}[/dim]: {count} changes")
    else:
        console.print("  [dim]No recent churn data (shallow clone)[/dim]")
        

    
    # File complexity (line count)
    console.print(f"\n[bold]Most Complex Files:[/bold]")
    files = []
    for file_path in local_path.rglob("*"):
        if file_path.is_file() and _should_index_file(file_path):
            if file_path.suffix in {".icns", ".ico", ".png", ".jpg", ".jpeg", ".gif", ".svg"}:
                continue
            try:
                lines = len(file_path.read_text(encoding="utf-8", errors="ignore").splitlines())
                files.append((str(file_path.relative_to(local_path)), lines))
            except Exception:
                pass
    
    for path, lines in sorted(files, key=lambda x: x[1], reverse=True)[:10]:
        console.print(f"  [dim]{path}[/dim]: {lines} lines")
    
    # Dependency graph (imports)
    console.print(f"\n[bold]Top Imports:[/bold]")
    imports = Counter()
    for file_path in local_path.rglob("*.py"):
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            for line in content.splitlines():
                if line.strip().startswith("import ") or line.strip().startswith("from "):
                    imports[line.strip()] += 1
        except Exception:
            pass
    
    for imp, count in imports.most_common(15):
        console.print(f"  [dim]{imp}[/dim]")



def export_repo(repo_id: str, format: str = "md") -> str:
    """Export repository summary to a markdown file."""
    from datetime import datetime
    from collections import Counter
    
    repo_dir = Path(settings.repos_dir)
    local_path = None
    for item in repo_dir.iterdir():
        if item.is_dir() and item.name.endswith(f"_{repo_id}"):
            local_path = item
            break
    
    if not local_path:
        raise ValueError(f"Repository {repo_id} not found")
    
    repo = git.Repo(str(local_path))
    repo_name = local_path.name.rsplit("_", 1)[0]
    
    lines = []
    lines.append(f"# {repo_name} — Repository Analysis")
    lines.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    lines.append(f"\n## Files")
    lines.append(f"\nTotal files: {sum(1 for _ in local_path.rglob('*') if _.is_file())}")
    
    lines.append(f"\n## Contributors")
    contributors = Counter()
    for commit in repo.iter_commits():
        contributors[commit.author.name] += 1
    for name, count in contributors.most_common(10):
        lines.append(f"- {name}: {count} commits")
    
    lines.append(f"\n## Recent Commits")
    for commit in repo.iter_commits(max_count=10):
        lines.append(f"- {commit.committed_datetime.strftime('%Y-%m-%d')} {commit.author.name}: {commit.message.split(chr(10))[0]}")
    
    export_path = Path.home() / ".reposcope" / f"{repo_name}_analysis.md"
    export_path.write_text("\n".join(lines), encoding="utf-8")
    
    return str(export_path)



def delete_repo(repo_id: str) -> bool:
    """Delete a repo from index and local storage."""
    from reposcope.core.retriever import delete_collection
    from reposcope.db.history import delete_conversations_by_repo

    delete_conversations_by_repo(repo_id)

    try:
        delete_collection(repo_id)
    except Exception:
        pass

    repo_dir = Path(settings.repos_dir)
    for item in repo_dir.iterdir():
        if item.is_dir() and item.name.endswith(f"_{repo_id}"):
            try:
                def on_rm_error(func, path, exc_info):
                    import stat
                    os.chmod(path, stat.S_IWRITE)
                    func(path)
                shutil.rmtree(item, onerror=on_rm_error)
            except Exception:
                pass

    return True

def list_indexed_repos() -> List[dict]:
    """List all indexed repositories."""
    from reposcope.core.retriever import list_collections
    return list_collections()