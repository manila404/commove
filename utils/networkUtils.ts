/**
 * Retry wrapper for async operations (e.g., Firebase calls).
 * Uses exponential backoff between retries.
 *
 * @param fn        The async function to execute
 * @param retries   Maximum number of retry attempts (default: 3)
 * @param delayMs   Base delay in ms before first retry (default: 1000)
 * @returns         The result of fn()
 * @throws          The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        const backoff = delayMs * Math.pow(2, attempt); // 1s, 2s, 4s...
        console.warn(
          `[withRetry] Attempt ${attempt + 1}/${retries + 1} failed. Retrying in ${backoff}ms...`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError;
}

/**
 * Checks if an error is likely network-related.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message = (error as any)?.message?.toLowerCase?.() || '';
  const code = (error as any)?.code?.toLowerCase?.() || '';

  return (
    !navigator.onLine ||
    message.includes('network') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('unavailable') ||
    message.includes('offline') ||
    code.includes('unavailable') ||
    code === 'auth/network-request-failed'
  );
}

/**
 * Returns a user-friendly error message based on the error type.
 */
export function getFriendlyErrorMessage(error: unknown): string {
  if (isNetworkError(error)) {
    return 'Network error. Please check your internet connection and try again.';
  }

  const code = (error as any)?.code || '';

  // Firebase Auth errors
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please try again.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email is already registered. Please sign in instead.';
  }

  // Firebase Firestore errors
  if (code === 'permission-denied') {
    return 'You do not have permission to perform this action.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again later.';
}
