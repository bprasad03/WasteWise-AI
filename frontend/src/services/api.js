/**
 * WasteWise-AI Frontend API Service
 * Handles communication with the FastAPI inference backend.
 */

// Read API URL from Vite environment variable with local fallback
export const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || 'http://127.0.0.1:8000';

/**
 * Checks backend health and model status
 */
export async function fetchHealth() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Sends an image file to the FastAPI prediction endpoint as multipart/form-data
 *
 * @param {File} file - Uploaded image file (JPG, JPEG, PNG)
 * @returns {Promise<Object>} API PredictionResponse
 */
export async function predictWaste(file) {
  if (!file) {
    throw new Error('Please select an image file to classify.');
  }

  // Validate client-side extension
  const validExtensions = ['.jpg', '.jpeg', '.png'];
  const fileName = file.name.toLowerCase();
  const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

  if (!isValidExt) {
    throw new Error('Unsupported format. Please upload a JPG, JPEG, or PNG image.');
  }

  // 10 MB limit check
  const maxBytes = 10 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('File size exceeds the 10 MB limit. Please choose a smaller image.');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/predict`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (res.status === 413) {
        throw new Error('The uploaded image is too large (maximum 10 MB permitted).');
      }
      if (res.status === 503) {
        throw new Error('AI Model is initializing or unavailable. Please verify the backend service is running.');
      }
      const errorMessage = data?.detail || data?.error || `Server returned error (${res.status})`;
      throw new Error(errorMessage);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(
        `Unable to reach the WasteWise backend at ${API_BASE_URL}. Ensure the FastAPI server is running (uvicorn backend.app.main:app --reload).`
      );
    }
    throw err;
  }
}
