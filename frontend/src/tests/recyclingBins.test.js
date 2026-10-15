import { describe, it, expect } from 'vitest';
import { RECYCLING_BINS_DATA } from '../components/RecyclingBins';

describe('Recycling Bins Catalog & Metadata', () => {
  const expectedClassIds = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash'];

  it('contains all 6 expected waste category definitions', () => {
    const presentIds = RECYCLING_BINS_DATA.map((b) => b.id);
    expect(presentIds).toEqual(expectedClassIds);
    expect(RECYCLING_BINS_DATA).toHaveLength(6);
  });

  it('each bin definition provides required styling, names, and summaries', () => {
    RECYCLING_BINS_DATA.forEach((bin) => {
      expect(bin.id).toBeTruthy();
      expect(bin.name).toBeTruthy();
      expect(bin.binName).toBeTruthy();
      expect(bin.colorName).toBeTruthy();
      expect(bin.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(bin.summary).toBeTruthy();
      expect(bin.icon).toBeDefined();
    });
  });
});
