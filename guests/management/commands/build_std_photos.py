"""Generate the resized Save-the-Date card photos.

The card's photo strips and lightbox must not ship the multi-MB camera
originals (kept in photo_masters/, outside the static tree so collectstatic
and the Docker image never pick them up), so each photo in
SAVE_THE_DATE_CARD_STRIPS gets two derivatives under
static/bigday/images/std/:

  thumb/<name>.jpg — small, loads first, shown in the printed strips
  full/<name>.jpg  — mid-size, preloaded in the background for the lightbox

Re-run after adding or swapping photos in SAVE_THE_DATE_CARD_STRIPS, then
commit the generated files (prod collectstatic ships whatever is committed).
"""
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from PIL import Image, ImageOps

from guests.views import SAVE_THE_DATE_CARD_STRIPS

VARIANTS = {
    # long edge px, JPEG quality. Thumb covers the ~220px strip frame at 3x
    # DPR; full covers the ~720px lightbox at 2x and modest zooming.
    'thumb': (800, 78),
    'full': (1600, 82),
}


class Command(BaseCommand):
    help = 'Resize the Save-the-Date card photos into thumb/full derivatives.'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true',
                            help='Regenerate even if the derivative is newer than the source.')

    def handle(self, *args, **options):
        masters_dir = settings.BASE_DIR / 'photo_masters'
        out_dir = settings.BASE_DIR / 'static' / 'bigday' / 'images' / 'std'
        sources = dict.fromkeys(p for strip in SAVE_THE_DATE_CARD_STRIPS for p in strip)
        made = skipped = 0
        for filename in sources:
            src = masters_dir / filename
            if not src.exists():
                raise CommandError(f'{filename} is in SAVE_THE_DATE_CARD_STRIPS but not in photo_masters/')
            base = os.path.splitext(filename)[0]
            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                for variant, (long_edge, quality) in VARIANTS.items():
                    dest = out_dir / variant / f'{base}.jpg'
                    if not options['force'] and dest.exists() and dest.stat().st_mtime >= src.stat().st_mtime:
                        skipped += 1
                        continue
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    scale = long_edge / max(im.size)
                    resized = im.resize(
                        (round(im.width * scale), round(im.height * scale)),
                        Image.LANCZOS,
                    ) if scale < 1 else im
                    resized.save(dest, 'JPEG', quality=quality, optimize=True, progressive=True)
                    made += 1
                    self.stdout.write(f'{dest.relative_to(settings.BASE_DIR)}: '
                                      f'{dest.stat().st_size // 1024} KB')
        self.stdout.write(self.style.SUCCESS(f'{made} generated, {skipped} up to date'))
