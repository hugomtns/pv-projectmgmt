/**
 * Irradiance Model
 *
 * Calculates solar position and expected irradiance for PV systems.
 * Used to estimate expected power output for performance ratio calculation.
 */

/**
 * Get the day of year (1-365/366)
 */
export function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate solar declination angle in degrees
 * The angle between the sun's rays and the equatorial plane
 */
export function calculateSolarDeclination(dayOfYear: number): number {
  // Cooper's equation
  return 23.45 * Math.sin(toRadians((360 / 365) * (dayOfYear - 81)));
}

/**
 * Calculate the equation of time in minutes
 * Accounts for Earth's elliptical orbit and axial tilt
 */
export function calculateEquationOfTime(dayOfYear: number): number {
  const b = toRadians((360 / 365) * (dayOfYear - 81));
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * Calculate solar noon in decimal hours (local solar time)
 */
export function calculateSolarNoon(longitude: number, timezone: number = 0): number {
  // Solar noon is when the sun crosses the meridian
  // Adjust for longitude offset from timezone meridian
  const longitudeCorrection = (timezone * 15 - longitude) / 15;
  return 12 + longitudeCorrection;
}

/**
 * Calculate hour angle in degrees
 * Negative before solar noon, positive after
 */
export function calculateHourAngle(hour: number, solarNoon: number): number {
  // 15 degrees per hour (360/24)
  return 15 * (hour - solarNoon);
}

/**
 * Calculate solar altitude angle in degrees
 * The angle between the sun and the horizon
 */
export function calculateSolarAltitude(
  latitude: number,
  declination: number,
  hourAngle: number
): number {
  const latRad = toRadians(latitude);
  const decRad = toRadians(declination);
  const hourRad = toRadians(hourAngle);

  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(hourRad);

  return toDegrees(Math.asin(Math.max(-1, Math.min(1, sinAltitude))));
}

/**
 * Calculate air mass (optical path length through atmosphere)
 * Higher air mass = more atmospheric absorption
 */
export function calculateAirMass(solarAltitude: number): number {
  if (solarAltitude <= 0) return Infinity;

  const altitudeRad = toRadians(solarAltitude);
  // Kasten-Young formula for air mass
  return 1 / (Math.sin(altitudeRad) + 0.50572 * Math.pow(6.07995 + solarAltitude, -1.6364));
}

/**
 * Calculate clear-sky Global Horizontal Irradiance (GHI)
 * Based on solar position and atmospheric conditions
 */
export function calculateClearSkyGHI(
  latitude: number,
  longitude: number,
  timestamp: Date
): number {
  const dayOfYear = getDayOfYear(timestamp);
  // Use UTC time to match the default timezone=0 in calculateSolarNoon()
  const hour = timestamp.getUTCHours() + timestamp.getUTCMinutes() / 60;

  // Solar geometry
  const declination = calculateSolarDeclination(dayOfYear);
  const solarNoon = calculateSolarNoon(longitude);
  const hourAngle = calculateHourAngle(hour, solarNoon);
  const solarAltitude = calculateSolarAltitude(latitude, declination, hourAngle);

  // Night time
  if (solarAltitude <= 0) return 0;

  // Air mass
  const airMass = calculateAirMass(solarAltitude);

  // Extraterrestrial irradiance (solar constant with orbital correction)
  const solarConstant = 1361; // W/m2
  const orbitalFactor = 1 + 0.033 * Math.cos(toRadians((360 / 365) * dayOfYear));
  const extraterrestrialIrradiance = solarConstant * orbitalFactor;

  // Atmospheric transmittance (simplified clear-sky model)
  // Using Hottel clear-sky model approximation
  const a0 = 0.4237 - 0.00821 * Math.pow(6 - Math.abs(latitude) / 20, 2);
  const a1 = 0.5055 + 0.00595 * Math.pow(6.5 - Math.abs(latitude) / 20, 2);
  const k = 0.2711 + 0.01858 * Math.pow(2.5 - Math.abs(latitude) / 20, 2);

  const transmittance = a0 + a1 * Math.exp(-k * airMass);

  // Direct Normal Irradiance
  const dni = extraterrestrialIrradiance * transmittance;

  // Global Horizontal Irradiance
  const ghi = dni * Math.sin(toRadians(solarAltitude));

  return Math.max(0, ghi);
}

/**
 * Apply cloud cover attenuation to irradiance
 */
export function applyCloudAttenuation(clearSkyGHI: number, cloudCoverPercent: number): number {
  // Empirical cloud attenuation model
  // Full cloud cover reduces irradiance to ~25% (diffuse only)
  const cloudFactor = 1 - (cloudCoverPercent / 100) * 0.75;
  return clearSkyGHI * cloudFactor;
}

/**
 * Calculate cell temperature from ambient temperature and irradiance
 * Uses simplified NOCT model
 */
export function calculateCellTemperature(
  ambientTemp: number,
  irradiance: number,
  noct: number = 45
): number {
  // NOCT is measured at 800 W/m2, 20C ambient, 1 m/s wind
  const tempRise = ((noct - 20) / 800) * irradiance;
  return ambientTemp + tempRise;
}

/**
 * Calculate temperature loss factor
 * Typical silicon modules lose ~0.4% per degree above 25C
 */
export function calculateTemperatureLoss(
  cellTemp: number,
  tempCoefficient: number = -0.004
): number {
  const tempDelta = cellTemp - 25; // STC reference is 25C
  const loss = tempDelta * Math.abs(tempCoefficient);
  return Math.max(0, Math.min(1, loss));
}

/**
 * Calculate expected power output
 */
export function calculateExpectedPower(
  capacityKwp: number,
  irradiance: number,
  cellTemp: number,
  systemLosses: number = 0.14 // 14% total system losses
): number {
  // STC irradiance is 1000 W/m2
  const irradianceFactor = irradiance / 1000;

  // Temperature derating
  const tempLoss = calculateTemperatureLoss(cellTemp);

  // Expected power
  const power = capacityKwp * irradianceFactor * (1 - tempLoss) * (1 - systemLosses);

  return Math.max(0, power);
}
