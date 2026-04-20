const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const retry = async (fn, options = {}) => {
  const { retries = 2, baseDelayMs = 400 } = options;
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      await wait(delay);
    }
  }

  throw lastError;
};
