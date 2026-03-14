from django.urls import path

from . import api_views, views

app_name = 'planning'

urlpatterns = [
    # Page views
    path('budget/', views.budget_page, name='budget'),
    path('estimator/', views.estimator_page, name='estimator'),
    path('todos/', views.todos_page, name='todos'),
    # API
    path('api/budget/items/', api_views.item_list, name='api-item-list'),
    path('api/budget/items/<int:pk>/', api_views.item_detail, name='api-item-detail'),
    path('api/budget/items/<int:item_pk>/expenses/', api_views.expense_list, name='api-expense-list'),
    path('api/budget/expenses/<int:pk>/', api_views.expense_detail, name='api-expense-detail'),
    path('api/budget/summary/', api_views.budget_summary, name='api-budget-summary'),
    path('api/budget/estimate/', api_views.budget_estimate, name='api-budget-estimate'),
    path('api/budget/import-estimate/', api_views.import_estimate, name='api-import-estimate'),
    # TickTick todos
    path('api/todos/', api_views.todo_list, name='api-todos'),
    path('api/todos/create/', api_views.todo_create, name='api-todos-create'),
    path('api/todos/<str:task_id>/complete/', api_views.todo_complete, name='api-todo-complete'),
    # Seating chart
    path('seating/', views.seating_page, name='seating'),
    path('api/seating/config/', api_views.seating_config, name='api-seating-config'),
    path('api/seating/tables/', api_views.table_list, name='api-seating-table-list'),
    path('api/seating/tables/<int:pk>/', api_views.table_detail, name='api-seating-table-detail'),
    path('api/seating/guests/', api_views.guest_seating_list, name='api-seating-guests'),
    path('api/seating/guests/<int:pk>/assign/', api_views.guest_assign, name='api-seating-guest-assign'),
    # Day-of schedule
    path('schedule/', views.schedule_page, name='schedule'),
    path('api/schedule/members/', api_views.schedule_members, name='api-schedule-members'),
    path('api/schedule/groups/', api_views.schedule_groups, name='api-schedule-groups'),
    path('api/schedule/days/', api_views.schedule_days, name='api-schedule-days'),
    path('api/schedule/days/<int:pk>/', api_views.schedule_day_detail, name='api-schedule-day-detail'),
    path('api/schedule/days/<int:day_pk>/events/', api_views.schedule_events, name='api-schedule-events'),
    path('api/schedule/events/<int:pk>/', api_views.schedule_event_detail, name='api-schedule-event-detail'),
    # Wedding party groups
    path('groups/', views.groups_page, name='groups'),
    path('groups/<int:pk>/email/', views.send_group_email, name='send-group-email'),
]
