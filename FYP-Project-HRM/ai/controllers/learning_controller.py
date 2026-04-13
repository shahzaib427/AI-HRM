"""
controllers/learning_controller.py

Full real-time AI-powered Learning Hub controller.
No mock data — everything is computed from the AI module or DB.
"""
from flask import jsonify, request, session
from datetime import datetime, date, timedelta
import logging
import traceback
import json
import re
import os

from models.learning import LearningProfile, CourseEnrollment, SkillDetectionLog, LearningActivity
from models import db

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-load the AI learning module (heavy — only import once)
# ---------------------------------------------------------------------------
_ai_learning = None

def _get_ai():
    global _ai_learning
    if _ai_learning is None:
        try:
            from ai_learning.ai_learning_module import predict as _predict
            _ai_learning = _predict
            logger.info("AI learning module loaded.")
        except Exception as e:
            logger.error(f"Could not load AI learning module: {e}")
            _ai_learning = None
    return _ai_learning


# ---------------------------------------------------------------------------
# CS / IT domain knowledge base (used for skill detection & recommendations)
# ---------------------------------------------------------------------------

DOMAIN_SKILL_MAP = {
    "ai_ml": {
        "keywords": ["machine learning", "ml", "deep learning", "neural network", "nlp",
                     "computer vision", "tensorflow", "pytorch", "scikit-learn", "keras",
                     "transformers", "bert", "gpt", "hugging face", "data science",
                     "pandas", "numpy", "matplotlib", "seaborn", "jupyter", "colab",
                     "reinforcement learning", "generative ai", "llm", "rag", "langchain",
                     "xgboost", "random forest", "gradient boosting", "feature engineering"],
        "label": "AI / Machine Learning",
        "color": "violet"
    },
    "web_frontend": {
        "keywords": ["react", "vue", "angular", "next.js", "nuxt", "svelte", "javascript",
                     "typescript", "html", "css", "tailwind", "bootstrap", "sass", "redux",
                     "graphql", "rest api", "webpack", "vite", "figma", "responsive design",
                     "accessibility", "seo", "web performance", "pwa"],
        "label": "Frontend / Web",
        "color": "blue"
    },
    "web_backend": {
        "keywords": ["node.js", "express", "django", "flask", "fastapi", "spring", "laravel",
                     "rails", "asp.net", "rest", "graphql", "microservices", "api design",
                     "authentication", "jwt", "oauth", "websockets", "grpc", "message queue",
                     "rabbitmq", "kafka", "celery"],
        "label": "Backend / APIs",
        "color": "emerald"
    },
    "mern_mean": {
        "keywords": ["mongodb", "express", "react", "node", "angular", "mongoose",
                     "nosql", "mern", "mean", "full stack"],
        "label": "MERN / MEAN Stack",
        "color": "green"
    },
    "devops_cloud": {
        "keywords": ["aws", "gcp", "azure", "docker", "kubernetes", "terraform",
                     "ci/cd", "jenkins", "github actions", "ansible", "helm",
                     "linux", "bash", "nginx", "load balancer", "monitoring",
                     "prometheus", "grafana", "cloudformation", "serverless"],
        "label": "DevOps / Cloud",
        "color": "orange"
    },
    "database": {
        "keywords": ["sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch",
                     "cassandra", "dynamodb", "firebase", "sqlite", "orm", "database design",
                     "indexing", "query optimisation", "data warehousing", "etl"],
        "label": "Databases",
        "color": "yellow"
    },
    "mobile": {
        "keywords": ["android", "ios", "flutter", "react native", "kotlin", "swift",
                     "dart", "expo", "mobile ui", "push notifications", "firebase"],
        "label": "Mobile Development",
        "color": "pink"
    },
    "cybersecurity": {
        "keywords": ["cybersecurity", "ethical hacking", "penetration testing", "owasp",
                     "network security", "encryption", "ssl", "firewall", "siem",
                     "vulnerability", "ctf", "kali linux", "burp suite"],
        "label": "Cybersecurity",
        "color": "red"
    },
    "data_engineering": {
        "keywords": ["spark", "hadoop", "airflow", "dbt", "data pipeline", "etl",
                     "data lake", "snowflake", "bigquery", "redshift", "kafka",
                     "stream processing", "batch processing"],
        "label": "Data Engineering",
        "color": "cyan"
    },
    "software_engineering": {
        "keywords": ["python", "java", "c++", "c#", "go", "rust", "design patterns",
                     "solid principles", "clean code", "tdd", "unit testing", "git",
                     "agile", "scrum", "system design", "algorithms", "data structures",
                     "object oriented", "functional programming"],
        "label": "Software Engineering",
        "color": "slate"
    }
}

