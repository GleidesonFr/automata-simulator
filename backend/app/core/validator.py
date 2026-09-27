from .automaton import Automaton
from .epsilon import EPSILON

class InvalidAutomatonError(ValueError):
    pass

def validate_automaton(automaton: Automaton) -> None:
    if EPSILON in automaton.alphabet:
        raise InvalidAutomatonError("ε não deve pertencer ao alfabeto Σ.")
        
    if automaton.initial_state not in automaton.states:
        raise InvalidAutomatonError( f"Estado inicial '{automaton.initial_state}' não pertence a Q.")
    
    invalid_final_states = automaton.final_states - automaton.states

    if invalid_final_states:
        raise InvalidAutomatonError( f"Estados finais não pertencem a Q: {invalid_final_states}")
    
    for state, transitions in automaton.transitions.items():
        if state not in automaton.states:
            raise InvalidAutomatonError( f"Estado '{state}' presente em δ não pertence a Q.")
        for symbol, target_states in transitions.items():
            if symbol != EPSILON and symbol not in automaton.alphabet:
                raise InvalidAutomatonError(f"Símbolo '{symbol}' não pertence a Σ.")
            
            invalid_targets = target_states - automaton.states
            
            if invalid_targets:
                raise InvalidAutomatonError( f"Estados de destino não pertencem a Q: {invalid_targets}")
            