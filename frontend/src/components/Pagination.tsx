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
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  if (totalItems <= itemsPerPage) {
    return null;
  }

  return (
    <div className="px-4 py-3 border-t border-border-subtle flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-surface-container-lowest">
      {!hidePerPage && (
        <div className="flex items-center gap-2">
          <span className="text-body-sm text-on-surface-variant">Items per page:</span>
          <select
            className="bg-surface-container-low border border-border-subtle rounded px-2 py-1 text-body-sm text-on-surface focus:ring-1 focus:ring-secondary outline-none cursor-pointer"
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

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-body-sm text-on-surface-variant">
          Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 border border-border-subtle rounded text-body-sm text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === '...') {
              return <span key={`ellipsis-${idx}`} className="px-2 text-on-surface-variant">...</span>;
            }
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page as number)}
                className={`px-3 py-1 rounded text-body-sm transition-colors ${
                  currentPage === page
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
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 border border-border-subtle rounded text-body-sm text-on-surface hover:bg-surface-variant transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
