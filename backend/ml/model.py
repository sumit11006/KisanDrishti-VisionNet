"""
Kisan Drishti - Custom MobileNetV3 Inference Engine
Replaces Gemini API with locally trained PyTorch model.

Usage:
    from backend.ml.model import KisanDrishtiModel
    engine = KisanDrishtiModel()
    result = engine.predict_from_bytes(image_bytes)
"""

import io
import json
import logging
import time
import pathlib
from typing import Dict, Any, List, Optional, Tuple

import torch
import torch.nn as nn
import torchvision.models as models
import torchvision.transforms as transforms
from PIL import Image

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# Paths
# -----------------------------------------------------------------------
_ML_DIR     = pathlib.Path(__file__).parent
DB_PATH     = _ML_DIR / "disease_db.json"
WEIGHTS_PATH = _ML_DIR / "kisan_drishti_model.pt"

# -----------------------------------------------------------------------
# PlantVillage class order — MUST match training script label order
# -----------------------------------------------------------------------
CLASS_NAMES: List[str] = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# -----------------------------------------------------------------------
# ImageNet normalisation (same as training)
# -----------------------------------------------------------------------
_TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std =[0.229, 0.224, 0.225],
    ),
])


def _build_model(num_classes: int = 38) -> nn.Module:
    """Reconstruct MobileNetV3-Large architecture with custom head."""
    model = models.mobilenet_v3_large(weights=None)
    # Replace classifier head to match our 38-class output
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, num_classes)
    return model


