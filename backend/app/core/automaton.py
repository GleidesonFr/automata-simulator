from dataclasses import dataclass
from typing import TypeAlias

State: TypeAlias = str
Symbol: TypeAlias = str

Transitions: TypeAlias = dict[
    State,
    dict[Symbol, set[State]]
]

@dataclass
class Automaton:
    states: set[State]
    alphabet: set[Symbol]
    initial_state: State
    final_states: set[State]
    transitions: Transitions

    def get_transitions(self, state: State, symbol: Symbol) -> set[State]:
        return self.transitions.get(state, {}).get(symbol, set())