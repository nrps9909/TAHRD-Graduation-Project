interface PaginationProps {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  style?: 'cute' | 'modern'
}

export default function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
  style = 'modern',
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)

      if (currentPage > 3) {
        pages.push('...')
      }

      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }

      if (currentPage < totalPages - 2) {
        pages.push('...')
      }

      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  // Cute style
  if (style === 'cute') {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        {/* Info */}
        <div className="text-sm font-medium" style={{ color: '#666' }}>
          顯示 <span className="font-bold" style={{ color: '#FF8FB3' }}>{startItem}</span> 到{' '}
          <span className="font-bold" style={{ color: '#FF8FB3' }}>{endItem}</span> 共{' '}
          <span className="font-bold" style={{ color: '#FF8FB3' }}>{totalItems}</span> 條
        </div>

        {/* Page buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: 'white',
              border: '2px solid #FFE5F0',
              color: '#FF8FB3',
            }}
          >
            ← 上一頁
          </button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) =>
              typeof page === 'number' ? (
                <button
                  key={index}
                  onClick={() => onPageChange(page)}
                  className="w-10 h-10 rounded-xl font-bold transition-all hover:scale-105"
                  style={
                    currentPage === page
                      ? {
                          background: 'linear-gradient(135deg, #FFB3D9, #FF8FB3)',
                          color: 'white',
                          border: '2px solid #FF8FB3',
                        }
                      : {
                          background: 'white',
                          border: '2px solid #FFE5F0',
                          color: '#999',
                        }
                  }
                >
                  {page}
                </button>
              ) : (
                <span key={index} className="px-2" style={{ color: '#999' }}>
                  {page}
                </span>
              )
            )}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-xl font-bold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: 'white',
              border: '2px solid #FFE5F0',
              color: '#FF8FB3',
            }}
          >
            下一頁 →
          </button>
        </div>

        {/* Items per page */}
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#666' }}>
              每頁
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
              className="px-3 py-2 rounded-xl font-medium focus:outline-none"
              style={{
                border: '2px solid #FFE5F0',
                color: '#FF8FB3',
                background: 'white',
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm font-medium" style={{ color: '#666' }}>
              條
            </span>
          </div>
        )}
      </div>
    )
  }

  // Modern style
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t border-gray-200">
      {/* Info */}
      <div className="text-sm text-gray-700">
        顯示 <span className="font-semibold">{startItem}</span> 到{' '}
        <span className="font-semibold">{endItem}</span> 共{' '}
        <span className="font-semibold">{totalItems}</span> 條
      </div>

      {/* Page buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          上一頁
        </button>

        <div className="flex items-center gap-1">
          {pageNumbers.map((page, index) =>
            typeof page === 'number' ? (
              <button
                key={index}
                onClick={() => onPageChange(page)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={index} className="px-2 text-gray-400">
                {page}
              </span>
            )
          )}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          下一頁
        </button>
      </div>

      {/* Items per page */}
      {onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">每頁</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-700">條</span>
        </div>
      )}
    </div>
  )
}
