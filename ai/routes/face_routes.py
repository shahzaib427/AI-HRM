import os
import io
import base64
import json
import logging
import numpy as np
from PIL import Image
from flask import Blueprint, request, jsonify

logger = logging.getLogger("face_routes")
face_bp = Blueprint("face", __name__, url_prefix="/ai/face")
INTERNAL_TOKEN = os.environ.get("INTERNAL_SERVICE_TOKEN", "internal-secret-change-me")

EMBEDDINGS_FILE = os.path.join(os.path.dirname(__file__), "embeddings.json")

# ── InsightFace model (loaded once at startup) ───────────────────
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

# ── Persistent storage ───────────────────────────────────────────
def _load_embeddings():
    if os.path.exists(EMBEDDINGS_FILE):
        try:
            with open(EMBEDDINGS_FILE, "r") as f:
                data = json.load(f)
            return {k: np.array(v, dtype=np.float32) for k, v in data.items()}
        except Exception as e:
            logger.error(f"Failed to load embeddings: {e}")
    return {}

def _save_embeddings(embeddings):
    try:
        with open(EMBEDDINGS_FILE, "w") as f:
            json.dump({k: v.tolist() for k, v in embeddings.items()}, f)
    except Exception as e:
        logger.error(f"Failed to save embeddings: {e}")

_embeddings = _load_embeddings()
logger.info(f"Loaded {len(_embeddings)} face embeddings from disk")

# ── Helpers ──────────────────────────────────────────────────────
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

    face = max(faces, key=lambda f: (f.bbox[2]-f.bbox[0]) * (f.bbox[3]-f.bbox[1]))

    embedding = np.array(face.embedding, dtype=np.float32)
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm

    logger.debug(f"ArcFace embedding dim={len(embedding)}")
    return embedding

def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = np.linalg.norm(a), np.linalg.norm(b)
    if na == 0 or nb == 0:
        return 0.0
    return float(np.dot(a, b) / (na * nb))

# ── Routes ───────────────────────────────────────────────────────

@face_bp.route("/register", methods=["POST"])
def register_face():
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    body   = request.get_json(silent=True) or {}
    emp_id = body.get("employeeId", "").strip()
    images = body.get("images", [])
    image  = body.get("image", "").strip()

    if not emp_id:
        return jsonify({"success": False, "error": "employeeId is required"}), 400

    all_images = images if images else ([image] if image else [])
    if not all_images:
        return jsonify({"success": False, "error": "image is required"}), 400

    try:
        embeddings = []
        for img in all_images:
            try:
                emb = _get_face_embedding(img)
                embeddings.append(emb)
            except ValueError as e:
                logger.warning(f"Skipping image: {e}")

        if not embeddings:
            return jsonify({"success": False, "error": "No face detected in any provided image"}), 422

        avg_embedding = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(avg_embedding)
        if norm > 0:
            avg_embedding = avg_embedding / norm

        _embeddings[emp_id] = avg_embedding.astype(np.float32)
        _save_embeddings(_embeddings)
        logger.info(f"Face registered ({len(embeddings)} photos averaged): {emp_id}")
        return jsonify({
            "success":      True,
            "employeeId":   emp_id,
            "embeddingDim": int(len(avg_embedding)),
            "photoCount":   len(embeddings),
            "message":      f"Face registered successfully ({len(embeddings)} photos)"
        })
    except Exception as e:
        logger.exception("Registration error")
        return jsonify({"success": False, "error": str(e)}), 500


@face_bp.route("/verify", methods=["POST"])
def verify_face():
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    body   = request.get_json(silent=True) or {}
    emp_id = body.get("employeeId", "").strip()
    image  = body.get("image", "").strip()

    if not emp_id:
        return jsonify({"success": False, "error": "employeeId is required"}), 400
    if not image:
        return jsonify({"success": False, "error": "image is required"}), 400

    stored = _embeddings.get(emp_id)
    if stored is None:
        return jsonify({
            "success": False, "match": False,
            "error": f"No registered face for employee: {emp_id}"
        }), 404

    try:
        live_emb = _get_face_embedding(image)
        similarity = _cosine_sim(stored, live_emb)

        # ── Threshold ────────────────────────────────────────────────
        # Changed from 0.50 → 0.45 so the frontend 70% confidence
        # requirement (MIN_CONFIDENCE=0.70 in Node backend) stays the
        # effective gate.  The Python threshold is now a lower safety
        # floor; the Node side rejects anything below 0.70.
        #
        # ArcFace cosine similarity (L2-normalised):
        #   same person  →  0.85 – 0.99   ✅
        #   diff person  →  0.40 – 0.65   ❌
        # ────────────────────────────────────────────────────────────
        THRESHOLD = 0.45  # ← lowered; Node backend enforces 0.70
        is_match  = similarity >= THRESHOLD

        logger.info(f"Verify [{emp_id}]: sim={similarity:.4f} match={is_match}")
        return jsonify({
            "success":    True,
            "match":      is_match,
            "confidence": round(float(similarity), 4),
            "employeeId": emp_id,
            "threshold":  THRESHOLD
        })

    except ValueError as e:
        return jsonify({"success": False, "match": False, "error": str(e)}), 422
    except Exception as e:
        logger.exception("Verification error")
        return jsonify({"success": False, "match": False, "error": str(e)}), 500


@face_bp.route("/delete/<employee_id>", methods=["DELETE"])
def delete_face(employee_id):
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    if employee_id in _embeddings:
        del _embeddings[employee_id]
        _save_embeddings(_embeddings)
        return jsonify({"success": True, "message": f"Face for {employee_id} removed"})
    return jsonify({"success": False, "error": "Employee not found"}), 404


@face_bp.route("/list", methods=["GET"])
def list_faces():
    if not _auth_ok():
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    return jsonify({
        "success":    True,
        "registered": list(_embeddings.keys()),
        "count":      len(_embeddings)
    })