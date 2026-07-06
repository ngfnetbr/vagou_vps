import { useState, useMemo } from "react";
import { UseQueryResult } from "@tanstack/react-query";

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePaginatedData<T>(
  data: T[] | undefined,
  initialPageSize: number = 10
): PaginationResult<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    if (!data) return [];
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, page, pageSize]);

  const goToPage = (newPage: number) => {
    const pageNumber = Math.max(1, Math.min(newPage, totalPages));
    setPage(pageNumber);
  };

  const goToNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const goToPreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const goToFirstPage = () => setPage(1);
  const goToLastPage = () => setPage(totalPages);

  const handleSetPageSize = (size: number) => {
    setPageSize(size);
    setPage(1); // Reset to first page when changing page size
  };

  return {
    data: paginatedData,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
  };
}
