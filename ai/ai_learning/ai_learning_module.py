# ai/ai_learning/ai_learning_module.py
from sentence_transformers import SentenceTransformer
import pandas as pd
import numpy as np
import chromadb
import logging
import os
import spacy

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables to cache models and data
_model = None
_nlp = None
_collection = None
_courses_df = None

def initialize():
    """Initialize all models and data (called once when module loads)"""
    global _model, _nlp, _collection, _courses_df
    
    print("Initializing AI Learning Module...")
    
    # Load SentenceTransformer model
    try:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("✓ SentenceTransformer model loaded")
    except Exception as e:
        logger.error(f"Failed to load SentenceTransformer: {e}")
        raise
    
    # Load spaCy model
    try:
        _nlp = spacy.load("en_core_web_sm")
        print("✓ spaCy model loaded")
    except:
        print("Downloading spaCy model...")
        os.system("python -m spacy download en_core_web_sm")
        _nlp = spacy.load("en_core_web_sm")
        print("✓ spaCy model downloaded and loaded")
    
    # Course dataset
    courses = [
        {"id": 1, "title": "Machine Learning Fundamentals", "skills": "machine learning python scikit-learn", "platform": "Coursera", "duration": "25 hours", "level": "Beginner", "rating": 4.7, "students": 250000, "category": "AI/ML", "job_roles": "data scientist machine learning engineer"},
        {"id": 2, "title": "Deep Learning Specialization", "skills": "deep learning neural networks tensorflow pytorch", "platform": "DeepLearning.AI", "duration": "40 hours", "level": "Intermediate", "rating": 4.9, "students": 500000, "category": "AI/ML", "job_roles": "deep learning engineer ai researcher ml engineer"},
        {"id": 3, "title": "Python for Everybody", "skills": "python programming basics", "platform": "Coursera", "duration": "35 hours", "level": "Beginner", "rating": 4.8, "students": 300000, "category": "Programming", "job_roles": "python developer software engineer"},
        {"id": 4, "title": "React - The Complete Guide", "skills": "react javascript frontend web development", "platform": "Udemy", "duration": "30 hours", "level": "Intermediate", "rating": 4.6, "students": 150000, "category": "Web Development", "job_roles": "frontend developer react developer"},
        {"id": 5, "title": "AWS Certified Solutions Architect", "skills": "aws cloud architecture devops", "platform": "Udemy", "duration": "50 hours", "level": "Advanced", "rating": 4.7, "students": 120000, "category": "Cloud", "job_roles": "cloud engineer devops engineer solutions architect"},
    ]
    _courses_df = pd.DataFrame(courses)
    
    # Setup ChromaDB
    DB_PATH = "./chromadb_data"
    os.makedirs(DB_PATH, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=DB_PATH)
    
    collection_name = "courses"
    
    try:
        _collection = chroma_client.get_collection(collection_name)
        print(f"✓ Using existing collection: {collection_name}")
    except:
        _collection = chroma_client.create_collection(name=collection_name, metadata={"hnsw:space": "cosine"})
        print(f"✓ Created new collection: {collection_name}")
    
    # Precompute embeddings if collection is empty
    if _collection.count() == 0:
        print("Adding courses to vector database...")
        course_texts = [(f"{c['title']} {c['skills']} {c.get('category','')} {c.get('job_roles','')}") for c in courses]
        embeddings = _model.encode(course_texts).tolist()
        metadatas = [{k:str(v) for k,v in c.items()} for c in courses]
        _collection.add(embeddings=embeddings, documents=course_texts, metadatas=metadatas, ids=[str(c['id']) for c in courses])
        print(f"✓ Added {len(courses)} courses to ChromaDB")
    
    print("AI Learning Module initialized successfully")

# Initialize when module loads
initialize()

def extract_skills_from_text(text):
    """Extract technical skills from text"""
    tech_skills_db = {"python", "java", "javascript", "react", "node", "aws", "docker", "sql", "tensorflow", "pytorch", "ml", "deep learning", "scikit-learn", "frontend", "backend"}
    text = text.lower()
    return [skill for skill in tech_skills_db if skill in text]

def predict(data):
    """
    Predict course recommendations based on user data
    
    Expected data formats:
    1. With resume file: {'resume_file': file_object}
    2. With skills list: {'skills': ['python', 'machine learning']}
    3. With text: {'text': 'resume text content'}
    
    Returns: {
        'status': 'success',
        'recommendations': [...],
        'extracted_skills': [...]
    }
    """
    try:
        # Handle different input formats
        skills = []
        
        # Case 1: Skills directly provided
        if 'skills' in data and data['skills']:
            skills = data['skills']
        
        # Case 2: Text provided (resume content)
        elif 'text' in data and data['text']:
            text = data['text']
            skills = extract_skills_from_text(text)
        
        # Case 3: File object provided (for integration with file upload)
        elif 'resume_file' in data and data['resume_file']:
            # This would need file processing logic
            # For now, return error
            return {
                'status': 'error',
                'message': 'File processing not implemented in predict function'
            }
        
        # Case 4: No valid input
        else:
            return {
                'status': 'error',
                'message': 'No skills or text provided. Please provide "skills" or "text" in request'
            }
        
        if not skills:
            return {
                'status': 'error',
                'message': 'No skills extracted from input',
                'extracted_skills': []
            }
        
        # Get recommendations based on skills
        user_embedding = _model.encode([" ".join(skills)]).tolist()[0]
        results = _collection.query(query_embeddings=[user_embedding], n_results=5)
        
        recommendations = []
        for i, course_meta in enumerate(results['metadatas'][0]):
            recommendations.append({
                "id": int(course_meta["id"]),
                "title": course_meta["title"],
                "platform": course_meta["platform"],
                "skills": course_meta["skills"].split(),
                "duration": course_meta.get("duration", "N/A"),
                "level": course_meta.get("level", "N/A"),
                "rating": float(course_meta.get("rating", 0)),
                "students": int(course_meta.get("students", 0)),
                "category": course_meta.get("category", "N/A"),
                "relevance_score": float(1 - results['distances'][0][i]/2),
                "relevance_percentage": int((1 - results['distances'][0][i]/2)*100)
            })
        
        return {
            'status': 'success',
            'extracted_skills': skills,
            'recommendations': recommendations,
            'total_recommendations': len(recommendations)
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return {
            'status': 'error',
            'message': str(e)
        }

# For testing the module directly
if __name__ == "__main__":
    # Test the predict function
    test_data = {
        'skills': ['python', 'machine learning']
    }
    result = predict(test_data)
    print(result)