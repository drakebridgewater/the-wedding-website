from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from guests.models import Guest, Party
from planning.models import SeatingConfig, SeatingTable


def make_table(**kwargs):
    defaults = {
        'name': 'Table 1',
        'capacity': 8,
        'shape': 'round',
        'grid_x': 0, 'grid_y': 0,
        'grid_width': 2, 'grid_height': 2,
    }
    defaults.update(kwargs)
    return SeatingTable.objects.create(**defaults)


def make_guest(party, **kwargs):
    defaults = {'first_name': 'Test', 'last_name': 'Guest'}
    defaults.update(kwargs)
    return Guest.objects.create(party=party, **defaults)


class SeatingConfigAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_get_config_creates_default(self):
        res = self.client.get('/planning/api/seating/config/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('grid_cols', data)
        self.assertIn('grid_rows', data)
        self.assertIn('cell_size_ft', data)

    def test_update_config(self):
        # Ensure singleton exists first
        SeatingConfig.get()
        res = self.client.patch('/planning/api/seating/config/', {
            'grid_cols': 25,
            'grid_rows': 20,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['grid_cols'], 25)
        self.assertEqual(res.json()['grid_rows'], 20)

    def test_config_requires_auth(self):
        self.client.logout()
        res = self.client.get('/planning/api/seating/config/')
        self.assertEqual(res.status_code, 403)


class SeatingTableAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_list_empty(self):
        res = self.client.get('/planning/api/seating/tables/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_create_table(self):
        res = self.client.post('/planning/api/seating/tables/', {
            'name': 'Head Table',
            'capacity': 10,
            'shape': 'square',
            'grid_x': 5, 'grid_y': 5,
            'grid_width': 3, 'grid_height': 2,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(SeatingTable.objects.filter(name='Head Table').exists())

    def test_create_table_fields(self):
        res = self.client.post('/planning/api/seating/tables/', {
            'name': 'Table A',
            'capacity': 6,
            'shape': 'round',
            'grid_x': 0, 'grid_y': 0,
            'grid_width': 2, 'grid_height': 2,
        }, format='json')
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn('id', data)
        self.assertEqual(data['name'], 'Table A')
        self.assertEqual(data['capacity'], 6)
        self.assertEqual(data['assigned_count'], 0)
        self.assertEqual(data['guests'], [])

    def test_list_tables(self):
        make_table(name='Table 1')
        make_table(name='Table 2', grid_x=3)
        res = self.client.get('/planning/api/seating/tables/')
        self.assertEqual(len(res.json()), 2)

    def test_update_table_position(self):
        table = make_table()
        res = self.client.patch(f'/planning/api/seating/tables/{table.pk}/', {
            'grid_x': 10,
            'grid_y': 8,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        table.refresh_from_db()
        self.assertEqual(table.grid_x, 10)
        self.assertEqual(table.grid_y, 8)

    def test_delete_table(self):
        table = make_table()
        res = self.client.delete(f'/planning/api/seating/tables/{table.pk}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(SeatingTable.objects.filter(pk=table.pk).exists())

    def test_delete_table_unassigns_guests(self):
        party = Party.objects.create(name='The Smiths', type='formal')
        table = make_table()
        guest = make_guest(party)
        guest.seating_table = table
        guest.save()

        self.client.delete(f'/planning/api/seating/tables/{table.pk}/')
        guest.refresh_from_db()
        self.assertIsNone(guest.seating_table)

    def test_table_requires_auth(self):
        self.client.logout()
        res = self.client.get('/planning/api/seating/tables/')
        self.assertEqual(res.status_code, 403)


class SeatingGuestAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)
        self.party = Party.objects.create(name='The Joneses', type='formal')
        self.guest = make_guest(self.party, first_name='Jane', last_name='Jones', is_attending=True)
        self.table = make_table(name='Table 5')

    def test_list_guests(self):
        res = self.client.get('/planning/api/seating/guests/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 1)

    def test_guest_fields(self):
        res = self.client.get('/planning/api/seating/guests/')
        g = res.json()[0]
        self.assertEqual(g['first_name'], 'Jane')
        self.assertEqual(g['last_name'], 'Jones')
        self.assertIsNone(g['seating_table_id'])

    def test_assign_guest_to_table(self):
        res = self.client.patch(f'/planning/api/seating/guests/{self.guest.pk}/assign/', {
            'table_id': self.table.pk,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.guest.refresh_from_db()
        self.assertEqual(self.guest.seating_table, self.table)

    def test_unassign_guest_from_table(self):
        self.guest.seating_table = self.table
        self.guest.save()

        res = self.client.patch(f'/planning/api/seating/guests/{self.guest.pk}/assign/', {
            'table_id': None,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.guest.refresh_from_db()
        self.assertIsNone(self.guest.seating_table)

    def test_assign_nonexistent_table(self):
        res = self.client.patch(f'/planning/api/seating/guests/{self.guest.pk}/assign/', {
            'table_id': 9999,
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_assign_guest_appears_in_table_guests_list(self):
        self.client.patch(f'/planning/api/seating/guests/{self.guest.pk}/assign/', {
            'table_id': self.table.pk,
        }, format='json')

        res = self.client.get('/planning/api/seating/tables/')
        table_data = next(t for t in res.json() if t['id'] == self.table.pk)
        self.assertEqual(table_data['assigned_count'], 1)
        self.assertEqual(table_data['guests'][0]['first_name'], 'Jane')

    def test_guest_list_requires_auth(self):
        self.client.logout()
        res = self.client.get('/planning/api/seating/guests/')
        self.assertEqual(res.status_code, 403)
