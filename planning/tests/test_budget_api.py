from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from planning.models import BudgetLineItem, Expense


def make_item(**kwargs):
    defaults = {
        'category': 'venue',
        'description': 'Test Venue',
        'estimated_cost': Decimal('5000.00'),
    }
    defaults.update(kwargs)
    return BudgetLineItem.objects.create(**defaults)


class BudgetItemListAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_list_empty(self):
        res = self.client.get('/planning/api/budget/items/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_list_returns_items(self):
        make_item(description='Venue A')
        make_item(category='catering', description='Caterer B')
        res = self.client.get('/planning/api/budget/items/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()), 2)

    def test_item_fields(self):
        make_item(description='Grand Hall', estimated_cost=Decimal('10000.00'))
        res = self.client.get('/planning/api/budget/items/')
        item = res.json()[0]
        self.assertIn('id', item)
        self.assertEqual(item['category'], 'venue')
        self.assertEqual(item['description'], 'Grand Hall')
        self.assertEqual(item['estimated_cost'], '10000.00')
        self.assertIsNone(item['actual_cost'])
        self.assertFalse(item['is_paid'])
        self.assertIn('variance', item)
        self.assertIn('expenses', item)

    def test_create_item(self):
        res = self.client.post('/planning/api/budget/items/', {
            'category': 'flowers',
            'description': 'Centerpieces',
            'estimated_cost': '2000.00',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertTrue(BudgetLineItem.objects.filter(description='Centerpieces').exists())

    def test_create_item_invalid_cost(self):
        res = self.client.post('/planning/api/budget/items/', {
            'category': 'venue',
            'description': 'Bad',
            'estimated_cost': 'not-a-number',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_create_item_missing_required_fields(self):
        res = self.client.post('/planning/api/budget/items/', {}, format='json')
        self.assertEqual(res.status_code, 400)

    def test_requires_auth(self):
        self.client.logout()
        res = self.client.get('/planning/api/budget/items/')
        self.assertEqual(res.status_code, 403)


class BudgetItemDetailAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)
        self.item = make_item(description='The Venue', estimated_cost=Decimal('8000.00'))

    def test_retrieve(self):
        res = self.client.get(f'/planning/api/budget/items/{self.item.pk}/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['description'], 'The Venue')

    def test_retrieve_nonexistent(self):
        res = self.client.get('/planning/api/budget/items/9999/')
        self.assertEqual(res.status_code, 404)

    def test_partial_update(self):
        res = self.client.patch(f'/planning/api/budget/items/{self.item.pk}/', {
            'actual_cost': '7500.00',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.item.refresh_from_db()
        self.assertEqual(self.item.actual_cost.amount, Decimal('7500.00'))

    def test_update_marks_paid(self):
        res = self.client.patch(f'/planning/api/budget/items/{self.item.pk}/', {
            'is_paid': True,
        }, format='json')
        self.assertEqual(res.status_code, 200)
        self.item.refresh_from_db()
        self.assertTrue(self.item.is_paid)

    def test_delete(self):
        res = self.client.delete(f'/planning/api/budget/items/{self.item.pk}/')
        self.assertEqual(res.status_code, 204)
        self.assertFalse(BudgetLineItem.objects.filter(pk=self.item.pk).exists())

    def test_variance_with_actual_cost(self):
        self.item.actual_cost = Decimal('7000.00')
        self.item.save()
        res = self.client.get(f'/planning/api/budget/items/{self.item.pk}/')
        self.assertEqual(res.json()['variance'], '1000.00')


class ExpenseAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)
        self.item = make_item()

    def test_list_expenses_empty(self):
        res = self.client.get(f'/planning/api/budget/items/{self.item.pk}/expenses/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    def test_list_expenses_nonexistent_item(self):
        res = self.client.get('/planning/api/budget/items/9999/expenses/')
        self.assertEqual(res.status_code, 404)

    def test_create_expense(self):
        res = self.client.post(f'/planning/api/budget/items/{self.item.pk}/expenses/', {
            'amount': '500.00',
            'description': 'Deposit',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(self.item.expenses.count(), 1)

    def test_create_expense_returns_updated_item(self):
        res = self.client.post(f'/planning/api/budget/items/{self.item.pk}/expenses/', {
            'amount': '500.00',
            'description': 'Deposit',
        }, format='json')
        # Response is the full BudgetLineItem so the frontend can update in one call
        data = res.json()
        self.assertEqual(data['id'], self.item.pk)
        self.assertEqual(len(data['expenses']), 1)
        self.assertEqual(data['expense_total'], '500.00')

    def test_delete_expense(self):
        expense = Expense.objects.create(
            budget_item=self.item,
            amount=Decimal('250.00'),
            description='Partial payment',
        )
        res = self.client.delete(f'/planning/api/budget/expenses/{expense.pk}/')
        # Returns updated budget item
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Expense.objects.filter(pk=expense.pk).exists())

    def test_delete_nonexistent_expense(self):
        res = self.client.delete('/planning/api/budget/expenses/9999/')
        self.assertEqual(res.status_code, 404)


class BudgetSummaryAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_summary_empty(self):
        res = self.client.get('/planning/api/budget/summary/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('total_estimated', data)
        self.assertIn('total_actual', data)
        self.assertIn('variance', data)
        self.assertIn('by_category', data)
        self.assertEqual(data['total_estimated'], '0')

    def test_summary_totals(self):
        make_item(category='venue', estimated_cost=Decimal('5000.00'))
        make_item(category='catering', estimated_cost=Decimal('3000.00'))
        res = self.client.get('/planning/api/budget/summary/')
        data = res.json()
        self.assertEqual(data['total_estimated'], '8000.00')

    def test_summary_by_category(self):
        make_item(category='venue', estimated_cost=Decimal('5000.00'))
        res = self.client.get('/planning/api/budget/summary/')
        cats = {c['category']: c for c in res.json()['by_category']}
        self.assertIn('venue', cats)
        self.assertEqual(cats['venue']['estimated'], 5000.0)

    def test_summary_requires_auth(self):
        self.client.logout()
        res = self.client.get('/planning/api/budget/summary/')
        self.assertEqual(res.status_code, 403)


class BudgetEstimateAPITest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user('testuser', password='pass')
        self.client = APIClient()
        self.client.force_login(self.user)

    def test_estimate_budget_tier(self):
        res = self.client.post('/planning/api/budget/estimate/', {
            'guest_count': 100,
            'tier': 'budget',
        }, format='json')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data['guest_count'], 100)
        self.assertEqual(data['tier'], 'budget')
        self.assertIn('total', data)
        self.assertIn('breakdown', data)
        self.assertGreater(data['total'], 0)

    def test_estimate_all_tiers_increase(self):
        def get_total(tier):
            res = self.client.post('/planning/api/budget/estimate/', {
                'guest_count': 100, 'tier': tier,
            }, format='json')
            return res.json()['total']

        self.assertLess(get_total('budget'), get_total('standard'))
        self.assertLess(get_total('standard'), get_total('luxury'))

    def test_estimate_invalid_tier(self):
        res = self.client.post('/planning/api/budget/estimate/', {
            'guest_count': 100,
            'tier': 'nonexistent',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_estimate_missing_guest_count(self):
        res = self.client.post('/planning/api/budget/estimate/', {
            'tier': 'budget',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_estimate_invalid_guest_count(self):
        res = self.client.post('/planning/api/budget/estimate/', {
            'guest_count': 'abc',
            'tier': 'budget',
        }, format='json')
        self.assertEqual(res.status_code, 400)

    def test_import_estimate_creates_items(self):
        res = self.client.post('/planning/api/budget/import-estimate/', {
            'guest_count': 50,
            'tier': 'standard',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        self.assertGreater(BudgetLineItem.objects.count(), 0)

    def test_import_estimate_skips_existing_categories(self):
        make_item(category='venue', description='Existing Venue')
        res = self.client.post('/planning/api/budget/import-estimate/', {
            'guest_count': 50,
            'tier': 'standard',
        }, format='json')
        self.assertEqual(res.status_code, 201)
        # Venue category still only has one item (was not overwritten)
        self.assertEqual(BudgetLineItem.objects.filter(category='venue').count(), 1)
        self.assertEqual(
            BudgetLineItem.objects.filter(category='venue').first().description,
            'Existing Venue',
        )
