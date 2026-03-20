from django.db import migrations

# (vendor_type, category, text, question)
CATERER_ITEMS = [
    # Booking & Contract
    ('caterer', 'Booking & Contract', 'Deposit & payment schedule',
     'What is the deposit amount, and when are the remaining payments due?'),
    ('caterer', 'Booking & Contract', 'Cancellation policy',
     'What happens to payments if we cancel? What is their policy if they cancel?'),
    ('caterer', 'Booking & Contract', 'Final headcount deadline',
     'How far in advance must the final guest count be confirmed?'),
    ('caterer', 'Booking & Contract', 'Force majeure / backup clause',
     'What happens if an emergency prevents them from serving on the day?'),

    # Pricing Gotchas
    ('caterer', 'Pricing Gotchas', 'Service charge & gratuity',
     'Are service charge and gratuity included in the quote, or added on top?'),
    ('caterer', 'Pricing Gotchas', 'Vendor & staff meals',
     'Do you require meals for your staff, and at what cost?'),
    ('caterer', 'Pricing Gotchas', 'Cake cutting fee',
     'Do you charge a cake cutting fee if we bring an outside cake?'),
    ('caterer', 'Pricing Gotchas', 'Rental items',
     'Are linens, serving equipment, and tableware included or rented separately?'),
    ('caterer', 'Pricing Gotchas', 'Bar service scope',
     'Do you provide bar staffing and alcohol, or is that separate?'),
    ('caterer', 'Pricing Gotchas', 'Minimum guest count',
     'Is there a minimum guest count or food & beverage minimum?'),

    # Menu & Food
    ('caterer', 'Menu & Food', 'Dietary accommodations',
     'Can you accommodate vegetarian, vegan, gluten-free, and common allergies?'),
    ('caterer', 'Menu & Food', 'Custom menu options',
     'Can we customize the menu, and is there an additional charge for custom items?'),
    ('caterer', 'Menu & Food', 'Tasting included',
     'Do you offer a tasting before we sign? Is it included in the price?'),
    ('caterer', 'Menu & Food', 'Ingredient sourcing',
     'Where do you source ingredients? Do you use seasonal or local produce?'),

    # Staffing & Day-of
    ('caterer', 'Staffing & Day-of', 'Staffing ratio',
     'How many servers and bartenders will be on site for our guest count?'),
    ('caterer', 'Staffing & Day-of', 'Day-of coordinator',
     'Will you provide a catering coordinator on the day, and who is our main contact?'),
    ('caterer', 'Staffing & Day-of', 'Setup & cleanup timeline',
     'When do you arrive for setup, and what is your cleanup timeline?'),
    ('caterer', 'Staffing & Day-of', 'Kitchen requirements',
     'What kitchen facilities and equipment do you need at the venue?'),
]

CAKE_ITEMS = [
    # Design & Flavors
    ('cake', 'Design & Flavors', 'Portfolio review',
     'Can we see photos of custom cakes at a similar style and price point?'),
    ('cake', 'Design & Flavors', 'Design replication',
     'Can you replicate a specific design from a photo? Are there any limitations?'),
    ('cake', 'Design & Flavors', 'Flavor combinations',
     'Can different tiers be different flavors? What is the full flavor menu?'),
    ('cake', 'Design & Flavors', 'Filling & frosting options',
     'What fillings and frosting types (buttercream, fondant, ganache) do you offer?'),

    # Tasting
    ('cake', 'Tasting', 'Tasting appointment',
     'Do you offer a tasting before we book? How many flavors can we try?'),
    ('cake', 'Tasting', 'Tasting cost',
     'Is the tasting included in the price, or is there an additional fee?'),

    # Pricing & Logistics
    ('cake', 'Pricing & Logistics', 'Delivery & setup included',
     'Is delivery, setup, and display at the venue included in the price?'),
    ('cake', 'Pricing & Logistics', 'Venue coordination',
     'Will you coordinate with the venue on setup time and refrigeration requirements?'),
    ('cake', 'Pricing & Logistics', 'Serving size guarantee',
     'How do you calculate servings for our guest count? Is there a cutting guide?'),
    ('cake', 'Pricing & Logistics', 'Lead time for design confirmation',
     'How far in advance must the final design and flavor selections be confirmed?'),
    ('cake', 'Pricing & Logistics', 'Backup plan',
     'What is the plan if there is a problem with the cake on the wedding day?'),
    ('cake', 'Pricing & Logistics', 'Anniversary tier preservation',
     'Do you offer advice or packaging for preserving the top tier for our first anniversary?'),

    # Booking
    ('cake', 'Booking', 'Deposit & payment schedule',
     'What deposit is required to hold our date, and when is the balance due?'),
    ('cake', 'Booking', 'Cancellation policy',
     'What is the refund policy if we cancel, or if you are unable to deliver?'),
    ('cake', 'Booking', 'Exclusive date booking',
     'How many cakes do you make per weekend? Will you be stretched thin on our date?'),
]

