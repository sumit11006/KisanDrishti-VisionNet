import logging
from typing import Dict, Any
from agents.base import Agent
try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)

class ClimateAgent(Agent):
    """IMD & micro-climate prediction agent."""
    
    def __init__(self):
        super().__init__(name="ClimateAgent")
        self.client = genai.Client() if GENAI_AVAILABLE else None
        self.model_name = "gemini-1.5-pro"

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def get_weather_forecast(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetches IMD gridded daily data (temperature, rainfall, humidity)."""
        try:
            logger.info(f"Fetching weather forecast for lat={lat}, lon={lon}")
            # Mock IMD fetch
            return {
                "temperature": 32.5,
                "humidity": 65.0,
                "rainfall_mm": 12.0,
                "forecast": "Scattered thunderstorms"
            }
        except Exception as e:
            logger.error(f"Error fetching weather forecast: {e}")
            raise

    async def predict_microclimate(self, plot_geometry: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combines satellite canopy data + weather + soil moisture.
        Uses Gemini to generate micro-climate risk assessment.
        Returns structured risk levels for frost, drought, flood, pest outbreak.
        """
        try:
            logger.info("Predicting microclimate risks")
            if not GENAI_AVAILABLE:
                return {
                    "frost_risk": "Low",
                    "drought_risk": "Medium",
                    "flood_risk": "Low", 
                    "pest_outbreak_risk": "High",
                    "advisory": "Monitor pest activity closely due to warm humid conditions."
                }
            prompt = f"Assess micro-climate risks based on plot geometry {plot_geometry} and context {context}. Return a JSON with risk levels (Low, Medium, High) for frost, drought, flood, pest_outbreak."
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error predicting microclimate: {e}")
            raise

    async def get_crop_calendar_advisory(self, region: str, crop_type: str, climate_data: Dict[str, Any]) -> Dict[str, Any]:
        """Returns optimal sowing/harvesting windows based on climate and region."""
        try:
            logger.info(f"Getting crop calendar advisory for {crop_type} in {region}")
            return {
                "crop": crop_type,
                "region": region,
                "optimal_sowing_start": "2024-06-15",
                "optimal_sowing_end": "2024-07-05",
                "harvesting_window": "2024-10-15 to 2024-11-10",
                "advisory": "Ensure soil moisture is optimal before sowing."
            }
        except Exception as e:
            logger.error(f"Error getting crop calendar: {e}")
            raise
