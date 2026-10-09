"""
Precision Feeding Assistant — Spreadsheet Prototype & Verification Matrix
AquaFeed Verification Testbed v0.1.0

Generates an exportable CSV verification audit matrix ('verification_matrix.csv')
and prints an illustrative audit run across production test ponds.
"""

from __future__ import annotations
import csv
import sys
from pathlib import Path

# Add engine directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from rules_engine import RulesEngine, PondState


def run_verification_matrix():
    data_dir = Path(__file__).parent / "data"
    engine = RulesEngine(data_dir=data_dir)

    # 7 Illustrative Verification Test Cases
    test_cases = [
        PondState(
            pond_id="POND-A1 (Baseline Fingerling)",
            species_id="nile_tilapia",
            stock_count=15000,
            mortality_today=12,
            avg_weight_g=18.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.4,
            cloudy_days=0,
            sensor_age_hours=0.2,
            consecutive_fully_eaten_days=1,
            leftover_today="none",
        ),
        PondState(
            pond_id="POND-A2 (Low DO Safety Stop)",
            species_id="nile_tilapia",
            stock_count=12000,
            mortality_today=5,
            avg_weight_g=85.0,
            temperature_c=30.0,
            dissolved_oxygen_mg_l=2.6,  # Low DO < 3.0
            cloudy_days=1,
            sensor_age_hours=0.1,
            consecutive_fully_eaten_days=0,
            leftover_today="none",
        ),
        PondState(
            pond_id="POND-B1 (Borderline DO Caution)",
            species_id="nile_tilapia",
            stock_count=18000,
            mortality_today=2,
            avg_weight_g=38.0,
            temperature_c=28.5,
            dissolved_oxygen_mg_l=4.1,  # 3.0 <= DO < 5.0
            cloudy_days=0,
            sensor_age_hours=0.3,
            consecutive_fully_eaten_days=2,
            leftover_today="none",
        ),
        PondState(
            pond_id="POND-B2 (Thermal Stress >32C)",
            species_id="nile_tilapia",
            stock_count=14000,
            mortality_today=0,
            avg_weight_g=120.0,
            temperature_c=33.5,  # Exceeds 32C optimum
            dissolved_oxygen_mg_l=5.2,
            cloudy_days=0,
            sensor_age_hours=0.1,
            consecutive_fully_eaten_days=1,
            leftover_today="none",
        ),
        PondState(
            pond_id="POND-C1 (Cloudy 3 Days + Stale Data)",
            species_id="nile_tilapia",
            stock_count=20000,
            mortality_today=8,
            avg_weight_g=55.0,
            temperature_c=27.0,
            dissolved_oxygen_mg_l=5.1,
            cloudy_days=3,  # Cloudy
            sensor_age_hours=2.5,  # Stale data > 2h
            consecutive_fully_eaten_days=0,
            leftover_today="none",
        ),
        PondState(
            pond_id="POND-C2 (Leftovers Down 20%)",
            species_id="nile_tilapia",
            stock_count=15000,
            mortality_today=1,
            avg_weight_g=42.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
            cloudy_days=0,
            sensor_age_hours=0.2,
            consecutive_fully_eaten_days=0,
            leftover_today="a lot",  # Leftover feedback
        ),
        PondState(
            pond_id="POND-D1 (Clean 3 Days + Table Ceiling)",
            species_id="nile_tilapia",
            stock_count=15000,
            mortality_today=0,
            avg_weight_g=42.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
            cloudy_days=0,
            sensor_age_hours=0.2,
            consecutive_fully_eaten_days=3,  # Clean eating
            leftover_today="none",
        ),
    ]

    output_csv = Path(__file__).parent / "verification_matrix.csv"
    matrix_rows = []

    for pond in test_cases:
        plan = engine.generate_daily_plan(pond)
        approved_kg = sum(m.approved_kg for m in plan.meals)
        skipped_kg = sum(m.planned_kg for m in plan.meals if m.status == "SKIPPED")

        # Determine winner in conflict hierarchy
        if any(m.status == "SKIPPED" for m in plan.meals):
            hierarchy_winner = "Safety Stop (DO < 3.0 mg/L)"
        elif pond.ammonia_ppm > 0.8:
            hierarchy_winner = "Water Quality Emergency"
        elif pond.leftover_today in ("a little", "a lot"):
            hierarchy_winner = "Farmer Leftover Feedback"
        elif plan.applied_rules:
            hierarchy_winner = "Environmental Water/Weather Limits"
        else:
            hierarchy_winner = "Calculated Ration"

        row = {
            "Pond_ID": pond.pond_id,
            "Species": plan.species_id,
            "Stocked_Count": pond.stock_count,
            "Deaths_Today": pond.mortality_today,
            "Effective_Count": plan.effective_count,
            "Avg_Weight_g": pond.avg_weight_g,
            "Biomass_kg": plan.biomass_kg,
            "Stage_Name": plan.stage_name,
            "Pellet_Size_mm": plan.pellet_size_mm,
            "Water_Temp_C": pond.temperature_c,
            "DO_mg_L": pond.dissolved_oxygen_mg_l,
            "Baseline_Rate_pct": plan.baseline_rate_pct,
            "Baseline_Ration_kg": plan.baseline_daily_ration_kg,
            "Adjusted_Ration_kg": plan.adjusted_daily_ration_kg,
            "Approved_Total_kg": round(approved_kg, 2),
            "Skipped_Total_kg": round(skipped_kg, 2),
            "Days_to_Next_Stage": plan.days_to_next_stage,
            "Oxygen_Status": plan.meals[0].oxygen_status,
            "Applied_Rules_Count": len(plan.applied_rules),
            "Hierarchy_Winner": hierarchy_winner,
        }
        matrix_rows.append(row)

    # Write out CSV file
    fieldnames = list(matrix_rows[0].keys())
    with open(output_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(matrix_rows)

    print(f"\n[OK] Successfully generated verification matrix: {output_csv.name}")
    print("=" * 105)
    print(f"{'Pond Scenario':<32} | {'Stage':<10} | {'Biomass':<8} | {'Base kg':<7} | {'Adj kg':<7} | {'Approved':<8} | {'Hierarchy Winner':<25}")
    print("-" * 105)
    for r in matrix_rows:
        print(f"{r['Pond_ID']:<32} | {r['Stage_Name']:<10} | {r['Biomass_kg']:<8.1f} | {r['Baseline_Ration_kg']:<7.1f} | {r['Adjusted_Ration_kg']:<7.1f} | {r['Approved_Total_kg']:<8.1f} | {r['Hierarchy_Winner']:<25}")
    print("=" * 105 + "\n")


if __name__ == "__main__":
    run_verification_matrix()