class KisanDrishtiModel:
    """
    Lightweight inference wrapper around the trained MobileNetV3 model.

    - Loads kisan_drishti_model.pt from backend/ml/ on first use.
    - Falls back to demo mode (high-quality mock response) if .pt not found.
    - Thread-safe: model and disease_db are loaded once at startup.
    """

    _instance: Optional["KisanDrishtiModel"] = None   # singleton

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model: Optional[nn.Module] = None
        self.model_loaded: bool = False
        self.disease_db: Dict[str, Any] = {}
        self._load_disease_db()
        self._load_model()

    # ------------------------------------------------------------------ #
    # Loaders
    # ------------------------------------------------------------------ #
    def _load_disease_db(self) -> None:
        try:
            self.disease_db = json.loads(DB_PATH.read_text(encoding="utf-8"))
            logger.info(f"[KisanDrishti] Disease DB loaded — {len(self.disease_db['classes'])} classes")
        except FileNotFoundError:
            logger.error(f"[KisanDrishti] disease_db.json not found at {DB_PATH}")
            self.disease_db = {"classes": {}}

    def _load_model(self) -> None:
        if not WEIGHTS_PATH.exists():
            logger.warning(
                f"[KisanDrishti] Model weights NOT found at {WEIGHTS_PATH}. "
                "Running in DEMO mode. Download kisan_drishti_model.pt from Kaggle and place it here."
            )
            self.model_loaded = False
            return
        try:
            logger.info(f"[KisanDrishti] Loading model weights from {WEIGHTS_PATH} ...")
            self.model = _build_model(num_classes=len(CLASS_NAMES))
            state = torch.load(str(WEIGHTS_PATH), map_location="cpu", weights_only=True)
            self.model.load_state_dict(state)
            self.model.eval()
            self.model_loaded = True
            logger.info("[KisanDrishti] Model loaded successfully — ready for inference.")
        except Exception as exc:
            logger.error(f"[KisanDrishti] Failed to load model: {exc}")
            self.model_loaded = False

    # ------------------------------------------------------------------ #
    # Preprocessing
    # ------------------------------------------------------------------ #
    def _preprocess(self, image_bytes: bytes) -> torch.Tensor:
        """Convert raw image bytes to a normalised (1, 3, 224, 224) tensor."""
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = _TRANSFORM(img)
        return tensor.unsqueeze(0)   # add batch dimension

    # ------------------------------------------------------------------ #
    # Inference
    # ------------------------------------------------------------------ #
    def _run_inference(self, tensor: torch.Tensor) -> Tuple[int, float, List[Dict]]:
        """
        Returns:
            top1_idx     - index of best class
            top1_conf    - confidence (0.0 – 1.0)
            top3_classes - [{class_name, confidence}, ...] top-3 list
        """
        with torch.no_grad():
            logits = self.model(tensor)               # (1, 38)
            probs  = torch.softmax(logits, dim=1)[0]  # (38,)

        top3_vals, top3_idxs = torch.topk(probs, 3)
        top1_idx  = int(top3_idxs[0].item())
        top1_conf = float(top3_vals[0].item())

        top3 = [
            {
                "class_key": CLASS_NAMES[int(top3_idxs[i].item())],
                "confidence": round(float(top3_vals[i].item()), 4),
            }
            for i in range(3)
        ]
        return top1_idx, top1_conf, top3

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    def predict_from_bytes(
        self,
        image_bytes: bytes,
        text_description: str = "",
        context: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Main prediction method.  Called by DiagnosticAgent.

        Returns a dict compatible with DiagnosticResult schema in main.py.
        """
        t_start = time.perf_counter()

        # ---------- model not downloaded yet → demo mode ----------
        if not self.model_loaded:
            logger.info("[KisanDrishti] Demo mode — returning high-quality mock diagnosis.")
            return self._demo_result()

        # ---------- real inference ----------
        try:
            tensor = self._preprocess(image_bytes)
            top1_idx, top1_conf, top3 = self._run_inference(tensor)
            elapsed_ms = round((time.perf_counter() - t_start) * 1000, 1)

            class_key = CLASS_NAMES[top1_idx]
            db_entry  = self.disease_db.get("classes", {}).get(class_key, {})

            result = self._build_result(class_key, top1_conf, top3, db_entry, elapsed_ms)
            logger.info(
                f"[KisanDrishti] Predicted: {db_entry.get('display_name', class_key)} "
                f"({top1_conf*100:.1f}%) in {elapsed_ms} ms"
            )
            return result

        except Exception as exc:
            logger.error(f"[KisanDrishti] Inference error: {exc}")
            raise

    def _build_result(
        self,
        class_key: str,
        confidence: float,
        top3: List[Dict],
        db: Dict,
        elapsed_ms: float,
    ) -> Dict[str, Any]:
        """Assemble the final API-compatible diagnosis dict."""
        is_healthy = db.get("severity", "NONE") == "NONE"
        return {
            "disease_name": db.get("display_name", class_key),
            "confidence": round(confidence, 4),
            "symptoms": db.get("symptoms", []),
            "treatment_plan": {
                "organic":  db.get("organic_treatment", "Consult local agronomist."),
                "chemical": db.get("chemical_treatment", "Consult local agronomist."),
            },
            "severity_level": db.get("severity", "UNKNOWN"),
            "estimated_yield_impact_percent": db.get("estimated_yield_impact_percent", 0.0),
            "brics_agrin_pattern_match_id": db.get("brics_agrin_pattern_match_id"),
            "similar_outbreaks_globally": db.get("similar_outbreaks_globally", []),
            "environmental_factors": db.get("environmental_factors", []),
            "pathogen_name": db.get("pathogen_name", "Unknown"),
            "pathogen_type": db.get("pathogen_type", "Unknown"),
            "crop": db.get("crop", "Unknown"),
            "model_version": "kisan-drishti-mobilenetv3-v1.0",
            "inference_device": "CPU",
            "inference_latency_ms": elapsed_ms,
            "top3_differential": top3,
            "is_healthy": is_healthy,
        }

    @staticmethod
    def _demo_result() -> Dict[str, Any]:
        """High-quality mock result shown before .pt file is placed."""
        return {
            "disease_name": "Tomato Late Blight",
            "confidence": 0.9421,
            "symptoms": [
                "Dark brown water-soaked lesions expanding rapidly on leaf margins",
                "White fuzzy sporulation visible on lower leaf surface in humid conditions",
                "Brown-black firm lesions on green fruit",
                "Stem necrosis - dark brown streaking on stems",
            ],
            "treatment_plan": {
                "organic":  "Apply Bordeaux mixture (1%) every 5-7 days during cool, wet weather. Copper hydroxide at 2g/L spray. Remove infected plant material immediately. Improve air circulation by staking.",
                "chemical": "Apply Metalaxyl + Mancozeb (Ridomil Gold) at 2g/L every 7 days. Alternate with Cymoxanil 8% + Mancozeb 64% WP at 2.5g/L.",
            },
            "severity_level": "CRITICAL",
            "estimated_yield_impact_percent": 60.0,
            "brics_agrin_pattern_match_id": "BRICS-PATH-2024-IN-1103",
            "similar_outbreaks_globally": [
                "India: Tomato blight - Himachal Pradesh, Nilgiris (2022)",
                "Brazil: Late blight - Minas Gerais (2023)",
                "South Africa: Tomato blight - Limpopo (2022)",
            ],
            "environmental_factors": [
                "Cool, wet weather (10-20 C) with high humidity (>90%)",
                "Extended periods of rain, fog, or heavy dew",
                "Dense plant canopy with poor air circulation",
            ],
            "pathogen_name": "Phytophthora infestans",
            "pathogen_type": "Oomycete (Water Mould)",
            "crop": "Tomato",
            "model_version": "kisan-drishti-mobilenetv3-v1.0 [DEMO — place kisan_drishti_model.pt in backend/ml/]",
            "inference_device": "CPU",
            "inference_latency_ms": 0.0,
            "top3_differential": [
                {"class_key": "Tomato___Late_blight",  "confidence": 0.9421},
                {"class_key": "Tomato___Early_blight", "confidence": 0.0341},
                {"class_key": "Potato___Late_blight",  "confidence": 0.0238},
            ],
            "is_healthy": False,
        }

    # ------------------------------------------------------------------ #
    # Health check helper
    # ------------------------------------------------------------------ #
    def status(self) -> Dict[str, Any]:
        return {
            "model_loaded": self.model_loaded,
            "weights_path": str(WEIGHTS_PATH),
            "weights_exist": WEIGHTS_PATH.exists(),
            "num_classes": len(CLASS_NAMES),
            "db_classes": len(self.disease_db.get("classes", {})),
            "mode": "INFERENCE" if self.model_loaded else "DEMO",
        }


# Singleton instance for import
kisan_model = KisanDrishtiModel()
