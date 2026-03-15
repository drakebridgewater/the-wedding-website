from django.urls import path

from . import api_views, views

app_name = 'todos'

urlpatterns = [
    path('', views.todos_page, name='todos'),
    path('api/', api_views.todo_list, name='api-todos'),
    path('api/create/', api_views.todo_create, name='api-todos-create'),
    path('api/<str:task_id>/complete/', api_views.todo_complete, name='api-todo-complete'),
]
