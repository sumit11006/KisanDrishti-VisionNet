/**
 * Core TypeScript type definitions for Krishi-Vision BRICS-AgriN.
 * Mirrors backend Pydantic schemas for type-safe API communication.
 */

export enum SeverityLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL"
}

export interface VisualSymptom {
  description: string;
  location: string;
  severity: SeverityLevel;
}

export interface TreatmentStep {
  step_number: number;
  action: string;
  products_recommended?: string[];
  duration_days?: number;
}

export interface DiseaseDiagnosticResponse {
  disease_name: string;
  confidence_score: number;
  severity: SeverityLevel;
  symptoms_detected: VisualSymptom[];
  treatment_plan: TreatmentStep[];
  prevention_tips: string[];
}

export interface DiagnosticRequest {
  crop_type: string;
  growth_stage: string;
  location_lat: number;
  location_lon: number;
  notes?: string;
}

export interface CropRotationEntry {
  season: string;
  crop_name: string;
  benefits: string[];
}

export interface SoilHealthMetric {
  parameter: string;
  current_value: number;
  optimal_range: string;
  recommendation: string;
}

export interface WaterConservationTechnique {
  technique_name: string;
  description: string;
  estimated_water_savings_percent: number;
  implementation_difficulty: string;
}

export interface RegenerativeAdvisoryResponse {
  advisory_id: string;
  crop_rotation_plan: CropRotationEntry[];
  soil_health_interventions: SoilHealthMetric[];
  water_conservation: WaterConservationTechnique[];
  estimated_yield_increase_percent: number;
  carbon_sequestration_potential: number;
}

export interface RegenerativeRequest {
  farm_size_hectares: number;
  current_crops: string[];
  soil_type: string;
  region: string;
  climate_zone: string;
}

export interface GeoJSONPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

export interface NDVITrendPoint {
  date: string;
  ndvi_value: number;
}

export interface SatelliteAnalysisResponse {
  analysis_date: string;
  average_ndvi: number;
  health_status: string;
  anomalies_detected: boolean;
  anomaly_description?: string;
  ndvi_trend: NDVITrendPoint[];
  moisture_index: number;
}

export interface CadastralParcel {
  parcel_id: string;
  owner_id: string;
  area_hectares: number;
  boundary: GeoJSONPolygon;
}

export interface FarmerProfile {
  ufid: string;
  full_name: string;
  phone_number: string;
  preferred_language: LanguageCode;
  total_land_area: number;
  primary_crops: string[];
  joined_date: string;
}

export interface MicroClimateRisk {
  risk_type: string;
  probability: number;
  mitigation_strategy: string;
}

export interface WeatherDay {
  date: string;
  temp_min: number;
  temp_max: number;
  precipitation_mm: number;
  humidity_percent: number;
  wind_speed_kmh: number;
  weather_condition: string;
}

export interface WeatherForecast {
  location_name: string;
  forecast_days: WeatherDay[];
  micro_climate_risks: MicroClimateRisk[];
}

export interface BRICSContribution {
  data_type: string;
  region: string;
  crop: string;
  observation_date: string;
  findings: string;
  contributor_id: string;
}

export interface BRICSPartnerInstitution {
  institution_id: string;
  name: string;
  country: string;
  focus_area: string;
}

export interface BRICSExchangeResponse {
  contribution_id: string;
  status: string;
  points_earned: number;
  similar_cases_in_brics: number;
}

export interface TranscriptionResponse {
  text: string;
  language_detected: string;
  confidence: number;
}

export enum SyncStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED"
}

export interface SyncOperation {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  payload?: any;
  headers?: Record<string, string>;
  status: SyncStatus;
  created_at: number;
  retry_count: number;
}

export interface SyncResult {
  operation_id: string;
  success: boolean;
  response?: any;
  error?: string;
}

export type LanguageCode = "en" | "hi" | "pt" | "ru" | "zh" | "af" | "ar" | "bn" | "fr" | "es" | "sw" | "ta" | "te" | "mr" | "gu" | "kn" | "ml" | "pa" | "ur" | "or" | "as" | "mai" | "sat";

export interface VoiceAdvisory {
  audio_url: string;
  duration_seconds: number;
  transcript: string;
}

export interface AppSettings {
  language: LanguageCode;
  data_sharing_enabled: boolean;
  offline_mode_enabled: boolean;
  notifications_enabled: boolean;
}

export interface UserSession {
  token: string;
  refresh_token: string;
  expires_at: number;
  user: FarmerProfile;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  total_items: number;
  page: number;
  page_size: number;
  total_pages: number;
}
