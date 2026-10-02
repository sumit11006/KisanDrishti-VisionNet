"""Base Agent class for Krishi-Vision BRICS-AgriN.

Provides a lightweight Agent base that mirrors the google.adk.agents.Agent
interface. When the Google ADK SDK is available (in production on GCP),
the real ADK Agent is used. For local development and demo purposes,
this fallback ensures the server boots without GCP dependencies.
"""
import logging
from typing import Any, List, Optional

logger = logging.getLogger(__name__)

try:
    from google.adk.agents import Agent as _ADKAgent, SequentialAgent, ParallelAgent
    ADK_AVAILABLE = True
    logger.info("Google ADK SDK detected.")
except ImportError:
    ADK_AVAILABLE = False
    logger.info("Google ADK SDK not found — using local demo agent base.")

    class _ADKAgent:
        """Lightweight Agent base for local/demo execution."""
        def __init__(self, name: str = "Agent", **kwargs):
            self.name = name

    class SequentialAgent(_ADKAgent):
        def __init__(self, agents: Optional[List[Any]] = None, **kwargs):
            super().__init__(name="SequentialAgent", **kwargs)
            self.agents = agents or []

    class ParallelAgent(_ADKAgent):
        def __init__(self, agents: Optional[List[Any]] = None, **kwargs):
            super().__init__(name="ParallelAgent", **kwargs)
            self.agents = agents or []

Agent = _ADKAgent
__all__ = ["Agent", "SequentialAgent", "ParallelAgent", "ADK_AVAILABLE"]
