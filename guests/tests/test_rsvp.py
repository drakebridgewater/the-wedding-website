from django.test import TestCase
from django.urls import reverse

from guests.models import Guest, Party


class RsvpSubmitTest(TestCase):

    def setUp(self):
        self.party = Party.objects.create(name='The Starks', type='formal')
        self.guest = Guest.objects.create(
            party=self.party, first_name='Ned', last_name='Stark',
        )
        self.other_party = Party.objects.create(name='The Lannisters', type='formal')
        self.other_guest = Guest.objects.create(
            party=self.other_party, first_name='Jaime', last_name='Lannister',
        )

    def submit(self, **fields):
        return self.client.post(
            reverse('invitation', args=[self.party.invitation_id]), fields,
        )

    def test_normal_rsvp_updates_guest(self):
        response = self.submit(**{
            'attending-{}'.format(self.guest.pk): 'yes',
            'dietary-{}'.format(self.guest.pk): 'no nuts',
        })
        self.assertEqual(response.status_code, 302)
        self.guest.refresh_from_db()
        self.assertTrue(self.guest.is_attending)
        self.assertEqual(self.guest.dietary_restrictions, 'no nuts')

    def test_malformed_field_name_does_not_500(self):
        response = self.submit(**{
            'attending-not-a-number': 'yes',
            'attending-{}'.format(self.guest.pk): 'yes',
        })
        self.assertEqual(response.status_code, 302)
        self.guest.refresh_from_db()
        self.assertTrue(self.guest.is_attending)

    def test_guest_pk_from_another_party_is_ignored(self):
        response = self.submit(**{
            'attending-{}'.format(self.other_guest.pk): 'yes',
        })
        self.assertEqual(response.status_code, 302)
        self.other_guest.refresh_from_db()
        self.assertIsNone(self.other_guest.is_attending)

    def test_nonexistent_guest_pk_does_not_500(self):
        response = self.submit(**{
            'attending-999999': 'yes',
        })
        self.assertEqual(response.status_code, 302)