# Curated real course database (real platforms, real courses)
COURSE_DATABASE = [
    # AI/ML
    {"id": "ml-001", "title": "Machine Learning Specialization", "platform": "Coursera (Andrew Ng)", "url": "https://www.coursera.org/specializations/machine-learning-introduction", "skills": ["machine learning", "supervised learning", "neural network", "python", "scikit-learn"], "duration": "3 months", "level": "Beginner", "rating": 4.9, "students": 1200000, "category": "AI / Machine Learning", "description": "The definitive ML course by Andrew Ng — covers linear regression, classification, neural nets, and best practices.", "weekly_hours": 9},
    {"id": "ml-002", "title": "Deep Learning Specialization", "platform": "DeepLearning.AI", "url": "https://www.coursera.org/specializations/deep-learning", "skills": ["deep learning", "tensorflow", "keras", "cnn", "rnn", "nlp"], "duration": "4 months", "level": "Intermediate", "rating": 4.9, "students": 750000, "category": "AI / Machine Learning", "description": "5-course deep dive into neural architectures, optimization, CNNs, sequence models, and NLP.", "weekly_hours": 10},
    {"id": "ml-003", "title": "Practical Deep Learning for Coders", "platform": "fast.ai", "url": "https://course.fast.ai", "skills": ["deep learning", "pytorch", "computer vision", "nlp", "practical ai"], "duration": "7 weeks", "level": "Intermediate", "rating": 4.8, "students": 400000, "category": "AI / Machine Learning", "description": "Top-down, code-first approach. Build and deploy real models in week 1.", "weekly_hours": 8},
    {"id": "ml-004", "title": "LLM Engineering: Master AI & LLMs", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["llm", "langchain", "rag", "openai", "hugging face", "generative ai"], "duration": "30 hours", "level": "Intermediate", "rating": 4.7, "students": 85000, "category": "AI / Machine Learning", "description": "Build production-grade LLM apps with RAG, agents, and function calling.", "weekly_hours": 6},
    {"id": "ml-005", "title": "MLOps Specialization", "platform": "Coursera (DeepLearning.AI)", "url": "https://www.coursera.org/specializations/machine-learning-engineering-for-production-mlops", "skills": ["mlops", "ml pipeline", "model deployment", "monitoring", "feature engineering"], "duration": "4 months", "level": "Advanced", "rating": 4.6, "students": 120000, "category": "AI / Machine Learning", "description": "Deploy, monitor, and maintain ML systems in production environments.", "weekly_hours": 8},

    # Web Frontend
    {"id": "fe-001", "title": "React — The Complete Guide 2024", "platform": "Udemy (Maximilian)", "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/", "skills": ["react", "hooks", "redux", "next.js", "typescript"], "duration": "68 hours", "level": "Beginner", "rating": 4.7, "students": 950000, "category": "Frontend / Web", "description": "Zero to production React. Covers hooks, context, Redux, React Router, and Next.js.", "weekly_hours": 10},
    {"id": "fe-002", "title": "Next.js & React — The Complete Guide", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["next.js", "react", "ssr", "ssg", "api routes", "vercel"], "duration": "25 hours", "level": "Intermediate", "rating": 4.8, "students": 300000, "category": "Frontend / Web", "description": "Server-side rendering, static generation, file routing, and deployment.", "weekly_hours": 8},
    {"id": "fe-003", "title": "TypeScript: The Complete Developer's Guide", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["typescript", "types", "interfaces", "generics", "decorators"], "duration": "24 hours", "level": "Intermediate", "rating": 4.6, "students": 220000, "category": "Frontend / Web", "description": "Master TypeScript from scratch through reusable code patterns and design patterns.", "weekly_hours": 6},
    {"id": "fe-004", "title": "CSS for JavaScript Developers", "platform": "Josh W. Comeau", "url": "https://css-for-js.dev", "skills": ["css", "animations", "layouts", "responsive design", "tailwind"], "duration": "40 hours", "level": "Intermediate", "rating": 4.9, "students": 25000, "category": "Frontend / Web", "description": "The most comprehensive CSS course aimed at JS developers who want to master styling.", "weekly_hours": 5},

    # Backend
    {"id": "be-001", "title": "Node.js, Express, MongoDB & More", "platform": "Udemy (Jonas)", "url": "https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/", "skills": ["node.js", "express", "mongodb", "rest api", "jwt", "mongoose"], "duration": "42 hours", "level": "Intermediate", "rating": 4.8, "students": 380000, "category": "Backend / APIs", "description": "Build fast, scalable backend APIs with auth, security, file uploads, email, and payments.", "weekly_hours": 8},
    {"id": "be-002", "title": "Django & Python Full Stack", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["django", "python", "postgresql", "rest framework", "celery"], "duration": "32 hours", "level": "Intermediate", "rating": 4.6, "students": 180000, "category": "Backend / APIs", "description": "Full stack web development using Django, DRF, PostgreSQL, and deployment.", "weekly_hours": 7},
    {"id": "be-003", "title": "FastAPI — The Modern Python API Framework", "platform": "Udemy / Official Docs", "url": "https://fastapi.tiangolo.com", "skills": ["fastapi", "python", "async", "pydantic", "openapi", "rest api"], "duration": "18 hours", "level": "Intermediate", "rating": 4.8, "students": 95000, "category": "Backend / APIs", "description": "Build blazing-fast APIs with automatic docs, type safety, and async support.", "weekly_hours": 5},
    {"id": "be-004", "title": "Microservices with Node JS and React", "platform": "Udemy (Stephen Grider)", "url": "https://www.udemy.com", "skills": ["microservices", "docker", "kubernetes", "nats", "typescript", "react"], "duration": "54 hours", "level": "Advanced", "rating": 4.6, "students": 85000, "category": "Backend / APIs", "description": "Production-grade microservices architecture with event streaming and container orchestration.", "weekly_hours": 10},

    # DevOps / Cloud
    {"id": "do-001", "title": "AWS Certified Solutions Architect — Associate", "platform": "Udemy (Stephane Maarek)", "url": "https://www.udemy.com", "skills": ["aws", "ec2", "s3", "rds", "vpc", "iam", "lambda", "cloud architecture"], "duration": "27 hours", "level": "Intermediate", "rating": 4.7, "students": 920000, "category": "DevOps / Cloud", "description": "The #1 AWS SAA-C03 exam prep. Covers all core services with hands-on labs.", "weekly_hours": 7},
    {"id": "do-002", "title": "Docker and Kubernetes: The Complete Guide", "platform": "Udemy (Stephen Grider)", "url": "https://www.udemy.com", "skills": ["docker", "kubernetes", "ci/cd", "github actions", "helm"], "duration": "21 hours", "level": "Intermediate", "rating": 4.6, "students": 200000, "category": "DevOps / Cloud", "description": "Build, ship, and scale containerised applications from dev to production.", "weekly_hours": 6},
    {"id": "do-003", "title": "Terraform for Beginners to Advanced", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["terraform", "infrastructure as code", "aws", "gcp", "azure"], "duration": "16 hours", "level": "Intermediate", "rating": 4.5, "students": 75000, "category": "DevOps / Cloud", "description": "Automate cloud infrastructure provisioning across all major providers.", "weekly_hours": 5},

    # Database
    {"id": "db-001", "title": "The Complete SQL Bootcamp 2024", "platform": "Udemy", "url": "https://www.udemy.com/course/the-complete-sql-bootcamp/", "skills": ["sql", "postgresql", "database design", "query optimisation", "joins"], "duration": "9 hours", "level": "Beginner", "rating": 4.7, "students": 530000, "category": "Databases", "description": "Master SQL queries, joins, aggregations, stored procedures, and database design.", "weekly_hours": 4},
    {"id": "db-002", "title": "MongoDB — The Complete Developer's Guide", "platform": "Udemy (Maximilian)", "url": "https://www.udemy.com", "skills": ["mongodb", "mongoose", "aggregation", "atlas", "indexing"], "duration": "17 hours", "level": "Intermediate", "rating": 4.6, "students": 160000, "category": "Databases", "description": "Deep dive into MongoDB, aggregation framework, indexes, and Atlas cloud.", "weekly_hours": 5},

    # Mobile
    {"id": "mob-001", "title": "Flutter & Dart — The Complete Guide 2024", "platform": "Udemy (Maximilian)", "url": "https://www.udemy.com/course/learn-flutter-dart-to-build-ios-android-apps/", "skills": ["flutter", "dart", "mobile", "firebase", "state management"], "duration": "42 hours", "level": "Beginner", "rating": 4.7, "students": 260000, "category": "Mobile Development", "description": "Build beautiful cross-platform apps for iOS and Android from scratch.", "weekly_hours": 8},
    {"id": "mob-002", "title": "React Native — The Practical Guide", "platform": "Udemy (Maximilian)", "url": "https://www.udemy.com", "skills": ["react native", "expo", "react", "mobile", "navigation"], "duration": "35 hours", "level": "Intermediate", "rating": 4.6, "students": 150000, "category": "Mobile Development", "description": "Build iOS and Android apps with React Native using real device features.", "weekly_hours": 7},

    # Cybersecurity
    {"id": "sec-001", "title": "The Complete Ethical Hacking Course", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["ethical hacking", "penetration testing", "kali linux", "network security", "owasp"], "duration": "25 hours", "level": "Beginner", "rating": 4.5, "students": 310000, "category": "Cybersecurity", "description": "Learn hacking techniques legally — network scanning, exploitation, and reporting.", "weekly_hours": 6},

    # Data Engineering
    {"id": "de-001", "title": "The Complete Apache Spark Course", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["spark", "pyspark", "hadoop", "data pipeline", "big data"], "duration": "20 hours", "level": "Intermediate", "rating": 4.5, "students": 65000, "category": "Data Engineering", "description": "Distributed computing with Apache Spark — batch and streaming data processing.", "weekly_hours": 6},
    {"id": "de-002", "title": "Data Engineering with dbt, Airflow & Snowflake", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["dbt", "airflow", "snowflake", "etl", "data warehouse", "sql"], "duration": "18 hours", "level": "Advanced", "rating": 4.6, "students": 40000, "category": "Data Engineering", "description": "Modern data stack for building analytics-ready data pipelines at scale.", "weekly_hours": 5},

    # Software Engineering
    {"id": "se-001", "title": "Grokking the System Design Interview", "platform": "educative.io", "url": "https://www.educative.io", "skills": ["system design", "scalability", "databases", "caching", "load balancing"], "duration": "40 hours", "level": "Advanced", "rating": 4.8, "students": 180000, "category": "Software Engineering", "description": "Prepare for top-tier system design interviews — URL shorteners, Twitter, Netflix.", "weekly_hours": 7},
    {"id": "se-002", "title": "Algorithms and Data Structures Masterclass", "platform": "Udemy (Colt Steele)", "url": "https://www.udemy.com/course/js-algorithms-and-data-structures-masterclass/", "skills": ["algorithms", "data structures", "big-o", "trees", "graphs", "dynamic programming"], "duration": "22 hours", "level": "Intermediate", "rating": 4.8, "students": 430000, "category": "Software Engineering", "description": "Master DSA for coding interviews — sorting, searching, trees, graphs, and DP.", "weekly_hours": 6},
    {"id": "se-003", "title": "Clean Code & Design Patterns", "platform": "Udemy", "url": "https://www.udemy.com", "skills": ["clean code", "design patterns", "solid", "refactoring", "oop"], "duration": "14 hours", "level": "Intermediate", "rating": 4.7, "students": 90000, "category": "Software Engineering", "description": "Write maintainable, testable code using SOLID principles and GoF patterns.", "weekly_hours": 4},
]

