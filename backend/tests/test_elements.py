import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_get_all_elements():
    """Test GET /api/elements returns all 118 elements"""
    response = client.get("/api/elements")
    assert response.status_code == 200
    elements = response.json()
    assert len(elements) == 118
    
    # Check uniqueness of atomic numbers 1 to 118
    atomic_nums = [e["atomic_number"] for e in elements]
    assert sorted(atomic_nums) == list(range(1, 119))


def test_specific_elements_exist():
    """Test Hydrogen (1), Carbon (6), Iron (26), Gold (79), Uranium (92)"""
    h_resp = client.get("/api/elements/1")
    assert h_resp.status_code == 200
    assert h_resp.json()["symbol"] == "H"
    assert h_resp.json()["name"] == "Hydrogen"

    c_resp = client.get("/api/elements/6")
    assert c_resp.status_code == 200
    assert c_resp.json()["symbol"] == "C"

    fe_resp = client.get("/api/elements/26")
    assert fe_resp.status_code == 200
    assert fe_resp.json()["symbol"] == "Fe"
    assert fe_resp.json()["name"] == "Iron"

    au_resp = client.get("/api/elements/79")
    assert au_resp.status_code == 200
    assert au_resp.json()["symbol"] == "Au"
    assert au_resp.json()["name"] == "Gold"

    u_resp = client.get("/api/elements/92")
    assert u_resp.status_code == 200
    assert u_resp.json()["symbol"] == "U"
    assert u_resp.json()["name"] == "Uranium"


def test_invalid_atomic_number():
    """Test invalid atomic numbers return HTTP 404"""
    resp_zero = client.get("/api/elements/0")
    assert resp_zero.status_code == 404

    resp_too_high = client.get("/api/elements/119")
    assert resp_too_high.status_code == 404
