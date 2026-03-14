import datetime

from django.test import TestCase

from planning.models import WeddingPartyMember, ScheduleDay, ScheduleEvent


class WeddingPartyMemberModelTest(TestCase):

    def setUp(self):
        self.bride = WeddingPartyMember.objects.create(
            name='Alice', role='bride', color='#ff69b4', order=1,
        )
        self.groom = WeddingPartyMember.objects.create(
            name='Bob', role='groom', color='#4169e1', order=2,
        )

    def test_str(self):
        self.assertEqual(str(self.bride), 'Alice (Bride)')
        self.assertEqual(str(self.groom), 'Bob (Groom)')

    def test_ordering_by_order_then_name(self):
        # Lower order value comes first
        members = list(WeddingPartyMember.objects.all())
        self.assertEqual(members[0], self.bride)
        self.assertEqual(members[1], self.groom)

    def test_ordering_name_tiebreak(self):
        WeddingPartyMember.objects.all().update(order=0)
        anna = WeddingPartyMember.objects.create(name='Anna', role='bridesmaid', order=0)
        names = list(WeddingPartyMember.objects.values_list('name', flat=True))
        self.assertEqual(names[0], 'Alice')
        self.assertEqual(names[1], 'Anna')
        anna.delete()

    def test_default_color(self):
        m = WeddingPartyMember.objects.create(name='Zara', role='bridesmaid', order=10)
        self.assertEqual(m.color, '#6366f1')

    def test_role_choices(self):
        roles = [r[0] for r in WeddingPartyMember.ROLES]
        self.assertIn('bride', roles)
        self.assertIn('groom', roles)
        self.assertIn('maid_of_honor', roles)
        self.assertIn('best_man', roles)
        self.assertIn('bridesmaid', roles)
        self.assertIn('groomsman', roles)
        self.assertIn('other', roles)


class ScheduleDayModelTest(TestCase):

    def setUp(self):
        self.day = ScheduleDay.objects.create(
            date=datetime.date(2025, 9, 13),
            label='Wedding Day',
            order=1,
        )

    def test_str(self):
        self.assertEqual(str(self.day), 'Wedding Day')

    def test_ordering_by_order_then_date(self):
        rehearsal = ScheduleDay.objects.create(
            date=datetime.date(2025, 9, 12),
            label='Rehearsal Dinner',
            order=0,
        )
        days = list(ScheduleDay.objects.all())
        self.assertEqual(days[0], rehearsal)
        self.assertEqual(days[1], self.day)


class ScheduleEventModelTest(TestCase):

    def setUp(self):
        self.day = ScheduleDay.objects.create(
            date=datetime.date(2025, 9, 13),
            label='Wedding Day',
            order=0,
        )
        self.member = WeddingPartyMember.objects.create(
            name='Alice', role='bride', order=0,
        )
        self.event = ScheduleEvent.objects.create(
            day=self.day,
            start_time=datetime.time(9, 0),
            duration_minutes=60,
            name='Hair & Makeup',
            location='Bridal Suite',
            category='getting_ready',
        )
        self.event.attendees.add(self.member)

    def test_str(self):
        self.assertIn('Wedding Day', str(self.event))
        self.assertIn('09:00', str(self.event))
        self.assertIn('Hair & Makeup', str(self.event))

    def test_ordering_by_start_time(self):
        later = ScheduleEvent.objects.create(
            day=self.day,
            start_time=datetime.time(11, 0),
            duration_minutes=30,
            name='Photos',
            category='photos',
        )
        earlier = ScheduleEvent.objects.create(
            day=self.day,
            start_time=datetime.time(7, 0),
            duration_minutes=30,
            name='Breakfast',
            category='meal',
        )
        events = list(self.day.events.all())
        self.assertEqual(events[0], earlier)
        self.assertEqual(events[1], self.event)
        self.assertEqual(events[2], later)

    def test_attendees_m2m(self):
        self.assertIn(self.member, self.event.attendees.all())
        self.assertEqual(self.event.attendees.count(), 1)

    def test_cascade_delete_day_removes_events(self):
        event_id = self.event.pk
        self.day.delete()
        self.assertFalse(ScheduleEvent.objects.filter(pk=event_id).exists())

    def test_remove_attendee_does_not_delete_event(self):
        self.event.attendees.remove(self.member)
        self.assertEqual(self.event.attendees.count(), 0)
        self.assertTrue(ScheduleEvent.objects.filter(pk=self.event.pk).exists())

    def test_delete_member_removes_from_event_attendees(self):
        self.member.delete()
        self.assertEqual(self.event.attendees.count(), 0)
        # Event itself must still exist
        self.assertTrue(ScheduleEvent.objects.filter(pk=self.event.pk).exists())

    def test_optional_fields_default_to_blank(self):
        event = ScheduleEvent.objects.create(
            day=self.day,
            start_time=datetime.time(14, 0),
            duration_minutes=30,
            name='Minimal Event',
            category='other',
        )
        self.assertEqual(event.location, '')
        self.assertEqual(event.notes, '')
