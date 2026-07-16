import { useEffect, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export const ADMIN_ROWS_PER_PAGE = 10;

export const adminTableHeadClass = "h-9 px-3 text-xs";
export const adminTableCellClass = "px-3 py-1.5";
export const adminIconButtonClass = "h-7 w-7";
export const adminIconClass = "h-3.5 w-3.5";

export function useDebouncedAdminSearch(delayMs = 300) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [searchQuery, delayMs]);

  return { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage };
}

export function paginateItems<T>(items: T[], currentPage: number, pageSize = ADMIN_ROWS_PER_PAGE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = items.slice((safePage - 1) * pageSize, safePage * pageSize);
  return { paginated, totalPages, safePage };
}

/** Page numbers with ellipsis for compact pagination controls. */
export function getPaginationPages(currentPage: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [];
  let previous: number | undefined;

  for (let page = 1; page <= totalPages; page++) {
    const isEdge = page === 1 || page === totalPages;
    const isNearCurrent = page >= currentPage - 1 && page <= currentPage + 1;
    if (!isEdge && !isNearCurrent) continue;

    if (previous !== undefined) {
      if (page - previous === 2) {
        pages.push(previous + 1);
      } else if (page - previous > 2) {
        pages.push("ellipsis");
      }
    }

    pages.push(page);
    previous = page;
  }

  return pages;
}

type AdminSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
};

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  ariaLabel = "Search records",
  className = "max-w-md flex-1",
}: AdminSearchInputProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 pl-8 text-sm"
        aria-label={ariaLabel}
      />
    </div>
  );
}

type AdminListPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize?: number;
};

export function AdminListPagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize = ADMIN_ROWS_PER_PAGE,
}: AdminListPaginationProps) {
  if (totalItems <= pageSize) return null;

  const pageNumbers = getPaginationPages(currentPage, totalPages);
  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {rangeStart}–{rangeEnd} of {totalItems} · Page {currentPage} of {totalPages}
      </span>
      <Pagination className="mx-0 w-auto justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              className="h-8 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage > 1) onPageChange(currentPage - 1);
              }}
              aria-disabled={currentPage <= 1}
              tabIndex={currentPage <= 1 ? -1 : undefined}
            />
          </PaginationItem>
          {pageNumbers.map((pageNum, index) =>
            pageNum === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis className="h-8 w-8" />
              </PaginationItem>
            ) : (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  className="h-8 w-8 text-xs"
                  isActive={pageNum === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(pageNum);
                  }}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              className="h-8 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                if (currentPage < totalPages) onPageChange(currentPage + 1);
              }}
              aria-disabled={currentPage >= totalPages}
              tabIndex={currentPage >= totalPages ? -1 : undefined}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

type AdminListToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  filters?: ReactNode;
};

export function AdminListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filters,
}: AdminListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <AdminSearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchAriaLabel}
      />
      {filters ? <div className="flex flex-wrap items-center gap-2 shrink-0">{filters}</div> : null}
    </div>
  );
}