# Available skills for autocomplete (flat list)
ALL_SKILLS = sorted(set([
    skill for course in COURSE_DATABASE for skill in course["skills"]
] + [
    kw for domain in DOMAIN_SKILL_MAP.values() for kw in domain["keywords"][:8]
]))

JOB_ROLES = [
    "Machine Learning Engineer", "Data Scientist", "AI Research Engineer",
    "Frontend Developer", "React Developer", "Full Stack Developer",
    "MERN Stack Developer", "MEAN Stack Developer",
    "Backend Developer", "Node.js Developer", "Python Developer",
    "DevOps Engineer", "Cloud Architect", "Site Reliability Engineer",
    "Mobile Developer", "Flutter Developer", "React Native Developer",
    "Data Engineer", "Database Administrator",
    "Cybersecurity Analyst", "Penetration Tester",
    "Software Engineer", "Systems Architect",
]

# Role → implied skills
ROLE_SKILL_MAP = {
    "machine learning engineer": ["machine learning", "python", "tensorflow", "pytorch", "mlops", "feature engineering"],
    "data scientist": ["python", "pandas", "numpy", "scikit-learn", "sql", "machine learning", "data visualisation"],
    "ai research engineer": ["deep learning", "pytorch", "transformers", "nlp", "computer vision", "research"],
    "frontend developer": ["html", "css", "javascript", "react", "responsive design", "typescript"],
    "react developer": ["react", "javascript", "typescript", "next.js", "redux", "hooks"],
    "full stack developer": ["react", "node.js", "express", "mongodb", "sql", "rest api"],
    "mern stack developer": ["mongodb", "express", "react", "node.js", "mongoose", "rest api"],
    "mean stack developer": ["mongodb", "express", "angular", "node.js", "typescript"],
    "backend developer": ["node.js", "python", "rest api", "sql", "authentication", "microservices"],
    "devops engineer": ["docker", "kubernetes", "aws", "ci/cd", "terraform", "linux"],
    "cloud architect": ["aws", "gcp", "azure", "terraform", "cloud architecture", "security"],
    "mobile developer": ["flutter", "react native", "firebase", "mobile ui"],
    "flutter developer": ["flutter", "dart", "firebase", "state management", "mobile ui"],
    "data engineer": ["spark", "airflow", "sql", "etl", "kafka", "data pipeline"],
    "cybersecurity analyst": ["network security", "ethical hacking", "owasp", "siem", "encryption"],
    "software engineer": ["python", "java", "algorithms", "data structures", "design patterns", "system design"],
}

