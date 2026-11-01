import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.chemistry.reaction_rules import REACTION_RULES

client = TestClient(app)


def test_rule_count_is_exactly_five():
    assert len(REACTION_RULES) == 5, f"Expected exactly 5 reaction rules, found {len(REACTION_RULES)}"
    rule_ids = [r["id"] for r in REACTION_RULES]
    assert "sn2_nucleophilic_substitution" in rule_ids
    assert "esterification" in rule_ids
    assert "acid_base_neutralization" in rule_ids
    assert "amide_formation" in rule_ids
    assert "alkene_hydration" in rule_ids


def test_sn2_bromomethane_hydroxide():
    payload = {
        "reactants": ["bromomethane", "hydroxide"],
        "conditions": {"temperature_c": 25, "catalyst": None}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["matched_rule"]["id"] == "sn2_nucleophilic_substitution"
    prod_smiles = [p["smiles"] for p in data["products"]]
    assert any("CO" in s for s in prod_smiles), f"Methanol not found in {prod_smiles}"
    assert any("Br" in s for s in prod_smiles), f"Bromide not found in {prod_smiles}"
    assert len(data["narration"]) > 0
    assert data["reactant_state"] is not None
    assert data["product_state"] is not None


def test_esterification_acetic_acid_ethanol():
    payload = {
        "reactants": ["acetic acid", "ethanol"],
        "conditions": {"temperature_c": 60, "catalyst": "sulfuric acid"}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["matched_rule"]["id"] == "esterification"
    prod_smiles = [p["smiles"] for p in data["products"]]
    # Ethyl acetate is CCOC(C)=O or similar and water is O
    assert any("O" in s for s in prod_smiles)
    assert any("C" in s and "(=O)" in s or "C(=O)OCC" in s or "CCOC(C)=O" in s for s in prod_smiles)


def test_acid_base_neutralization():
    payload = {
        "reactants": ["hydrochloric acid", "sodium hydroxide"],
        "conditions": {"temperature_c": 25}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["matched_rule"]["id"] == "acid_base_neutralization"
    prod_smiles = [p["smiles"] for p in data["products"]]
    assert any(s == "O" for s in prod_smiles), f"Water not found in {prod_smiles}"
    assert any("Cl" in s and "Na" in s for s in prod_smiles), f"NaCl not found in {prod_smiles}"


def test_amide_formation_acetic_acid_ethylamine():
    payload = {
        "reactants": ["acetic acid", "ethylamine"],
        "conditions": {"temperature_c": 50}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["matched_rule"]["id"] == "amide_formation"
    prod_smiles = [p["smiles"] for p in data["products"]]
    assert any(s == "O" for s in prod_smiles), f"Water not found in {prod_smiles}"
    assert any("CCNC(C)=O" in s or "CCNC(=O)C" in s for s in prod_smiles), f"Amide not found in {prod_smiles}"


def test_alkene_hydration_ethene_water():
    payload = {
        "reactants": ["ethene", "water"],
        "conditions": {"temperature_c": 100, "catalyst": "acid"}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["matched_rule"]["id"] == "alkene_hydration"
    prod_smiles = [p["smiles"] for p in data["products"]]
    assert any("CCO" in s for s in prod_smiles), f"Ethanol not found in {prod_smiles}"


def test_no_supported_rule_gold_mercury():
    payload = {
        "reactants": ["gold", "mercury"],
        "conditions": {"temperature_c": 25}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_supported_rule"
    assert data["products"] is None
    assert data["molecule_analysis"] is not None
    assert len(data["molecule_analysis"]) == 2
    # Verify that properties like molar mass, formula, tpsa, logp are present
    for m in data["molecule_analysis"]:
        assert "formula" in m
        assert "molecular_weight" in m
        assert "tpsa" in m
        assert "logp" in m
        assert "hbd" in m
        assert "hba" in m


def test_no_supported_rule_benzene_methane():
    payload = {
        "reactants": ["benzene", "methane"],
        "conditions": {"temperature_c": 25}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_supported_rule"
    assert data["products"] is None
    assert data["molecule_analysis"] is not None
    assert len(data["molecule_analysis"]) == 2
    assert data["molecule_analysis"][0]["formula"] in ("C6H6", "CH4")


def test_invalid_name_clear_error():
    payload = {
        "reactants": ["completely_fake_chemical_xyz_12345", "water"],
        "conditions": {"temperature_c": 25}
    }
    response = client.post("/api/custom-reaction", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("lookup_failure", "invalid_molecule")
    assert "Could not resolve" in data["message"] or "failed" in data["message"].lower()

