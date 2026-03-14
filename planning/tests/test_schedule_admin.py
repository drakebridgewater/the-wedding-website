"""
Admin tests for the day-of schedule models.

Note: Django 4.2 is incompatible with Python 3.14's updated copy.copy() protocol
when applied to template contexts (django/template/context.py __copy__).
Tests that render HTML admin pages are skipped on Python 3.14+.
Registry and configuration tests run on all Python versions.
"""
import datetime
import sys

from django.contrib import admin
from django.test import TestCase
from unittest import skipIf

from planning.admin import (
    WeddingPartyMemberAdmin,
    ScheduleDayAdmin,
    ScheduleEventAdmin,
    ScheduleEventInline,
)
from planning.models import WeddingPartyMember, ScheduleDay, ScheduleEvent

PY314_COMPAT_ISSUE = sys.version_info >= (3, 14)


class AdminRegistrationTest(TestCase):
    """Verify all schedule models are registered in the Django admin."""

    def test_wedding_party_member_registered(self):
        self.assertIn(WeddingPartyMember, admin.site._registry)

    def test_schedule_day_registered(self):
        self.assertIn(ScheduleDay, admin.site._registry)

    def test_schedule_event_registered(self):
        self.assertIn(ScheduleEvent, admin.site._registry)

    def test_wedding_party_member_uses_correct_admin_class(self):
        self.assertIsInstance(admin.site._registry[WeddingPartyMember], WeddingPartyMemberAdmin)

    def test_schedule_day_uses_correct_admin_class(self):
        self.assertIsInstance(admin.site._registry[ScheduleDay], ScheduleDayAdmin)

    def test_schedule_event_uses_correct_admin_class(self):
        self.assertIsInstance(admin.site._registry[ScheduleEvent], ScheduleEventAdmin)


class AdminConfigurationTest(TestCase):
    """Verify admin class configuration without rendering HTML."""

    def test_member_list_display(self):
        ma = admin.site._registry[WeddingPartyMember]
        self.assertIn('name', ma.list_display)
        self.assertIn('role', ma.list_display)
        self.assertIn('color', ma.list_display)
        self.assertIn('order', ma.list_display)

    def test_member_list_editable_order(self):
        ma = admin.site._registry[WeddingPartyMember]
        self.assertIn('order', ma.list_editable)

    def test_member_list_filter_role(self):
        ma = admin.site._registry[WeddingPartyMember]
        self.assertIn('role', ma.list_filter)

    def test_day_list_display(self):
        ma = admin.site._registry[ScheduleDay]
        self.assertIn('label', ma.list_display)
        self.assertIn('date', ma.list_display)
        self.assertIn('order', ma.list_display)

    def test_day_has_event_inline(self):
        ma = admin.site._registry[ScheduleDay]
        self.assertIn(ScheduleEventInline, ma.inlines)

    def test_event_list_display(self):
        ma = admin.site._registry[ScheduleEvent]
        self.assertIn('name', ma.list_display)
        self.assertIn('day', ma.list_display)
        self.assertIn('start_time', ma.list_display)
        self.assertIn('category', ma.list_display)

    def test_event_list_filter(self):
        ma = admin.site._registry[ScheduleEvent]
        self.assertIn('day', ma.list_filter)
        self.assertIn('category', ma.list_filter)

    def test_event_filter_horizontal_attendees(self):
        ma = admin.site._registry[ScheduleEvent]
        self.assertIn('attendees', ma.filter_horizontal)


class AdminQuerysetTest(TestCase):
    """Test model-level operations exercised by admin views."""

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
            name='Ceremony',
            category='ceremony',
        )
        self.event.attendees.add(self.member)

    def test_member_queryset_ordered(self):
        WeddingPartyMember.objects.create(name='Zara', role='groomsman', order=99)
        members = list(WeddingPartyMember.objects.all())
        self.assertEqual(members[0].name, 'Alice')

    def test_event_inline_model(self):
        self.assertEqual(ScheduleEventInline.model, ScheduleEvent)

    def test_admin_can_filter_events_by_day(self):
        day2 = ScheduleDay.objects.create(
            date=datetime.date(2025, 9, 14), label='Day 2', order=1,
        )
        ScheduleEvent.objects.create(
            day=day2, start_time=datetime.time(10, 0),
            duration_minutes=30, name='Brunch', category='meal',
        )
        self.assertEqual(ScheduleEvent.objects.filter(day=self.day).count(), 1)
        self.assertEqual(ScheduleEvent.objects.filter(day=day2).count(), 1)

    def test_admin_can_filter_events_by_category(self):
        ScheduleEvent.objects.create(
            day=self.day, start_time=datetime.time(14, 0),
            duration_minutes=60, name='Reception', category='reception',
        )
        self.assertEqual(ScheduleEvent.objects.filter(category='ceremony').count(), 1)
        self.assertEqual(ScheduleEvent.objects.filter(category='reception').count(), 1)

    def test_member_create_and_retrieve(self):
        bob = WeddingPartyMember.objects.create(name='Bob', role='groom', order=1)
        self.assertEqual(WeddingPartyMember.objects.get(pk=bob.pk).name, 'Bob')

    def test_member_update(self):
        self.member.color = '#abcdef'
        self.member.save()
        self.assertEqual(WeddingPartyMember.objects.get(pk=self.member.pk).color, '#abcdef')

    def test_member_delete(self):
        extra = WeddingPartyMember.objects.create(name='Temp', role='other', order=99)
        extra.delete()
        self.assertFalse(WeddingPartyMember.objects.filter(pk=extra.pk).exists())


@skipIf(PY314_COMPAT_ISSUE, 'Django 4.2 template context copy is broken on Python 3.14+')
class AdminHTMLRenderTest(TestCase):
    """
    Smoke-test that admin list/add pages return HTTP 200.
    Skipped on Python 3.14+ due to Django 4.2 incompatibility with
    the updated copy.copy() protocol in django/template/context.py.
    """

    def setUp(self):
        from django.contrib.auth.models import User
        self.superuser = User.objects.create_superuser('admin', 'admin@example.com', 'password')
        self.client.force_login(self.superuser)
        WeddingPartyMember.objects.create(name='Alice', role='bride', color='#ff69b4', order=0)
        self.day = ScheduleDay.objects.create(
            date=datetime.date(2025, 9, 13), label='Wedding Day', order=0,
        )

    def test_member_changelist(self):
        from django.urls import reverse
        res = self.client.get(reverse('admin:planning_weddingpartymember_changelist'))
        self.assertEqual(res.status_code, 200)

    def test_member_add_page(self):
        from django.urls import reverse
        res = self.client.get(reverse('admin:planning_weddingpartymember_add'))
        self.assertEqual(res.status_code, 200)

    def test_day_changelist(self):
        from django.urls import reverse
        res = self.client.get(reverse('admin:planning_scheduleday_changelist'))
        self.assertEqual(res.status_code, 200)

    def test_day_add_page(self):
        from django.urls import reverse
        res = self.client.get(reverse('admin:planning_scheduleday_add'))
        self.assertEqual(res.status_code, 200)

    def test_event_changelist(self):
        from django.urls import reverse
        res = self.client.get(reverse('admin:planning_scheduleevent_changelist'))
        self.assertEqual(res.status_code, 200)

    def test_non_staff_cannot_access_admin(self):
        from django.urls import reverse
        from django.contrib.auth.models import User
        regular = User.objects.create_user('regular', password='pass')
        self.client.force_login(regular)
        res = self.client.get(reverse('admin:planning_scheduleday_changelist'))
        self.assertNotEqual(res.status_code, 200)
