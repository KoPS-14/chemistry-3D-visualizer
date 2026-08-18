import logging
from typing import List
from fastapi import APIRouter, HTTPException, status

from app.schemas.models import (
    VisualizeRequest,
    VisualizeResponse,
    ReactionData,
    ReactantProduct3DData,
    ReactantOrProduct,
    ReactionConditions,
    ElementData,
)
from app.ai.llm_service import LLMService
from app.chemistry.rdkit_service import RDKitService
from app.chemistry.lookup_service import LookupService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/elements", response_model=List[ElementData])
def get_all_elements():
    """Returns all 118 periodic table elements"""
    elements = LookupService.get_all_elements()
    if not elements:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Periodic table dataset unavailable."
        )
    return elements


@router.get("/elements/{atomic_number}", response_model=ElementData)
def get_element_by_number(atomic_number: int):
    """Returns element by atomic number (1..118)"""
    if atomic_number < 1 or atomic_number > 118:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Invalid atomic number {atomic_number}. Must be between 1 and 118."
        )
    element = LookupService.get_element_by_atomic_number(atomic_number)
    if not element:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Element with atomic number {atomic_number} not found."
        )
    return element


@router.post("/visualize", response_model=VisualizeResponse)
def visualize_chemistry(payload: VisualizeRequest):
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty."
        )

    # Step 1: Parse natural-language prompt via LLM abstraction
    llm_output = LLMService.parse_prompt(prompt)

    # Step 2: Handle Molecule Request
    if llm_output.request_type == "molecule":
        if not llm_output.smiles:
            return VisualizeResponse(
                status="unsupported",
                message="No valid SMILES identifier could be extracted for this molecule prompt."
            )

        # RDKit SMILES Validation
        mol = RDKitService.validate_smiles(llm_output.smiles)
        if mol is None:
            return VisualizeResponse(
                status="unsupported",
                message=f"Chemical validation failed: '{llm_output.smiles}' is an invalid SMILES structure."
            )

        # 3D coordinate generation and geometry optimization
        mol_data = RDKitService.generate_3d_molecule(
            smiles=llm_output.smiles,
            name=llm_output.name or "Molecule"
        )

        if mol_data is None:
            return VisualizeResponse(
                status="unsupported",
                message="Failed to generate 3D coordinates and force field geometry optimization."
            )

        return VisualizeResponse(
            status="success",
            request_type="molecule",
            data=mol_data,
            explanation=f"Successfully parsed prompt '{prompt}'. 3D geometry optimized using RDKit force fields with explicit hydrogens.",
            message="Molecule structure successfully generated."
        )

    # Step 3: Handle Reaction Request
    elif llm_output.request_type == "reaction":
        # Look up validated template if available
        cached_rxn = LookupService.find_reaction(
            reaction_type=llm_output.reaction_type,
            name=llm_output.name
        )

        rxn_name = llm_output.name or "Chemical Reaction"
        rxn_type = llm_output.reaction_type or "General"
        description = "Validated chemical reaction with 3D RDKit component geometries."
        equation = None

        raw_reactants = llm_output.reactants or []
        raw_products = llm_output.products or []

        if cached_rxn:
            rxn_name = cached_rxn.get("name", rxn_name)
            rxn_type = cached_rxn.get("reaction_type", rxn_type)
            description = cached_rxn.get("description", description)
            equation = cached_rxn.get("balanced_equation", equation)
            
            if not raw_reactants:
                raw_reactants = [ReactantOrProduct(**r) for r in cached_rxn.get("reactants", [])]
            if not raw_products:
                raw_products = [ReactantOrProduct(**p) for p in cached_rxn.get("products", [])]

        if not raw_reactants:
            return VisualizeResponse(
                status="unsupported",
                message="Reaction request must contain at least one reactant."
            )

        # Process and chemically validate reactants in 3D
        reactants_3d: List[ReactantProduct3DData] = []
        for item in raw_reactants:
            mol = RDKitService.validate_smiles(item.smiles)
            if mol is None:
                return VisualizeResponse(
                    status="unsupported",
                    message=f"Chemical validation failed for reactant '{item.name}' (SMILES: {item.smiles})."
                )
            mol_data = RDKitService.generate_3d_molecule(item.smiles, name=item.name)
            if mol_data is None:
                return VisualizeResponse(
                    status="unsupported",
                    message=f"Failed 3D spatial coordinate generation for reactant '{item.name}'."
                )
            reactants_3d.append(
                ReactantProduct3DData(
                    name=item.name,
                    smiles=item.smiles,
                    role="reactant",
                    molecule_data=mol_data
                )
            )

        # Process and chemically validate products in 3D
        products_3d: List[ReactantProduct3DData] = []
        for item in raw_products:
            mol = RDKitService.validate_smiles(item.smiles)
            if mol is None:
                return VisualizeResponse(
                    status="unsupported",
                    message=f"Chemical validation failed for product '{item.name}' (SMILES: {item.smiles})."
                )
            mol_data = RDKitService.generate_3d_molecule(item.smiles, name=item.name)
            if mol_data is None:
                return VisualizeResponse(
                    status="unsupported",
                    message=f"Failed 3D spatial coordinate generation for product '{item.name}'."
                )
            products_3d.append(
                ReactantProduct3DData(
                    name=item.name,
                    smiles=item.smiles,
                    role="product",
                    molecule_data=mol_data
                )
            )

        rxn_data = ReactionData(
            name=rxn_name,
            reaction_type=rxn_type,
            description=description,
            balanced_equation=equation,
            reactants=reactants_3d,
            products=products_3d,
            conditions=llm_output.conditions or ReactionConditions()
        )

        return VisualizeResponse(
            status="success",
            request_type="reaction",
            data=rxn_data,
            explanation=f"Parsed reaction '{rxn_name}'. Generated 3D geometries for {len(reactants_3d)} reactant(s) and {len(products_3d)} product(s).",
            message="Reaction data and 3D component coordinates successfully generated."
        )

    else:
        return VisualizeResponse(
            status="unsupported",
            message="This request is not currently supported or could not be chemically validated."
        )
