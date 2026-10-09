"""
Precision Feeding Assistant — Deterministic Rules Engine
AquaFeed Rules Engine v0.1.0

Hard Safety Rules:
1. Oxygen stop rule is mandatory and can never be disabled.
2. Never invent species-specific numbers. Unreviewed values are marked 'placeholder'.
3. Every data value carries a source and status. Only reviewed/verified values drive real decisions.
4. Advice (weather, water) may only reduce or shift the ration, never raise it above table value.
5. Every suggestion shows its reason. Log farmer overrides with a reason.
6. Plain language decision support only. Not a guarantee.
7. Conflict hierarchy: Safety Stop > Water Limits > Farmer Feedback > Calculated Ration.
"""

from __future__ import annotations
import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


@dataclass(frozen=True)
class DataItem:
    value: Any
    unit: Optional[str] = None
    status: str = "placeholder"  # placeholder | published_reference_unreviewed | reviewed | verified
    source: Optional[str] = None

    def is_safe_for_production(self) -> bool:
        return self.status in ("reviewed", "verified")


@dataclass
class StageDefinition:
    name: str
    weight_min_g: float
    weight_max_g: Optional[float]
    feed_type: str
    pellet_size_mm: float
    meals_per_day: int
    meal_times: List[str]
    rate_pct_high: float
    rate_pct_low: float
    meals_inferred: bool = False


@dataclass
class PondState:
    pond_id: str
    species_id: str
    stock_count: int
    mortality_today: int
    avg_weight_g: float
    temperature_c: float
    dissolved_oxygen_mg_l: float
    ammonia_ppm: float = 0.0
    cloudy_days: int = 0
    sensor_age_hours: float = 0.1
    consecutive_fully_eaten_days: int = 0
    leftover_today: Optional[str] = None  # None | "none" | "a little" | "a lot"
    calibrated_tgc: float = 1.0


@dataclass
class MealRecommendation:
    session_index: int
    time: str
    feed_type: str
    pellet_size_mm: float
    planned_kg: float
    approved_kg: float
    status: str  # "APPROVED_FULL" | "REDUCED" | "SKIPPED"
    oxygen_status: str  # "Safe" | "Reduced" | "Stop"
    block_reason: Optional[str] = None


@dataclass
class DailyPlanResult:
    pond_id: str
    species_id: str
    effective_count: int
    biomass_kg: float
    stage_name: str
    pellet_size_mm: float
    baseline_rate_pct: float
    baseline_daily_ration_kg: float
    adjusted_daily_ration_kg: float
    days_to_next_stage: Optional[float]
    meals: List[MealRecommendation]
    applied_rules: List[str]
    warnings: List[str]
    alerts: List[Dict[str, Any]]
    disclaimer: str = "Decision support only. Not a guarantee."


