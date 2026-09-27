from app.core.automaton import Automaton
from app.core.epsilon import epsilon_closure, epsilon_closure_with_trace

def create_automaton() -> Automaton:
    return Automaton(
        states={"q0", "q1", "q2", "q3"},
        alphabet={"a", "b"},
        initial_state="q0",
        final_states={"q3"},
        transitions={
            "q0": {
                "ε": {"q1"}
            },
            "q1": {
                "ε": {"q2"}
            },
            "q2": {
                "a": {"q3"},
            },
            "q3": {}
        }
    )

def test_epsilon_closure_without_epsilon_transition():
    automaton = create_automaton()

    result = epsilon_closure(automaton, {"q3"})

    assert result == {"q3"}

def test_epsilon_closure_with_one_epsilon_transition():
    automaton = create_automaton()

    result = epsilon_closure(automaton, {"q1"})

    assert result == {"q1", "q2"}

def test_epsilon_closure_with_transitive_transitions():
    automaton = create_automaton()

    result = epsilon_closure(automaton, {"q0"})

    assert result == {"q0", "q1", "q2"}

def test_epsilon_closure_with_cycle():
    automaton = Automaton(
        states={"q0", "q1", "q2"},
        alphabet={"a"},
        initial_state="q0",
        final_states={"q2"},
        transitions={
            "q0": {
                "ε": {"q1"},
            },
            "q1": {
                "ε": {"q0", "q2"},
            },
            "q2": {},
        },
    )

    result = epsilon_closure(automaton, {"q0"})

    assert result == {"q0", "q1", "q2"}


def test_epsilon_closure_trace_includes_cycle_edges():
    automaton = Automaton(
        states={"q0", "q1", "q2"},
        alphabet={"a"},
        initial_state="q0",
        final_states={"q2"},
        transitions={
            "q0": {"ε": {"q1"}},
            "q1": {"ε": {"q0", "q2"}},
            "q2": {},
        },
    )

    closure, traversed = epsilon_closure_with_trace(automaton, {"q0"})

    assert closure == {"q0", "q1", "q2"}
    assert traversed == {("q0", "q1"), ("q1", "q0"), ("q1", "q2")}

def test_epsilon_closure_with_multiple_initial_states():
    automaton = create_automaton()

    result = epsilon_closure(
        automaton,
        {"q0", "q3"},
    )

    assert result == {"q0", "q1", "q2", "q3"}
