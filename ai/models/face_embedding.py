# Drop this into: <flask-ai-service>/models/face_embedding.py
#
# WHY THIS FILE EXISTS
# ---------------------
# The old face_routes.py kept registered faces in a plain Python dict
# (`_embeddings`) that lived only in one process's memory, backed by a
# local embeddings.json file. That caused two real bugs:
#
#   1. Multi-worker divergence: if gunicorn runs more than one worker
#      process (typical on Render), each worker loads its own copy of
#      the dict at startup. Registering a face updates ONE worker's
#      memory + the file, but a /verify request routed to a DIFFERENT
#      worker never sees it until that worker restarts. Which worker
#      handles a request is effectively random from the client's
#      perspective, which is exactly a "works sometimes, fails other
#      times" bug.
#
#   2. Non-durable storage: a web service's local disk on most hosting
#      plans is not guaranteed to persist across deploys/restarts, so
#      embeddings.json can quietly reset, wiping every registered face.
#
# Storing embeddings in the database Flask already uses (via the same
# `db` SQLAlchemy instance as your other models) fixes both: every
# worker and every restart reads the same row from the same database.

from datetime import datetime
from models import db


class FaceEmbedding(db.Model):
    __tablename__ = "face_embeddings"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.String(64), unique=True, nullable=False, index=True)
    embedding = db.Column(db.JSON, nullable=False)      # 512-d ArcFace vector, L2-normalised
    embedding_dim = db.Column(db.Integer, nullable=False)
    photo_count = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "employeeId": self.employee_id,
            "embeddingDim": self.embedding_dim,
            "photoCount": self.photo_count,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }