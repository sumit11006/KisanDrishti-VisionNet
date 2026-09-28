from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import datetime

class CropRotationEntry(BaseModel):
    season: str
    crop_name: str
    variety: str
    expected_yield_kg_per_ha: float
    nitrogen_contribution_kg_per_ha: float
    water_requirement_mm: float
    carbon_sequestration_kg_per_ha: float
    companion_crops: List[str]

class SoilHealthMetric(BaseModel):
    parameter: str
    current_value: float
    optimal_range_min: float
    optimal_range_max: float
    unit: str
    improvement_recommendation: str

class WaterConservationTechnique(BaseModel):
    technique_name: str
    description: str
    water_savings_percent: float
    implementation_cost_category: str
    suitable_soil_types: List[str]
    suitable_crops: List[str]

class RegenerativeAdvisoryResponse(BaseModel):
    recommended_crop_rotation: List[CropRotationEntry]
    soil_health_score: float = Field(ge=0, le=100)
    soil_health_metrics: List[SoilHealthMetric]
    nitrogen_fixation_potential_kg_per_ha: float
    cover_crop_recommendation: List[str]
    water_conservation_techniques: List[WaterConservationTechnique]
    carbon_sequestration_estimate_kg_per_ha: float
    biodiversity_index: float = Field(ge=0, le=1.0)
    organic_matter_improvement_plan: str
    estimated_roi_improvement_percent: float
    advisory_valid_until: datetime.datetime
    brics_benchmark_comparison: Dict[str, float]

class RegenerativeRequest(BaseModel):
    farmer_id: Optional[str] = None
    plot_geometry: Dict[str, Any]
    current_crop: Optional[str] = None
    soil_type: Optional[str] = None
    irrigation_type: Optional[str] = None
    farming_history_years: Optional[int] = None

class SatelliteAnalysisResponse(BaseModel):
    ndvi_mean: float
    ndvi_min: float
    ndvi_max: float
    evi_mean: float
    moisture_stress_index: float
    vegetation_health_category: str
    historical_ndvi_trend: List[Dict[str, Any]]
    anomaly_detected: bool
    anomaly_description: Optional[str] = None
    analysis_period_start: datetime.date
    analysis_period_end: datetime.date
    cloud_cover_percent: float
    data_source: str
