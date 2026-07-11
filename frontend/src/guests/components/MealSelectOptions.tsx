import { useMealOptions } from '../api'

/** <option> list for a meal <select>; keeps a stale/inactive current value selectable. */
export function MealSelectOptions({ current }: { current: string }) {
  const { data: options = [] } = useMealOptions()
  const known = options.some((o) => o.key === current)
  return (
    <>
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
      {current && !known && <option value={current}>{current}</option>}
    </>
  )
}
