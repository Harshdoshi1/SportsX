const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const shouldRetryError = (error) => {
  const status = error?.response?.status;

  if (!status) {
    return true;
  }

  if (status === 429 || status === 401 || status === 403) {
    return false;
  }

  if (status >= 400 && status < 500 && status !== 408) {
    return false;
  }

  return true;
};

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
      if (!shouldRetryError(error)) {
        break;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      await wait(delay);
    }
  }

  throw lastError;
};
