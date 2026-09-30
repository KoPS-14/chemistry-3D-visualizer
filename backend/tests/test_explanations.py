import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_explain_element_endpoint():
    payload = {
        "atomic_number": 6,
        "symbol": "C",
        "name": "Carbon",
        "category": "nonmetal",
        "group": 14,
        "period": 2,
        "electron_configuration": "[He] 2s² 2p²",
        "atomic_mass": 12.011,
        "summary": "Carbon is tetravalent and forms organic compounds."
    }
    response = client.post("/api/explain/element", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["symbol"] == "C"
    assert data["element_name"] == "Carbon"
    assert len(data["explanation"]) > 20


def test_explain_reaction_endpoint():
    payload = {
        "name": "SN2 Substitution",
        "reaction_type": "SN2",
        "balanced_equation": "CH3Br + OH- -> CH3OH + Br-",
        "conditions": {
            "temperature_c": 50,
            "pressure_atm": 1.0,
            "catalyst": "none",
            "solvent": "acetone",
            "concentration": "2.0 M"
        },
        "is_interrupted": True
    }
    response = client.post("/api/explain/reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["reaction_name"] == "SN2 Substitution"
    assert data["is_interrupted"] is True
    assert len(data["explanation"]) > 20
