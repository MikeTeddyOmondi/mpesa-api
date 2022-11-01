from django.urls import path, include
from . import views

urlpatterns = [
    path('', views.createTransaction, name='create_transaction'),
    path('daraja/stk-push', views.stk_push_callback, name='mpesa_stk_push_callback'),
]

# The URL "daraja/stk-push" will be exposed to the internet
