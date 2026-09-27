from pydantic import BaseModel

class AutomatonSchema(BaseModel):
    states: list[str]
    alphabet: list[str]
    initial_state: str
    final_states: list[str]
    transitions: dict[str, dict[str, list[str]]]

class SimulationRequest(BaseModel):
    automaton: AutomatonSchema
    word: str

class TraversedTransitionResponse(BaseModel):
    source: str
    symbol: str
    target: str

class SimulationStepResponse(BaseModel):
    symbol: str | None
    active_states: list[str]
    direct_states: list[str]
    epsilon_states: list[str]
    consumed_transitions: list[TraversedTransitionResponse]
    epsilon_transitions: list[TraversedTransitionResponse]

class SimulationResponse(BaseModel):
    word: str
    accepted: bool
    steps: list[SimulationStepResponse]
    final_active_states: list[str]
    accepting_states: list[str]
