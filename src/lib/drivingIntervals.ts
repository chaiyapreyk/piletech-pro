export type DrivingIntervalValue = number | null;

export function appendDrivingInterval(
  blowCounts: DrivingIntervalValue[],
  value: DrivingIntervalValue
): DrivingIntervalValue[] {
  if (value !== null && (!Number.isFinite(value) || value <= 0)) return blowCounts;
  return [...blowCounts, value];
}

export function updateDrivingInterval(
  blowCounts: DrivingIntervalValue[],
  index: number,
  value: DrivingIntervalValue
): DrivingIntervalValue[] {
  if (!Number.isInteger(index) || index < 0) return blowCounts;
  const updated = [...blowCounts];
  while (updated.length < index) updated.push(null);
  updated[index] = value;
  return updated;
}
