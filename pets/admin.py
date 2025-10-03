from django.contrib import admin
from .models import Pet, DailyLog, Medication

class MedicationInline(admin.TabularInline):
    model = Medication
    extra = 1  # how many empty rows to show by default

class DailyLogAdmin(admin.ModelAdmin):
    inlines = [MedicationInline]
    list_display = ('pet', 'date', 'food', 'energy')
    list_filter = ('pet', 'date')

class PetAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'breed', 'age')
    search_fields = ('name', 'breed')

admin.site.register(Pet, PetAdmin)
admin.site.register(DailyLog, DailyLogAdmin)

