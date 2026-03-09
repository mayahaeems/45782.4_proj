export default function EmptyState({ emoji = '📭', title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span className="text-6xl animate-float">{emoji}</span>
      <h3 className="text-2xl font-display text-stone-700">{title}</h3>
      {message && <p className="text-stone-500 font-body text-center max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