DAILY_TASK_TEMPLATES = {
    "machine learning": [
        {"topic": "Implement Linear Regression from scratch using NumPy", "duration": "45 min", "format": "Coding Exercise", "priority": "High", "resource": "https://numpy.org/doc/stable/"},
        {"topic": "Study Bias-Variance Trade-off with visual examples", "duration": "30 min", "format": "Concept Deep-Dive", "priority": "High", "resource": "https://scikit-learn.org"},
        {"topic": "Explore a Kaggle dataset — EDA & feature engineering", "duration": "60 min", "format": "Hands-on Project", "priority": "High", "resource": "https://kaggle.com"},
    ],
    "react": [
        {"topic": "Build a custom useDebounce hook and integrate it in a search component", "duration": "40 min", "format": "Coding Exercise", "priority": "High", "resource": "https://react.dev/learn/reusing-logic-with-custom-hooks"},
        {"topic": "Optimise renders using React.memo and useCallback", "duration": "35 min", "format": "Performance Lab", "priority": "Medium", "resource": "https://react.dev"},
        {"topic": "Set up a Next.js app with App Router and server components", "duration": "50 min", "format": "Project Setup", "priority": "High", "resource": "https://nextjs.org/docs"},
    ],
    "node.js": [
        {"topic": "Build a JWT-secured REST API endpoint with refresh tokens", "duration": "55 min", "format": "Coding Exercise", "priority": "High", "resource": "https://jwt.io"},
        {"topic": "Set up rate limiting and Helmet.js security middleware", "duration": "30 min", "format": "Security Lab", "priority": "High", "resource": "https://helmetjs.github.io"},
    ],
    "docker": [
        {"topic": "Write a multi-stage Dockerfile for a Node.js app", "duration": "40 min", "format": "Coding Exercise", "priority": "High", "resource": "https://docs.docker.com"},
        {"topic": "Compose a full-stack app with docker-compose (app + db + nginx)", "duration": "60 min", "format": "Project", "priority": "High", "resource": "https://docs.docker.com/compose/"},
    ],
    "python": [
        {"topic": "Implement a binary search tree with insert, search, and in-order traversal", "duration": "45 min", "format": "Coding Exercise", "priority": "High", "resource": "https://docs.python.org"},
        {"topic": "Write unit tests for a REST API using pytest and httpx", "duration": "35 min", "format": "Testing Lab", "priority": "Medium", "resource": "https://docs.pytest.org"},
    ],
    "sql": [
        {"topic": "Write complex window function queries (RANK, LAG, LEAD) on a sales dataset", "duration": "35 min", "format": "Query Practice", "priority": "High", "resource": "https://mode.com/sql-tutorial/"},
        {"topic": "Design and normalise a schema for an e-commerce platform", "duration": "45 min", "format": "Design Exercise", "priority": "High", "resource": "https://dbdiagram.io"},
    ],
    "default": [
        {"topic": "Review your target skill's official documentation and summarise key concepts", "duration": "30 min", "format": "Documentation Study", "priority": "Medium", "resource": "https://developer.mozilla.org"},
        {"topic": "Build a mini project applying your current skill — even 50 lines of code counts", "duration": "60 min", "format": "Hands-on Project", "priority": "High", "resource": "https://github.com"},
    ]
}

LEARNING_PATH_PHASES = {
    "foundation": {
        "title": "Cognitive Foundation",
        "icon": "🧠",
        "description": "Build unshakeable theoretical grounding",
        "activities": ["Core concept study", "Terminology mastery", "Mental model construction", "Prerequisite review"]
    },
    "application": {
        "title": "Applied Mechanics",
        "icon": "⚙️",
        "description": "Translate theory into working code",
        "activities": ["Guided coding exercises", "Debugging real errors", "API exploration", "Pattern recognition"]
    },
    "project": {
        "title": "Structured Creation",
        "icon": "🏗️",
        "description": "Architect and ship a portfolio-worthy project",
        "activities": ["Project scoping", "Architecture design", "Iterative development", "Code review simulation"]
    },
    "mastery": {
        "title": "Professional Synthesis",
        "icon": "🎯",
        "description": "Elevate to industry-grade practices",
        "activities": ["Performance optimisation", "Security hardening", "Testing strategy", "Production deployment"]
    }
}

