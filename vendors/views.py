from django.contrib.auth.decorators import login_required
from django.shortcuts import render

VENDOR_LABELS = {
    'venue': 'Venue',
    'caterer': 'Caterers',
    'cake': 'Cake & Bakery',
    'florist': 'Florists',
    'entertainment': 'Entertainment',
}


def _vendor_page(vendor_type):
    @login_required
    def view(request):
        return render(request, f'vendors/{vendor_type}.html', {
            'vendor_type': vendor_type,
            'vendor_label': VENDOR_LABELS[vendor_type],
        })
    view.__name__ = f'{vendor_type}_page'
    return view


venue_page = _vendor_page('venue')
caterer_page = _vendor_page('caterer')
cake_page = _vendor_page('cake')
florist_page = _vendor_page('florist')
entertainment_page = _vendor_page('entertainment')
