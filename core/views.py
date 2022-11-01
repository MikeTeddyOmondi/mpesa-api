import os
from dotenv import load_dotenv
load_dotenv()

from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import TransactionSerializer
from .models import Transaction

from django_daraja.mpesa.core import MpesaClient
mpesa_client = MpesaClient()

@csrf_exempt
@api_view(['POST'])
def createTransaction(request):
    # Use a Safaricom phone number that you have access to, for you to be able to view the prompt.
    data = request.data
    phone_number = data['phone_number']
    amount = data['amount']

    account_reference = 'Hotel Elmiriam'
    transaction_desc = 'Hotel Reservation Transaction'
    callback_url = os.getenv("CALLBACK_URL");
    
    response = mpesa_client.stk_push(phone_number, amount, account_reference, transaction_desc, callback_url)
    
    # serializer = TransactionSerializer(data=request.data)
    # if serializer.is_valid():
    #         serializer.save()

    return Response(response)

@api_view(['POST'])
def stk_push_callback(request):
    data = request.body
    print(request.body)
    # Handle the success message and error mpesa 
    # Send a message back to hotel service
    # Save the Transaction to the database | Postgresql

    return Response(data)


