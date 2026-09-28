from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional, List
import datetime

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class VisualSymptom(BaseModel):
    symptom_description: str
    affected_plant_part: str
    color_change: Optional[str] = None
    pattern_type: Optional[str] = None
    coverage_percentage: float = Field(ge=0, le=100)

class TreatmentStep(BaseModel):
    step_number: int
    action: str
    product_name: Optional[str] = None
    dosage: Optional[str] = None
    application_method: str
    frequency: str
    precautions: List[str]

class DiseaseDiagnosticResponse(BaseModel):
    pathogen_name: str
    pathogen_type: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    visual_symptoms: List[VisualSymptom]
    root_cause_analysis: str
    environmental_factors: List[str]
    organic_treatment_plan: List[TreatmentStep]
    chemical_treatment_plan: List[TreatmentStep]
    severity_level: SeverityLevel
    estimated_yield_impact_percent: float = Field(ge=0, le=100)
    brics_agrin_pattern_match_id: Optional[str] = None
    similar_outbreaks_globally: List[str]
    diagnosis_timestamp: datetime.datetime
    model_version: str = "gemini-1.5-pro-002"

class DiagnosticRequest(BaseModel):
    image_base64: str
    crop_type: Optional[str] = None
    growth_stage: Optional[str] = None
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    farmer_description: Optional[str] = None
    language_code: str = "en"
