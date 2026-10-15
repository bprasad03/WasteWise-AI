/**
 * WasteWise-AI: Thumbnail Generation Utility
 * Generates lightweight, persistent Data URL thumbnails for session history.
 * Data URLs do not rely on browser object URLs, preventing broken thumbnails
 * when object URLs are revoked to prevent memory leaks.
 */

/**
 * Creates a lightweight, persistent Data URL thumbnail from a File object.
 *
 * @param {File} file - Source image file
 * @param {number} maxWidth - Maximum thumbnail width (default: 120px)
 * @param {number} maxHeight - Maximum thumbnail height (default: 120px)
 * @returns {Promise<string|null>} Data URL string or null on failure
 */
export function createThumbnailDataUrl(file, maxWidth = 120, maxHeight = 120) {
  return new Promise((resolve) => {
    if (!file || typeof FileReader === 'undefined') {
      resolve(null);
      return;
    }

    try {
      const reader = new FileReader();

      reader.onload = (e) => {
        const rawResult = e.target?.result;
        if (!rawResult) {
          resolve(null);
          return;
        }

        // Check if browser DOM Image and Canvas are available
        if (
          typeof Image === 'undefined' ||
          typeof document === 'undefined' ||
          !document.createElement
        ) {
          resolve(typeof rawResult === 'string' ? rawResult : null);
          return;
        }

        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.naturalWidth || img.width || maxWidth;
            let height = img.naturalHeight || img.height || maxHeight;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = Math.max(width, 1);
            canvas.height = Math.max(height, 1);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(typeof rawResult === 'string' ? rawResult : null);
              return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } catch {
            resolve(typeof rawResult === 'string' ? rawResult : null);
          }
        };

        img.onerror = () => resolve(null);
        img.src = typeof rawResult === 'string' ? rawResult : '';
      };

      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}
