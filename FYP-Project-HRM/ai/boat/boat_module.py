# boat/boat_module.py

import os
import torch
from sentence_transformers import SentenceTransformer
from transformers import T5Tokenizer, T5ForConditionalGeneration
from sklearn.metrics.pairwise import cosine_similarity
import re
import numpy as np
from datetime import datetime
from typing import List, Dict, Optional

# --------------------------
# Configuration - OPTIMIZED FOR SPEED
# --------------------------
CONFIG = {
    'min_similarity_threshold': 0.35,
    'max_context_docs': 2,
    'max_generation_tokens': 100,
    'temperature': 0.1,
    'num_beams': 2,
    'repetition_penalty': 1.2,
    'use_generation': False
}

# --------------------------
# Memory optimization for 4GB RAM
# --------------------------
torch.set_num_threads(2)

# --------------------------
# Embedding model for RAG
# --------------------------
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# --------------------------
# Generator model (FLAN-T5-small)
# --------------------------
model_name = "google/flan-t5-small"
tokenizer = T5Tokenizer.from_pretrained(model_name)
model = T5ForConditionalGeneration.from_pretrained(model_name)

print("Models loaded!")

# --------------------------
# Load HR documents from folder
# --------------------------
docs_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), "hr_docs")
knowledge_base = []
knowledge_metadata = []
embeddings = None

# Check if folder exists
if not os.path.exists(docs_folder):
    print(f"ERROR: HR documents folder '{docs_folder}' not found! Knowledge base is empty.")
