export const paginate = (items = [], page = 1, limit = 20) => {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number(limit) > 0 ? Number(limit) : 20;

  const start = (safePage - 1) * safeLimit;
  const end = start + safeLimit;
  const pagedItems = items.slice(start, end);

  return {
    data: pagedItems,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: items.length,
      totalPages: Math.ceil(items.length / safeLimit) || 1,
      hasNextPage: end < items.length,
      hasPrevPage: safePage > 1,
    },
  };
};
