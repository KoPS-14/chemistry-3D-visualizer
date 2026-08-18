import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.chemistry.rdkit_service import RDKitService
from app.ai.llm_service import LLMService

client = TestClient(app)


def test_valid_smiles():
    """Test 1: Valid SMILES parsing via RDKit"""
    mol = RDKitService.validate_smiles("CCO")
    assert mol is not None
    assert mol.GetNumAtoms() == 3  # Heavy atoms C, C, O


def test_invalid_smiles():
    """Test 2: Invalid SMILES rejection via RDKit"""
    mol = RDKitService.validate_smiles("INVALID_SMILES_STRING_123")
    assert mol is None


def test_3d_coordinate_generation():
    """Test 3: 3D embedding and coordinate extraction for ethanol (CCO)"""
    mol_data = RDKitService.generate_3d_molecule("CCO", name="Ethanol")
    assert mol_data is not None
    assert mol_data.name == "Ethanol"
    assert mol_data.smiles == "CCO"
    assert mol_data.formula == "C2H6O"
    assert len(mol_data.atoms) == 9  # 2 Carbons, 1 Oxygen, 6 Hydrogens
    assert len(mol_data.bonds) == 8
    
    # Verify non-zero 3D coordinates
    coords = [(atom.x, atom.y, atom.z) for atom in mol_data.atoms]
    assert any(x != 0.0 or y != 0.0 or z != 0.0 for x, y, z in coords)


def test_llm_structured_output_validation():
    """Test 4: LLM structured output parsing for 'Show the 3D structure of ethanol'"""
    res = LLMService.parse_prompt("Show the 3D structure of ethanol")
    assert res.request_type == "molecule"
    assert res.smiles == "CCO"
    assert res.confidence >= 0.90


def test_molecule_api_endpoint():
    """Test 5: POST /api/visualize endpoint with 'Show ethanol'"""
    response = client.post("/api/visualize", json={"prompt": "Show ethanol in 3D"})
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["status"] == "success"
    assert json_resp["request_type"] == "molecule"
    data = json_resp["data"]
    assert data["smiles"] == "CCO"
    assert data["formula"] == "C2H6O"
    assert len(data["atoms"]) == 9
    assert len(data["bonds"]) == 8


def test_unsupported_reaction_handling():
    """Test 6: POST /api/visualize with unsupported or unknown chemistry prompt"""
    response = client.post("/api/visualize", json={"prompt": "Show quantum teleportation of unknown element Xyz"})
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["status"] == "unsupported"
    assert "not currently supported" in json_resp["message"]


def test_health_endpoint():
    """Test GET /api/health endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