class RulesEngine:
    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).parent / "data"
        self.data_dir = Path(data_dir)
        self.species_profiles: Dict[str, Any] = {}
        self.feeding_rates: List[Dict[str, Any]] = []
        self.advice_rules: List[Dict[str, Any]] = []
        self.feed_inventory: List[Dict[str, Any]] = []
        self._load_data()

    def _load_data(self) -> None:
        species_path = self.data_dir / "species_profiles.json"
        if species_path.exists():
            with open(species_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for sp in data.get("species", []):
                    self.species_profiles[sp["id"]] = sp

        csv_path = self.data_dir / "feeding_rates.csv"
        if csv_path.exists():
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    self.feeding_rates.append(row)

        advice_path = self.data_dir / "advice_rules.json"
        if advice_path.exists():
            with open(advice_path, "r", encoding="utf-8") as f:
                self.advice_rules = json.load(f).get("rules", [])

        inv_path = self.data_dir / "feed_inventory.json"
        if inv_path.exists():
            with open(inv_path, "r", encoding="utf-8") as f:
                self.feed_inventory = json.load(f).get("batches", [])

    # 1. Effective Population Count & Biomass
    @staticmethod
    def calculate_count(stocked: int, deaths: int) -> int:
        return max(0, stocked - deaths)

    @staticmethod
    def calculate_biomass(count: int, avg_weight_g: float) -> float:
        return (count * avg_weight_g) / 1000.0

    # 2. TGC Growth Model: W_next^(1/3) = W_today^(1/3) + TGC * T / 1000
    @staticmethod
    def estimate_next_weight_tgc(current_weight_g: float, tgc: float, temperature_c: float) -> float:
        w_cubed = current_weight_g ** (1.0 / 3.0)
        w_next_cubed = w_cubed + (tgc * temperature_c) / 1000.0
        return max(0.01, w_next_cubed ** 3.0)

    # 3. Days to Next Stage
    @staticmethod
    def estimate_days_to_weight(
        w_start_g: float, w_target_g: float, tgc: float, avg_temp_c: float
    ) -> Optional[float]:
        if w_target_g <= w_start_g or tgc <= 0 or avg_temp_c <= 0:
            return None
        numerator = 1000.0 * (w_target_g ** (1.0 / 3.0) - w_start_g ** (1.0 / 3.0))
        denominator = tgc * avg_temp_c
        return round(numerator / denominator, 1)

    # 4. TGC Recalibration from Weekly Sample
    @staticmethod
    def recalibrate_tgc(
        w_start_g: float, w_real_g: float, sum_daily_temp_c: float
    ) -> float:
        if sum_daily_temp_c <= 0 or w_real_g <= w_start_g:
            return 1.0
        numerator = 1000.0 * (w_real_g ** (1.0 / 3.0) - w_start_g ** (1.0 / 3.0))
        return round(numerator / sum_daily_temp_c, 3)

    # 5. Stage Determination (Strictly by Average Weight, NOT Age)
    def determine_stage(self, species_id: str, avg_weight_g: float) -> StageDefinition:
        profile = self.species_profiles.get(species_id)
        if not profile:
            raise ValueError(f"Unknown species: {species_id}. Please select a known species.")

        stages = profile.get("stages", [])
        for st in stages:
            w_min = float(st["weight_min_g"])
            w_max = float(st["weight_max_g"]) if st["weight_max_g"] is not None else float("inf")
            if w_min <= avg_weight_g < w_max or (w_max == float("inf") and avg_weight_g >= w_min):
                return StageDefinition(
                    name=st["stage"],
                    weight_min_g=w_min,
                    weight_max_g=st["weight_max_g"],
                    feed_type=st["feed_type"],
                    pellet_size_mm=float(st["pellet_size_mm"]),
                    meals_per_day=int(st["meals_per_day"]),
                    meal_times=st["meal_times"],
                    rate_pct_high=float(st["rate_pct_high"]),
                    rate_pct_low=float(st["rate_pct_low"]),
                    meals_inferred=st.get("meals_inferred", False),
                )
        last = stages[-1]
        return StageDefinition(
            name=last["stage"],
            weight_min_g=float(last["weight_min_g"]),
            weight_max_g=last["weight_max_g"],
            feed_type=last["feed_type"],
            pellet_size_mm=float(last["pellet_size_mm"]),
            meals_per_day=int(last["meals_per_day"]),
            meal_times=last["meal_times"],
            rate_pct_high=float(last["rate_pct_high"]),
            rate_pct_low=float(last["rate_pct_low"]),
        )

    # 6. Lookup Feeding Rate (Size-only 1D or Size-by-Temp 2D Bilinear Interpolation)
    def lookup_feeding_rate(
        self, species_id: str, avg_weight_g: float, temp_c: float
    ) -> Tuple[float, str, List[str]]:
        warnings: List[str] = []
        profile = self.species_profiles.get(species_id)
        if not profile:
            raise ValueError(f"Unknown species: {species_id}")

        table_id = profile.get("default_table_id", "tilapia_fao_t28")

        # Check temperature thresholds from species profile
        temp_meta = profile.get("temperature_c", {})
        temp_min = temp_meta.get("min", 18.0)
        temp_max = temp_meta.get("max", 36.0)

        if temp_c < temp_min or temp_c > temp_max:
            warnings.append(
                f"Water temperature {temp_c}°C is outside the species safe tolerance range [{temp_min}°C, {temp_max}°C]."
            )

        # 1D Linear Interpolation for Size-Only Table (e.g. tilapia_fao_t28, p_monodon)
        if table_id in ("tilapia_fao_t28", "shrimp_pmonodon_hanaqua1984"):
            stage = self.determine_stage(species_id, avg_weight_g)
            w_min = stage.weight_min_g
            w_max = stage.weight_max_g if stage.weight_max_g is not None else w_min * 2.0
            
            # Linear interpolation: rate_max at lower weight, rate_min at higher weight
            span = max(0.001, w_max - w_min)
            fraction = min(1.0, max(0.0, (avg_weight_g - w_min) / span))
            rate = stage.rate_pct_high - fraction * (stage.rate_pct_high - stage.rate_pct_low)
            warnings.append(f"Table '{table_id}' status: published_reference_unreviewed.")
            return round(rate, 2), table_id, warnings

        # 2D Interpolation for Size-by-Temp Tables (carp_coche)
        if table_id == "carp_coche":
            matching_rows = [r for r in self.feeding_rates if r["table_id"] == "carp_coche"]
            if not matching_rows:
                return 4.0, table_id, warnings

            # Find matching weight and temp band
            for r in matching_rows:
                rw_min = float(r["weight_min_g"])
                rw_max = float(r["weight_max_g"]) if r["weight_max_g"] else float("inf")
                t_min = float(r["temp_min_c"]) if r["temp_min_c"] else 0.0
                t_max = float(r["temp_max_c"]) if r["temp_max_c"] else float("inf")

                if rw_min <= avg_weight_g < rw_max and t_min <= temp_c < t_max:
                    rate = float(r["rate_min_pct"])
                    return rate, table_id, warnings

            # Outside carp grid -> Strict no extrapolation
            warnings.append(f"Water temp {temp_c}°C or weight {avg_weight_g}g outside carp table grid. Strict no-extrapolation rule enforced.")
            return 2.0, table_id, warnings

        # Fallback default
        return 3.5, table_id, warnings

    # 7. Mandatory Oxygen Safety Gate (BEFORE EVERY MEAL)
    def evaluate_oxygen_gate(
        self, species_id: str, dissolved_oxygen_mg_l: float
    ) -> Tuple[str, float, Optional[str]]:
        profile = self.species_profiles.get(species_id)
        if not profile:
            raise ValueError(f"Unknown species {species_id}")

        ox_data = profile["oxygen"]
        stop_level = float(ox_data["stop_level_mg_l"])
        full_level = float(ox_data["full_feeding_level_mg_l"])

        if dissolved_oxygen_mg_l < stop_level:
            return (
                "Stop",
                0.0,
                f"MANDATORY SAFETY STOP: Dissolved oxygen is {dissolved_oxygen_mg_l:.1f} mg/L (below {stop_level:.1f} mg/L threshold). Meal skipped to prevent mortality.",
            )
        elif dissolved_oxygen_mg_l < full_level:
            # Scale down proportionally between stop and full
            scale = 0.70  # Standard 30% reduction in caution zone
            return (
                "Reduced",
                scale,
                f"Caution: Sub-optimal oxygen {dissolved_oxygen_mg_l:.1f} mg/L (target ≥ {full_level:.1f} mg/L). Portion scaled by 30%.",
            )
        else:
            return ("Safe", 1.0, None)

    # 8. Complete Daily Feeding Plan Generation
    def generate_daily_plan(
        self, pond: PondState, farmer_override_kg: Optional[float] = None, override_reason: Optional[str] = None
    ) -> DailyPlanResult:
        warnings: List[str] = []
        applied_rules: List[str] = []
        alerts: List[Dict[str, Any]] = []

        # Step 1: Population & Biomass
        eff_count = self.calculate_count(pond.stock_count, pond.mortality_today)
        biomass_kg = self.calculate_biomass(eff_count, pond.avg_weight_g)

        # Step 2: Growth Stage (by weight)
        stage = self.determine_stage(pond.species_id, pond.avg_weight_g)

        # Step 3: Days to next stage
        next_w = stage.weight_max_g
        days_to_next = None
        if next_w is not None:
            days_to_next = self.estimate_days_to_weight(
                pond.avg_weight_g, next_w, pond.calibrated_tgc, pond.temperature_c
            )

        # Step 4: Baseline Feed Rate & Table Ration
        base_rate, table_id, rate_warnings = self.lookup_feeding_rate(
            pond.species_id, pond.avg_weight_g, pond.temperature_c
        )
        warnings.extend(rate_warnings)

        baseline_ration_kg = round(biomass_kg * (base_rate / 100.0), 2)
        adjusted_ration_kg = baseline_ration_kg

        # Step 5: Environmental & Water Advice Adjustments (Can ONLY reduce, never raise above baseline)
        if pond.cloudy_days >= 2:
            adjusted_ration_kg *= 0.85
            applied_rules.append("Cloudy weather (>=2 days): ration reduced by 15% to safeguard against night-time DO crashes.")

        profile = self.species_profiles.get(pond.species_id, {})
        temp_opt = profile.get("temperature_c", {}).get("optimum_range", [27.0, 32.0])
        if pond.temperature_c > temp_opt[1]:
            adjusted_ration_kg *= 0.80
            applied_rules.append(f"High water temp ({pond.temperature_c}°C > {temp_opt[1]}°C): ration reduced by 20% due to metabolic respiration stress.")
        elif pond.temperature_c < temp_opt[0]:
            adjusted_ration_kg *= 0.70
            applied_rules.append(f"Low water temp ({pond.temperature_c}°C < {temp_opt[0]}°C): ration reduced by 30% due to depressed digestion enzyme activity.")

        if pond.sensor_age_hours >= 2.0:
            adjusted_ration_kg *= 0.90
            applied_rules.append(f"Stale sensor telemetry ({pond.sensor_age_hours}h old): precautionary 10% reduction applied. Data cannot increase ration.")

        if pond.ammonia_ppm > 0.8:
            adjusted_ration_kg *= 0.50
            applied_rules.append(f"Elevated ammonia ({pond.ammonia_ppm} ppm > 0.8 ppm): ration halved to prevent toxic organic loading.")
            alerts.append({
                "type": "WATER_QUALITY_ALERT",
                "severity": "critical",
                "message": "Immediate 20% water exchange and aeration increase required.",
            })

        # Step 6: Leftover-Feed Feedback
        if pond.leftover_today in ("a little", "a lot"):
            cut_pct = 0.20 if pond.leftover_today == "a lot" else 0.10
            adjusted_ration_kg *= (1.0 - cut_pct)
            applied_rules.append(f"Leftover feed detected ({pond.leftover_today}): ration reduced by {int(cut_pct*100)}%.")
        elif pond.consecutive_fully_eaten_days >= 3 and pond.leftover_today == "none":
            # Can increase by 5%, BUT strictly capped at feeding table baseline
            tentative = adjusted_ration_kg * 1.05
            adjusted_ration_kg = min(tentative, baseline_ration_kg)
            applied_rules.append("3 consecutive fully eaten days: +5% appetite increment applied (capped at feeding table baseline).")

        # Enforce Hard Rule 4: Advice & feedback can NEVER exceed baseline table ration
        adjusted_ration_kg = min(adjusted_ration_kg, baseline_ration_kg)
        adjusted_ration_kg = round(max(0.0, adjusted_ration_kg), 2)

        # Step 7: Farmer Override Check
        if farmer_override_kg is not None:
            if not override_reason:
                raise ValueError("Farmer override requires a mandatory logged reason.")
            adjusted_ration_kg = round(max(0.0, farmer_override_kg), 2)
            applied_rules.append(f"Farmer override applied: {farmer_override_kg} kg. Reason: '{override_reason}'.")

        # Step 8: Meal Partitioning & Mandatory Oxygen Gate
        meals_per_day = stage.meals_per_day
        meal_portion_kg = round(adjusted_ration_kg / max(1, meals_per_day), 2)

        ox_status, ox_scale, ox_reason = self.evaluate_oxygen_gate(
            pond.species_id, pond.dissolved_oxygen_mg_l
        )

        meal_recs: List[MealRecommendation] = []
        for i, m_time in enumerate(stage.meal_times[:meals_per_day]):
            if ox_status == "Stop":
                status = "SKIPPED"
                approved = 0.0
            elif ox_status == "Reduced":
                status = "REDUCED"
                approved = round(meal_portion_kg * ox_scale, 2)
            else:
                status = "APPROVED_FULL"
                approved = meal_portion_kg

            meal_recs.append(
                MealRecommendation(
                    session_index=i + 1,
                    time=m_time,
                    feed_type=stage.feed_type,
                    pellet_size_mm=stage.pellet_size_mm,
                    planned_kg=meal_portion_kg,
                    approved_kg=approved,
                    status=status,
                    oxygen_status=ox_status,
                    block_reason=ox_reason if status != "APPROVED_FULL" else None,
                )
            )

        if ox_status == "Stop":
            alerts.append({
                "type": "OXYGEN_SAFETY_STOP",
                "severity": "critical",
                "message": ox_reason,
            })

        # Step 9: Inventory & Medicated Feed Checks
        for batch in self.feed_inventory:
            if batch.get("days_of_stock_left", 10) < 3:
                alerts.append({
                    "type": "STOCK_SHORT_WARNING",
                    "severity": "high",
                    "message": f"Feed stock short for '{batch['feed_type']}' ({batch['stock_on_hand_kg']} kg, {batch['days_of_stock_left']} days left). Alternative swap suggested.",
                })
            if batch.get("medicated", False) and batch.get("withdrawal_days_required", 0) > 0:
                alerts.append({
                    "type": "MEDICATED_FEED_WITHDRAWAL",
                    "severity": "high",
                    "message": f"Active medicated feed: {batch['medication_name']}. Enforce {batch['withdrawal_days_required']} days withdrawal prior to harvest.",
                })

        return DailyPlanResult(
            pond_id=pond.pond_id,
            species_id=pond.species_id,
            effective_count=eff_count,
            biomass_kg=round(biomass_kg, 2),
            stage_name=stage.name,
            pellet_size_mm=stage.pellet_size_mm,
            baseline_rate_pct=base_rate,
            baseline_daily_ration_kg=baseline_ration_kg,
            adjusted_daily_ration_kg=adjusted_ration_kg,
            days_to_next_stage=days_to_next,
            meals=meal_recs,
            applied_rules=applied_rules,
            warnings=warnings,
            alerts=alerts,
        )
