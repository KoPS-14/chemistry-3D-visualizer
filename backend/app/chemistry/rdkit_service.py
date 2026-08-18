import json
import logging
from typing import Dict, Any, Optional
from pathlib import Path

from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors, rdMolDescriptors

from app.schemas.models import MoleculeData, AtomData, BondData
from app.core.config import settings

logger = logging.getLogger(__name__)

DEFAULT_CPK = {
    "H": "#FFFFFF",
    "C": "#909090",
    "N": "#3050F8",
    "O": "#FF0D0D",
    "F": "#90E050",
    "Na": "#AB5CF2",
    "P": "#FF8000",
    "S": "#FFFF30",
    "Cl": "#1FF01F",
    "Br": "#A62929",
    "I": "#940094"
}


def load_cpk_colors() -> Dict[str, str]:
    table_path = settings.DATA_DIR / "elements" / "periodic_table.json"
    colors = DEFAULT_CPK.copy()
    if table_path.exists():
        try:
            with open(table_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for sym, info in data.items():
                    if "cpk" in info:
                        colors[sym] = info["cpk"]
        except Exception as e:
            logger.warning(f"Could not load periodic table JSON: {e}")
    return colors


CPK_COLORS = load_cpk_colors()


class RDKitService:
    @staticmethod
    def validate_smiles(smiles: str) -> Optional[Chem.Mol]:
        if not smiles or not isinstance(smiles, str):
            return None
        try:
            mol = Chem.MolFromSmiles(smiles.strip())
            return mol
        except Exception:
            return None

    @staticmethod
    def generate_3d_molecule(smiles: str, name: str = "Molecule") -> Optional[MoleculeData]:
        mol = RDKitService.validate_smiles(smiles)
        if mol is None:
            return None

        # Add explicit hydrogens for complete 3D structure
        mol_h = Chem.AddHs(mol)

        # Embed 3D coordinates
        embed_res = -1
        try:
            params = AllChem.ETKDGv3()
            params.randomSeed = 42
            embed_res = AllChem.EmbedMolecule(mol_h, params)
        except Exception:
            pass

        if embed_res != 0:
            try:
                embed_res = AllChem.EmbedMolecule(mol_h, randomSeed=42)
            except Exception:
                embed_res = -1

        if embed_res != 0 or mol_h.GetNumConformers() == 0:
            logger.error(f"Failed to generate 3D coordinates for SMILES: {smiles}")
            return None

        # Force field geometry optimization
        try:
            if AllChem.MMFFHasAllMoleculeParams(mol_h):
                AllChem.MMFFOptimizeMolecule(mol_h, maxIters=500)
            else:
                AllChem.UFFOptimizeMolecule(mol_h, maxIters=500)
        except Exception as e:
            logger.warning(f"Geometry optimization warning: {e}")

        conf = mol_h.GetConformer()

        # Extract atoms
        atoms = []
        for idx, atom in enumerate(mol_h.GetAtoms()):
            sym = atom.GetSymbol()
            pos = conf.GetAtomPosition(idx)
            color = CPK_COLORS.get(sym, "#CCCCCC")

            atoms.append(
                AtomData(
                    index=idx,
                    element=sym,
                    symbol=sym,
                    atomic_number=atom.GetAtomicNum(),
                    x=round(pos.x, 4),
                    y=round(pos.y, 4),
                    z=round(pos.z, 4),
                    cpk_color=color,
                    charge=atom.GetFormalCharge(),
                    hybridization=str(atom.GetHybridization())
                )
            )

        # Extract bonds
        bonds = []
        bond_order_num_map = {
            Chem.BondType.SINGLE: 1.0,
            Chem.BondType.DOUBLE: 2.0,
            Chem.BondType.TRIPLE: 3.0,
            Chem.BondType.AROMATIC: 1.5
        }
        bond_order_str_map = {
            Chem.BondType.SINGLE: "SINGLE",
            Chem.BondType.DOUBLE: "DOUBLE",
            Chem.BondType.TRIPLE: "TRIPLE",
            Chem.BondType.AROMATIC: "AROMATIC"
        }

        for bond in mol_h.GetBonds():
            b_type = bond.GetBondType()
            order_num = bond_order_num_map.get(b_type, 1.0)
            order_str = bond_order_str_map.get(b_type, "SINGLE")
            begin_idx = bond.GetBeginAtomIdx()
            end_idx = bond.GetEndAtomIdx()

            bonds.append(
                BondData(
                    start_index=begin_idx,
                    end_index=end_idx,
                    from_atom=begin_idx,
                    to=end_idx,
                    order=order_str,
                    bond_order_num=order_num,
                    bond_type=str(b_type)
                )
            )

        formula = rdMolDescriptors.CalcMolFormula(mol_h)
        mw = round(float(Descriptors.ExactMolWt(mol_h)), 3)

        return MoleculeData(
            name=name,
            smiles=smiles,
            formula=formula,
            molecular_weight=mw,
            atoms=atoms,
            bonds=bonds
        )
