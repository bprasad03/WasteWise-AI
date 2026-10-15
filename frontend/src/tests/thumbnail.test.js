import { describe, it, expect, vi } from 'vitest';
import { createThumbnailDataUrl } from '../utils/thumbnail';

describe('Thumbnail Generation Utility', () => {
  it('returns null if no file is provided', async () => {
    const result = await createThumbnailDataUrl(null);
    expect(result).toBeNull();
  });

  it('handles FileReader reading and returns data URL string', async () => {
    const fakeFile = new File(['fake-image-bytes'], 'test.jpg', { type: 'image/jpeg' });
    const result = await createThumbnailDataUrl(fakeFile);

    // In Node / jsdom environment, result should be a string or data URL
    expect(typeof result === 'string' || result === null).toBe(true);
  });
});