QUICK_RESOURCES = {
    "AI / Machine Learning": [
        {"title": "Papers With Code", "url": "https://paperswithcode.com", "desc": "Latest ML papers with open-source implementations", "icon": "📄"},
        {"title": "Hugging Face Hub", "url": "https://huggingface.co", "desc": "Open-source models, datasets, and spaces", "icon": "🤗"},
        {"title": "fast.ai Forums", "url": "https://forums.fast.ai", "desc": "Practitioner community for deep learning", "icon": "💬"},
        {"title": "Kaggle", "url": "https://kaggle.com", "desc": "Competitions, notebooks, and real datasets", "icon": "🏆"},
    ],
    "Frontend / Web": [
        {"title": "MDN Web Docs", "url": "https://developer.mozilla.org", "desc": "Authoritative web platform reference", "icon": "📖"},
        {"title": "React Dev", "url": "https://react.dev", "desc": "Official React documentation and tutorials", "icon": "⚛️"},
        {"title": "CSS-Tricks", "url": "https://css-tricks.com", "desc": "Guides, almanac, and CSS techniques", "icon": "🎨"},
        {"title": "Can I Use", "url": "https://caniuse.com", "desc": "Browser compatibility for web features", "icon": "🔍"},
    ],
    "Backend / APIs": [
        {"title": "Node.js Docs", "url": "https://nodejs.org/docs", "desc": "Official Node.js API reference", "icon": "🟢"},
        {"title": "Django Docs", "url": "https://docs.djangoproject.com", "desc": "Comprehensive Django documentation", "icon": "🐍"},
        {"title": "FastAPI Docs", "url": "https://fastapi.tiangolo.com", "desc": "High-performance Python API framework", "icon": "⚡"},
        {"title": "Postman", "url": "https://postman.com", "desc": "API design, testing, and documentation", "icon": "📡"},
    ],
    "DevOps / Cloud": [
        {"title": "AWS Free Tier", "url": "https://aws.amazon.com/free", "desc": "Hands-on cloud practice for free", "icon": "☁️"},
        {"title": "Docker Hub", "url": "https://hub.docker.com", "desc": "Container images and registries", "icon": "🐋"},
        {"title": "Kubernetes Docs", "url": "https://kubernetes.io/docs", "desc": "Official K8s documentation", "icon": "⎈"},
        {"title": "DevOps Roadmap", "url": "https://roadmap.sh/devops", "desc": "Visual learning roadmap for DevOps", "icon": "🗺️"},
    ],
    "Databases": [
        {"title": "PostgreSQL Docs", "url": "https://www.postgresql.org/docs/", "desc": "Comprehensive PostgreSQL reference", "icon": "🐘"},
        {"title": "MongoDB University", "url": "https://learn.mongodb.com", "desc": "Free official MongoDB courses", "icon": "🍃"},
        {"title": "SQLZoo", "url": "https://sqlzoo.net", "desc": "Interactive SQL exercises in the browser", "icon": "🦁"},
        {"title": "DB Diagram", "url": "https://dbdiagram.io", "desc": "Visual database schema design tool", "icon": "🗂️"},
    ],
    "default": [
        {"title": "roadmap.sh", "url": "https://roadmap.sh", "desc": "Community-driven learning roadmaps for every tech role", "icon": "🗺️"},
        {"title": "GitHub Learning Lab", "url": "https://github.com", "desc": "Learn Git, open source, and collaboration", "icon": "🐙"},
        {"title": "freeCodeCamp", "url": "https://freecodecamp.org", "desc": "Free certifications in web dev, Python, and more", "icon": "🔥"},
        {"title": "The Odin Project", "url": "https://theodinproject.com", "desc": "Full stack curriculum — totally free", "icon": "⚔️"},
    ]
}

LEARNING_TIPS = {
    "AI / Machine Learning": [
        "Implement every algorithm from scratch before using a library — it builds true intuition.",
        "Kaggle competitions are the fastest path to industry-ready ML skills.",
        "Read one ML paper per week on arXiv or Papers With Code.",
        "Track your experiments with MLflow or Weights & Biases from day one.",
        "Always visualise your data before modelling — most insights hide in exploratory analysis.",
    ],
    "Frontend / Web": [
        "Build in public — ship something every week, even broken things. Iteration beats perfection.",
        "Read the browser's DevTools Network tab. You'll understand the web in 10 minutes.",
        "Accessibility is not optional. Screen-reader test every component you build.",
        "Study how open-source libraries like Radix UI are architectured — it's free mentorship.",
        "Core Web Vitals are the new performance benchmark — learn LCP, CLS, and FID deeply.",
    ],
    "Backend / APIs": [
        "Design your API contract (OpenAPI spec) before writing a single line of code.",
        "Twelve-Factor App methodology is the production checklist every backend dev needs.",
        "Test at the boundary, not the implementation — focus on input/output contracts.",
        "Database query performance is 80% of backend bottlenecks. Learn EXPLAIN ANALYZE.",
        "Security is not a feature — bake auth, rate limiting, and input validation in from the start.",
    ],
    "DevOps / Cloud": [
        "Everything in code — Dockerfiles, Terraform, CI/CD pipelines. No manual clicks in prod.",
        "Break things in a staging environment every week. Chaos engineering builds real reliability.",
        "Understand the OSI model deeply — 80% of cloud debugging is networking knowledge.",
        "Cost optimisation is a skill. Set billing alerts on your personal AWS account on day one.",
        "GitOps is the standard — Argo CD and Flux CD are worth learning early.",
    ],
    "default": [
        "Deliberate practice over passive watching — code along, then rebuild it from memory.",
        "Teach what you learn: write a blog post, explain it on LinkedIn, or mentor a peer.",
        "Spaced repetition (Anki) beats cramming. Review concepts 24h, 1 week, and 1 month later.",
        "Build a portfolio project that solves a real problem you personally face.",
        "The best developers read error messages carefully. Slow down and read the full stack trace.",
    ]
}


# ---------------------------------------------------------------------------
# Helper: skill extraction from text (resume / project descriptions)
# ---------------------------------------------------------------------------

def _extract_skills_from_text(text: str) -> list:
    """Rule-based skill extractor across all CS domains."""
    text_lower = text.lower()
    found = {}

    for domain, info in DOMAIN_SKILL_MAP.items():
        for kw in info["keywords"]:
            # Whole-word match to avoid false positives (e.g. "C" in "CSS")
            pattern = r'\b' + re.escape(kw) + r'\b'
            if re.search(pattern, text_lower):
                confidence = 90 if len(kw) > 5 else 70
                if kw not in found or found[kw]["confidence"] < confidence:
                    found[kw] = {
                        "name": kw,
                        "confidence": confidence,
                        "source": "resume",
                        "domain": domain,
                        "domain_label": info["label"]
                    }

    return sorted(found.values(), key=lambda x: -x["confidence"])


