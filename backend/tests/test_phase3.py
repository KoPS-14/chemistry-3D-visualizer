import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_sn2_reaction_endpoint():
    """Test SN2 reaction request via /api/visualize"""
    response = client.post(
        "/api/visualize",
        json={"prompt": "Show the SN2 reaction of methyl bromide with hydroxide"}
    )
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["status"] == "success"
    assert json_resp["request_type"] == "reaction"
    
    data = json_resp["data"]
    assert data["reaction_type"] == "SN2"
    assert "reactants" in data and len(data["reactants"]) >= 2
    assert "products" in data and len(data["products"]) >= 2

    # Check 3D molecular structures generated for reactants and products
    for r in data["reactants"]:
        assert r["molecule_data"] is not None
        assert len(r["molecule_data"]["atoms"]) > 0

    for p in data["products"]:
        assert p["molecule_data"] is not None
        assert len(p["molecule_data"]["atoms"]) > 0


def test_water_formation_reaction_endpoint():
    """Test water formation reaction prompt"""
    response = client.post(
        "/api/visualize",
        json={"prompt": "Show water formation reaction"}
    )
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["status"] == "success"
    assert json_resp["request_type"] == "reaction"
    assert json_resp["data"]["reaction_type"] == "WaterFormation"


def test_acid_base_reaction_endpoint():
    """Test acid base neutralization reaction prompt"""
    response = client.post(
        "/api/visualize",
        json={"prompt": "Show acid base neutralization"}
    )
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["status"] == "success"
    assert json_resp["request_type"] == "reaction"
    assert json_resp["data"]["reaction_type"] == "AcidBase"
