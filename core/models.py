from django.db import models
import uuid

class Transaction(models.Model):
    # total, VAT, subtotal, customer info, booking info
    public_uuid = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    image = models.CharField(max_length=200)
    likes = models.PositiveIntegerField(default=0)
    reference = models.CharField(max_length=255)

    # def __str__(self):
    #     return str(self.public_id)