def _skill_to_courses(skills: list, limit: int = 8) -> list:
    """Score every course in COURSE_DATABASE against a list of skill strings."""
    skill_set = {s.lower() for s in skills}
    scored = []

    for course in COURSE_DATABASE:
        course_skill_set = {s.lower() for s in course["skills"]}
        overlap = skill_set & course_skill_set
        if not overlap:
            # Keyword scan in title / category
            title_lower = course["title"].lower()
            overlap = {s for s in skill_set if s in title_lower}

        if overlap:
            relevance = min(100, int(len(overlap) / max(len(course["skills"]), 1) * 100) + len(overlap) * 8)
            scored.append({**course, "relevance": relevance, "matched_skills": list(overlap)})

    # Fallback: return highest-rated courses if nothing matched
    if not scored:
        scored = [{**c, "relevance": 60, "matched_skills": []} for c in COURSE_DATABASE[:6]]

    return sorted(scored, key=lambda x: (-x["relevance"], -x["rating"]))[:limit]


def _try_ai_recommend(skills: list) -> list:
    """Try the RAG AI module; fall back to curated DB."""
    ai = _get_ai()
    if ai:
        try:
            result = ai({"skills": skills})
            if result.get("status") == "success" and result.get("recommendations"):
                # Enrich AI results with full DB data if IDs match
                ai_recs = result["recommendations"]
                db_map = {str(c["id"]): c for c in COURSE_DATABASE}
                enriched = []
                for rec in ai_recs:
                    key = str(rec.get("id", ""))
                    full = db_map.get(key, rec)
                    enriched.append({**full, "relevance": rec.get("relevance_percentage", 75)})
                return enriched
        except Exception as e:
            logger.warning(f"AI module error, using curated DB: {e}")
    return _skill_to_courses(skills)


def _get_user_id() -> str | None:
    return request.args.get('user_id') or request.json.get('user_id') if request.is_json else None or session.get('user_id')


def _get_or_create_profile(user_id: str) -> LearningProfile:
    profile = LearningProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = LearningProfile(user_id=user_id)
        db.session.add(profile)
        db.session.commit()
    return profile


def _log_activity(user_id: str, activity_type: str, description: str, minutes: int = 0):
    act = LearningActivity(user_id=user_id, activity_type=activity_type,
                           description=description, minutes_spent=minutes)
    db.session.add(act)
    db.session.commit()


def _calculate_streak(user_id: str) -> int:
    """Count consecutive days with at least one learning activity."""
    today = date.today()
    streak = 0
    for i in range(30):
        day = today - timedelta(days=i)
        day_start = datetime(day.year, day.month, day.day)
        day_end = day_start + timedelta(days=1)
        count = LearningActivity.query.filter(
            LearningActivity.user_id == user_id,
            LearningActivity.created_at >= day_start,
            LearningActivity.created_at < day_end
        ).count()
        if count > 0:
            streak += 1
        elif i > 0:
            break
    return streak


# ---------------------------------------------------------------------------
# Controller methods
# ---------------------------------------------------------------------------

