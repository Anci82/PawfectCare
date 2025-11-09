from django.contrib import admin
from django.utils.html import format_html
from .models import Pet, DailyLog, Medication, VetInfo

class MedicationInline(admin.TabularInline):
    model = Medication
    extra = 1

@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    inlines = [MedicationInline]
    list_display = ('pet', 'date', 'food', 'energy')
    list_filter = ('pet', 'date')

@admin.register(Pet)
class PetAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'breed', 'age')
    search_fields = ('name', 'breed')

@admin.register(VetInfo)
class VetInfoAdmin(admin.ModelAdmin):
    # show owner username nicely
    list_display = ('owner_username', 'clinic_name', 'phone_link', 'email_link', 'next_appointment', 'updated_at')
    list_filter = ('next_appointment',)
    search_fields = ('clinic_name', 'owner__username', 'phone', 'email')
    ordering = ('next_appointment',)

    def owner_username(self, obj):
        return obj.owner.username
    owner_username.short_description = "User"

    def phone_link(self, obj):
        if not obj.phone:
            return "—"
        return format_html('<a href="tel:{}">{}</a>', obj.phone, obj.phone)
    phone_link.short_description = "Phone"

    def email_link(self, obj):
        if not obj.email:
            return "—"
        return format_html('<a href="mailto:{}">{}</a>', obj.email, obj.email)
    email_link.short_description = "Email"
