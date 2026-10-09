"""
Unit Test Suite for Precision Feeding Rules Engine
Verifies all 10 required product scenarios and hard safety constraints:
1. Low DO
2. Borderline DO
3. Temperature out of range
4. Growth stage transition
5. Sample weight correction & TGC recalibration
6. Missing/stale telemetry data
7. Leftover feed feedback
8. Short feed stock warning
9. Medicated feed withdrawal period
10. Farmer override logging
"""

import sys
import unittest
from pathlib import Path

# Add engine directory to sys.path
sys.path.insert(0, str(Path(__file__).parent))

from rules_engine import RulesEngine, PondState


class TestPrecisionFeedingEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        data_dir = Path(__file__).parent / "data"
        cls.engine = RulesEngine(data_dir=data_dir)

    # -------------------------------------------------------------
    # Scenario 1: Low DO (< 3.0 mg/L) — Mandatory Safety Stop
    # -------------------------------------------------------------
    def test_scenario_01_low_dissolved_oxygen_stop(self):
        pond = PondState(
            pond_id="POND-01",
            species_id="nile_tilapia",
            stock_count=15000,
            mortality_today=10,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=2.6,  # Below 3.0 mg/L Stop threshold
        )
        plan = self.engine.generate_daily_plan(pond)

        self.assertGreater(plan.baseline_daily_ration_kg, 0)
        # All meals must be SKIPPED with 0.0 approved kg
        for meal in plan.meals:
            self.assertEqual(meal.status, "SKIPPED")
            self.assertEqual(meal.approved_kg, 0.0)
            self.assertIn("MANDATORY SAFETY STOP", meal.block_reason)

        alert_types = [a["type"] for a in plan.alerts]
        self.assertIn("OXYGEN_SAFETY_STOP", alert_types)

    # -------------------------------------------------------------
    # Scenario 2: Borderline DO (3.0 <= DO < 5.0 mg/L) — Proportionate Ration Reduction
    # -------------------------------------------------------------
    def test_scenario_02_borderline_dissolved_oxygen_reduced(self):
        pond = PondState(
            pond_id="POND-02",
            species_id="nile_tilapia",
            stock_count=15000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=4.2,  # Between 3.0 and 5.0 mg/L
        )
        plan = self.engine.generate_daily_plan(pond)

        for meal in plan.meals:
            self.assertEqual(meal.status, "REDUCED")
            self.assertLess(meal.approved_kg, meal.planned_kg)
            self.assertGreater(meal.approved_kg, 0.0)
            self.assertIn("Caution: Sub-optimal oxygen", meal.block_reason)

    # -------------------------------------------------------------
    # Scenario 3: Temperature Out of Safe Range (Below Min or Above Max)
    # -------------------------------------------------------------
    def test_scenario_03_temperature_out_of_range(self):
        # 16°C is below Tilapia min of 20°C
        pond = PondState(
            pond_id="POND-03",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=50.0,
            temperature_c=16.0,
            dissolved_oxygen_mg_l=5.5,
        )
        plan = self.engine.generate_daily_plan(pond)

        # Warnings must flag temperature out of range
        temp_warns = [w for w in plan.warnings if "outside the species safe tolerance range" in w]
        self.assertTrue(len(temp_warns) > 0)
        # Cold temperature reduction rule must be applied
        self.assertLess(plan.adjusted_daily_ration_kg, plan.baseline_daily_ration_kg)

    # -------------------------------------------------------------
    # Scenario 4: Growth Stage Transition (Automatic by Weight, Not Age)
    # -------------------------------------------------------------
    def test_scenario_04_stage_transition_by_weight(self):
        # Weight 18g: Fingerling stage (5-20g) -> 4 meals, 2.0mm pellet
        pond_fingerling = PondState(
            pond_id="POND-04A",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=18.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
        )
        plan_f = self.engine.generate_daily_plan(pond_fingerling)
        self.assertEqual(plan_f.stage_name, "Fingerling")
        self.assertEqual(plan_f.pellet_size_mm, 2.0)
        self.assertEqual(len(plan_f.meals), 4)

        # Weight crosses into 25g: Juvenile stage (20-100g) -> 2 meals, 2.0mm pellet
        pond_juvenile = PondState(
            pond_id="POND-04B",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=25.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
        )
        plan_j = self.engine.generate_daily_plan(pond_juvenile)
        self.assertEqual(plan_j.stage_name, "Juvenile")
        self.assertEqual(len(plan_j.meals), 2)

    # -------------------------------------------------------------
    # Scenario 5: Weekly Sample Weight Correction & TGC Recalibration
    # -------------------------------------------------------------
    def test_scenario_05_sample_weight_correction_and_tgc_recalibration(self):
        # 7-day period with avg temp 28°C: sum temp = 196
        w_start = 20.0
        w_real = 26.5  # Actual measured weight from weekly sampling
        sum_daily_temp = 7 * 28.0

        calibrated_tgc = self.engine.recalibrate_tgc(w_start, w_real, sum_daily_temp)
        self.assertAlmostEqual(calibrated_tgc, 1.365, places=2)

        # Days to next target weight (100g) using recalibrated TGC
        days_to_target = self.engine.estimate_days_to_weight(w_real, 100.0, calibrated_tgc, 28.0)
        self.assertIsNotNone(days_to_target)
        self.assertGreater(days_to_target, 0)
        self.assertLess(days_to_target, 60)

    # -------------------------------------------------------------
    # Scenario 6: Missing / Stale Telemetry Data (Never Raises Ration)
    # -------------------------------------------------------------
    def test_scenario_06_stale_telemetry_precaution(self):
        pond = PondState(
            pond_id="POND-06",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=45.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
            sensor_age_hours=3.5,  # Stale data > 2 hours
        )
        plan = self.engine.generate_daily_plan(pond)

        # Stale sensor rule applied
        self.assertLess(plan.adjusted_daily_ration_kg, plan.baseline_daily_ration_kg)
        rule_hits = [r for r in plan.applied_rules if "Stale sensor telemetry" in r]
        self.assertTrue(len(rule_hits) > 0)

    # -------------------------------------------------------------
    # Scenario 7: Leftover Feed Feedback & Hard Ceiling Rule
    # -------------------------------------------------------------
    def test_scenario_07_leftover_feedback_and_ceiling(self):
        # Case 7A: Leftovers observed -> Down 10-20%
        pond_leftover = PondState(
            pond_id="POND-07A",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
            leftover_today="a lot",
        )
        plan_lo = self.engine.generate_daily_plan(pond_leftover)
        self.assertAlmostEqual(plan_lo.adjusted_daily_ration_kg, plan_lo.baseline_daily_ration_kg * 0.80, places=1)

        # Case 7B: 3 days clean eating -> +5% appetite, but strictly capped at feeding table baseline
        pond_clean = PondState(
            pond_id="POND-07B",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
            consecutive_fully_eaten_days=3,
            leftover_today="none",
        )
        plan_cl = self.engine.generate_daily_plan(pond_clean)
        # MUST NEVER exceed baseline feeding table ration!
        self.assertLessEqual(plan_cl.adjusted_daily_ration_kg, plan_cl.baseline_daily_ration_kg)

    # -------------------------------------------------------------
    # Scenario 8: Short Feed Stock Warning (< 3 Days Left)
    # -------------------------------------------------------------
    def test_scenario_08_short_feed_stock_alert(self):
        pond = PondState(
            pond_id="POND-08",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
        )
        plan = self.engine.generate_daily_plan(pond)

        stock_alerts = [a for a in plan.alerts if a["type"] == "STOCK_SHORT_WARNING"]
        self.assertTrue(len(stock_alerts) > 0)
        self.assertIn("Feed stock short", stock_alerts[0]["message"])

    # -------------------------------------------------------------
    # Scenario 9: Medicated Feed Withdrawal Safety
    # -------------------------------------------------------------
    def test_scenario_09_medicated_feed_withdrawal(self):
        pond = PondState(
            pond_id="POND-09",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
        )
        plan = self.engine.generate_daily_plan(pond)

        med_alerts = [a for a in plan.alerts if a["type"] == "MEDICATED_FEED_WITHDRAWAL"]
        self.assertTrue(len(med_alerts) > 0)
        self.assertIn("Oxytetracycline", med_alerts[0]["message"])

    # -------------------------------------------------------------
    # Scenario 10: Farmer Override Requires Mandatory Reason
    # -------------------------------------------------------------
    def test_scenario_10_farmer_override_logging(self):
        pond = PondState(
            pond_id="POND-10",
            species_id="nile_tilapia",
            stock_count=10000,
            mortality_today=0,
            avg_weight_g=40.0,
            temperature_c=28.0,
            dissolved_oxygen_mg_l=5.5,
        )

        # 10A: Override with valid reason succeeds and logs
        plan = self.engine.generate_daily_plan(
            pond, farmer_override_kg=12.5, override_reason="Observed exceptionally strong surface feeding vigor"
        )
        self.assertEqual(plan.adjusted_daily_ration_kg, 12.5)
        override_rules = [r for r in plan.applied_rules if "Farmer override applied" in r]
        self.assertTrue(len(override_rules) > 0)

        # 10B: Override without reason must raise ValueError
        with self.assertRaises(ValueError):
            self.engine.generate_daily_plan(pond, farmer_override_kg=12.5, override_reason="")


if __name__ == "__main__":
    unittest.main()
