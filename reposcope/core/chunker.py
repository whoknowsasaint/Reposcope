"""AST-based code chunking using tree-sitter."""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Dict, Tuple

from tree_sitter import Language, Parser, Query, QueryCursor


@dataclass
class CodeChunk:
    """A single chunk of code with metadata."""

    content: str
    file_path: str
    start_line: int
    end_line: int
    chunk_type: str  # 'function', 'class', 'method', 'module'
    name: str = ""  # function/class name
    language: str = ""


# Language mapping for tree-sitter
LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".rb": "ruby",
    ".php": "php",
}

# Query patterns for different languages
QUERIES = {
    "python": """
        (function_definition
            name: (identifier) @name) @function
        (class_definition
            name: (identifier) @name) @class
    """,
    "javascript": """
        (function_declaration
            name: (identifier) @name) @function
        (class_declaration
            name: (identifier) @name) @class
        (method_definition
            name: (property_identifier) @name) @method
        (arrow_function) @function
    """,
    "typescript": """
        (function_declaration
            name: (identifier) @name) @function
        (class_declaration
            name: (type_identifier) @name) @class
        (method_definition
            name: (property_identifier) @name) @method
        (arrow_function) @function
    """,
    "tsx": """
        (function_declaration
            name: (identifier) @name) @function
        (class_declaration
            name: (type_identifier) @name) @class
        (method_definition
            name: (property_identifier) @name) @method
        (arrow_function) @function
    """,
    "go": """
        (function_declaration
            name: (identifier) @name) @function
        (method_declaration
            name: (field_identifier) @name) @method
        (type_declaration) @class
    """,
    "rust": """
        (function_item
            name: (identifier) @name) @function
        (impl_item) @class
        (trait_item) @class
    """,
}


def _get_language_module(lang_name: str):
    """Dynamically import the tree-sitter language module."""
    try:
        if lang_name == "python":
            from tree_sitter_python import language as py_lang
            return Language(py_lang())
        elif lang_name == "javascript":
            from tree_sitter_javascript import language as js_lang
            return Language(js_lang())
        elif lang_name == "typescript":
            from tree_sitter_typescript import language_typescript as ts_lang
            return Language(ts_lang())
        elif lang_name == "tsx":
            from tree_sitter_typescript import language_tsx as tsx_lang
            return Language(tsx_lang())
        elif lang_name == "go":
            from tree_sitter_go import language as go_lang
            return Language(go_lang())
        elif lang_name == "rust":
            from tree_sitter_rust import language as rust_lang
            return Language(rust_lang())
    except ImportError:
        pass
    return None


def _detect_language(file_path: str) -> str:
    """Detect programming language from file extension."""
    ext = Path(file_path).suffix.lower()
    return LANGUAGE_MAP.get(ext, "")


def _simple_chunk(content: str, file_path: str, chunk_size: int = 512, overlap: int = 50) -> List[CodeChunk]:
    """Fallback: chunk by lines with overlap."""
    lines = content.split("\n")
    chunks = []
    step = chunk_size - overlap

    for i in range(0, len(lines), step):
        chunk_lines = lines[i : i + chunk_size]
        start = i + 1
        end = min(i + chunk_size, len(lines))
        chunk_content = "\n".join(chunk_lines)
        chunks.append(
            CodeChunk(
                content=chunk_content,
                file_path=file_path,
                start_line=start,
                end_line=end,
                chunk_type="module",
                name=f"lines_{start}-{end}",
                language=_detect_language(file_path),
            )
        )

    return chunks


def _extract_name_from_matches(matches: List, node) -> str:
    """Extract the name from a matched node using its child captures."""
    for match in matches:
        pattern_idx, captures_dict = match
        if "name" in captures_dict:
            for name_node in captures_dict["name"]:
                # Check if this name node is a child of our target node
                if (name_node.start_point[0] >= node.start_point[0] and 
                    name_node.end_point[0] <= node.end_point[0]):
                    return name_node.text.decode("utf8") if name_node.text else ""
    return ""


