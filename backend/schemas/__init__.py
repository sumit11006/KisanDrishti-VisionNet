"""Krishi-Vision BRICS-AgriN schema definitions.

Exports all Pydantic models used for API request/response validation
and Gemini structured output enforcement.
"""

from .diagnostic import (
    DiagnosticRequest,
    DiseaseDiagnosticResponse,
    SeverityLevel,
    TreatmentStep,
    VisualSymptom,
)
from .regenerative import (
    CropRotationEntry,
    RegenerativeAdvisoryResponse,
    RegenerativeRequest,
    SatelliteAnalysisResponse,
    SoilHealthMetric,
    WaterConservationTechnique,
)

__all__ = [
    "DiagnosticRequest",
    "DiseaseDiagnosticResponse",
    "SeverityLevel",
    "TreatmentStep",
    "VisualSymptom",
    "CropRotationEntry",
    "RegenerativeAdvisoryResponse",
    "RegenerativeRequest",
    "SatelliteAnalysisResponse",
    "SoilHealthMetric",
    "WaterConservationTechnique",
]
