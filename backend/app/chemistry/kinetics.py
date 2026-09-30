"""
Kinetics & Reaction Conditions Module

Provides educational calculations and physical chemistry insights:
- Arrhenius Equation: k = A * exp(-Ea / RT)
- Catalyst Activation Energy Reduction
- Pressure & Le Chatelier Equilibrium Shifts
- Solvent Effects (Polar Protic vs Polar Aprotic)
- Reactant Concentration Effects
"""
import math
from typing import Dict, Any, Optional

BASELINE_ACTIVATION_ENERGIES_KJ = {
    "SN2": 75.0,
    "ADDITION": 60.0,
    "NEUTRALIZATION": 12.0,
    "ELIMINATION": 90.0,
    "COMBUSTION": 120.0,
    "OXIDATION": 85.0,
    "CYCLOADDITION": 105.0,
    "CONDENSATION": 65.0,
    "ELECTROPHILIC_AROMATIC": 80.0,
    "REFORMING": 150.0,
    "REDOX_CATALYTIC": 95.0,
    "ESTERIFICATION": 70.0,
    "HYDROLYSIS": 55.0,
    "GENERAL": 70.0
}

CATALYST_BARRIER_REDUCTIONS_KJ = {
    "acid": 28.0,
    "base": 25.0,
    "metal": 38.0,
    "transition_metal": 42.0,
    "platinum": 45.0,
    "v2o5": 35.0,
    "enzyme": 50.0,
    "none": 0.0
}


