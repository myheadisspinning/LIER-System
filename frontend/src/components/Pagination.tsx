import { useMemo } from 'react';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hidePerPage?: boolean;
};

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  totalItems,
  startIndex,
  endIndex,
  hidePerPage = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (safeTotalPages <= maxVisible) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      for (let i = Math.max(2, safeCurrentPage - 1); i <= Math.min(safeTotalPages - 1, safeCurrentPage + 1); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (safeCurrentPage < safeTotalPages - 2) {
        pages.push('...');
      }

      if (!pages.includes(safeTotalPages)) {
        pages.push(safeTotalPages);
      }
    }

    return pages;
  }, [safeCurrentPage, safeTotalPages]);

  return (
    <div className="px-3 py-2 border-t border-border-subtle flex items-center justify-between gap-2 bg-surface-container-lowest">
      {!hidePerPage && (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-body-sm text-on-surface-variant whitespace-nowrap">Items</span>
          <select
            className="bg-surface-container-low border border-border-subtle rounded px-1.5 py-0.5 text-body-sm text-on-surface focus:ring-1 focus:ring-secondary outline-none cursor-pointer"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      )}

      <div className="flex items-center justify-end gap-1 min-w-0">
        <span
          className="text-body-sm text-on-surface-variant whitespace-nowrap shrink-0"
          title={`Showing ${startIndex + 1}-${Math.min(endIndex, totalItems)} of ${totalItems}`}
        >
          Page {safeCurrentPage} of {safeTotalPages}
        </span>

        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
          disabled={safeCurrentPage === 1}
          className="shrink-0 w-7 h-7 flex items-center justify-center border border-border-subtle rounded text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
        </button>

        <div className="flex items-center gap-0.5">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 flex items-center justify-center text-body-sm text-on-surface-variant"
                >
                  ...
                </span>
              );
            }
            return (
              <button
                key={page}
                type="button"
                aria-label={`Go to page ${page}`}
                onClick={() => onPageChange(page as number)}
                className={`w-7 h-7 flex items-center justify-center rounded text-body-sm transition-colors ${
                  safeCurrentPage === page
                    ? 'bg-secondary text-on-secondary'
                    : 'text-on-surface hover:bg-surface-variant'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Next page"
          onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
          disabled={safeCurrentPage === safeTotalPages}
          className="shrink-0 w-7 h-7 flex items-center justify-center border border-border-subtle rounded text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
