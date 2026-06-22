import { describe, it, expect } from 'vitest';
import { newStreak, updateStreak } from './streak';

describe('streak', () => {
  it('starts at zero', () => {
    expect(newStreak()).toEqual({ current: 0, longest: 0, lastActiveDayKey: null });
  });

  it('increments on the first active day', () => {
    expect(updateStreak(newStreak(), '2026-06-01')).toMatchObject({ current: 1, longest: 1 });
  });

  it('increments on consecutive days', () => {
    let s = updateStreak(newStreak(), '2026-06-01');
    s = updateStreak(s, '2026-06-02');
    expect(s.current).toBe(2);
    expect(s.longest).toBe(2);
  });

  it('NEVER wipes on a missed day — it holds and resumes +1', () => {
    let s = updateStreak(newStreak(), '2026-06-01'); // 1
    s = updateStreak(s, '2026-06-02'); // 2
    s = updateStreak(s, '2026-06-09'); // missed a week — resumes, not reset
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('is idempotent within the same day', () => {
    let s = updateStreak(newStreak(), '2026-06-01');
    s = updateStreak(s, '2026-06-01');
    expect(s.current).toBe(1);
  });
});
