"""
Replaces: <flask-ai-service>/routes/face_routes.py

WHAT CHANGED AND WHY
---------------------
1. Embeddings now live in the database (models/face_embedding.py) instead
   of an in-process dict + local JSON file. Every request reads/writes the
   same row, so results are consistent no matter which gunicorn worker
   handles the request and no matter how many times the service restarts.
   This is the fix for the "sometimes works, sometimes doesn't" behavior.

2. Full CRUD, matching what the Node backend and React UI now expect:
     POST   /ai/face/register        create OR update (upsert) a face
     POST   /ai/face/verify          read + compare (unchanged behavior)
     GET    /ai/face/status/<id>     read: is this employee registered?
     GET    /ai/face/list            read: all registered employee ids
     DELETE /ai/face/delete/<id>     delete a registered face

3. Threshold comment now matches the actual Node-side gate, so the two
   services don't silently drift out of sync again.
"""

import os
import io
import time
import base64
import logging
import numpy as np
from PIL import Image
from flask import Blueprint, request, jsonify

from models import db
from models.face_embedding import FaceEmbedding

logger = logging.getLogger("face_routes")
face_bp = Blueprint("face", __name__, url_prefix="/ai/face")
INTERNAL_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "internal-secret-change-me")

# ── InsightFace model (loaded once per process, warmed up at startup) ────
_face_app = None


def _get_face_app():
    global _face_app
    if _face_app is None:
        import insightface
        from insightface.app import FaceAnalysis
        _face_app = FaceAnalysis(
            name="buffalo_sc",
            providers=["CPUExecutionProvider"]
        )
        _face_app.prepare(ctx_id=0, det_size=(320, 320))
        logger.info("InsightFace model loaded (buffalo_sc)")
    return _face_app


# ── Helpers ───────────────────────────────────────────────────────
def _auth_ok():
    auth = request.headers.get("Authorization", "")
    return auth == f"Bearer {INTERNAL_TOKEN}"


def _decode_img_array(b64: str) -> np.ndarray:
    """Decode base64 image → uint8 RGB numpy array."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    b64 = b64.strip().replace("\n", "").replace("\r", "").replace(" ", "")
    raw = base64.b64decode(b64)
    pil_img = Image.open(io.BytesIO(raw)).convert("RGB")
    MAX_SIZE = 640
    w, h = pil_img.size
    if max(w, h) > MAX_SIZE:
        scale = MAX_SIZE / max(w, h)
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    return np.array(pil_img, dtype=np.uint8)


def _get_face_embedding(b64: str) -> np.ndarray:
    """
    Returns a 512-d ArcFace embedding via InsightFace (buffalo_sc model).
    Cosine similarity (L2-normalised):
      same person  →  0.85 – 0.99  ✅
      diff person  →  0.40 – 0.65  ❌
    """
    img_rgb = _decode_img_array(b64)
    import cv2
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)

    app = _get_face_app()
    faces = app.get(img_bgr)

    logger.debug(f"img shape={img_bgr.shape} faces found={len(faces)}")

    if not faces:
        raise ValueError("No face detected — ensure face is clearly visible and well-lit")

    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    embedding = np.array(face.embedding, dtype=np.float32)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm

    return embedding


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def _get_embedding_row(emp_id: str):
    """Always hits the DB — this is the fix for the multi-worker bug.
    No per-process cache means no worker can ever have stale/missing data."""
    return FaceEmbedding.query.filter_by(employee_id=emp_id).first()


# ── Routes ───────────────────────────────────────────────────────

@face_bp.route("/register", methods=["POST"])
def register_face():
    """CREATE or UPDATE (upsert) an employee's registered face."""
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    body = request.get_json(silent=True) or {}
    emp_id = (body.get("employeeId") or "").strip()
    images = body.get("images", [])
    image = (body.get("image") or "").strip()

    if not emp_id:
        return jsonify({"success": False, "error": "employeeId is required"}), 400

    all_images = images if images else ([image] if image else [])
    if not all_images:
        return jsonify({"success": False, "error": "image is required"}), 400

    started = time.time()
    try:
        embeddings = []
        for img in all_images:
            try:
                embeddings.append(_get_face_embedding(img))
            except ValueError as e:
                logger.warning(f"[{emp_id}] skipping image: {e}")

        if not embeddings:
            return jsonify({"success": False, "error": "No face detected in any provided image"}), 422

        avg_embedding = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(avg_embedding)
        if norm > 0:
            avg_embedding = avg_embedding / norm

        row = _get_embedding_row(emp_id)
        if row is None:
            row = FaceEmbedding(employee_id=emp_id)
            db.session.add(row)

        row.embedding = avg_embedding.astype(np.float32).tolist()
        row.embedding_dim = int(len(avg_embedding))
        row.photo_count = len(embeddings)
        db.session.commit()

        logger.info(
            f"Face registered for {emp_id}: {len(embeddings)}/{len(all_images)} photos "
            f"used, {time.time() - started:.1f}s"
        )
        return jsonify({
            "success": True,
            "employeeId": emp_id,
            "embeddingDim": row.embedding_dim,
            "photoCount": row.photo_count,
            "message": f"Face registered successfully ({row.photo_count} photos)"
        })
    except Exception as e:
        db.session.rollback()
        logger.exception(f"[{emp_id}] registration error")
        return jsonify({"success": False, "error": str(e)}), 500