def evaluate_educational_conditions(
    reaction_type: str,
    conditions: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    conds = conditions or {}
    rxn_type_clean = (reaction_type or "GENERAL").upper().strip()

    # 1. Base Activation Energy (Ea)
    matched_key = "GENERAL"
    for k in BASELINE_ACTIVATION_ENERGIES_KJ:
        if k in rxn_type_clean:
            matched_key = k
            break
    ea_baseline = BASELINE_ACTIVATION_ENERGIES_KJ.get(matched_key, 70.0)

    # 2. Catalyst Effect
    catalyst_str = str(conds.get("catalyst", "none")).lower().strip()
    catalyst_reduction = 0.0
    for cat_k, cat_red in CATALYST_BARRIER_REDUCTIONS_KJ.items():
        if cat_k in catalyst_str and cat_k != "none":
            catalyst_reduction = max(catalyst_reduction, cat_red)

    if catalyst_reduction == 0.0 and catalyst_str not in ("none", "", "null"):
        catalyst_reduction = 30.0  # Generic active catalyst reduction

    ea_effective = max(10.0, ea_baseline - catalyst_reduction)

    # 3. Temperature & Catalyst Combined Arrhenius Rate Scaling
    temp_c = float(conds.get("temperature_c", 25.0) if conds.get("temperature_c") is not None else 25.0)
    temp_c = max(-50.0, min(600.0, temp_c))
    temp_k = temp_c + 273.15
    ref_temp_k = 298.15  # 25°C baseline
    r_constant = 8.314  # J/(mol*K)

    # Catalytic acceleration: exp(Delta_Ea / (R * T_ref)) with soft educational scaling
    cat_exponent = min(6.0, (catalyst_reduction * 1000.0) / (r_constant * ref_temp_k * 4.0))
    catalyst_rate_factor = math.exp(cat_exponent) if catalyst_reduction > 0 else 1.0

    # Thermal acceleration: exp(-Ea_eff/RT) / exp(-Ea_eff/RT_ref)
    delta_inv_t = (1.0 / ref_temp_k) - (1.0 / temp_k)
    temp_exponent = (ea_effective * 1000.0 / r_constant) * delta_inv_t
    clamped_temp_exponent = max(-8.0, min(8.0, temp_exponent))
    thermal_rate_factor = math.exp(clamped_temp_exponent)

    # 4. Pressure & Le Chatelier Effect (atm)
    pressure_atm = float(conds.get("pressure_atm", 1.0) if conds.get("pressure_atm") is not None else 1.0)
    pressure_atm = max(0.1, min(200.0, pressure_atm))
    
    is_gas_phase = matched_key in ("COMBUSTION", "REFORMING", "REDOX_CATALYTIC", "CYCLOADDITION")
    pressure_factor = math.pow(pressure_atm, 0.4) if is_gas_phase else 1.0

    # 5. Solvent Effect
    solvent_str = str(conds.get("solvent", "aqueous")).lower().strip()
    solvent_factor = 1.0
    solvent_note = "Standard aqueous/polar medium."

    if matched_key == "SN2":
        if any(aprotic in solvent_str for aprotic in ("aprotic", "acetone", "dmso", "dmf", "acetonitrile")):
            solvent_factor = 4.5
            solvent_note = "Polar aprotic solvent does not cage nucleophile in hydrogen bonds, accelerating SN2 rate by >4x!"
        elif any(protic in solvent_str for protic in ("protic", "ethanol", "water", "methanol")):
            solvent_factor = 0.8
            solvent_note = "Polar protic solvent solvates nucleophilic lone pair, modestly slowing SN2 attack."
    elif matched_key in ("NEUTRALIZATION", "HYDROLYSIS"):
        if "protic" in solvent_str or "aqueous" in solvent_str or "water" in solvent_str:
            solvent_factor = 1.5
            solvent_note = "Aqueous/protic solvent stabilizes ions and facilitates rapid proton transfer."

    # 6. Reactant Concentration Effect (M)
    conc_val = 1.0
    raw_conc = conds.get("concentration", 1.0)
    try:
        if isinstance(raw_conc, (int, float)):
            conc_val = float(raw_conc)
        elif isinstance(raw_conc, str):
            clean_c = "".join(ch for ch in raw_conc if ch.isdigit() or ch == ".")
            conc_val = float(clean_c) if clean_c else 1.0
    except Exception:
        conc_val = 1.0
    conc_val = max(0.05, min(10.0, conc_val))
    conc_factor = math.pow(conc_val, 1.2)

    # 7. Total Relative Rate Multiplier
    raw_rate_multiplier = thermal_rate_factor * catalyst_rate_factor * pressure_factor * solvent_factor * conc_factor
    k_relative = round(raw_rate_multiplier, 3)


    # Map to 3D visual simulation speed (smoothly clamped to 0.2x .. 3.5x for interactive Three.js playback)
    if k_relative <= 0.1:
        sim_speed = 0.25
    elif k_relative < 1.0:
        sim_speed = 0.25 + (k_relative - 0.1) * 0.75 / 0.9
    elif k_relative <= 5.0:
        sim_speed = 1.0 + (k_relative - 1.0) * 0.35
    elif k_relative <= 20.0:
        sim_speed = 2.4 + (k_relative - 5.0) * 0.05
    else:
        sim_speed = 3.5
    sim_speed = round(min(3.5, max(0.2, sim_speed)), 2)

    # 8. Explanations & Insights
    le_chatelier_shift = "Equilibrium stable at standard state."
    if is_gas_phase:
        if pressure_atm > 5.0:
            le_chatelier_shift = f"High pressure ({pressure_atm} atm) shifts equilibrium towards the side with fewer gas molecules according to Le Chatelier's principle."
        elif pressure_atm < 0.8:
            le_chatelier_shift = f"Low pressure ({pressure_atm} atm) decreases molecular collision frequency."

    rate_impact = (
        f"At {temp_c}°C ({temp_k:.1f} K) and {pressure_atm} atm, reaction rate is {k_relative}x relative to standard 25°C. "
        f"{'Catalyst provides an alternate low-barrier pathway. ' if catalyst_reduction > 0 else ''}"
        f"{solvent_note}"
    )

    ea_impact = (
        f"Baseline activation barrier Ea = {ea_baseline} kJ/mol. "
        f"{f'Catalyst lowers effective Ea by {catalyst_reduction} kJ/mol to {ea_effective} kJ/mol!' if catalyst_reduction > 0 else 'No catalyst active (standard thermal barrier).'}"
    )

    educational_insight = (
        f"Arrhenius relationship: k = A * exp(-Ea / RT). Increasing temperature from 25°C to {temp_c}°C raises average molecular kinetic energy, "
        f"exponentially increasing the fraction of collisions with energy exceeding Ea ({ea_effective} kJ/mol)."
    )

    return {
        "status": "success",
        "temperature_c": temp_c,
        "temperature_k": round(temp_k, 1),
        "pressure_atm": pressure_atm,
        "catalyst": catalyst_str,
        "solvent": solvent_str,
        "concentration_m": conc_val,
        "baseline_activation_energy_kj": ea_baseline,
        "effective_activation_energy_kj": ea_effective,
        "catalyst_reduction_kj": catalyst_reduction,
        "relative_rate_multiplier": k_relative,
        "simulation_speed_factor": sim_speed,
        "rate_impact": rate_impact,
        "activation_energy_impact": ea_impact,
        "le_chatelier_shift": le_chatelier_shift,
        "educational_insight": educational_insight
    }

