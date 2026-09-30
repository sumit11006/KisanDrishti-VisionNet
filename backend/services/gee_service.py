"""Google Earth Engine analytics service for satellite imagery processing.

Provides NDVI, EVI, moisture stress analysis over agricultural parcels
using Sentinel-2 and Landsat imagery.
"""
import ee
import datetime
import numpy as np
from typing import Any
import structlog

logger = structlog.get_logger(__name__)

class GEEService:
    def __init__(self, project_id: str):
        self.project_id = project_id
        
    def initialize(self):
        try:
            logger.info("Initializing Google Earth Engine", project=self.project_id)
            ee.Initialize(project=self.project_id)
        except Exception as e:
            logger.error("Failed to initialize Google Earth Engine", error=str(e))
            raise

    def _geometry_from_geojson(self, geojson: dict) -> ee.Geometry:
        try:
            return ee.Geometry(geojson)
        except Exception as e:
            logger.error("Invalid GeoJSON format", error=str(e))
            raise ValueError(f"Could not convert geojson to ee.Geometry: {e}")

    def fetch_sentinel2_imagery(self, geometry: ee.Geometry, start_date: str, end_date: str) -> ee.ImageCollection:
        try:
            logger.info("Fetching Sentinel-2 imagery", start=start_date, end=end_date)
            def mask_s2_clouds(image):
                qa = image.select('QA60')
                cloud_bit_mask = 1 << 10
                cirrus_bit_mask = 1 << 11
                mask = qa.bitwiseAnd(cloud_bit_mask).eq(0).And(qa.bitwiseAnd(cirrus_bit_mask).eq(0))
                return image.updateMask(mask).divide(10000)

            dataset = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                       .filterBounds(geometry)
                       .filterDate(start_date, end_date)
                       .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                       .map(mask_s2_clouds))
            return dataset
        except Exception as e:
            logger.error("Error fetching Sentinel-2 imagery", error=str(e))
            raise

    def calculate_ndvi(self, image: ee.Image) -> ee.Image:
        try:
            ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            return image.addBands(ndvi)
        except Exception as e:
            logger.error("Error calculating NDVI", error=str(e))
            raise

    def calculate_evi(self, image: ee.Image) -> ee.Image:
        try:
            evi = image.expression(
                '2.5 * ((B8 - B4) / (B8 + 6 * B4 - 7.5 * B2 + 1))', {
                    'B8': image.select('B8'),
                    'B4': image.select('B4'),
                    'B2': image.select('B2')
                }
            ).rename('EVI')
            return image.addBands(evi)
        except Exception as e:
            logger.error("Error calculating EVI", error=str(e))
            raise

    def calculate_moisture_stress(self, image: ee.Image) -> ee.Image:
        try:
            ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI')
            # Classify stress levels: < -0.2 is high stress, -0.2 to 0.2 moderate, > 0.2 low
            high_stress = ndmi.lt(-0.2)
            mod_stress = ndmi.gte(-0.2).And(ndmi.lte(0.2))
            low_stress = ndmi.gt(0.2)
            
            stress_level = (ee.Image(0)
                            .where(high_stress, 3) # 3: High
                            .where(mod_stress, 2)  # 2: Moderate
                            .where(low_stress, 1)  # 1: Low
                            .rename('StressLevel'))
            return image.addBands([ndmi, stress_level])
        except Exception as e:
            logger.error("Error calculating moisture stress", error=str(e))
            raise

    def analyze_parcel(self, geojson: dict, days_back: int = 30) -> dict:
        try:
            geometry = self._geometry_from_geojson(geojson)
            end_date = datetime.datetime.now()
            start_date = end_date - datetime.timedelta(days=days_back)
            
            start_str = start_date.strftime('%Y-%m-%d')
            end_str = end_date.strftime('%Y-%m-%d')
            
            collection = self.fetch_sentinel2_imagery(geometry, start_str, end_str)
            collection = collection.map(self.calculate_ndvi).map(self.calculate_evi).map(self.calculate_moisture_stress)
            
            recent_image = collection.median().clip(geometry)
            
            # Compute zonal statistics
            stats = recent_image.reduceRegion(
                reducer=ee.Reducer.mean().combine(
                    reducer2=ee.Reducer.minMax(),
                    sharedInputs=True
                ).combine(
                    reducer2=ee.Reducer.stdDev(),
                    sharedInputs=True
                ),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            # Get historical baseline
            historical_stats = self.get_historical_trend(geometry, months=60) # 5 years
            
            # Simple anomaly detection
            current_ndvi_mean = stats.get('NDVI_mean', 0)
            baseline_ndvi_mean = sum([h['ndvi_mean'] for h in historical_stats[-12:]]) / 12 if historical_stats else 0
            anomaly = current_ndvi_mean - baseline_ndvi_mean
            
            return {
                'metrics': stats,
                'baseline_ndvi_mean': baseline_ndvi_mean,
                'ndvi_anomaly': anomaly,
                'historical_trend': historical_stats,
                'analysis_period': {'start': start_str, 'end': end_str}
            }
            
        except Exception as e:
            logger.error("Error analyzing parcel", error=str(e))
            raise

    def get_historical_trend(self, geometry: ee.Geometry, months: int = 12) -> list:
        try:
            end_date = datetime.datetime.now()
            start_date = end_date - datetime.timedelta(days=months*30)
            
            collection = self.fetch_sentinel2_imagery(geometry, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            collection = collection.map(self.calculate_ndvi).map(self.calculate_evi)
            
            def get_mean(image):
                date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')
                mean_dict = image.reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=geometry,
                    scale=10,
                    maxPixels=1e9
                )
                return ee.Feature(None, {'date': date, 'NDVI_mean': mean_dict.get('NDVI'), 'EVI_mean': mean_dict.get('EVI')})
            
            trend_features = collection.map(get_mean).getInfo()
            
            trend = []
            if 'features' in trend_features:
                for f in trend_features['features']:
                    props = f.get('properties', {})
                    if props.get('NDVI_mean') is not None:
                        trend.append({
                            'date': props.get('date'),
                            'ndvi_mean': props.get('NDVI_mean'),
                            'evi_mean': props.get('EVI_mean')
                        })
            return trend
        except Exception as e:
            logger.error("Error getting historical trend", error=str(e))
            raise

    def detect_canopy_stress_zones(self, geojson: dict) -> dict:
        try:
            geometry = self._geometry_from_geojson(geojson)
            end_date = datetime.datetime.now()
            start_date = end_date - datetime.timedelta(days=30)
            
            collection = self.fetch_sentinel2_imagery(geometry, start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            collection = collection.map(self.calculate_moisture_stress)
            recent_image = collection.median().clip(geometry)
            
            stress_stats = recent_image.reduceRegion(
                reducer=ee.Reducer.frequencyHistogram(),
                geometry=geometry,
                scale=10,
                maxPixels=1e9
            ).getInfo()
            
            return {
                'stress_distribution': stress_stats.get('StressLevel', {}),
                'metadata': 'Stress levels mapped: 1=Low, 2=Moderate, 3=High'
            }
        except Exception as e:
            logger.error("Error detecting canopy stress zones", error=str(e))
            raise
