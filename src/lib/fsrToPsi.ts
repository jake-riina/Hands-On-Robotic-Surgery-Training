/**
 * Resistor from supply to the ADC node (FSR leg to GND). ESP32 glove builds often use 10 kΩ;
 * if your schematic uses 56 kΩ, set this to 56000 or readings will read high.
 */
export const FSR_ADC_PULLUP_OHMS = 10000;

/**
 * Final PSI multiplier after the power-law model. Tune if bar is still low/high vs a reference.
 */
export const FSR_PSI_OUTPUT_SCALE = 1.2;

/**
 * Calibrate FSR ADC reading to pressure (PSI).
 *
 * @param adc — raw analog reading (0–4095)
 * @param rFixed — pull-up to match hardware (defaults to {@link FSR_ADC_PULLUP_OHMS})
 * @param K — calibration parameter from FSR power-law curve
 * @param n — calibration exponent from FSR power-law curve
 * @param areaIn2 — sensing area in square inches (14.77 mm circle ≈ 0.266 in²)
 */
export function fsrToPsi(
  adc: number,
  rFixed: number = FSR_ADC_PULLUP_OHMS,
  K: number = 2.058e6,
  n: number = 0.9,
  areaIn2: number = 0.266
): number {
  if (adc <= 0) {
    return 0;
  }
  let a = adc;
  if (a >= 4095) {
    a = 4094.9;
  }

  const rFsr = (rFixed * (4095 - a)) / a;
  const forceG = K * rFsr ** -n;
  const pounds = forceG * 0.00220462;
  const psi = (pounds / areaIn2) * FSR_PSI_OUTPUT_SCALE;

  return psi;
}
