# Wedding color themes.
# To add a new theme: add an entry to THEMES and it will automatically appear
# as a choice in the admin panel.
#
# Each theme defines:
#   accent       — primary color (links, highlights, buttons)
#   accent_hover — darker shade for hover states
#   accent_light — very light tint (backgrounds, badges)

THEMES = {
    'rose':  {'accent': '#e11d48', 'accent_hover': '#9f1239', 'accent_light': '#fce7f3'},
    'blush': {'accent': '#c084a0', 'accent_hover': '#9d4f78', 'accent_light': '#fdf4ff'},
    'sage':  {'accent': '#4d7c4f', 'accent_hover': '#2d5a2e', 'accent_light': '#f0fdf4'},
    'navy':  {'accent': '#1e3a5f', 'accent_hover': '#0f1f38', 'accent_light': '#eff6ff'},
    'gold':  {'accent': '#b45309', 'accent_hover': '#78350f', 'accent_light': '#fffbeb'},
    'slate': {'accent': '#475569', 'accent_hover': '#1e293b', 'accent_light': '#f8fafc'},
    'mauve': {'accent': '#7c3f6e', 'accent_hover': '#4a1942', 'accent_light': '#fdf2f8'},
    'terra': {'accent': '#c2714f', 'accent_hover': '#8c4a30', 'accent_light': '#fff7ed'},
}

THEME_CHOICES = [(k, k.title()) for k in THEMES.keys()]


def get_theme(name):
    return THEMES.get(name, THEMES['rose'])
