import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
}: PaginationControlsProps) {
  const generatePageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const showEllipsis = totalPages > 7;

    if (!showEllipsis) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>
          Mostrando {startItem} a {endItem} de {totalItems} registros
        </span>
        <div className="flex items-center gap-2 ml-4">
          <span className="whitespace-nowrap">Itens por página:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => hasPreviousPage && onPageChange(currentPage - 1)}
              className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!hasPreviousPage}
            />
          </PaginationItem>

          {pageNumbers.map((pageNum, idx) => (
            <PaginationItem key={idx}>
              {pageNum === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => onPageChange(pageNum)}
                  isActive={pageNum === currentPage}
                  className="cursor-pointer"
                  aria-label={`Ir para página ${pageNum}`}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >
                  {pageNum}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() => hasNextPage && onPageChange(currentPage + 1)}
              className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
              aria-disabled={!hasNextPage}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
