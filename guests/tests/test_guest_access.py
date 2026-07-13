from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse

from guests.access import SESSION_PARTY_KEY, SESSION_VERIFIED_KEY
from guests.models import Guest, Party
from wedding.models import FundMessage, Question


class GuestAccessTestBase(TestCase):

    def setUp(self):
        self.party = Party.objects.create(name='The Starks', type='formal')
        self.guest = Guest.objects.create(
            party=self.party, first_name='Ned', last_name='Stark',
        )
        self.other_party = Party.objects.create(name='The Lannisters', type='formal')
        Guest.objects.create(
            party=self.other_party, first_name='Jaime', last_name='Lannister',
        )

    def unlock(self, name, next_path='/', anchor=''):
        return self.client.post(reverse('guest-unlock'), {
            'name': name, 'next': next_path, 'anchor': anchor,
        })

    def force_generic_session(self):
        session = self.client.session
        session[SESSION_VERIFIED_KEY] = True
        session.save()

    def assert_verified(self, party=None):
        self.assertTrue(self.client.session.get(SESSION_VERIFIED_KEY))
        if party is not None:
            self.assertEqual(self.client.session.get(SESSION_PARTY_KEY), party.pk)
        else:
            self.assertIsNone(self.client.session.get(SESSION_PARTY_KEY))


class PersonalLinkSessionTest(GuestAccessTestBase):

    def test_personal_links_grant_party_session(self):
        for url_name in ('invitation', 'guest-details', 'save-the-date-card', 'rsvp-confirm'):
            self.client = self.client_class()  # fresh session each time
            response = self.client.get(reverse(url_name, args=[self.party.invitation_id]))
            self.assertEqual(response.status_code, 200, url_name)
            self.assert_verified(party=self.party)


class UnlockAccessTest(GuestAccessTestBase):

    def test_unlock_by_party_name_case_insensitive(self):
        response = self.unlock('the STARKS', next_path='/', anchor='gifts')
        self.assertRedirects(response, '/#gifts', fetch_redirect_response=False)
        self.assert_verified(party=self.party)

    def test_unlock_by_guest_full_name(self):
        response = self.unlock('NED stark')
        self.assertEqual(response.status_code, 302)
        self.assert_verified(party=self.party)

    def test_unlock_by_first_name_only_when_no_last_name(self):
        solo_party = Party.objects.create(name='Solo', type='formal')
        Guest.objects.create(party=solo_party, first_name='Hodor')
        self.unlock('hodor')
        self.assert_verified(party=solo_party)

    def test_ambiguous_match_verifies_without_party(self):
        Guest.objects.create(party=self.other_party, first_name='Ned', last_name='Stark')
        self.unlock('Ned Stark')
        self.assert_verified(party=None)

    def test_ambiguous_match_keeps_previously_known_party(self):
        self.client.get(reverse('invitation', args=[self.party.invitation_id]))
        Guest.objects.create(party=self.other_party, first_name='Ned', last_name='Stark')
        self.unlock('Ned Stark')
        self.assert_verified(party=self.party)

    def test_no_match_redirects_with_error_and_stays_locked(self):
        response = self.unlock('Jon Snow', next_path='/', anchor='questions')
        self.assertRedirects(response, '/?unlock_error=1#questions', fetch_redirect_response=False)
        self.assertFalse(self.client.session.get(SESSION_VERIFIED_KEY))

    def test_rejects_external_next_url(self):
        response = self.client.post(reverse('guest-unlock'), {
            'name': 'Ned Stark', 'next': 'https://evil.example/', 'anchor': '',
        })
        self.assertRedirects(response, '/', fetch_redirect_response=False)


class GatedContentTest(GuestAccessTestBase):

    def setUp(self):
        super().setUp()
        Question.objects.create(name='Arya', question_text='Is there parking?', is_approved=True)

    def test_home_locked_shows_teasers_not_content(self):
        response = self.client.get('/')
        self.assertContains(response, 'reserved for our wedding guests')
        self.assertNotContains(response, 'Is there parking?')
        self.assertNotContains(response, 'Submit a Question')
        self.assertNotContains(response, 'Modify Reservation')

    def test_home_unlocked_shows_content(self):
        self.force_generic_session()
        response = self.client.get('/')
        self.assertContains(response, 'Is there parking?')
        self.assertContains(response, 'Submit a Question')
        self.assertNotContains(response, 'reserved for our wedding guests')

    def test_staff_login_sees_everything_without_rsvp_column(self):
        user = User.objects.create_user('couple', password='pw')
        self.client.force_login(user)
        response = self.client.get('/')
        self.assertContains(response, 'Submit a Question')
        self.assertNotContains(response, 'Modify Reservation')

    def test_navbar_rsvp_links_only_with_exact_party(self):
        self.force_generic_session()
        response = self.client.get('/')
        self.assertNotContains(response, 'Modify Reservation')

        self.client.get(reverse('invitation', args=[self.party.invitation_id]))
        response = self.client.get('/')
        self.assertContains(response, 'Modify Reservation')
        self.assertContains(response, 'Update Contact Details')
        self.assertContains(response, self.party.invitation_id)

    def test_honeymoon_page_locked_vs_unlocked(self):
        response = self.client.get(reverse('honeymoon-fund'))
        self.assertContains(response, 'reserved for our wedding guests')
        self.assertNotContains(response, 'Leave a Note')

        self.force_generic_session()
        response = self.client.get(reverse('honeymoon-fund'))
        self.assertContains(response, 'Leave a Note')
        self.assertNotContains(response, 'reserved for our wedding guests')

    def test_submit_question_requires_verification(self):
        self.client.post(reverse('submit-question'), {'question_text': 'Sneaky?'})
        self.assertFalse(Question.objects.filter(question_text='Sneaky?').exists())

        self.force_generic_session()
        self.client.post(reverse('submit-question'), {'question_text': 'Legit question'})
        self.assertTrue(Question.objects.filter(question_text='Legit question').exists())

    def test_submit_fund_message_requires_verification(self):
        self.client.post(reverse('submit-fund-message'), {'message': 'Sneaky note'})
        self.assertFalse(FundMessage.objects.filter(message='Sneaky note').exists())

        self.force_generic_session()
        self.client.post(reverse('submit-fund-message'), {'message': 'Congrats!'})
        self.assertTrue(FundMessage.objects.filter(message='Congrats!').exists())
