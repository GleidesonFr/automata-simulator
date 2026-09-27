from fastapi import APIRouter, HTTPException
from app.core.parser import parse_automaton
from app.core.simulator import simulate
from app.schemas.automaton import (
    SimulationRequest,
    SimulationResponse,
    SimulationStepResponse,
    TraversedTransitionResponse,
)
from app.core.validator import InvalidAutomatonError

router = APIRouter()

@router.post('/simulate', response_model=SimulationResponse)
def simulate_automaton(request: SimulationRequest):
    try:
        data = request.automaton.model_dump()
        data["words"] = []
        parsed = parse_automaton(data)
        
        result = simulate(parsed.automaton, request.word)
        return SimulationResponse(
            word=result.word,
            accepted=result.accepted,
            steps=[
                SimulationStepResponse(
                    symbol=step.symbol,
                    active_states=sorted(step.active_states),
                    direct_states=sorted(step.direct_states),
                    epsilon_states=sorted(step.epsilon_states),
                    consumed_transitions=[
                        TraversedTransitionResponse(
                            source=transition.source,
                            symbol=transition.symbol,
                            target=transition.target,
                        )
                        for transition in sorted(step.consumed_transitions)
                    ],
                    epsilon_transitions=[
                        TraversedTransitionResponse(
                            source=transition.source,
                            symbol=transition.symbol,
                            target=transition.target,
                        )
                        for transition in sorted(step.epsilon_transitions)
                    ],
                )
                for step in result.steps
            ],
            final_active_states=sorted(result.final_active_states),
            accepting_states=sorted(result.accepting_states),
        )
    except InvalidAutomatonError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
