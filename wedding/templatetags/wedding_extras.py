import markdown as _md
from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def markdownify(value):
    """Render markdown text as safe HTML. Supports bullets, links, bold, italic."""
    if not value:
        return ''
    html = _md.markdown(
        value,
        extensions=['nl2br', 'sane_lists'],
    )
    return mark_safe(html)
