from django import forms
from .models import Pet, DailyLog, Medication, VetInfo

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

class VetInfoForm(forms.ModelForm):
    class Meta:
        model = VetInfo
        fields = ('clinic_name', 'phone', 'email', 'next_appointment')

    def clean(self):
        cleaned = super().clean()
        # (Model.clean already enforces future date if provided)
        return cleaned
