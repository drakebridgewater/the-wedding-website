import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import type { AnyVendor, VendorType, VenueVendor } from './types'
import { PhotoUpload } from './PhotoUpload'
import { LocationMap } from './LocationMap'
import { VendorChecklist } from './VendorChecklist'

// ---- Zod schemas ----

const moneyField = z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid dollar amount').or(z.literal(''))
const optionalMoney = moneyField.optional().nullable()

const baseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Must be a valid URL').or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  email: z.string().email('Must be a valid email').or(z.literal('')),
  is_chosen: z.boolean(),
  is_favorite: z.boolean(),
  has_talked_to: z.boolean(),
  has_visited: z.boolean(),
  price_estimate: optionalMoney,
  rating: z.number().int().min(1).max(5).nullable().optional(),
  address: z.string().optional().or(z.literal('')),
  latitude: z.string().optional().or(z.literal('')),
  longitude: z.string().optional().or(z.literal('')),
  positives: z.string().optional().or(z.literal('')),
  negatives: z.string().optional().or(z.literal('')),
  comments: z.string().optional().or(z.literal('')),
})

const venueExtension = z.object({
  capacity: z.number().int().positive().nullable().optional(),
  style: z.string().optional().or(z.literal('')),
  has_parking: z.boolean(),
  catering_included: z.boolean(),
  accommodation_nearby: z.boolean(),
  is_indoor: z.boolean(),
  is_outdoor: z.boolean(),
})

const catererExtension = z.object({
  price_per_head: optionalMoney,
  cuisine_type: z.string().optional().or(z.literal('')),
  has_vegetarian: z.boolean(),
  has_vegan: z.boolean(),
  has_gluten_free: z.boolean(),
  tasting_scheduled: z.boolean(),
  tasting_completed: z.boolean(),
})

const cakeExtension = z.object({
  price_per_serving: optionalMoney,
  flavors: z.string().optional().or(z.literal('')),
  custom_design_available: z.boolean(),
  tasting_scheduled: z.boolean(),
  tasting_completed: z.boolean(),
})

const floristExtension = z.object({
  arrangement_types: z.string().optional().or(z.literal('')),
  style: z.string().optional().or(z.literal('')),
  minimum_order: optionalMoney,
})

const entertainmentExtension = z.object({
  type: z.string().optional().or(z.literal('')),
  num_members: z.number().int().positive().nullable().optional(),
  genres: z.string().optional().or(z.literal('')),
  package_details: z.string().optional().or(z.literal('')),
  sample_link: z.string().url('Must be a valid URL').or(z.literal('')).optional(),
  performance_duration_hours: z.string().regex(/^\d+(\.\d)?$/, 'Enter a valid number').or(z.literal('')).optional().nullable(),
})

const SCHEMA_MAP = {
  venue: baseSchema.merge(venueExtension),
  caterer: baseSchema.merge(catererExtension),
  cake: baseSchema.merge(cakeExtension),
  florist: baseSchema.merge(floristExtension),
  entertainment: baseSchema.merge(entertainmentExtension),
} as const

type FormValues = Record<string, unknown>

// ---- Tab types ----

type FormTab = 'overview' | 'contact' | 'location' | 'details' | 'notes' | 'checklist' | 'photos'

function getTabsForType(vendorType: VendorType, hasVendor: boolean): { id: FormTab; label: string }[] {
  const photosTab = hasVendor ? [{ id: 'photos' as FormTab, label: 'Photos' }] : []
  if (vendorType === 'venue') {
    return [
      { id: 'overview',  label: 'Overview' },
      { id: 'contact',   label: 'Contact' },
      { id: 'location',  label: 'Location' },
      { id: 'notes',     label: 'Notes' },
      { id: 'checklist', label: 'Checklist' },
      ...photosTab,
    ]
  }
  return [
    { id: 'overview', label: 'Overview' },
    { id: 'contact',  label: 'Contact' },
    { id: 'location', label: 'Location' },
    { id: 'details',   label: 'Details' },
    { id: 'notes',     label: 'Notes' },
    { id: 'checklist', label: 'Checklist' },
    ...photosTab,
  ]
}

