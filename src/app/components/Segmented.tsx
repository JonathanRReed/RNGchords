interface SegmentedProps<T extends string> {
  label: string
  options: ReadonlyArray<{ id: T; label: string }>
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
  return (
    <div role="group" aria-label={label} className={className ? `seg ${className}` : 'seg'}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className="seg__item"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
