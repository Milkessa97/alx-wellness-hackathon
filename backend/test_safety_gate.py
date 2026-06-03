import pytest
from safety_gate import classify_assessment
from models import AssessmentRequest
from pydantic import ValidationError
from constants import TIER_SAFE, TIER_ELEVATED, TIER_CRISIS

def test_score_0_safe():
    """Test that a score of 0 (all answers 0) is classified as SAFE."""
    answers = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_SAFE
    assert score == 0

def test_score_9_safe():
    """Test that a score of 9 (upper bound of SAFE tier) is classified as SAFE."""
    answers = [1, 1, 1, 1, 1, 1, 1, 2, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_SAFE
    assert score == 9

def test_score_10_elevated():
    """Test that a score of 10 (lower bound of ELEVATED tier) is classified as ELEVATED."""
    answers = [2, 1, 1, 1, 1, 1, 1, 2, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_ELEVATED
    assert score == 10

def test_score_14_elevated():
    """Test that a score of 14 (upper bound of ELEVATED tier) is classified as ELEVATED."""
    answers = [2, 2, 2, 2, 2, 2, 1, 1, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_ELEVATED
    assert score == 14

def test_score_15_crisis():
    """Test that a score of 15 (lower bound of CRISIS tier) is classified as CRISIS."""
    answers = [2, 2, 2, 2, 2, 2, 2, 1, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_CRISIS
    assert score == 15

def test_score_27_crisis():
    """Test that a score of 27 (all answers 3, max possible score) is classified as CRISIS."""
    answers = [3, 3, 3, 3, 3, 3, 3, 3, 3]
    tier, score = classify_assessment(answers)
    assert tier == TIER_CRISIS
    assert score == 27

def test_q9_flag_triggers_crisis():
    """Test that if Q9 is non-zero (1), the assessment is classified as CRISIS even with a low score of 1."""
    answers = [0, 0, 0, 0, 0, 0, 0, 0, 1]
    tier, score = classify_assessment(answers)
    assert tier == TIER_CRISIS
    assert score == 1

def test_q9_zero_score_9_safe():
    """Test that if Q9 is zero and total score is 9, the assessment is correctly categorized as SAFE."""
    answers = [2, 2, 2, 2, 1, 0, 0, 0, 0]
    tier, score = classify_assessment(answers)
    assert tier == TIER_SAFE
    assert score == 9

def test_wrong_number_of_answers():
    """Test that passing a list of wrong length to classify_assessment raises a ValueError."""
    with pytest.raises(ValueError, match="Expected 9 answers"):
        classify_assessment([1, 2, 3])

def test_answer_out_of_range_validation():
    """Test that inputs out of bounds (not 0-3 or not integer) are rejected by Pydantic validator."""
    # Test value > 3
    with pytest.raises(ValidationError):
        AssessmentRequest(answers=[0, 0, 0, 0, 0, 0, 0, 0, 4])
        
    # Test negative value
    with pytest.raises(ValidationError):
        AssessmentRequest(answers=[0, 0, 0, 0, 0, 0, 0, 0, -1])

    # Test float value
    with pytest.raises(ValidationError):
        AssessmentRequest(answers=[0, 0, 0, 0, 0, 0, 0, 0, 1.5])
