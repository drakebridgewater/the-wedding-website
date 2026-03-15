from django.urls import path

from . import api_views, views

app_name = 'budget'

urlpatterns = [
    # Page views
    path('', views.budget_page, name='budget'),
    path('estimator/', views.estimator_page, name='estimator'),
    # Budget line items
    path('api/items/', api_views.item_list, name='api-item-list'),
    path('api/items/<int:pk>/', api_views.item_detail, name='api-item-detail'),
    path('api/items/<int:item_pk>/expenses/', api_views.expense_list, name='api-expense-list'),
    path('api/expenses/<int:pk>/', api_views.expense_detail, name='api-expense-detail'),
    path('api/summary/', api_views.budget_summary, name='api-summary'),
    path('api/estimate/', api_views.budget_estimate, name='api-estimate'),
    path('api/import-estimate/', api_views.import_estimate, name='api-import-estimate'),
]
