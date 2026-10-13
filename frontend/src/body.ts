// Height and bodyweight conversions. The API stores metric (cm, kg); these
// convert for display and input when the Body stats page is set to imperial.

import type { BodyUnits } from './api/types'

const CM_PER_INCH = 2.54
const LBS_PER_KG = 2.20462262

// 177.8 -> { feet: 5, inches: 10 } (inches rounded to the nearest whole inch)
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH)
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 }
}

// 5 ft 10 in -> 177.8 (rounded to 0.1 cm, what the API stores)
export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10
}

// Rounded to 0.1 lb, so 180 lbs -> 81.65 kg -> 180 lbs round-trips.
export function kgToLbs(kg: number): number {
  return Math.round(kg * LBS_PER_KG * 10) / 10
}

// Rounded to 0.01 kg, what the API stores.
export function lbsToKg(lbs: number): number {
  return Math.round((lbs / LBS_PER_KG) * 100) / 100
}

// "5 ft 10 in" or "178 cm"
export function formatHeight(cm: number, units: BodyUnits): string {
  if (units === 'metric') {
    return `${Math.round(cm)} cm`
  }
  const { feet, inches } = cmToFeetInches(cm)
  return `${feet} ft ${inches} in`
}

// "180 lbs" or "81.6 kg"
export function formatBodyweight(kg: number, units: BodyUnits): string {
  return units === 'metric' ? `${Math.round(kg * 10) / 10} kg` : `${kgToLbs(kg)} lbs`
}
