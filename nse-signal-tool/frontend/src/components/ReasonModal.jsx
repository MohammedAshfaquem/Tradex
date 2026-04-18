import React from 'react'

const ReasonModal = ({ isOpen, onClose, signal }) => {
  if (!isOpen || !signal) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-primary border border-bg-border rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className={`signal-badge-${signal.signal.toLowerCase()}`}>
              {signal.symbol}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {/* Signal Details */}
        <div className="space-y-4 mb-6">
          <div>
            <p className="text-text-secondary text-sm mb-1">Signal</p>
            <p className={`text-lg font-bold ${
              signal.signal === 'BUY' 
                ? 'text-signal-buy' 
                : signal.signal === 'SELL' 
                ? 'text-signal-sell' 
                : 'text-signal-watch'
            }`}>
              {signal.signal}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-text-secondary text-sm mb-1">Confidence</p>
              <p className="text-lg font-bold">{signal.confidence}%</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-1">Risk Level</p>
              <p className={`text-lg font-bold ${
                signal.risk === 'HIGH'
                  ? 'text-signal-sell'
                  : signal.risk === 'MEDIUM'
                  ? 'text-signal-watch'
                  : 'text-signal-buy'
              }`}>
                {signal.risk}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-text-secondary text-sm mb-1">Entry</p>
              <p className="font-semibold">₹{signal.entry_price?.toFixed(2) || '-'}</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-1">Target</p>
              <p className="font-semibold text-signal-buy">₹{signal.target?.toFixed(2) || '-'}</p>
            </div>
            <div>
              <p className="text-text-secondary text-sm mb-1">Stop Loss</p>
              <p className="font-semibold text-signal-sell">₹{signal.stop_loss?.toFixed(2) || '-'}</p>
            </div>
          </div>
        </div>

        {/* LLM Analysis / Reason */}
        <div className="bg-bg-border rounded p-4">
          <p className="text-text-secondary text-sm mb-2">📊 Analysis</p>
          <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
            {signal.reason || 'No analysis available'}
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-accent hover:bg-accent/80 text-bg-primary font-semibold py-2 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default ReasonModal
