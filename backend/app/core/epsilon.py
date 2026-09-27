from .automaton import Automaton, State

EPSILON = "ε"

def epsilon_closure(automaton: Automaton, states: set[State]) -> set[State]:
    closure, _ = epsilon_closure_with_trace(automaton, states)
    return closure


def epsilon_closure_with_trace(
    automaton: Automaton,
    states: set[State],
) -> tuple[set[State], set[tuple[State, State]]]:
    closure = set(states)
    stack = list(states)
    traversed: set[tuple[State, State]] = set()

    while stack:
        state = stack.pop()
        epsilon_moves = automaton.get_transitions(state, EPSILON)

        for next_state in epsilon_moves:
            traversed.add((state, next_state))
            if next_state not in closure:
                closure.add(next_state)
                stack.append(next_state)

    return closure, traversed