else:
    print(f"\nLoading HR documents from: {docs_folder}")

    def smart_chunk_text(text: str, filename: str) -> List[str]:
        """Intelligently chunk text while preserving context - OPTIMIZED"""
        chunks = []
        text = text.strip()
        if not text:
            return chunks
        
        # Prioritize Q&A patterns first
        qa_pattern = r'(Q:.*?\nA:.*?)(?=\nQ:|$)'
        qa_matches = re.findall(qa_pattern, text, re.DOTALL | re.IGNORECASE)
        if qa_matches:
            for match in qa_matches:
                clean_match = match.strip()
                if len(clean_match) > 20:
                    chunks.append(clean_match)
            return chunks[:10]
        
        # Split by paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        for para in paragraphs:
            clean_para = para.strip()
            if len(clean_para) > 50:
                chunks.append(clean_para)
            elif len(clean_para) > 20:
                chunks.append(clean_para)
        
        if not chunks and len(text) > 20:
            chunks.append(text)
        
        # Deduplicate
        seen = set()
        unique_chunks = []
        for chunk in chunks:
            chunk_hash = hash(chunk[:100])
            if chunk_hash not in seen:
                seen.add(chunk_hash)
                unique_chunks.append(chunk)
        
        return unique_chunks[:15]

    def extract_keywords(text: str) -> set:
        """Extract important keywords from text"""
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        words = re.findall(r'\b[a-z]{3,}\b', text.lower())
        return {word for word in words if word not in stopwords}

    # Load all HR documents
    for filename in os.listdir(docs_folder):
        if filename.endswith(".txt"):
            filepath = os.path.join(docs_folder, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
                    if not text.strip():
                        print(f"  ⚠️ Warning: {filename} is empty, skipping...")
                        continue
                    
                    chunks = smart_chunk_text(text, filename)
                    for chunk in chunks:
                        keywords = extract_keywords(chunk)
                        knowledge_base.append(chunk)
                        knowledge_metadata.append({
                            'source': filename,
                            'keywords': keywords,
                            'preview': chunk[:100] + "..." if len(chunk) > 100 else chunk,
                            'length': len(chunk),
                            'full_text': chunk
                        })
                    
                    print(f"  ✅ Loaded {len(chunks)} chunks from {filename}")
            except Exception as e:
                print(f"  ❌ Error loading {filename}: {e}")

    print(f"\n📚 Total: {len(knowledge_base)} knowledge chunks loaded")

    # Create embeddings
    if len(knowledge_base) > 0:
        print("\n🔍 Creating embeddings for search...")
        embeddings = embed_model.encode(knowledge_base, show_progress_bar=True)
        print("✅ Embeddings created!")
    else:
        embeddings = None

# --------------------------
# Search function
# --------------------------
def search_docs(query: str, top_k: int = 3) -> List[Dict]:
    """Search for relevant documents - IMPROVED matching"""
    if not knowledge_base or embeddings is None:
        return []
    
    query_emb = embed_model.encode([query])
    sims = cosine_similarity(query_emb, embeddings)[0]
    
    top_k_actual = min(top_k * 3, len(sims))
    top_indices = sims.argsort()[-top_k_actual:][::-1]
    
    relevant_docs = []
    query_keywords = set([w for w in query.lower().split() if len(w) > 2])
    
    for idx in top_indices:
        keyword_boost = 0
        if query_keywords and 'keywords' in knowledge_metadata[idx]:
            keyword_match = len(query_keywords & knowledge_metadata[idx]['keywords'])
            keyword_boost = keyword_match * 0.1
        
        final_score = sims[idx] + keyword_boost
        if final_score >= CONFIG['min_similarity_threshold']:
            relevant_docs.append({
                'content': knowledge_base[idx],
                'score': final_score,
                'source': knowledge_metadata[idx]['source'],
                'full_text': knowledge_metadata[idx]['full_text']
            })
    
    relevant_docs.sort(key=lambda x: x['score'], reverse=True)
    return relevant_docs[:top_k]

# --------------------------
# Best answer extraction
# --------------------------
def get_best_answer_from_context(question: str, context_docs: List[Dict]) -> Optional[str]:
    """Extract the most relevant answer from RAG documents"""
    if not context_docs:
        return None
    
    question_lower = question.lower()
    question_words = set(question_lower.split())
    common_words = {'where', 'what', 'how', 'do', 'i', 'my', 'the', 'a', 'an', 'is', 'are', 'to', 'for'}
    question_words -= common_words
    
    for doc in context_docs:
        content = doc['content']
        
        # Q&A matching
        qa_pattern = r'Q:\s*(.*?)\nA:\s*(.*?)(?=\nQ:|$)'
        qa_matches = re.findall(qa_pattern, content, re.DOTALL | re.IGNORECASE)
        for q, a in qa_matches:
            q_words = set(q.lower().split())
            score = len(question_words & q_words) / max(len(question_words), 1)
            if score > 0.5 or ('where' in question_lower and 'where' in q.lower()):
                return a.strip()
        
        # Bullet points
        bullet_pattern = r'[•\-*]\s*(.+?)(?=\n[•\-*]|\n\n|$)'
        bullet_matches = re.findall(bullet_pattern, content, re.DOTALL)
        for bullet in bullet_matches:
            bullet_lower = bullet.lower()
            if 'where' in question_lower and ('portal' in bullet_lower or 'url' in bullet_lower):
                return bullet.strip()
            if 'check in' in question_lower and 'check in' in bullet_lower:
                return bullet.strip()
        
        # URLs
        if 'where' in question_lower:
            urls = re.findall(r'https?://[^\s]+', content)
            if urls:
                return f"Access at: {urls[0]}"
        
        # Fallback: first relevant sentence
        sentences = re.split(r'[.!?]+', content)
        for sentence in sentences:
            if len(sentence.strip()) > 15 and any(w in sentence.lower() for w in question_words):
                return sentence.strip()
    
    return "I found information but couldn't extract a clear answer. Please rephrase your question."

# --------------------------
# Simple greeting/acknowledgment responses
# --------------------------
def get_simple_response(question: str) -> Optional[str]:
    q = question.lower().strip()
    greetings = ["hi", "hello", "hey", "hii", "helloo", "greetings", "good morning", "good afternoon", "good evening"]
    acknowledgments = ["ok", "okay", "thanks", "thank you", "got it", "sure", "fine", "cool", "nice", "alright"]

    if any(greet in q for greet in greetings):
        return "Hello! I'm your HR assistant. How can I help you today?"
    if any(ack in q for ack in acknowledgments):
        return "You're welcome! Is there anything else I can help you with?"
    
    return None

# --------------------------
# Generate answer
# --------------------------
def generate_answer(question: str) -> str:
    """Generate answer using RAG + quick responses"""
    q_lower = question.lower().strip()

    quick_mapping = {
        "check in": "Staff must click 'Check In' at the start of the day before 10:00 AM.",
        "check out": "Staff must click 'Check Out' at the end of the day for accurate attendance tracking.",
        "where to mark attendance": "Log in to LSIT HR portal at https://lsit.edu.pk/attendance or use LSIT Connect mobile app.",
        "forgot attendance": "Contact administration within 24 hours at administration@lsituoe.edu.pk to rectify your attendance.",
        "attendance history": "You can view your attendance history in the LSIT portal or LSIT Connect app under 'Attendance History'.",
        "late check in": "Any check-in after 10:00 AM will be marked as late in your attendance record."
    }
    for key, response in quick_mapping.items():
        if key in q_lower:
            return response

    simple_response = get_simple_response(question)
    if simple_response:
        return simple_response

    if not knowledge_base:
        return "I don't have any HR documents loaded. Please add HR documents to the system."

    relevant_docs = search_docs(question, top_k=3)
    if not relevant_docs:
        topics = set(meta['source'].replace('.txt','').replace('_',' ').title() for meta in knowledge_metadata)
        return f"I couldn't find information about '{question}'. I can help with topics like: {', '.join(sorted(topics))}"

    best_answer = get_best_answer_from_context(question, relevant_docs)
    if not best_answer:
        return "I found relevant information but couldn't extract a clear answer. Please rephrase your question."

    best_answer = best_answer.strip()
    if best_answer.startswith('Q:'):
        best_answer = best_answer.split('A:')[-1].strip()
    
    return best_answer

# --------------------------
# Document stats
# --------------------------
def get_document_stats() -> Dict:
    sources = {}
    for meta in knowledge_metadata:
        source = meta['source']
        if source not in sources:
            sources[source] = {'chunks': 0, 'total_chars': 0}
        sources[source]['chunks'] += 1
        sources[source]['total_chars'] += meta.get('length', 0)
    return {
        'total_chunks': len(knowledge_base),
        'total_documents': len(sources),
        'documents': sources
    }

# --------------------------
# Main predict function for Flask
# --------------------------
def predict(data: dict) -> dict:
    action = data.get('action')

    if action == 'ask':
        question = data.get('question', '')
        if not question:
            return {'status': 'error', 'answer': 'No question provided.'}
        try:
            start_time = datetime.now()
            answer = generate_answer(question)
            elapsed = (datetime.now() - start_time).total_seconds()
            return {'status': 'success', 'answer': answer, 'response_time': elapsed}
        except Exception as e:
            return {'status': 'error', 'answer': f"Error: {str(e)}"}

    elif action == 'search':
        query = data.get('query', '')
        top_k = data.get('top_k', 5)
        if not query:
            return {'status': 'error', 'results': []}
        try:
            results = search_docs(query, top_k)
            clean_results = [{'content': r['content'][:300], 'score': float(r['score']), 'source': r['source']} for r in results]
            return {'status': 'success', 'results': clean_results}
        except Exception as e:
            return {'status': 'error', 'results': [], 'error': str(e)}

    elif action == 'status':
        return {'status': 'success', 'data': {'knowledge_base_size': len(knowledge_base), 'documents_loaded': len(knowledge_base) > 0}}

    elif action == 'list_documents':
        stats = get_document_stats()
        return {'status': 'success', 'documents': list(stats['documents'].keys())}

    else:
        return {'status': 'error', 'answer': 'Unknown action.'}

# --------------------------
# CLI mode
# --------------------------
def run_cli():
    stats = get_document_stats()
    print("\n" + "="*50)
    print("🤖 HR Assistant")
    print("="*50)
    print(f"📚 Loaded: {len(knowledge_base)} chunks from {stats['total_documents']} documents")
    print("Type 'exit' to quit\n")

    while True:
        question = input("You: ").strip()
        if question.lower() in ["exit", "quit", "bye"]:
            print("Bot: Goodbye!")
            break
        if not question:
            continue
        print("Bot: ", end="", flush=True)
        start_time = datetime.now()
        answer = generate_answer(question)
        elapsed = (datetime.now() - start_time).total_seconds()
        print(answer)
        print(f"({elapsed:.2f}s)\n")

if __name__ == "__main__":
    run_cli()