@face_bp.route("/verify", methods=["POST"])
def verify_face():
    """READ + compare: is this live photo the registered employee?"""
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    body = request.get_json(silent=True) or {}
    emp_id = (body.get("employeeId") or "").strip()
    image = (body.get("image") or "").strip()

    if not emp_id:
        return jsonify({"success": False, "error": "employeeId is required"}), 400
    if not image:
        return jsonify({"success": False, "error": "image is required"}), 400

    row = _get_embedding_row(emp_id)
    if row is None:
        return jsonify({
            "success": False, "match": False,
            "error": f"No registered face for employee: {emp_id}"
        }), 404

    try:
        stored = np.array(row.embedding, dtype=np.float32)
        live_emb = _get_face_embedding(image)
        similarity = _cosine_sim(stored, live_emb)

        # Threshold kept intentionally low here — the Node backend applies
        # the real gate (FACE_MIN_CONFIDENCE, currently 0.65). Keep these
        # two in sync if either changes; this one is just a safety floor.
        THRESHOLD = 0.45
        is_match = similarity >= THRESHOLD

        logger.info(f"Verify [{emp_id}]: sim={similarity:.4f} match={is_match}")
        return jsonify({
            "success": True,
            "match": is_match,
            "confidence": round(float(similarity), 4),
            "employeeId": emp_id,
            "threshold": THRESHOLD
        })
    except ValueError as e:
        return jsonify({"success": False, "match": False, "error": str(e)}), 422
    except Exception as e:
        logger.exception(f"[{emp_id}] verification error")
        return jsonify({"success": False, "match": False, "error": str(e)}), 500


@face_bp.route("/status/<employee_id>", methods=["GET"])
def face_status(employee_id):
    """READ: registration status + metadata for one employee."""
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    row = _get_embedding_row(employee_id)
    if row is None:
        return jsonify({"success": True, "registered": False, "employeeId": employee_id})
    return jsonify({"success": True, "registered": True, **row.to_dict()})


@face_bp.route("/delete/<employee_id>", methods=["DELETE"])
def delete_face(employee_id):
    """DELETE a registered face."""
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    row = _get_embedding_row(employee_id)
    if row is None:
        return jsonify({"success": False, "error": "Employee not found"}), 404

    db.session.delete(row)
    db.session.commit()
    logger.info(f"Face removed for {employee_id}")
    return jsonify({"success": True, "message": f"Face for {employee_id} removed"})


@face_bp.route("/list", methods=["GET"])
def list_faces():
    """READ: all registered employee ids."""
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    rows = FaceEmbedding.query.with_entities(FaceEmbedding.employee_id).all()
    ids = [r.employee_id for r in rows]
    return jsonify({"success": True, "registered": ids, "count": len(ids)})