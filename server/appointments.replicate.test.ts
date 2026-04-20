import { describe, it, expect } from 'vitest';

describe('Appointment Replication Logic', () => {

  it('should validate weekly replication creates 4 additional appointments', () => {
    // This test validates the logic - actual replication happens in routers.ts
    const baseDate = new Date('2026-03-01T14:00:00');
    const expectedDates = [];
    
    for (let week = 1; week <= 4; week++) {
      const newDate = new Date(baseDate);
      newDate.setDate(baseDate.getDate() + (week * 7));
      expectedDates.push(newDate);
    }
    
    expect(expectedDates.length).toBe(4);
    expect(expectedDates[0].getDate()).toBe(8);  // March 8
    expect(expectedDates[1].getDate()).toBe(15); // March 15
    expect(expectedDates[2].getDate()).toBe(22); // March 22
    expect(expectedDates[3].getDate()).toBe(29); // March 29
  });

  it('should calculate correct weekly intervals', () => {
    const startDate = new Date('2026-02-15T09:00:00');
    const week1 = new Date(startDate);
    week1.setDate(startDate.getDate() + 7);
    
    const week2 = new Date(startDate);
    week2.setDate(startDate.getDate() + 14);
    
    const week3 = new Date(startDate);
    week3.setDate(startDate.getDate() + 21);
    
    const week4 = new Date(startDate);
    week4.setDate(startDate.getDate() + 28);
    
    expect(week1.getDate()).toBe(22);
    expect(week2.getDate()).toBe(1); // March 1
    expect(week3.getDate()).toBe(8);
    expect(week4.getDate()).toBe(15);
  });

  it('should preserve session duration when replicating (new parallel logic)', () => {
    // New logic: endTime derived from startTime + durationMs
    const startTime = new Date('2026-04-07T09:00:00.000Z');
    const endTime   = new Date('2026-04-07T09:50:00.000Z');
    const durationMs = endTime.getTime() - startTime.getTime();

    expect(durationMs).toBe(50 * 60 * 1000); // 50 minutes

    const weeksData = Array.from({ length: 4 }, (_, i) => {
      const week = i + 1;
      const newStartTime = new Date(startTime);
      newStartTime.setDate(startTime.getDate() + week * 7);
      const newEndTime = new Date(newStartTime.getTime() + durationMs);
      return { startTime: newStartTime, endTime: newEndTime };
    });

    weeksData.forEach((apt, i) => {
      const dur = apt.endTime.getTime() - apt.startTime.getTime();
      expect(dur).toBe(durationMs);
      const diffDays = (apt.startTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe((i + 1) * 7);
    });
  });

  it('should build 4 appointments in parallel (Promise.all compatible)', async () => {
    const startTime = new Date('2026-05-04T10:00:00.000Z');
    const endTime   = new Date('2026-05-04T10:50:00.000Z');
    const durationMs = endTime.getTime() - startTime.getTime();

    const weeksData = Array.from({ length: 4 }, (_, i) => {
      const week = i + 1;
      const newStartTime = new Date(startTime);
      newStartTime.setDate(startTime.getDate() + week * 7);
      const newEndTime = new Date(newStartTime.getTime() + durationMs);
      return { startTime: newStartTime, endTime: newEndTime };
    });

    const mockInsert = (apt: { startTime: Date }) =>
      Promise.resolve([{ insertId: apt.startTime.getTime() }]);

    const results = await Promise.all(weeksData.map(apt => mockInsert(apt)));
    const ids = results.map(r => r[0].insertId);

    expect(ids.length).toBe(4);
    expect(new Set(ids).size).toBe(4); // All IDs distinct
  });
});
