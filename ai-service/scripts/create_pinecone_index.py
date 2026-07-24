import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

# Load environment variables
load_dotenv()

def create_index():
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("Error: PINECONE_API_KEY not found in environment or .env file.")
        sys.exit(1)
        
    pc = Pinecone(api_key=api_key)
    index_name = "legalease-clauses"
    
    # Check existing indexes
    existing_indexes = [idx.name for idx in pc.list_indexes()]
    print(f"Existing Pinecone indexes: {existing_indexes}")
    
    if index_name in existing_indexes:
        print(f"Index '{index_name}' already exists.")
        return
        
    print(f"Index '{index_name}' does not exist. Creating...")
    try:
        env = os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
        pc.create_index(
            name=index_name,
            dimension=1536,
            metric="cosine",
            spec=ServerlessSpec(
                cloud="aws",
                region=env
            )
        )
        print(f"Successfully created index '{index_name}'.")
    except Exception as e:
        print(f"Failed to create index '{index_name}': {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_index()
