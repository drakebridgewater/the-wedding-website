import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400'

/** Label + control wrapper used by every form in the guests app. */
export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-stone-400 mt-1">{hint}</p>}
    </div>
  )
}

export function TextField({
  label, hint, className, ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <Field label={label} hint={hint}>
      <input {...rest} className={cn(inputClass, className)} />
    </Field>
  )
}

export function SelectField({
  label, hint, options, className, ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: ReactNode
  hint?: ReactNode
  options: [string, string][]
}) {
  return (
    <Field label={label} hint={hint}>
      <select {...rest} className={cn(inputClass, className)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  )
}

export function TextAreaField({
  label, hint, className, ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <Field label={label} hint={hint}>
      <textarea {...rest} className={cn(inputClass, 'resize-none', className)} />
    </Field>
  )
}

export function CheckboxField({
  label, hint, className, ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn('flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer select-none', className)}>
      <input type="checkbox" {...rest} className="w-4 h-4 rounded border-stone-300" />
      <span>
        {label}
        {hint && <span className="ml-1 text-xs text-stone-400">{hint}</span>}
      </span>
    </label>
  )
}
