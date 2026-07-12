from django.test import TestCase
from django.urls import reverse

from guests.models import ContactUpdate, Guest, Party


class ContactDetailsTest(TestCase):

    def setUp(self):
        self.party = Party.objects.create(name='The Starks', type='formal')
        self.guest = Guest.objects.create(
            party=self.party,
            first_name='Ned',
            last_name='Stark',
            email='ned@winterfell.example',
        )
        self.url = reverse('guest-details', args=[self.party.invitation_id])

    def test_get_prefills_form(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'The Starks')
        self.assertContains(response, 'Ned')
        self.assertContains(response, 'ned@winterfell.example')

    def test_get_unknown_invite_id_404s(self):
        response = self.client.get(reverse('guest-details', args=['not-a-real-id']))
        self.assertEqual(response.status_code, 404)

    def test_post_updates_party_and_guest_and_logs_changes(self):
        response = self.client.post(self.url, {
            'party_name': 'The Stark Family',
            'first_name-{}'.format(self.guest.pk): 'Eddard',
            'last_name-{}'.format(self.guest.pk): 'Stark',
            'email-{}'.format(self.guest.pk): 'eddard@winterfell.example',
            'phone-{}'.format(self.guest.pk): '555-0100',
            'address': '1 Winterfell Way, The North',
            'address_city': 'Winterfell',
            'address_verified': '1',
        })
        self.assertRedirects(response, self.url + '?saved=1')

        self.party.refresh_from_db()
        self.guest.refresh_from_db()
        self.assertEqual(self.party.name, 'The Stark Family')
        self.assertEqual(self.party.address, '1 Winterfell Way, The North')
        self.assertEqual(self.party.address_city, 'Winterfell')
        self.assertTrue(self.party.address_verified)
        self.assertEqual(self.guest.first_name, 'Eddard')
        self.assertEqual(self.guest.email, 'eddard@winterfell.example')
        self.assertEqual(self.guest.phone, '555-0100')

        update = ContactUpdate.objects.get(party=self.party)
        changed_fields = {(c['target'], c['field']) for c in update.changes}
        self.assertIn(('party', 'name'), changed_fields)
        self.assertIn(('party', 'address'), changed_fields)
        self.assertIn(('guest', 'first_name'), changed_fields)
        self.assertIn(('guest', 'email'), changed_fields)
        self.assertIn(('guest', 'phone'), changed_fields)

    def test_post_without_changes_logs_nothing(self):
        response = self.client.post(self.url, {
            'party_name': self.party.name,
            'first_name-{}'.format(self.guest.pk): self.guest.first_name,
            'last_name-{}'.format(self.guest.pk): self.guest.last_name,
            'email-{}'.format(self.guest.pk): self.guest.email,
            'phone-{}'.format(self.guest.pk): '',
            'address': '',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(ContactUpdate.objects.count(), 0)

    def test_blank_names_do_not_wipe_existing_values(self):
        self.client.post(self.url, {
            'party_name': '',
            'first_name-{}'.format(self.guest.pk): '',
            'last_name-{}'.format(self.guest.pk): 'Stark',
            'email-{}'.format(self.guest.pk): self.guest.email,
        })
        self.party.refresh_from_db()
        self.guest.refresh_from_db()
        self.assertEqual(self.party.name, 'The Starks')
        self.assertEqual(self.guest.first_name, 'Ned')

    def test_ignores_fields_for_other_parties_guests(self):
        other_party = Party.objects.create(name='The Lannisters')
        other_guest = Guest.objects.create(party=other_party, first_name='Jaime')
        self.client.post(self.url, {
            'first_name-{}'.format(other_guest.pk): 'Hacked',
        })
        other_guest.refresh_from_db()
        self.assertEqual(other_guest.first_name, 'Jaime')

    def test_first_visit_marks_save_the_date_opened(self):
        from datetime import datetime, timezone
        self.party.save_the_date_sent = datetime.now(timezone.utc)
        self.party.save()
        self.client.get(self.url)
        self.party.refresh_from_db()
        self.assertIsNotNone(self.party.save_the_date_opened)

    def test_details_link_merge_field(self):
        from guests.invitation import render_template
        subject, body = render_template(
            '<a href="{{details_link}}">update</a>', 'Hi', self.party, 'https://example.com'
        )
        self.assertIn(
            'https://example.com' + reverse('guest-details', args=[self.party.invitation_id]),
            body,
        )
