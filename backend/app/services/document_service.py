from langchain_community.document_loaders import PyPDFLoader, TextLoader

from langchain_text_splitters import (
    RecursiveCharacterTextSplitter
)

def load_document(file_path):

    if file_path.lower().endswith(".txt"):
        loader = TextLoader(file_path, encoding="utf-8")
    else:
        loader = PyPDFLoader(file_path)

    documents = loader.load()

    return documents


def split_documents(documents):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )

    chunks = splitter.split_documents(
        documents
    )

    return chunks