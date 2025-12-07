from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('create-pet/', views.create_pet, name='create_pet'),
    path('ajax-create-pet/', views.create_pet_ajax, name='create_pet_ajax'),
    path('ajax-create-log/', views.create_log_ajax, name='ajax_create_log'),
    path('login/', views.user_login, name='user_login'),
    path('logout/', views.user_logout, name='user_logout'),
    path('register/', views.user_register, name='user_register'),
    path('ajax-user-pets/', views.user_pets_json, name='user_pets_json'),
    path('ajax-pet-logs/<int:pet_id>/', views.pet_logs_json, name='pet_logs_json'),
    path("ai-helper/", views.ai_helper, name="ai_helper"),
    path("ajax-delete-log/<int:log_id>/", views.ajax_delete_log, name="ajax_delete_log"),
    path('ajax-update-log/<int:log_id>/', views.ajax_update_log, name='ajax_update_log'),
    path("vet-info/", views.vet_info_view, name="vet_info"),
    path("update-account/", views.update_account, name="update_account"),
    path("change-password/", views.change_password, name="change_password"),
    path("delete-account/", views.delete_account, name="delete_account"),
    path("activate/<uidb64>/<token>/", views.activate_account, name="activate_account"),

]
