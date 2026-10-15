import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_BASE_URL, fetchHealth, predictWaste } from '../services/api';

describe('Frontend API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves API_BASE_URL with default fallback', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('rejects predictWaste when no file is provided', async () => {
    await expect(predictWaste(null)).rejects.toThrow('Please select an image file to classify.');
  });

  it('rejects predictWaste for disallowed file extensions', async () => {
    const textFile = new File(['sample text'], 'notes.txt', { type: 'text/plain' });
    await expect(predictWaste(textFile)).rejects.toThrow('Unsupported format');
  });

  it('rejects predictWaste for files exceeding 10 MB', async () => {
    // Mock a large file (> 10MB)
    const largeFile = new File([''], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    await expect(predictWaste(largeFile)).rejects.toThrow('File size exceeds the 10 MB limit');
  });

  it('successfully sends multipart/form-data and receives prediction result', async () => {
    const mockResponse = {
      predicted_class: 'glass',
      predicted_class_id: 1,
      confidence: 0.92,
      probabilities: [
        { class_id: 0, class_name: 'cardboard', probability: 0.01 },
        { class_id: 1, class_name: 'glass', probability: 0.92 },
        { class_id: 2, class_name: 'metal', probability: 0.03 },
        { class_id: 3, class_name: 'paper', probability: 0.01 },
        { class_id: 4, class_name: 'plastic', probability: 0.02 },
        { class_id: 5, class_name: 'trash', probability: 0.01 },
      ],
      guidance: {
        bin_name: 'Glass Container Recycling Bin / Bottle Bank',
        bin_color: 'Green',
        instructions: ['Rinse bottles cleanly.'],
        disclaimer: 'Guidance only.',
      },
      filename: 'bottle.jpg',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const testFile = new File(['fake-bytes'], 'bottle.jpg', { type: 'image/jpeg' });
    const result = await predictWaste(testFile);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.predicted_class).toBe('glass');
    expect(result.confidence).toBe(0.92);
    expect(result.guidance.bin_name).toContain('Glass');
  });

  it('handles HTTP 413 oversized response with friendly error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ detail: 'Payload too large' }),
    });

    const testFile = new File(['bytes'], 'sample.png', { type: 'image/png' });
    await expect(predictWaste(testFile)).rejects.toThrow('too large');
  });

  it('handles HTTP 503 model initializing response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ detail: 'Model unavailable' }),
    });

    const testFile = new File(['bytes'], 'sample.png', { type: 'image/png' });
    await expect(predictWaste(testFile)).rejects.toThrow('initializing or unavailable');
  });

  it('fetchHealth returns status when server responds 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'healthy',
        model_loaded: true,
        version: '1.0.0',
      }),
    });

    const health = await fetchHealth();
    expect(health.status).toBe('healthy');
    expect(health.model_loaded).toBe(true);
  });
});
