from typing import Any, Dict
from agents.base import Agent, SequentialAgent, ParallelAgent, ADK_AVAILABLE
from agents.diagnostic_agent import DiagnosticAgent
from agents.geospatial_agent import GeospatialAgent
from agents.climate_agent import ClimateAgent
from agents.brics_exchange_agent import BRICSExchangeAgent
from agents.supervisor import SupervisorAgent

_AGENTS = {}

def get_agent(agent_name: str) -> Any:
    """Retrieve an agent by name, initializing if not already created."""
    if not _AGENTS:
        # Initialize instances on first request
        _AGENTS["diagnostic"] = DiagnosticAgent()
        _AGENTS["geospatial"] = GeospatialAgent()
        _AGENTS["climate"] = ClimateAgent()
        _AGENTS["brics_exchange"] = BRICSExchangeAgent()
        _AGENTS["supervisor"] = SupervisorAgent()
        
    if agent_name not in _AGENTS:
        raise ValueError(f"Agent {agent_name} not found. Available agents: {list(_AGENTS.keys())}")
        
    return _AGENTS[agent_name]

__all__ = [
    "DiagnosticAgent",
    "GeospatialAgent",
    "ClimateAgent",
    "BRICSExchangeAgent",
    "SupervisorAgent",
    "get_agent"
]