// ---- UI helpers ----

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function inputCls(error?: string) {
  return cn(
    'w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 text-sm',
    error ? 'border-red-300 focus:ring-red-400' : 'border-gray-300 focus:ring-rose-400',
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</h3>
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex rounded-md overflow-hidden border border-gray-200 text-xs">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={cn(
            'px-3 py-1 transition-colors',
            value ? 'bg-rose-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50',
          )}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={cn(
            'px-3 py-1 transition-colors border-l border-gray-200',
            !value ? 'bg-rose-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50',
          )}
        >
          No
        </button>
      </div>
    </div>
  )
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            'text-xl leading-none transition-colors',
            value != null && n <= value ? 'text-amber-400' : 'text-gray-200 hover:text-amber-300',
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ---- Shared field section props ----

interface FieldSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any
}

// ---- Venue feature toggles (Overview tab) ----

function VenueFeatureToggles({ control }: FieldSectionProps) {
  return (
    <div className="space-y-0.5 bg-gray-50 rounded-lg p-3">
      <Controller control={control} name="has_parking" render={({ field }) =>
        <ToggleRow label="Parking available" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="catering_included" render={({ field }) =>
        <ToggleRow label="Catering included" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="accommodation_nearby" render={({ field }) =>
        <ToggleRow label="Accommodation nearby" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="is_indoor" render={({ field }) =>
        <ToggleRow label="Indoor space" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="is_outdoor" render={({ field }) =>
        <ToggleRow label="Outdoor space" value={!!field.value} onChange={field.onChange} />
      } />
    </div>
  )
}

// ---- Type-specific Overview fields (key metrics shown at-a-glance) ----

function CatererOverviewFields({ register, errors }: FieldSectionProps) {
  const CUISINES = ['', 'american', 'italian', 'mediterranean', 'asian', 'mexican', 'bbq', 'other']
  const CUISINE_LABELS: Record<string, string> = {
    '': 'Select…', american: 'American', italian: 'Italian', mediterranean: 'Mediterranean',
    asian: 'Asian Fusion', mexican: 'Mexican', bbq: 'BBQ', other: 'Other',
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Price per Head ($)" error={errors.price_per_head?.message as string}>
        <input {...register('price_per_head')} className={inputCls(errors.price_per_head?.message as string)} placeholder="e.g. 95" />
      </Field>
      <Field label="Cuisine Type">
        <select {...register('cuisine_type')} className={inputCls()}>
          {CUISINES.map((c) => <option key={c} value={c}>{CUISINE_LABELS[c]}</option>)}
        </select>
      </Field>
    </div>
  )
}

function CakeOverviewFields({ register, errors }: FieldSectionProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Price per Serving ($)" error={errors.price_per_serving?.message as string}>
        <input {...register('price_per_serving')} className={inputCls(errors.price_per_serving?.message as string)} placeholder="e.g. 12" />
      </Field>
      <Field label="Flavors">
        <input {...register('flavors')} className={inputCls()} placeholder="e.g. Vanilla, Lemon" />
      </Field>
    </div>
  )
}

function FloristOverviewFields({ register, errors }: FieldSectionProps) {
  const STYLES = ['', 'romantic', 'modern', 'wildflower', 'tropical', 'minimalist', 'classic', 'other']
  const STYLE_LABELS: Record<string, string> = {
    '': 'Select…', romantic: 'Romantic', modern: 'Modern', wildflower: 'Wildflower',
    tropical: 'Tropical', minimalist: 'Minimalist', classic: 'Classic', other: 'Other',
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Style">
        <select {...register('style')} className={inputCls()}>
          {STYLES.map((s) => <option key={s} value={s}>{STYLE_LABELS[s]}</option>)}
        </select>
      </Field>
      <Field label="Minimum Order ($)" error={errors.minimum_order?.message as string}>
        <input {...register('minimum_order')} className={inputCls(errors.minimum_order?.message as string)} placeholder="e.g. 500" />
      </Field>
    </div>
  )
}

function EntertainmentOverviewFields({ register }: FieldSectionProps) {
  const TYPES = ['', 'dj', 'band', 'both']
  const TYPE_LABELS: Record<string, string> = { '': 'Select…', dj: 'DJ', band: 'Band', both: 'DJ + Band' }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Type">
        <select {...register('type')} className={inputCls()}>
          {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </Field>
      <Field label="Number of Members">
        <input
          type="number"
          {...register('num_members', { valueAsNumber: true, setValueAs: (v: string) => v === '' || isNaN(Number(v)) ? null : Number(v) })}
          className={inputCls()}
          placeholder="For bands"
        />
      </Field>
    </div>
  )
}

// ---- Type-specific Details tab sections ----

function CatererDetailSection({ control }: FieldSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Dietary Options" />
      <div className="space-y-0.5 bg-gray-50 rounded-lg p-3">
        <Controller control={control} name="has_vegetarian" render={({ field }) =>
          <ToggleRow label="Vegetarian options" value={!!field.value} onChange={field.onChange} />
        } />
        <Controller control={control} name="has_vegan" render={({ field }) =>
          <ToggleRow label="Vegan options" value={!!field.value} onChange={field.onChange} />
        } />
        <Controller control={control} name="has_gluten_free" render={({ field }) =>
          <ToggleRow label="Gluten-free options" value={!!field.value} onChange={field.onChange} />
        } />
      </div>
      <SectionHeader title="Tasting" />
      <div className="space-y-0.5 bg-gray-50 rounded-lg p-3">
        <Controller control={control} name="tasting_scheduled" render={({ field }) =>
          <ToggleRow label="Tasting scheduled" value={!!field.value} onChange={field.onChange} />
        } />
        <Controller control={control} name="tasting_completed" render={({ field }) =>
          <ToggleRow label="Tasting completed" value={!!field.value} onChange={field.onChange} />
        } />
      </div>
    </div>
  )
}

function CakeDetailSection({ control }: FieldSectionProps) {
  return (
    <div className="space-y-0.5 bg-gray-50 rounded-lg p-3">
      <Controller control={control} name="custom_design_available" render={({ field }) =>
        <ToggleRow label="Custom design available" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="tasting_scheduled" render={({ field }) =>
        <ToggleRow label="Tasting scheduled" value={!!field.value} onChange={field.onChange} />
      } />
      <Controller control={control} name="tasting_completed" render={({ field }) =>
        <ToggleRow label="Tasting completed" value={!!field.value} onChange={field.onChange} />
      } />
    </div>
  )
}

function FloristDetailSection({ register }: FieldSectionProps) {
  return (
    <Field label="Arrangement Types">
      <input
        {...register('arrangement_types')}
        className={inputCls()}
        placeholder="e.g. Bouquets, Centerpieces, Ceremony arch"
      />
    </Field>
  )
}

function EntertainmentDetailSection({ register, errors }: FieldSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Performance Duration (hours)" error={errors.performance_duration_hours?.message as string}>
          <input {...register('performance_duration_hours')} className={inputCls()} placeholder="e.g. 4" />
        </Field>
        <Field label="Genres">
          <input {...register('genres')} className={inputCls()} placeholder="e.g. Pop, R&B, Jazz" />
        </Field>
      </div>
      <Field label="Sample / Demo Link" error={errors.sample_link?.message as string}>
        <input {...register('sample_link')} className={inputCls(errors.sample_link?.message as string)} placeholder="https://…" />
      </Field>
      <Field label="Package Details">
        <textarea {...register('package_details')} rows={4} className={inputCls()} placeholder="Describe included services…" />
      </Field>
    </div>
  )
}

// ---- Defaults builder ----

function buildDefaults(vendorType: VendorType, vendor?: AnyVendor | null): FormValues {
  const v = vendor as Record<string, unknown> | null | undefined

  const base = {
    name: vendor?.name ?? '',
    website: vendor?.website ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    is_chosen: vendor?.is_chosen ?? false,
    is_favorite: vendor?.is_favorite ?? false,
    has_talked_to: vendor?.has_talked_to ?? false,
    has_visited: vendor?.has_visited ?? false,
    price_estimate: vendor?.price_estimate ?? '',
    rating: vendor?.rating ?? null,
    address: vendor?.address ?? '',
    latitude: vendor?.latitude ?? '',
    longitude: vendor?.longitude ?? '',
    positives: vendor?.positives ?? '',
    negatives: vendor?.negatives ?? '',
    comments: vendor?.comments ?? '',
    checklist: (v?.checklist as number[]) ?? [],
  }

  if (vendorType === 'venue') {
    return {
      ...base,
      capacity: v?.capacity ?? null,
      style: v?.style ?? '',
      has_parking: v?.has_parking ?? false,
      catering_included: v?.catering_included ?? false,
      accommodation_nearby: v?.accommodation_nearby ?? false,
      is_indoor: v?.is_indoor ?? false,
      is_outdoor: v?.is_outdoor ?? false,
    }
  }
  if (vendorType === 'caterer') {
    return {
      ...base,
      price_per_head: v?.price_per_head ?? '',
      cuisine_type: v?.cuisine_type ?? '',
      has_vegetarian: v?.has_vegetarian ?? false,
      has_vegan: v?.has_vegan ?? false,
      has_gluten_free: v?.has_gluten_free ?? false,
      tasting_scheduled: v?.tasting_scheduled ?? false,
      tasting_completed: v?.tasting_completed ?? false,
    }
  }
  if (vendorType === 'cake') {
    return {
      ...base,
      price_per_serving: v?.price_per_serving ?? '',
      flavors: v?.flavors ?? '',
      custom_design_available: v?.custom_design_available ?? false,
      tasting_scheduled: v?.tasting_scheduled ?? false,
      tasting_completed: v?.tasting_completed ?? false,
    }
  }
  if (vendorType === 'florist') {
    return {
      ...base,
      arrangement_types: v?.arrangement_types ?? '',
      style: v?.style ?? '',
      minimum_order: v?.minimum_order ?? '',
    }
  }
  // entertainment
  return {
    ...base,
    type: v?.type ?? '',
    num_members: v?.num_members ?? null,
    genres: v?.genres ?? '',
    package_details: v?.package_details ?? '',
    sample_link: v?.sample_link ?? '',
    performance_duration_hours: v?.performance_duration_hours ?? '',
  }
}

// ---- Main form component ----

interface Props {
  vendorType: VendorType
  vendor?: AnyVendor | null
  onSubmit: (data: Partial<AnyVendor>) => void
  onDelete?: () => void
  isPending: boolean
}

export function VendorForm({ vendorType, vendor, onSubmit, onDelete, isPending }: Props) {
  const isVenue = vendorType === 'venue'
  const [activeTab, setActiveTab] = useState<FormTab>('overview')

  // Reset to overview when switching vendors or vendor types
  useEffect(() => {
    setActiveTab('overview')
  }, [vendor?.id, vendorType])

  const tabs = getTabsForType(vendorType, !!vendor)

  const schema = SCHEMA_MAP[vendorType]
  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(vendorType, vendor),
  })

  useEffect(() => {
    reset(buildDefaults(vendorType, vendor))
  }, [vendor, vendorType, reset])

  const checklistValue = (watch('checklist') ?? []) as number[]

  const lat = vendor?.latitude ? parseFloat(String(vendor.latitude)) : null
  const lng = vendor?.longitude ? parseFloat(String(vendor.longitude)) : null
  const hasLocation = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)

  function tabHidden(tab: FormTab): boolean {
    return activeTab !== tab
  }

  function submit(values: FormValues) {
    const clean: Record<string, unknown> = { ...values }
    const moneyFields = ['price_estimate', 'price_per_head', 'price_per_serving', 'minimum_order']
    moneyFields.forEach((f) => {
      if (clean[f] === '') clean[f] = null
    })
    onSubmit(clean as Partial<AnyVendor>)
  }

  const fieldProps = { register, control, errors }

  const VENUE_STYLES = ['', 'rustic', 'modern', 'garden', 'ballroom', 'barn', 'industrial', 'other']
  const VENUE_STYLE_LABELS: Record<string, string> = {
    '': 'Select…', rustic: 'Rustic', modern: 'Modern', garden: 'Garden',
    ballroom: 'Ballroom', barn: 'Barn', industrial: 'Industrial', other: 'Other',
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">

      {/* ---- Tab bar ---- */}
      <div className="flex border-b border-gray-200 -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              activeTab === tab.id
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-gray-400 hover:text-gray-600',
            )}
          >
            {tab.label}
            {tab.id === 'checklist' && checklistValue.length > 0 && (
              <span className="ml-1.5 text-xs bg-rose-100 text-rose-500 rounded-full px-1.5 py-0.5 font-normal">
                {checklistValue.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ====================================================
          OVERVIEW TAB
          ==================================================== */}
      <div className={cn('space-y-4', tabHidden('overview') && 'hidden')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Name *" error={errors.name?.message as string}>
            <input
              {...register('name')}
              className={inputCls(errors.name?.message as string)}
              placeholder="Name"
            />
          </Field>
          <Field label="Price Estimate ($)" error={errors.price_estimate?.message as string}>
            <input
              {...register('price_estimate')}
              className={inputCls(errors.price_estimate?.message as string)}
              placeholder="e.g. 8000"
            />
          </Field>
        </div>

        {/* Type-specific key metrics */}
        {isVenue && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Style" error={errors.style?.message as string}>
              <select {...register('style')} className={inputCls()}>
                {VENUE_STYLES.map((s) => <option key={s} value={s}>{VENUE_STYLE_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field label="Capacity (guests)" error={errors.capacity?.message as string}>
              <input
                type="number"
                {...register('capacity', {
                  valueAsNumber: true,
                  setValueAs: (v: string) => v === '' || isNaN(Number(v)) ? null : Number(v),
                })}
                className={inputCls()}
                placeholder="e.g. 200"
              />
            </Field>
          </div>
        )}
        {vendorType === 'caterer'      && <CatererOverviewFields {...fieldProps} />}
        {vendorType === 'cake'         && <CakeOverviewFields {...fieldProps} />}
        {vendorType === 'florist'      && <FloristOverviewFields {...fieldProps} />}
        {vendorType === 'entertainment' && <EntertainmentOverviewFields {...fieldProps} />}

        <SectionHeader title="Rating" />
        <Controller control={control} name="rating" render={({ field }) => (
          <RatingPicker value={field.value as number | null} onChange={field.onChange} />
        )} />

        <SectionHeader title="Status" />
        <div className="space-y-0.5 bg-gray-50 rounded-lg p-3">
          <Controller control={control} name="is_chosen" render={({ field }) =>
            <ToggleRow label="Selected / Chosen" value={!!field.value} onChange={field.onChange} />
          } />
          <Controller control={control} name="is_favorite" render={({ field }) =>
            <ToggleRow label="Favourite" value={!!field.value} onChange={field.onChange} />
          } />
          <Controller control={control} name="has_talked_to" render={({ field }) =>
            <ToggleRow label="Have talked to" value={!!field.value} onChange={field.onChange} />
          } />
          <Controller control={control} name="has_visited" render={({ field }) =>
            <ToggleRow label="Have visited" value={!!field.value} onChange={field.onChange} />
          } />
        </div>

        {/* Venue: feature toggles on overview */}
        {isVenue && (
          <>
            <SectionHeader title="Features" />
            <VenueFeatureToggles {...fieldProps} />
          </>
        )}
      </div>

      {/* ====================================================
          CONTACT TAB
          ==================================================== */}
      <div className={cn('space-y-4', tabHidden('contact') && 'hidden')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Website" error={errors.website?.message as string}>
            <input {...register('website')} className={inputCls(errors.website?.message as string)} placeholder="https://…" />
          </Field>
          <Field label="Phone" error={errors.phone?.message as string}>
            <input {...register('phone')} className={inputCls()} placeholder="(555) 000-0000" />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message as string}>
          <input {...register('email')} className={inputCls(errors.email?.message as string)} placeholder="contact@example.com" />
        </Field>
      </div>

      {/* ====================================================
          LOCATION TAB
          ==================================================== */}
      <div className={cn('space-y-4', tabHidden('location') && 'hidden')}>
        <Field label="Address" error={errors.address?.message as string}>
          <input {...register('address')} className={inputCls()} placeholder="Street, City, State ZIP" />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Latitude" error={errors.latitude?.message as string}>
            <input {...register('latitude')} className={inputCls()} placeholder="e.g. 40.7128" />
          </Field>
          <Field label="Longitude" error={errors.longitude?.message as string}>
            <input {...register('longitude')} className={inputCls()} placeholder="e.g. -74.0060" />
          </Field>
        </div>
        {hasLocation
          ? <LocationMap lat={lat!} lng={lng!} />
          : <p className="text-xs text-gray-400 italic">Enter coordinates above and save to see the map.</p>
        }
      </div>

      {/* ====================================================
          DETAILS TAB  (non-venue: type-specific toggles/fields)
          ==================================================== */}
      {!isVenue && (
        <div className={cn('space-y-4', tabHidden('details') && 'hidden')}>
          {vendorType === 'caterer'       && <CatererDetailSection {...fieldProps} />}
          {vendorType === 'cake'          && <CakeDetailSection {...fieldProps} />}
          {vendorType === 'florist'       && <FloristDetailSection {...fieldProps} />}
          {vendorType === 'entertainment' && <EntertainmentDetailSection {...fieldProps} />}
        </div>
      )}

      {/* ====================================================
          NOTES TAB
          ==================================================== */}
      <div className={cn('space-y-4', tabHidden('notes') && 'hidden')}>
        <Field label="Positives" error={undefined}>
          <textarea
            {...register('positives')}
            rows={4}
            className={inputCls()}
            placeholder="What you like…"
          />
        </Field>
        <Field label="Negatives" error={undefined}>
          <textarea
            {...register('negatives')}
            rows={4}
            className={inputCls()}
            placeholder="Concerns or drawbacks…"
          />
        </Field>
        <Field label="Comments" error={undefined}>
          <textarea
            {...register('comments')}
            rows={4}
            className={inputCls()}
            placeholder="Other notes…"
          />
        </Field>
      </div>

      {/* ====================================================
          CHECKLIST TAB  (all vendor types)
          ==================================================== */}
      <div className={cn(tabHidden('checklist') && 'hidden')}>
        <Controller
          control={control}
          name="checklist"
          render={({ field }) => (
            <VendorChecklist
              vendorType={vendorType}
              checked={(field.value as number[]) ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* ====================================================
          PHOTOS TAB  (edit mode only, all vendor types)
          ==================================================== */}
      {vendor && (
        <div className={cn(tabHidden('photos') && 'hidden')}>
          <PhotoUpload
            vendorId={vendor.id}
            vendorType={vendorType}
            photos={(vendor as VenueVendor).photos}
          />
        </div>
      )}

      {/* ---- Actions ---- */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Delete
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 text-sm bg-rose-600 text-white font-medium rounded-md hover:bg-rose-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving…' : vendor ? 'Save Changes' : 'Add'}
        </button>
      </div>
    </form>
  )
}
