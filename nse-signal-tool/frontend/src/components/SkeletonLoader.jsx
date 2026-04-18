const SkeletonLoader = ({ type = 'card', count = 1 }) => {
  if (type === 'metrics') {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="card animate-fade-in">
            <div className="skeleton h-4 w-24 mb-3"></div>
            <div className="skeleton h-10 w-32"></div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className="card animate-fade-in">
        <div className="skeleton h-6 w-48 mb-6"></div>

        <div className="space-y-3">
          {/* Table Header */}
          <div className="flex gap-4 pb-3 border-b border-bg-border">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="skeleton h-3 w-20"></div>
            ))}
          </div>

          {/* Table Rows */}
          {Array(count).fill(0).map((_, i) => (
            <div key={i} className="flex gap-4 py-4 border-b border-bg-border">
              <div className="skeleton h-4 w-20"></div>
              <div className="skeleton h-6 w-16 rounded-lg"></div>
              <div className="skeleton h-4 w-20"></div>
              <div className="skeleton h-4 w-16"></div>
              <div className="skeleton h-4 w-16"></div>
              <div className="skeleton h-4 w-16"></div>
              <div className="skeleton h-4 w-12"></div>
              <div className="skeleton h-4 w-32"></div>
              <div className="skeleton h-4 w-16"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="space-y-4">
        {Array(count).fill(0).map((_, i) => (
          <div key={i} className="card animate-fade-in">
            <div className="skeleton h-6 w-3/4 mb-3"></div>
            <div className="skeleton h-4 w-full mb-2"></div>
            <div className="skeleton h-4 w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

export default SkeletonLoader
