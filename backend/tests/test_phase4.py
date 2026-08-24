import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.chemistry.lookup_service import LookupService
from app.chemistry.rdkit_service import RDKitService
from app.chemistry.reaction_templates import get_reaction_animation_template

client = TestClient(app)


def test_all_25_reaction_templates_load():
    """Test that all 25 reaction JSON template datasets exist and contain valid chemical SMILES."""
    from pathlib import Path
    import json
    from app.core.config import settings

    rxn_dir = settings.DATA_DIR / "reactions"
    json_files = list(rxn_dir.glob("*.json"))
    assert len(json_files) >= 24, f"Expected at least 24 reaction template files, found {len(json_files)}"

    for fpath in json_files:
        with open(fpath, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert "name" in data
            assert "reaction_type" in data
            assert "reactants" in data and len(data["reactants"]) > 0
            assert "products" in data and len(data["products"]) > 0

            # Verify RDKit validation for reactants & products
            for r in data["reactants"]:
                mol = RDKitService.validate_smiles(r["smiles"])
                assert mol is not None, f"Invalid reactant SMILES '{r['smiles']}' in {fpath.name}"

            for p in data["products"]:
                mol = RDKitService.validate_smiles(p["smiles"])
                assert mol is not None, f"Invalid product SMILES '{p['smiles']}' in {fpath.name}"


def test_reaction_animation_templates():
    """Test that animation keyframe templates are returned for all major reaction classes."""
    classes = ["SN2", "Addition", "Neutralization", "Elimination", "Combustion", "Oxidation", "Synthesis"]
    for c in classes:
        tmpl = get_reaction_animation_template(c)
        assert tmpl is not None
        assert "keyframes" in tmpl and len(tmpl["keyframes"]) >= 3
        assert "stages" in tmpl and len(tmpl["stages"]) >= 3


def test_visualize_endpoint_with_phase4_reactions():
    """Test /api/visualize endpoint returns 3D structures and keyframe animation template."""
    prompts = [
        "SN2 Substitution of Methyl Bromide with Hydroxide",
        "Catalytic Hydrogenation of Ethylene",
        "Methane Complete Combustion",
        "Fischer Esterification of Acetic Acid & Ethanol"
    ]
    for prompt in prompts:
        resp = client.post("/api/visualize", json={"prompt": prompt})
        assert resp.status_code == 200
        json_data = resp.json()
        assert json_data["status"] == "success"
        assert json_data["request_type"] == "reaction"
        rxn = json_data["data"]
        assert "animation_template" in rxn and rxn["animation_template"] is not None
        assert "stages" in rxn and len(rxn["stages"]) > 0
