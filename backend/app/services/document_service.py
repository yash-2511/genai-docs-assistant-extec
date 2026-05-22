from __future__ import annotations

import csv
import json
import os
import zipfile
from html.parser import HTMLParser
from pathlib import Path
from xml.etree import ElementTree

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown", ".csv", ".json", ".html", ".htm", ".docx"}


class _HTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        text = data.strip()
        if text:
            self.parts.append(text)


def get_supported_document_extensions() -> set[str]:
    return set(SUPPORTED_DOCUMENT_EXTENSIONS)


def get_user_upload_dir(base_upload_dir: str, user_id: str) -> str:
    return os.path.join(base_upload_dir, user_id)


def get_session_upload_dir(base_upload_dir: str, user_id: str, session_id: str) -> str:
    return os.path.join(get_user_upload_dir(base_upload_dir, user_id), session_id)


def list_session_documents(base_upload_dir: str, user_id: str, session_id: str) -> list[str]:
    session_dir = get_session_upload_dir(base_upload_dir, user_id, session_id)
    if not os.path.isdir(session_dir):
        return []

    supported_extensions = tuple(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))
    return sorted(
        filename
        for filename in os.listdir(session_dir)
        if filename.lower().endswith(supported_extensions)
        and os.path.isfile(os.path.join(session_dir, filename))
    )


def session_has_documents(base_upload_dir: str, user_id: str, session_id: str) -> bool:
    return bool(list_session_documents(base_upload_dir, user_id, session_id))


def is_supported_document(file_path: str) -> bool:
    return Path(file_path).suffix.lower() in SUPPORTED_DOCUMENT_EXTENSIONS


def _read_docx_text(file_path: str) -> str:
    with zipfile.ZipFile(file_path) as archive:
        with archive.open("word/document.xml") as xml_file:
            tree = ElementTree.parse(xml_file)

    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs = []
    for paragraph in tree.findall(".//w:p", namespace):
        text_runs = [node.text for node in paragraph.findall(".//w:t", namespace) if node.text]
        paragraph_text = "".join(text_runs).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    return "\n".join(paragraphs).strip()


def _read_html_text(file_path: str) -> str:
    extractor = _HTMLTextExtractor()
    with open(file_path, "r", encoding="utf-8", errors="ignore") as html_file:
        extractor.feed(html_file.read())
    return "\n".join(extractor.parts).strip()


def _read_json_text(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8-sig", errors="ignore") as json_file:
        raw_text = json_file.read().strip()

    if not raw_text:
        return ""

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        return raw_text

    return json.dumps(parsed, indent=2, ensure_ascii=False).strip()


def _read_csv_text(file_path: str) -> str:
    rows = []
    with open(file_path, "r", encoding="utf-8-sig", newline="", errors="ignore") as csv_file:
        reader = csv.reader(csv_file)
        rows = [", ".join(cell.strip() for cell in row if cell.strip()) for row in reader]

    return "\n".join(row for row in rows if row).strip()


def extract_document_text(file_path: str) -> str:
    extension = Path(file_path).suffix.lower()

    if extension == ".txt" or extension in {".md", ".markdown"}:
        with open(file_path, "r", encoding="utf-8-sig", errors="ignore") as text_file:
            return text_file.read().strip()

    if extension in {".html", ".htm"}:
        return _read_html_text(file_path)

    if extension == ".json":
        return _read_json_text(file_path)

    if extension == ".csv":
        return _read_csv_text(file_path)

    if extension == ".docx":
        return _read_docx_text(file_path)

    if extension == ".pdf":
        documents = PyPDFLoader(file_path).load()
        return "\n".join(document.page_content.strip() for document in documents if document.page_content and document.page_content.strip()).strip()

    raise ValueError(f"Unsupported document format: {extension or 'unknown'}")

def load_document(file_path):

    if not is_supported_document(file_path):
        raise ValueError("Unsupported document format")

    extension = Path(file_path).suffix.lower()

    if extension == ".pdf":
        return PyPDFLoader(file_path).load()

    if extension == ".docx":
        text = _read_docx_text(file_path)
        return [Document(page_content=text, metadata={"source": file_path, "page": 1})] if text else []

    if extension in {".html", ".htm"}:
        text = _read_html_text(file_path)
    elif extension == ".json":
        text = _read_json_text(file_path)
    elif extension == ".csv":
        text = _read_csv_text(file_path)
    else:
        loader = TextLoader(file_path, encoding="utf-8")
        return loader.load()

    return [Document(page_content=text, metadata={"source": file_path, "page": 1})] if text else []


def split_documents(documents):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = splitter.split_documents(
        documents
    )

    return chunks