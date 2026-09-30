import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.chemistry.kinetics import evaluate_educational_conditions

client = TestClient(app)


def test_kinetics_temperature_scaling():
    # Test temperature acceleration
    res_25c = evaluate_educational_conditions("SN2", {"temperature_c": 25.0})
    res_100c = evaluate_educational_conditions("SN2", {"temperature_c": 100.0})

    assert res_25c["status"] == "success"
    assert res_100c["status"] == "success"
    assert res_100c["relative_rate_multiplier"] > res_25c["relative_rate_multiplier"]
    assert res_100c["simulation_speed_factor"] >= res_25c["simulation_speed_factor"]


def test_kinetics_catalyst_barrier_reduction():
    # Test catalyst lowers Ea
    res_no_cat = evaluate_educational_conditions("Addition", {"catalyst": "none"})
    res_with_cat = evaluate_educational_conditions("Addition", {"catalyst": "platinum"})

    assert res_with_cat["effective_activation_energy_kj"] < res_no_cat["effective_activation_energy_kj"]
    assert res_with_cat["catalyst_reduction_kj"] > 0
    assert res_with_cat["relative_rate_multiplier"] > res_no_cat["relative_rate_multiplier"]


def test_kinetics_solvent_effect_sn2():
    # Test polar aprotic increases SN2 rate
    res_aprotic = evaluate_educational_conditions("SN2", {"solvent": "acetone"})
    res_protic = evaluate_educational_conditions("SN2", {"solvent": "ethanol"})

    assert res_aprotic["relative_rate_multiplier"] > res_protic["relative_rate_multiplier"]
    assert "Polar aprotic" in res_aprotic["rate_impact"]


def test_kinetics_api_endpoint():
    payload = {
        "reaction_type": "SN2",
        "conditions": {
            "temperature_c": 75.0,
            "pressure_atm": 2.0,
            "catalyst": "none",
            "solvent": "acetone",
            "concentration": "2.0 M"
        }
    }
    resp = client.post("/api/kinetics", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["temperature_c"] == 75.0
    assert data["relative_rate_multiplier"] > 1.0
    assert "Arrhenius" in data["educational_insight"]

