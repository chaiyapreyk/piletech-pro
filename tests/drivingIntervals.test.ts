import { describe, expect, it } from 'vitest';
import {
  appendDrivingInterval,
  updateDrivingInterval,
} from '@/lib/drivingIntervals';

describe('driving interval operations', () => {
  it('appends valid values and skipped intervals without mutating the source', () => {
    const source: (number | null)[] = [20];

    expect(appendDrivingInterval(source, 25)).toEqual([20, 25]);
    expect(appendDrivingInterval(source, null)).toEqual([20, null]);
    expect(source).toEqual([20]);
  });

  it('ignores invalid blow values', () => {
    const source: (number | null)[] = [20];

    expect(appendDrivingInterval(source, 0)).toBe(source);
    expect(appendDrivingInterval(source, Number.NaN)).toBe(source);
  });

  it('updates an existing or future interval and fills skipped gaps', () => {
    expect(updateDrivingInterval([20], 0, 30)).toEqual([30]);
    expect(updateDrivingInterval([20], 2, 30)).toEqual([20, null, 30]);
  });
});
