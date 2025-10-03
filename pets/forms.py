from django import forms
from .models import Pet, DailyLog, Medication

class PetForm(forms.ModelForm):
    class Meta:
        model = Pet
        fields = ['type', 'name', 'age', 'weight', 'breed', 'surgery_type','surgery_date', 'surgery_reason']
        widgets = {
            'surgery_date': forms.DateInput(attrs={'type': 'date'})
        }

class DailyLogForm(forms.ModelForm):
    class Meta:
        model = DailyLog
        fields = ['pet', 'date', 'food', 'energy', 'notes', 'photo']

class MedicationForm(forms.ModelForm):
    class Meta:
        model = Medication
        fields = ['log', 'name', 'dosage', 'times']
