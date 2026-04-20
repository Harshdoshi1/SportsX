export const ok = (res, payload, meta = {}) => {
  res.status(200).json({
    success: true,
    ...payload,
    meta,
  });
};

export const fail = (res, statusCode, message, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    details,
  });
};

export const notFound = (req, res) => {
  fail(res, 404, `Route not found: ${req.originalUrl}`);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  fail(
    res,
    statusCode,
    err.message || "Unexpected server error",
    process.env.NODE_ENV === "production" ? null : err.stack
  );

  next();
};
