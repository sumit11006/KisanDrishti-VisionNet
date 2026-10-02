import logging
from typing import Dict, Any, List
from agents.base import Agent, SequentialAgent, ParallelAgent
from agents.diagnostic_agent import DiagnosticAgent
from agents.geospatial_agent import GeospatialAgent
from agents.climate_agent import ClimateAgent
from agents.brics_exchange_agent import BRICSExchangeAgent

logger = logging.getLogger(__name__)

class SupervisorAgent(Agent):
    """
    Orchestrates different agents for Krishi-Vision.
    """
    def __init__(self):
        super().__init__(name="SupervisorAgent")
        self.diagnostic = DiagnosticAgent()
        self.geospatial = GeospatialAgent()
        self.climate = ClimateAgent()
        self.brics_exchange = BRICSExchangeAgent()
        
    async def diagnose_crop(self, image_data: str, text_description: str = "", lat: float = None, lon: float = None) -> Dict[str, Any]:
        """
        Runs diagnostic + geospatial in parallel, then climate.
        """
        try:
            logger.info("Starting diagnose_crop workflow")
            
            # Run diagnostic and geospatial in parallel
            parallel_workflow = ParallelAgent(agents=[self.diagnostic, self.geospatial])
            
            diag_task = self.diagnostic.diagnose_crop(image_data=image_data, text_description=text_description)
            geo_task = self.geospatial.fetch_satellite_analysis(geometry={"type": "Point", "coordinates": [lon, lat]}) if lat and lon else None
            
            # Execute tasks
            import asyncio
            results = await asyncio.gather(
                diag_task, 
                geo_task if geo_task else asyncio.sleep(0),
                return_exceptions=True
            )
            
            diag_result = results[0]
            geo_result = results[1] if geo_task else None
            
            if isinstance(diag_result, Exception):
                logger.error(f"Error in diagnostic agent: {diag_result}")
                raise diag_result
                
            # Then run climate
            climate_result = await self.climate.get_weather_forecast(lat=lat, lon=lon) if lat and lon else None
            
            return {
                "diagnosis": diag_result,
                "geospatial_context": geo_result,
                "climate_context": climate_result
            }
            
        except Exception as e:
            logger.error(f"Workflow diagnose_crop failed: {e}")
            raise

    async def full_advisory(self, farmer_id: str, plot_geometry: Dict[str, Any]) -> Dict[str, Any]:
        """Runs all agents with supervisor coordination for full advisory."""
        try:
            logger.info(f"Starting full_advisory for farmer {farmer_id}")
            geo_context = await self.geospatial.get_parcel_info(farmer_id=farmer_id, plot_geometry=plot_geometry)
            climate_context = await self.climate.predict_microclimate(plot_geometry=plot_geometry, context=geo_context)
            advisory = await self.climate.get_crop_calendar_advisory(region="unknown", crop_type="unknown", climate_data=climate_context)
            return {
                "parcel_info": geo_context,
                "microclimate_risk": climate_context,
                "calendar_advisory": advisory
            }
        except Exception as e:
            logger.error(f"Workflow full_advisory failed: {e}")
            raise

    async def brics_exchange(self, local_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs exchange agent with anonymization."""
        try:
            logger.info("Starting brics_exchange workflow")
            anonymized = await self.brics_exchange.anonymize_and_export(local_data)
            return {"status": "success", "exported_data": anonymized}
        except Exception as e:
            logger.error(f"Workflow brics_exchange failed: {e}")
            raise
