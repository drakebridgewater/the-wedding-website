import { Node, mergeAttributes } from '@tiptap/core'

/**
 * Friendly names for the {{merge_tokens}} the backend resolves at send time
 * (guests/invitation.py render_template()). The editor shows these labels as
 * pills; the stored HTML keeps the raw tokens.
 */
export const MERGE_TAGS: { tag: string; label: string; tip: string }[] = [
  { tag: 'party_name', label: 'Family name', tip: 'e.g. "The Smith Family"' },
  { tag: 'first_name', label: 'First name', tip: "The first guest's first name" },
  { tag: 'rsvp_link', label: 'RSVP link', tip: 'Full link to their invitation' },
  { tag: 'details_link', label: 'Details form link', tip: 'Link where the party can update names, emails, phones & address' },
  { tag: 'couple', label: "Couple's names", tip: 'From the site settings' },
  { tag: 'date', label: 'Wedding date', tip: 'From the site settings' },
  { tag: 'location', label: 'Location', tip: 'From the site settings' },
  { tag: 'site_url', label: 'Website link', tip: 'The wedding website address' },
]

const LABEL_BY_TAG = Object.fromEntries(MERGE_TAGS.map((t) => [t.tag, t.label]))
const KNOWN_TAGS = MERGE_TAGS.map((t) => t.tag).join('|')

/** Stored HTML → editor HTML: raw {{tokens}} become pill placeholder spans. */
export function tokensToPills(html: string): string {
  return html.replace(
    new RegExp(`\\{\\{(${KNOWN_TAGS})\\}\\}`, 'g'),
    (_, tag) => `<span data-merge-tag="${tag}"></span>`,
  )
}

/** Editor HTML → stored HTML: pill spans collapse back to raw {{tokens}}. */
export function pillsToTokens(html: string): string {
  return html.replace(
    /<span[^>]*data-merge-tag="(\w+)"[^>]*>.*?<\/span>/g,
    (_, tag) => `{{${tag}}}`,
  )
}

/** Inline atom node that renders a merge token as a labeled pill. */
export const MergeTag = Node.create({
  name: 'mergeTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    // rendered via data-merge-tag below; suppress the default `tag=` attribute
    return { tag: { default: '', renderHTML: () => ({}) } }
  },

  parseHTML() {
    return [{
      tag: 'span[data-merge-tag]',
      getAttrs: (el) => ({ tag: (el as HTMLElement).getAttribute('data-merge-tag') }),
    }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const tag = node.attrs.tag as string
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-merge-tag': tag,
        class: 'inline-block align-baseline rounded-md bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[0.8em] font-medium leading-tight select-none',
      }),
      LABEL_BY_TAG[tag] ?? tag,
    ]
  },
})
