"""
backend/tests/unit/test_tracking_fsm.py

Pure FSM validation tests (no DB needed) for
app/services/tracking_service.validate_transition.
"""
import pytest

from app.core.exceptions import InvalidStatusTransitionError
from app.services.tracking_service import validate_transition


def test_valid_forward_transition():
    validate_transition("DRAFT", "READY")
    validate_transition("APPLIED", "IN_REVIEW")
    validate_transition("INTERVIEWING", "OFFER")


def test_invalid_transition_rejected():
    with pytest.raises(InvalidStatusTransitionError):
        validate_transition("DRAFT", "OFFER")


def test_terminal_states_have_no_transitions():
    with pytest.raises(InvalidStatusTransitionError):
        validate_transition("REJECTED", "APPLIED")
    with pytest.raises(InvalidStatusTransitionError):
        validate_transition("WITHDRAWN", "DRAFT")


def test_withdraw_allowed_from_any_active_state():
    for state in ["DRAFT", "READY", "APPLIED", "IN_REVIEW", "INTERVIEWING", "OFFER"]:
        validate_transition(state, "WITHDRAWN")
