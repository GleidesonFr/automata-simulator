from dataclasses import dataclass
from .automaton import Automaton, State, Symbol
from .epsilon import EPSILON, epsilon_closure_with_trace


@dataclass(frozen=True, order=True)
class TraversedTransition:
    source: State
    symbol: Symbol
    target: State

@dataclass
class SimulationStep:
    symbol: Symbol | None
    active_states: set[State]
    direct_states: set[State]
    epsilon_states: set[State]
    consumed_transitions: set[TraversedTransition]
    epsilon_transitions: set[TraversedTransition]

@dataclass
class SimulationResult:
    word: str
    accepted: bool
    steps: list[SimulationStep]
    final_active_states: set[State]
    accepting_states: set[State]

def move(automaton: Automaton, states: set[State], symbol: Symbol) -> set[State]:
    reachable_states, _ = move_with_trace(automaton, states, symbol)
    return reachable_states


def move_with_trace(
    automaton: Automaton,
    states: set[State],
    symbol: Symbol,
) -> tuple[set[State], set[TraversedTransition]]:
    reachable_states: set[State] = set()
    traversed: set[TraversedTransition] = set()

    for state in states:
        transitions = automaton.get_transitions(state, symbol)
        reachable_states.update(transitions)
        traversed.update(
            TraversedTransition(state, symbol, target)
            for target in transitions
        )

    return reachable_states, traversed


def traced_epsilon_closure(
    automaton: Automaton,
    states: set[State],
) -> tuple[set[State], set[TraversedTransition]]:
    closure, traversed_pairs = epsilon_closure_with_trace(automaton, states)
    transitions = {
        TraversedTransition(source, EPSILON, target)
        for source, target in traversed_pairs
    }
    return closure, transitions

def simulate(automaton: Automaton, word: str) -> SimulationResult:
    initial_states = {automaton.initial_state}
    active_states, initial_epsilon_transitions = traced_epsilon_closure(
        automaton,
        initial_states,
    )
    
    steps = [
        SimulationStep(
            symbol=None,
            active_states=set(active_states),
            direct_states=initial_states,
            epsilon_states=active_states - initial_states,
            consumed_transitions=set(),
            epsilon_transitions=initial_epsilon_transitions,
        ),
    ]

    for symbol in word:
        reachable_states, consumed_transitions = move_with_trace(
            automaton,
            active_states,
            symbol,
        )
        active_states, epsilon_transitions = traced_epsilon_closure(
            automaton,
            reachable_states,
        )

        steps.append(
            SimulationStep(
                symbol=symbol,
                active_states=set(active_states),
                direct_states=set(reachable_states),
                epsilon_states=active_states - reachable_states,
                consumed_transitions=consumed_transitions,
                epsilon_transitions=epsilon_transitions,
            )
        )
    
    accepting_states = active_states & automaton.final_states
    accepted = bool(accepting_states)

    return SimulationResult(
        word=word,
        accepted=accepted,
        steps=steps,
        final_active_states=set(active_states),
        accepting_states=set(accepting_states),
    )
