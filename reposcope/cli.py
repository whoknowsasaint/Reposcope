"""Click CLI for Reposocpe."""
import os
import subprocess
import sys
import time
from pathlib import Path

import click
import httpx
from rich.console import Console
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)

from reposcope.core.llm import ask_question_stream_sync
from reposcope.config import settings
from reposcope.core.indexer import delete_repo, index_repo, list_indexed_repos
from reposcope.core.llm import ask_question_stream
from reposcope.db.connection import init_db

console = Console()

SERVER_URL = f"http://{settings.server_host}:{settings.server_port}"


def _is_server_running() -> bool:
    """Check if the embedded server is already running."""
    try:
        response = httpx.get(f"{SERVER_URL}/health", timeout=2.0)
        return response.status_code == 200
    except Exception:
        return False


def _start_server() -> subprocess.Popen:
    """Start the embedded FastAPI server in a background process."""
    console.print("[dim]Starting server...[/dim]")

    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    env["PYTHONUTF8"] = "1"







    process = subprocess.Popen(
        [
            sys.executable,
            "-c",
            "from reposcope.server import app; import uvicorn; uvicorn.run(app, host='" + settings.server_host + "', port=" + str(settings.server_port) + ")",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env=env,
    )

    for _ in range(30):
        if _is_server_running():
            return process
        time.sleep(0.5)

    console.print("[red]Failed to start server[/red]")
    sys.exit(1)


def _ensure_server() -> subprocess.Popen | None:
    """Ensure server is running, start if not."""
    if _is_server_running():
        return None
    return _start_server()


def _stop_server(process: subprocess.Popen | None) -> None:
    """Stop the embedded server if we started it."""
    if process:
        process.terminate()
        try:
            process.wait(timeout=5)
        except Exception:
            process.kill()


@click.group()
@click.version_option(version="0.1.0")
def main():
    """Reposcope -- Chat with any codebase."""
    init_db()


@main.command()
@click.argument("url")
def index(url: str):
    """Index a GitHub repository with progress tracking."""
    # Run locally — no server needed. Writes directly to ChromaDB.
    try:
        repo_id = index_repo(url)
        console.print(f"[green]OK Indexed {url}[/green]")
        console.print(f"[dim]  Repo ID: {repo_id}[/dim]")
    except Exception as e:
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
@click.argument("repo_id")
def update(repo_id: str):
    """Update a repository with the latest changes."""
    from reposcope.core.indexer import update_repo
    try:
        update_repo(repo_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
@click.argument("repo_id")
def analyze(repo_id: str):
    """Analyze a repository: churn, complexity, contributors."""
    from reposcope.core.indexer import analyze_repo
    try:
        analyze_repo(repo_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
@click.argument("repo_id")
@click.option("--format", "-f", default="md", help="Export format (md)")
def export(repo_id: str, format: str):
    """Export repository analysis to a file."""
    from reposcope.core.indexer import export_repo
    try:
        path = export_repo(repo_id, format)
        console.print(f"[green]OK Exported to {path}[/green]")
    except Exception as e:
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
def list():
    """List all indexed repositories."""
    # Run locally — checks ChromaDB directly
    try:
        repos = list_indexed_repos()
        if not repos:
            console.print("[yellow]No repositories indexed yet.[/yellow]")
            return

        console.print("[bold]Indexed Repositories:[/bold]")
        for repo in repos:
            console.print(f"  [cyan]* {repo['repo_name']}[/cyan] [dim]({repo['repo_id']})[/dim]")
    except Exception as e:
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
@click.argument("repo_id")
def rm(repo_id: str):
    """Remove a repository from the index."""
    # Run locally — no server needed
    try:
        success = delete_repo(repo_id)
        if success:
            console.print("[green]OK Repository removed[/green]")
        else:
            console.print("[yellow]! Repository not found[/yellow]")
    except Exception as e:
        console.print(f"[red]X Error: {e}[/red]")


@main.command()
@click.argument("repo_id")
@click.argument("query")
def ask(repo_id: str, query: str):
    """Ask a one-shot question with streaming response."""
    server_proc = _ensure_server()
    try:
        with console.status("[bold blue]Retrieving context..."):
            response = httpx.post(
                f"{SERVER_URL}/ask",
                json={"repo_id": repo_id, "query": query},
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()

        if not data["chunks"]:
            console.print("[yellow]No relevant code found.[/yellow]")
            return

        console.print("[bold blue]Assistant:[/bold blue]")
        full_answer = ""
        
        with Live(Markdown(""), refresh_per_second=15, console=console) as live:
            for event in ask_question_stream_sync(repo_id, query):
                if event["type"] == "token":
                    full_answer += event["content"]
                    live.update(Markdown(full_answer))
                elif event["type"] == "done":
                    live.update(Markdown(full_answer))
                    if event["chunks"]:
                        console.print("\n[dim]Sources:[/dim]")
                        for chunk in event["chunks"]:
                            console.print(
                                f"  [cyan]-> {chunk['file_path']}:{chunk['start_line']}-{chunk['end_line']}[/cyan]"
                            )
                    break
                elif event["type"] == "error":
                    console.print(f"[red]X Error: {event['content']}[/red]")
                    break

    except Exception as e:
        console.print(f"[red]X Error: {e}[/red]")
    finally:
        _stop_server(server_proc)


@main.command()
@click.argument("repo_id")
def chat(repo_id: str):
    """Start an interactive chat session with streaming."""
    server_proc = _ensure_server()

    try:
        response = httpx.post(
            f"{SERVER_URL}/conversations",
            json={"repo_id": repo_id, "title": f"Chat with {repo_id}"},
            timeout=10.0,
        )
        response.raise_for_status()
        conv = response.json()
        conversation_id = conv["id"]
    except Exception as e:
        console.print(f"[red]Failed to create conversation: {e}[/red]")
        _stop_server(server_proc)
        return

    console.print(f"[bold green]Chatting with repo {repo_id}[/bold green]")
    console.print(f"[dim]Conversation #{conversation_id}[/dim]")
    console.print("[dim]Commands: /quit, /history[/dim]")
    console.print()

    try:
        while True:
            query = console.input("[bold blue]You:[/bold blue] ")

            if query.strip().lower() in ("/quit", "/exit", "q"):
                break

            if query.strip().lower() == "/history":
                try:
                    resp = httpx.get(f"{SERVER_URL}/conversations/{conversation_id}", timeout=10.0)
                    resp.raise_for_status()
                    data = resp.json()
                    console.print("[bold]History:[/bold]")
                    for msg in data["messages"]:
                        role_color = "blue" if msg["role"] == "user" else "green"
                        prefix = "You" if msg["role"] == "user" else "Assistant"
                        content = msg["content"][:80] + "..." if len(msg["content"]) > 80 else msg["content"]
                        console.print(f"  [bold {role_color}]{prefix}:[/bold {role_color}] {content}")
                except Exception:
                    console.print("[red]Failed to load history[/red]")
                continue

            if not query.strip():
                continue

            full_answer = ""
            with Live(Markdown(""), refresh_per_second=15, console=console) as live:
                for event in ask_question_stream_sync(repo_id, query, conversation_id):
                    if event["type"] == "token":
                        full_answer += event["content"]
                        live.update(Markdown(full_answer))
                    elif event["type"] == "done":
                        live.update(Markdown(full_answer))
                        if event["chunks"]:
                            sources = ", ".join(
                                f"{c['file_path']}:{c['start_line']}-{c['end_line']}"
                                for c in event["chunks"]
                            )
                            console.print(f"[dim]Sources: {sources}[/dim]")
                        break
                    elif event["type"] == "error":
                        console.print(f"[red]X Error: {event['content']}[/red]")
                        break

            console.print()

    except KeyboardInterrupt:
        console.print("\n[dim]Goodbye![/dim]")
    finally:
        _stop_server(server_proc)


@main.command()
def server():
    """Start the web UI server (runs until Ctrl+C)."""
    console.print(f"[bold green]Starting server at {SERVER_URL}[/bold green]")
    console.print("[dim]Press Ctrl+C to stop[/dim]")
    
    process = _start_server()
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        console.print("\n[dim]Stopping server...[/dim]")
        _stop_server(process)


if __name__ == "__main__":
    main()
