from app.core.automaton import Automaton
from app.core.epsilon import epsilon_closure
from app.core.simulator import TraversedTransition, move, simulate


def create_automaton() -> Automaton:
    return Automaton(
        states={"q0", "q1", "q2"},
        alphabet={"a", "b"},
        initial_state="q0",
        final_states={"q2"},
        transitions={
            "q0": {
                "a": {"q0"},
                "ε": {"q1"},
            },
            "q1": {
                "b": {"q2"},
            },
            "q2": {},
        },
    )

def test_move():
    automaton = create_automaton()

    result = move(
        automaton,
        {"q0"},
        "a",
    )

    assert result == {"q0"}

def test_move_without_transition():
    automaton = create_automaton()

    result = move(
        automaton,
        {"q2"},
        "a",
    )

    assert result == set()

def test_accept_word():
    automaton = create_automaton()

    result = simulate(
        automaton,
        "b",
    )

    assert result.accepted is True
    assert result.final_active_states == {"q2"}
    assert result.accepting_states == {"q2"}

def test_accept_word_with_multiple_symbols():
    automaton = create_automaton()

    result = simulate(
        automaton,
        "aaab",
    )

    assert result.accepted is True
    assert result.final_active_states == {"q2"}

def test_reject_word():
    automaton = create_automaton()

    result = simulate(
        automaton,
        "aaa",
    )

    assert result.accepted is False
    assert result.accepting_states == set()

def test_empty_word_rejected():
    automaton = create_automaton()

    result = simulate(
        automaton,
        "",
    )

    assert result.accepted is False
    assert result.final_active_states == {"q0", "q1"}
    assert result.accepting_states == set()

def test_empty_word_accepted_through_epsilon():
    automaton = Automaton(
        states={"q0", "q1"},
        alphabet={"a"},
        initial_state="q0",
        final_states={"q1"},
        transitions={
            "q0": {
                "ε": {"q1"},
            },
            "q1": {},
        },
    )

    result = simulate(
        automaton,
        "",
    )

    assert result.accepted is True
    assert result.final_active_states == {"q0", "q1"}
    assert result.accepting_states == {"q1"}

def test_simulation_steps():
    automaton = create_automaton()

    result = simulate(
        automaton,
        "ab",
    )

    assert len(result.steps) == 3

    assert result.steps[0].symbol is None
    assert result.steps[0].active_states == {"q0", "q1"}
    assert result.steps[0].direct_states == {"q0"}
    assert result.steps[0].epsilon_states == {"q1"}
    assert result.steps[0].consumed_transitions == set()
    assert result.steps[0].epsilon_transitions == {
        TraversedTransition("q0", "ε", "q1"),
    }

    assert result.steps[1].symbol == "a"
    assert result.steps[1].active_states == {"q0", "q1"}
    assert result.steps[1].direct_states == {"q0"}
    assert result.steps[1].epsilon_states == {"q1"}
    assert result.steps[1].consumed_transitions == {
        TraversedTransition("q0", "a", "q0"),
    }
    assert result.steps[1].epsilon_transitions == {
        TraversedTransition("q0", "ε", "q1"),
    }

    assert result.steps[2].symbol == "b"
    assert result.steps[2].active_states == {"q2"}
    assert result.steps[2].direct_states == {"q2"}
    assert result.steps[2].epsilon_states == set()
    assert result.steps[2].consumed_transitions == {
        TraversedTransition("q1", "b", "q2"),
    }
    assert result.steps[2].epsilon_transitions == set()

    assert len(result.steps) == len(result.word) + 1


def test_rejected_step_without_transition_has_empty_trace():
    result = simulate(create_automaton(), "c")

    step = result.steps[1]
    assert step.active_states == set()
    assert step.direct_states == set()
    assert step.epsilon_states == set()
    assert step.consumed_transitions == set()
    assert step.epsilon_transitions == set()


def test_step_state_partition_is_consistent():
    result = simulate(create_automaton(), "aaab")

    for step in result.steps:
        assert step.direct_states.isdisjoint(step.epsilon_states)
        assert step.active_states == step.direct_states | step.epsilon_states


def test_steps_follow_formal_recurrence_and_final_intersection():
    automaton = create_automaton()
    word = "aaab"

    result = simulate(automaton, word)
    expected_states = epsilon_closure(automaton, {automaton.initial_state})

    assert result.steps[0].active_states == expected_states

    for symbol, step in zip(word, result.steps[1:], strict=True):
        expected_states = epsilon_closure(
            automaton,
            move(automaton, expected_states, symbol),
        )
        assert step.symbol == symbol
        assert step.active_states == expected_states

    expected_intersection = expected_states & automaton.final_states
    assert result.final_active_states == expected_states
    assert result.accepting_states == expected_intersection
    assert result.accepted is bool(expected_intersection)
