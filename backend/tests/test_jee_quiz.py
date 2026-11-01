import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_all_quiz_questions():
    response = client.get("/api/quiz/questions")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert 2025 in data["available_years"]
    assert 2024 in data["available_years"]
    assert 2023 in data["available_years"]
    assert 2022 in data["available_years"]
    assert len(data["questions"]) >= 5


def test_filter_quiz_questions_by_year():
    response = client.get("/api/quiz/questions?year=2024")
    assert response.status_code == 200
    data = response.json()
    for q in data["questions"]:
        assert q["year"] == 2024


def test_filter_quiz_questions_by_category():
    response = client.get("/api/quiz/questions?category=Organic%20Chemistry")
    assert response.status_code == 200
    data = response.json()
    for q in data["questions"]:
        assert q["category"] == "Organic Chemistry"


def test_get_progressive_hints():
    # Fetch first question
    q_res = client.get("/api/quiz/questions")
    q_id = q_res.json()["questions"][0]["id"]

    # Step 1
    h1_res = client.get(f"/api/quiz/hint/{q_id}?step=1")
    assert h1_res.status_code == 200
    h1_data = h1_res.json()
    assert h1_data["hint_step"] == 1
    assert len(h1_data["hint_text"]) > 0

    # Step 2
    h2_res = client.get(f"/api/quiz/hint/{q_id}?step=2")
    assert h2_res.status_code == 200
    assert h2_res.json()["hint_step"] == 2


def test_teach_in_3d_endpoint():
    q_res = client.get("/api/quiz/questions")
    q_id = q_res.json()["questions"][0]["id"]

    t3d_res = client.get(f"/api/quiz/teach-3d/{q_id}")
    assert t3d_res.status_code == 200
    data = t3d_res.json()
    assert "spatial_insight" in data
    assert len(data["stages"]) > 0
    assert data["reaction_data"] is not None
    assert len(data["reaction_data"]["reactants"]) > 0
    assert len(data["reaction_data"]["products"]) > 0

