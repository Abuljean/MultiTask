// Shared module state between the list and the quick-add route — the
// namespacing is what keeps recurring ids and task ids from colliding.
import { clearEnterMark, getEnterFrom, markEnter } from '../enter-marks';

describe('enter marks', () => {
  it('marks and reads back a direction', () => {
    markEnter(1, 'left');
    expect(getEnterFrom(1)).toBe('left');
    clearEnterMark(1);
  });

  it('clears after clearEnterMark', () => {
    markEnter(2, 'right');
    clearEnterMark(2);
    expect(getEnterFrom(2)).toBeNull();
  });

  it('namespaced recurring keys cannot collide with task ids', () => {
    markEnter(3, 'left');
    markEnter('rec:3', 'right');
    expect(getEnterFrom(3)).toBe('left');
    expect(getEnterFrom('rec:3')).toBe('right');
    clearEnterMark(3);
    clearEnterMark('rec:3');
  });

  it('unknown keys return null', () => {
    expect(getEnterFrom(999999)).toBeNull();
    expect(getEnterFrom('rec:999999')).toBeNull();
  });
});
