from django.db import models
from django.conf import settings

from .validators import validate_international_phone_no_spaces
from django.core.validators import EmailValidator
from django.core.exceptions import ValidationError
from django.utils import timezone



class Pet(models.Model):
    PET_TYPES = [
        ('Dog', 'Dog'),
        ('Cat', 'Cat'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pets'
    )
    type = models.CharField(max_length=10, choices=PET_TYPES)
    name = models.CharField(max_length=50)
    age = models.PositiveIntegerField()
    weight = models.FloatField()
    breed = models.CharField(max_length=50, blank=True, null=True)
    surgery_type = models.CharField(max_length=100)
    surgery_date = models.DateField(blank=True, null=True) 
    surgery_reason = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.type})"


class DailyLog(models.Model):
    FOOD_CHOICES = [
        ('100%', '100%'),
        ('75%', '75%'),
        ('50%', '50%'),
        ('25%', '25%'),
        ('None', 'None'),
    ]

    ENERGY_CHOICES = [
        ('High', 'High'),
        ('Normal', 'Normal'),
        ('Low', 'Low'),
    ]

    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='logs')
    date = models.DateField()
    food = models.CharField(max_length=10, choices=FOOD_CHOICES)
    energy = models.CharField(max_length=10, choices=ENERGY_CHOICES)
    notes = models.TextField(blank=True, null=True)
    photo = models.ImageField(upload_to='pet_photos/', blank=True, null=True)

    def __str__(self):
        return f"{self.pet.name} - {self.date}"


class Medication(models.Model):
    log = models.ForeignKey(DailyLog, on_delete=models.CASCADE, related_name='meds')
    name = models.CharField(max_length=50)
    dosage = models.PositiveIntegerField(help_text="Dosage in mg")
    times = models.PositiveIntegerField(help_text="Times per day")

    def __str__(self):
        return f"{self.name} for {self.log.pet.name} on {self.log.date}"

class VetInfo(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vet_info'
    )
    clinic_name = models.CharField(max_length=80, blank=True)
    phone = models.CharField(max_length=20, validators=[validate_international_phone_no_spaces], blank=True)
    email = models.EmailField(blank=True, validators=[EmailValidator()])
    next_appointment = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        # Only enforce if a date is provided
        if self.next_appointment and self.next_appointment <= timezone.now():
            raise ValidationError({"next_appointment": "Appointment must be in the future."})

    def __str__(self):
        return f"{self.owner.username} — {self.clinic_name or 'No clinic set'}"