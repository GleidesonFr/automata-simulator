import json
from dataclasses import dataclass
from pathlib import Path
from .automaton import Automaton, Transitions
from .validator import validate_automaton

@dataclass
class AutomatonInput:
    automaton: Automaton
    words: list[str]

def load_automaton_file(file_path: str | Path) -> AutomatonInput:
    path = Path(file_path)

    with path.open('r', encoding='utf-8') as file:
        data = json.load(file)

    return parse_automaton(data)

def parse_automaton(data: dict) -> AutomatonInput:
    states = set(data['states'])
    alphabet = set(data['alphabet'])
    initial_state = data['initial_state']
    final_states = set(data['final_states'])
    words = data.get('words', [])
    
    transitions = parse_transitions(data['transitions'])
    
    automaton = Automaton(
        states,
        alphabet,
        initial_state,
        final_states,
        transitions
    )

    validate_automaton(automaton)

    return AutomatonInput(automaton, words)

def parse_transitions(data: dict) -> Transitions:
    transitions: Transitions = {}

    for state, state_transitions in data.items():
        transitions[state] = {}
        for symbol, target_states in state_transitions.items():
            transitions[state][symbol] = set(target_states)

    return transitions