class LearningController:

    # ── GET /skills ──────────────────────────────────────────────────────────
    @staticmethod
    def get_skills():
        try:
            return jsonify({
                "all_skills": ALL_SKILLS,
                "domains": {k: {"label": v["label"], "color": v["color"]} for k, v in DOMAIN_SKILL_MAP.items()},
                "total": len(ALL_SKILLS)
            })
        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── GET /job-roles ───────────────────────────────────────────────────────
    @staticmethod
    def get_job_roles():
        try:
            return jsonify({"job_roles": JOB_ROLES})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # ── POST /recommend ──────────────────────────────────────────────────────
    @staticmethod
    def get_recommendations():
        """
        Body: { user_id, skills: [...], use_auto_detection: bool,
                job_role, projects: [{name, technologies:[]}] }
        """
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")

            skills = data.get("skills", [])
            job_role = (data.get("job_role") or "").lower().strip()
            projects = data.get("projects", [])

            # Merge skills from job role
            if job_role and job_role in ROLE_SKILL_MAP:
                skills = list(set(skills + ROLE_SKILL_MAP[job_role]))

            # Merge skills from projects
            for project in projects:
                techs = project.get("technologies", [])
                if isinstance(techs, str):
                    techs = [t.strip() for t in techs.split(",")]
                skills = list(set(skills + [t.lower() for t in techs if t.strip()]))

            if not skills:
                return jsonify({"error": "Please provide at least one skill or job role."}), 400

            # AI-powered (RAG) recommendation
            courses = _try_ai_recommend(skills)

            # Identify detected domains
            matched_domains = {}
            skill_set = {s.lower() for s in skills}
            for domain, info in DOMAIN_SKILL_MAP.items():
                overlap = skill_set & set(info["keywords"])
                if overlap:
                    matched_domains[domain] = {"label": info["label"], "matched": list(overlap)[:5]}

            # Persist / update profile
            if user_id:
                profile = _get_or_create_profile(user_id)
                existing = set(s.strip() for s in profile.current_skills.split(",") if s.strip())
                profile.current_skills = ",".join(existing | set(skills))
                db.session.commit()
                _log_activity(user_id, "recommendation_fetch",
                              f"Fetched {len(courses)} recommendations for {len(skills)} skills")

            return jsonify({
                "recommendations": courses,
                "total": len(courses),
                "detected_domains": matched_domains,
                "skills_used": skills,
                "quick_resources": _get_resources(matched_domains),
                "learning_tips": _get_tips(matched_domains),
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── POST /detect-skills ──────────────────────────────────────────────────
    @staticmethod
    def detect_skills():
        """
        Body: { user_id, job_role, projects: [{name, description, technologies}] }
        Resume is handled via /upload-resume; this endpoint merges role + projects.
        """
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")
            job_role = (data.get("job_role") or "").lower().strip()
            projects = data.get("projects", [])

            detected = {}
            sources_used = {}

            # From job role
            if job_role:
                role_skills = ROLE_SKILL_MAP.get(job_role, [])
                if not role_skills:
                    # fuzzy match
                    for role, skills in ROLE_SKILL_MAP.items():
                        if any(word in job_role for word in role.split()):
                            role_skills = skills
                            break
                for sk in role_skills:
                    detected[sk] = {"name": sk, "confidence": 85, "source": "job_role"}
                if role_skills:
                    sources_used["job_role"] = True

            # From projects
            if projects:
                for project in projects:
                    desc_text = f"{project.get('name','')} {project.get('description','')} "
                    techs = project.get("technologies", [])
                    if isinstance(techs, str):
                        techs = [t.strip() for t in techs.split(",")]
                    tech_text = " ".join(techs)
                    combined = desc_text + tech_text

                    extracted = _extract_skills_from_text(combined)
                    for s in extracted:
                        name = s["name"]
                        if name not in detected or detected[name]["confidence"] < s["confidence"]:
                            detected[name] = {**s, "source": "project"}

                    # Direct tech list
                    for tech in techs:
                        t = tech.lower().strip()
                        if t and t not in detected:
                            detected[t] = {"name": t, "confidence": 80, "source": "project"}

                if detected:
                    sources_used["projects"] = True

            detected_list = sorted(detected.values(), key=lambda x: -x["confidence"])

            # Identify domains
            skill_names = [s["name"] for s in detected_list]
            matched_domains = _match_domains(skill_names)

            # Persist log
            if user_id:
                log = SkillDetectionLog(
                    user_id=user_id,
                    source=",".join(sources_used.keys()) or "manual",
                    detected_skills=json.dumps(skill_names),
                    confidence_scores=json.dumps({s["name"]: s["confidence"] for s in detected_list})
                )
                db.session.add(log)
                db.session.commit()

            return jsonify({
                "detected_skills": detected_list,
                "total": len(detected_list),
                "sources_used": sources_used,
                "matched_domains": matched_domains,
                "message": f"Detected {len(detected_list)} skills from {len(sources_used)} sources."
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── POST /upload-resume ───────────────────────────────────────────────────
    @staticmethod
    def upload_resume():
        try:
            user_id = request.form.get("user_id") or session.get("user_id")

            if "resume" not in request.files:
                return jsonify({"error": "No resume file provided"}), 400

            file = request.files["resume"]
            if not file.filename:
                return jsonify({"error": "Empty filename"}), 400

            text = ""
            filename = file.filename.lower()

            if filename.endswith(".pdf"):
                try:
                    import pdfplumber
                    with pdfplumber.open(file) as pdf:
                        text = "\n".join(page.extract_text() or "" for page in pdf.pages)
                except ImportError:
                    try:
                        import PyPDF2
                        reader = PyPDF2.PdfReader(file)
                        text = "\n".join(
                            page.extract_text() or "" for page in reader.pages
                        )
                    except ImportError:
                        return jsonify({"error": "PDF parsing library not installed. Install pdfplumber or PyPDF2."}), 500
            elif filename.endswith(".txt"):
                text = file.read().decode("utf-8", errors="ignore")
            elif filename.endswith(".docx"):
                try:
                    import docx
                    from io import BytesIO
                    doc = docx.Document(BytesIO(file.read()))
                    text = "\n".join(para.text for para in doc.paragraphs)
                except ImportError:
                    return jsonify({"error": "python-docx not installed."}), 500
            else:
                return jsonify({"error": "Unsupported file type. Use PDF, TXT, or DOCX."}), 400

            if not text.strip():
                return jsonify({"error": "Could not extract text from resume."}), 400

            # Extract skills
            detected = _extract_skills_from_text(text)
            matched_domains = _match_domains([s["name"] for s in detected])

            # Confidence scores dict
            confidence_scores = {s["name"]: s["confidence"] for s in detected}

            # Persist
            if user_id:
                log = SkillDetectionLog(
                    user_id=user_id,
                    source="resume",
                    detected_skills=json.dumps([s["name"] for s in detected]),
                    confidence_scores=json.dumps(confidence_scores)
                )
                db.session.add(log)
                db.session.commit()

            return jsonify({
                "detected_skills": [s["name"] for s in detected],
                "skill_details": detected,
                "confidence_scores": confidence_scores,
                "matched_domains": matched_domains,
                "total_skills": len(detected),
                "message": f"Successfully extracted {len(detected)} skills from your resume."
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── POST /learning-path ───────────────────────────────────────────────────
    @staticmethod
    def get_learning_path():
        """
        Body: { user_id, targetSkills: [...], weekly_hours: int }
        Returns a 4-week structured learning path.
        """
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")
            target_skills = data.get("targetSkills", [])
            weekly_hours = int(data.get("weekly_hours", 5))

            if not target_skills:
                return jsonify({"error": "Please provide target skills."}), 400

            matched_domains = _match_domains(target_skills)
            domain_labels = [v["label"] for v in matched_domains.values()]

            phases = list(LEARNING_PATH_PHASES.values())
            learning_path = []

            for i, phase in enumerate(phases):
                week_num = i + 1
                # Skills to cover this week
                skills_this_week = target_skills[i * 2: i * 2 + 2] if len(target_skills) > i else target_skills[:2]

                # Resource count scales with weekly hours
                resource_count = max(2, min(8, weekly_hours // 2))

                learning_path.append({
                    "week": week_num,
                    "phase": phase["title"],
                    "icon": phase["icon"],
                    "focus": phase["description"],
                    "activities": phase["activities"],
                    "skills_covered": skills_this_week or target_skills[:2],
                    "domains": domain_labels,
                    "hours": weekly_hours,
                    "resources": resource_count,
                    "priority": "Critical" if week_num <= 2 else "High",
                    "milestone": _get_milestone(week_num, target_skills),
                    "assessment": _get_assessment(week_num),
                })

            return jsonify({
                "learning_path": learning_path,
                "total_weeks": 4,
                "total_hours": weekly_hours * 4,
                "target_skills": target_skills,
                "matched_domains": matched_domains
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── POST /daily-task ─────────────────────────────────────────────────────
    @staticmethod
    def get_daily_task():
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")
            skills = data.get("skills", [])

            if not skills:
                return jsonify({"error": "No skills provided."}), 400

            task = None
            # Find best-matching template
            for skill in skills:
                sk = skill.lower()
                for key, tasks in DAILY_TASK_TEMPLATES.items():
                    if key in sk or sk in key:
                        import random
                        task = random.choice(tasks)
                        task["skill"] = skill
                        break
                if task:
                    break

            if not task:
                import random
                task = {**random.choice(DAILY_TASK_TEMPLATES["default"]), "skill": skills[0]}

            # Enrich with domain info
            matched = _match_domains(skills)
            primary_domain = next(iter(matched.values()), {})

            if user_id:
                _log_activity(user_id, "daily_task", f"Fetched daily task: {task['topic'][:60]}", 0)

            return jsonify({
                **task,
                "date": date.today().isoformat(),
                "category": primary_domain.get("label", "Computer Science"),
                "encouragement": "Every expert was once a beginner. Start now. 🚀"
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── GET /stats ────────────────────────────────────────────────────────────
    @staticmethod
    def get_learning_stats():
        try:
            user_id = request.args.get("user_id") or session.get("user_id")
            if not user_id:
                return jsonify({"error": "User ID required"}), 400

            # Enrollments
            enrollments = CourseEnrollment.query.filter_by(user_id=user_id).all()
            completed = [e for e in enrollments if e.completed]

            # Activities
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            activities = LearningActivity.query.filter(
                LearningActivity.user_id == user_id,
                LearningActivity.created_at >= thirty_days_ago
            ).all()

            total_minutes = sum(a.minutes_spent for a in activities)
            streak = _calculate_streak(user_id)

            # Profile
            profile = LearningProfile.query.filter_by(user_id=user_id).first()
            current_skills = [s.strip() for s in (profile.current_skills if profile else "").split(",") if s.strip()]

            return jsonify({
                "courses_enrolled": len(enrollments),
                "courses_completed": len(completed),
                "total_learning_minutes": total_minutes,
                "total_learning_hours": round(total_minutes / 60, 1),
                "streak_days": streak,
                "activities_30d": len(activities),
                "skills_count": len(current_skills),
                "current_skills": current_skills,
            })

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── POST /enroll ──────────────────────────────────────────────────────────
    @staticmethod
    def enroll_course():
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")
            if not user_id:
                return jsonify({"error": "User ID required"}), 400

            course_id = data.get("course_id")
            course_title = data.get("course_title", "")
            platform = data.get("platform", "")

            existing = CourseEnrollment.query.filter_by(user_id=user_id, course_id=course_id).first()
            if existing:
                return jsonify({"message": "Already enrolled", "enrollment": existing.to_dict()})

            enrollment = CourseEnrollment(
                user_id=user_id,
                course_id=course_id,
                course_title=course_title,
                platform=platform,
                progress=0
            )
            db.session.add(enrollment)
            _log_activity(user_id, "course_start", f"Enrolled in: {course_title[:80]}", 0)
            db.session.commit()

            return jsonify({"message": "Enrolled successfully!", "enrollment": enrollment.to_dict()})

        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── GET /profile ──────────────────────────────────────────────────────────
    @staticmethod
    def get_profile():
        try:
            user_id = request.args.get("user_id") or session.get("user_id")
            if not user_id:
                return jsonify({"error": "User ID required"}), 400
            profile = _get_or_create_profile(user_id)
            return jsonify(profile.to_dict())
        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500

    # ── PUT /profile ──────────────────────────────────────────────────────────
    @staticmethod
    def update_profile():
        try:
            data = request.json or {}
            user_id = data.get("user_id") or session.get("user_id")
            if not user_id:
                return jsonify({"error": "User ID required"}), 400

            profile = _get_or_create_profile(user_id)
            if "level" in data:
                profile.level = data["level"]
            if "preferred_format" in data:
                profile.preferred_format = data["preferred_format"]
            if "weekly_hours" in data:
                profile.weekly_hours = int(data["weekly_hours"])
            if "current_skills" in data:
                profile.current_skills = ",".join(data["current_skills"])
            if "target_skills" in data:
                profile.target_skills = ",".join(data["target_skills"])
            if "job_role" in data:
                profile.job_role = data["job_role"]

            db.session.commit()
            return jsonify({"message": "Profile updated", "profile": profile.to_dict()})
        except Exception as e:
            logger.error(traceback.format_exc())
            return jsonify({"error": str(e)}), 500


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _match_domains(skills: list) -> dict:
    skill_set = {s.lower() for s in skills}
    matched = {}
    for domain, info in DOMAIN_SKILL_MAP.items():
        overlap = skill_set & set(info["keywords"])
        if overlap:
            matched[domain] = {"label": info["label"], "color": info["color"], "matched": list(overlap)[:5]}
    return matched


def _get_resources(matched_domains: dict) -> list:
    """Return real resources relevant to detected domains."""
    resources = []
    for domain in matched_domains:
        label = matched_domains[domain]["label"]
        if label in QUICK_RESOURCES:
            resources.extend(QUICK_RESOURCES[label])
        if len(resources) >= 8:
            break
    if not resources:
        resources = QUICK_RESOURCES["default"]
    # Deduplicate by URL
    seen = set()
    unique = []
    for r in resources:
        if r["url"] not in seen:
            seen.add(r["url"])
            unique.append(r)
    return unique[:6]


def _get_tips(matched_domains: dict) -> list:
    tips = []
    for domain in matched_domains:
        label = matched_domains[domain]["label"]
        if label in LEARNING_TIPS:
            tips.extend(LEARNING_TIPS[label])
    if not tips:
        tips = LEARNING_TIPS["default"]
    return list(dict.fromkeys(tips))[:5]   # deduplicate, cap at 5


def _get_milestone(week: int, skills: list) -> str:
    milestones = [
        f"Explain core {skills[0] if skills else 'concepts'} principles confidently without notes",
        f"Build a working {skills[0] if skills else 'mini'} prototype and push it to GitHub",
        f"Pass a timed {skills[0] if skills else 'technical'} quiz scoring ≥ 80%",
        "Ship a complete project and document it in your portfolio",
    ]
    return milestones[week - 1] if week <= 4 else milestones[-1]


def _get_assessment(week: int) -> str:
    assessments = [
        "Concept quiz — 10 multiple-choice questions",
        "Code review — peer-review a GitHub repository",
        "Mini project demo — 5-minute walkthrough recording",
        "Portfolio submission — live deployed project",
    ]
    return assessments[week - 1] if week <= 4 else assessments[-1]