FLORIST_ITEMS = [
    # Design & Vision
    ('florist', 'Design & Vision', 'Portfolio review',
     'Can we see photos of past weddings in a similar style and at a similar budget?'),
    ('florist', 'Design & Vision', 'Mood board interpretation',
     'How do you work with a mood board? Can you source specific flowers or alternatives?'),
    ('florist', 'Design & Vision', 'Seasonal flower availability',
     'Which flowers in our vision are in season on our date? What are the best substitutes?'),
    ('florist', 'Design & Vision', 'Mock-up / trial arrangement',
     'Do you create a sample centerpiece or bouquet before the wedding for approval?'),
    ('florist', 'Design & Vision', 'Site visit',
     'Will you do a site visit at our venue to plan installations and scale?'),

    # Pricing & Scope
    ('florist', 'Pricing & Scope', 'Itemized quote',
     'Can we get a written itemized quote for every arrangement and floral piece?'),
    ('florist', 'Pricing & Scope', 'Rental items',
     'Are vases, arches, and installation hardware included, rented, or charged separately?'),
    ('florist', 'Pricing & Scope', 'Minimum order',
     'Do you have a minimum order requirement, and does our budget meet it?'),
    ('florist', 'Pricing & Scope', 'Substitution policy',
     'If a specific flower is unavailable or over budget, how do you handle substitutions?'),

    # Logistics
    ('florist', 'Logistics', 'Setup arrival time',
     'When do you arrive for setup, and how long does the full installation take?'),
    ('florist', 'Logistics', 'Breakdown & rental collection',
     'Do you return at the end of the evening to collect rentals and break down arrangements?'),
    ('florist', 'Logistics', 'Venue restrictions',
     'Are you familiar with this venue\'s flower, candle, and installation policies?'),
    ('florist', 'Logistics', 'Multiple locations',
     'If ceremony and reception are at different venues, how do you handle the transition?'),

    # Booking
    ('florist', 'Booking', 'Deposit & payment schedule',
     'What deposit is required to hold our date, and when is the balance due?'),
    ('florist', 'Booking', 'Cancellation policy',
     'What is the refund policy if we cancel, and what happens if you need to cancel?'),
    ('florist', 'Booking', 'Exclusive booking per day',
     'How many weddings do you take on per day? Will you be present on our day?'),
]

ENTERTAINMENT_ITEMS = [
    # Music & Performance
    ('entertainment', 'Music & Performance', 'Song library & requests',
     'How large is your song library? Do you take song requests in advance and on the night?'),
    ('entertainment', 'Music & Performance', 'Do-not-play list',
     'Can we provide a list of songs we absolutely do not want played?'),
    ('entertainment', 'Music & Performance', 'MC responsibilities',
     'Will you serve as MC for introductions and announcements? What is your style — formal or casual?'),
    ('entertainment', 'Music & Performance', 'First dance & special songs',
     'Can you source or learn a specific song if it is not in your library?'),
    ('entertainment', 'Music & Performance', 'Continuous music during breaks',
     'Is there a gap in music during your breaks? How do you handle transitions?'),
    ('entertainment', 'Music & Performance', 'Reading the crowd',
     'How do you adapt your set if guests are not dancing or energy is low?'),

    # Equipment
    ('entertainment', 'Equipment', 'Equipment provided',
     'Do you bring your own PA system, lighting, and cables? What does the setup look like?'),
    ('entertainment', 'Equipment', 'Backup equipment',
     'What is your backup plan if a piece of equipment fails during the reception?'),
    ('entertainment', 'Equipment', 'Venue power & space requirements',
     'What power access, floor space, and sound system specifications do you need from the venue?'),
    ('entertainment', 'Equipment', 'Noise restrictions',
     'Are you familiar with the venue\'s noise curfew and amplified music cutoff?'),

    # Booking & Logistics
    ('entertainment', 'Booking & Logistics', 'Exclusive booking',
     'Do you perform at multiple events on the same day?'),
    ('entertainment', 'Booking & Logistics', 'Setup & soundcheck time',
     'When do you arrive, and how long does your setup and soundcheck take?'),
    ('entertainment', 'Booking & Logistics', 'Vendor meal required',
     'Do you require a meal during the event, and is that cost included or extra?'),
    ('entertainment', 'Booking & Logistics', 'Cancellation policy',
     'What is the refund policy if we cancel? What if a band member is sick or you cannot perform?'),
    ('entertainment', 'Booking & Logistics', 'Deposit & payment schedule',
     'What deposit is required to hold our date, and when is the balance due?'),
    ('entertainment', 'Booking & Logistics', 'Overtime rate',
     'What is the cost per hour if you play past the contracted end time?'),
]


def seed_items(apps, schema_editor):
    VendorChecklistItem = apps.get_model('vendors', 'VendorChecklistItem')
    all_items = CATERER_ITEMS + CAKE_ITEMS + FLORIST_ITEMS + ENTERTAINMENT_ITEMS
    VendorChecklistItem.objects.bulk_create([
        VendorChecklistItem(
            vendor_type=vendor_type,
            category=category,
            text=text,
            question=question,
            order=i,
        )
        for i, (vendor_type, category, text, question) in enumerate(all_items)
    ])


def unseed_items(apps, schema_editor):
    VendorChecklistItem = apps.get_model('vendors', 'VendorChecklistItem')
    VendorChecklistItem.objects.exclude(vendor_type='venue').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0004_vendor_checklist_refactor'),
    ]

    operations = [
        migrations.RunPython(seed_items, unseed_items),
    ]