def _chunk_with_ast(content: str, file_path: str, language: str) -> List[CodeChunk]:
    """Chunk code using tree-sitter AST."""
    lang_module = _get_language_module(language)
    if not lang_module:
        return _simple_chunk(content, file_path)

    parser = Parser(lang_module)
    source_bytes = content.encode("utf8", errors="ignore")
    tree = parser.parse(source_bytes)

    query_str = QUERIES.get(language, "")
    if not query_str:
        return _simple_chunk(content, file_path)

    # Use the new Query + QueryCursor API (tree-sitter 0.25+)
    query = Query(lang_module, query_str)
    cursor = QueryCursor(query)
    matches = cursor.matches(tree.root_node)

    chunks = []
    seen_ranges = set()

    for pattern_idx, captures_dict in matches:
        # Process each type of capture
        for capture_name in ("function", "class", "method"):
            if capture_name not in captures_dict:
                continue
                
            for node in captures_dict[capture_name]:
                start_line = node.start_point[0] + 1
                end_line = node.end_point[0] + 1
                range_key = (start_line, end_line)

                if range_key in seen_ranges:
                    continue
                seen_ranges.add(range_key)

                # Extract name from the same match
                name = ""
                if "name" in captures_dict:
                    for name_node in captures_dict["name"]:
                        # Check if this name node belongs to our current node
                        if (name_node.start_point[0] >= node.start_point[0] and 
                            name_node.end_point[0] <= node.end_point[0]):
                            name = name_node.text.decode("utf-8", errors="ignore") if name_node.text else ""
                            break

                chunk_lines = content.split("\n")[start_line - 1 : end_line]
                chunk_content = "\n".join(chunk_lines)

                chunks.append(
                    CodeChunk(
                        content=chunk_content,
                        file_path=file_path,
                        start_line=start_line,
                        end_line=end_line,
                        chunk_type=capture_name,
                        name=name,
                        language=language,
                    )
                )

    # If AST chunking produced nothing, fall back to line-based
    if not chunks:
        return _simple_chunk(content, file_path)

    # Add module-level chunks for parts not covered by AST chunks
    return _fill_gaps(chunks, content, file_path, language)


def _fill_gaps(
    chunks: List[CodeChunk], content: str, file_path: str, language: str
) -> List[CodeChunk]:
    """Fill gaps between AST chunks with line-based chunks."""
    lines = content.split("\n")
    all_chunks = []
    last_end = 0

    for chunk in sorted(chunks, key=lambda c: c.start_line):
        if chunk.start_line > last_end + 1:
            # Gap found — add a module chunk
            gap_start = last_end + 1
            gap_end = chunk.start_line - 1
            gap_lines = lines[gap_start - 1 : gap_end]
            gap_content = "\n".join(gap_lines).strip()

            if gap_content and len(gap_content) > 50:
                all_chunks.append(
                    CodeChunk(
                        content=gap_content,
                        file_path=file_path,
                        start_line=gap_start,
                        end_line=gap_end,
                        chunk_type="module",
                        name=f"lines_{gap_start}-{gap_end}",
                        language=language,
                    )
                )

        all_chunks.append(chunk)
        last_end = chunk.end_line

    # Check for trailing gap
    if last_end < len(lines):
        gap_lines = lines[last_end:]
        gap_content = "\n".join(gap_lines).strip()
        if gap_content and len(gap_content) > 50:
            all_chunks.append(
                CodeChunk(
                    content=gap_content,
                    file_path=file_path,
                    start_line=last_end + 1,
                    end_line=len(lines),
                    chunk_type="module",
                    name=f"lines_{last_end + 1}-{len(lines)}",
                    language=language,
                )
            )

    return sorted(all_chunks, key=lambda c: c.start_line)


def chunk_file(file_path: str, content: str, chunk_size: int = 512, overlap: int = 50) -> List[CodeChunk]:
    """Chunk a single file using AST when possible, falling back to line-based."""
    language = _detect_language(file_path)

    if not language:
        return _simple_chunk(content, file_path, chunk_size, overlap)

    try:
        return _chunk_with_ast(content, file_path, language)
    except Exception:
        return _simple_chunk(content, file_path, chunk_size, overlap)