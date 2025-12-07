from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .forms import PetForm, DailyLogForm, MedicationForm
from .models import Pet, DailyLog, Medication, VetInfo
import json
from datetime import timedelta
import requests
import base64
from django.views.decorators.http import require_POST
import os
from decouple import config
from django.views.decorators.http import require_http_methods
from django.utils.dateparse import parse_datetime
from django.utils.timezone import make_aware
from django.http import HttpResponseBadRequest
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
from django.conf import settings





from .ai_utils import call_gemini_model          # your Gemini caller
from .utils_ai import compute_recovery_flags     # helper above

from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.shortcuts import redirect
from django.contrib.auth import get_user_model

UserModel = get_user_model()

def activate_account(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = UserModel.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        user = None

    if user is not None and default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()
        # redirect to home with "activated=1"
        return redirect("/?activated=1")
    else:
        # redirect to home with "activation=failed"
        return redirect("/?activation=failed")



# --------------------------
# HOME
# --------------------------
def home(request):
    return render(request, "pets/index.html")


# --------------------------
# AUTHENTICATION
# --------------------------
@csrf_exempt
def user_login(request):
    if request.method != 'POST':
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    username_or_email = request.POST.get('username')
    password = request.POST.get('password')

    try:
        user_obj = User.objects.get(email=username_or_email)
        username = user_obj.username
    except User.DoesNotExist:
        username = username_or_email

    user = authenticate(request, username=username, password=password)
    if user:
        if not user.is_active:
            return JsonResponse({"success": False, "error": "Account not activated. Please check your email."})
        login(request, user)

        # 🔹 Get first pet name for this owner (or None if no pets yet)
        pet_name = (
            Pet.objects
            .filter(owner=user)
            .values_list('name', flat=True)
            .first()
        )

        return JsonResponse({
            "success": True,
            "username": user.username,
            "email": user.email,
            "pet_name": pet_name,
        })

    return JsonResponse({"success": False, "error": "Invalid credentials"})

@csrf_exempt
@login_required
def update_account(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    username = (request.POST.get("username") or "").strip()
    email = (request.POST.get("email") or "").strip()

    user = request.user

    if not email:
        return JsonResponse(
            {"success": False, "error": "Email is required"},
            status=400,
        )

    if not username:
        username = user.username  # keep current if empty

    # Username length rule (same as register)
    if len(username) > 15:
        return JsonResponse(
            {"success": False, "error": "Username must be 15 characters or fewer."},
            status=400,
        )

    # Uniqueness checks (ignore current user)
    if User.objects.filter(username=username).exclude(pk=user.pk).exists():
        return JsonResponse(
            {"success": False, "error": "Username already taken"},
            status=400,
        )

    if User.objects.filter(email=email).exclude(pk=user.pk).exists():
        return JsonResponse(
            {"success": False, "error": "Email already in use"},
            status=400,
        )

    # Save changes
    user.username = username
    user.email = email
    user.save()

    return JsonResponse({
        "success": True,
        "username": user.username,
        "email": user.email,
    })
@csrf_exempt
@login_required
def change_password(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    current_password = (request.POST.get("current_password") or "").strip()
    new_password1 = (request.POST.get("new_password1") or "").strip()
    new_password2 = (request.POST.get("new_password2") or "").strip()

    user = request.user

    if not current_password:
        return JsonResponse(
            {"success": False, "error": "Current password is required"},
            status=400,
        )

    if not user.check_password(current_password):
        return JsonResponse(
            {"success": False, "error": "Current password is incorrect"},
            status=400,
        )

    if not new_password1 or not new_password2:
        return JsonResponse(
            {"success": False, "error": "New password is required"},
            status=400,
        )

    if new_password1 != new_password2:
        return JsonResponse(
            {"success": False, "error": "New passwords do not match"},
            status=400,
        )

    try:
        validate_password(new_password1, user=user)
    except ValidationError as e:
        return JsonResponse(
            {"success": False, "error": " ".join(e.messages)},
            status=400,
        )

    user.set_password(new_password1)
    user.save()
    update_session_auth_hash(request, user)  # keep user logged in

    return JsonResponse({"success": True, "message": "Password changed successfully"})

@csrf_exempt
@login_required
def delete_account(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    password = (request.POST.get("password") or "").strip()
    user = request.user

    if not password:
        return JsonResponse(
            {"success": False, "error": "Password is required to delete account"},
            status=400,
        )

    if not user.check_password(password):
        return JsonResponse(
            {"success": False, "error": "Incorrect password"},
            status=400,
        )

    # Delete the user; related objects with on_delete=CASCADE will be cleaned up
    user.delete()

    return JsonResponse({"success": True})




@csrf_exempt
def user_logout(request):
    logout(request)
    return JsonResponse({"success": True})


@csrf_exempt
def user_register(request):
    if request.method != 'POST':
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    email = request.POST.get('email')
    username = request.POST.get('username')
    password = request.POST.get('password')

    # Required fields
    if not email or not password:
        return JsonResponse(
            {"success": False, "error": "Email and password are required"},
            status=400,
        )

    # Auto-generate username from email if empty
    if not username:
        username = email.split('@')[0]

    # Username max length rule
    if len(username) > 15:
        return JsonResponse(
            {"success": False, "error": "Username must be 15 characters or fewer."},
            status=400,
        )

    # Username already exists
    if User.objects.filter(username=username).exists():
        return JsonResponse(
            {"success": False, "error": "Username already taken"},
            status=400,
        )

    # Email already exists
    if User.objects.filter(email=email).exists():
        return JsonResponse(
            {"success": False, "error": "Email already in use"},
            status=400,
        )

    # Password validation
    try:
        validate_password(password)
    except ValidationError as e:
        error_message = ". ".join(e.messages)
        return JsonResponse(
            {"success": False, "error": error_message},
            status=400,
        )

    # Create the user
    try:
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        # LOCAL (DEBUG=True) -> require activation
        # LIVE  (DEBUG=False) -> auto-activate (no email required)
        if settings.DEBUG:
            user.is_active = False
        else:
            user.is_active = True

        user.save()

        # ========== EMAIL FLOW ONLY IN DEBUG (LOCAL) ==========
        if settings.DEBUG:
            # Activation email for the user
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            domain = request.get_host()
            activate_url = f"{request.scheme}://{domain}/activate/{uid}/{token}/"

            subject = "Activate your PawfectCare account"
            message = (
                f"Hi {user.username},\n\n"
                f"Thank you for registering at PawfectCare.\n"
                f"Please click the link below to activate your account:\n\n"
                f"{activate_url}\n\n"
                f"If you did not create this account, you can ignore this email."
            )

            # from_email = None → uses DEFAULT_FROM_EMAIL
            send_mail(subject, message, None, [user.email])

            # Optional: notify you
            admin_email = getattr(settings, "ADMIN_NOTIFICATION_EMAIL", None)
            if admin_email:
                admin_subject = f"New PawfectCare user registered: {user.username}"
                admin_message = (
                    f"A new user has registered.\n\n"
                    f"Username: {user.username}\n"
                    f"Email: {user.email}\n"
                )
                send_mail(admin_subject, admin_message, None, [admin_email])

            response_message = "Registration successful. Please check your email to activate your account."
        else:
            # Live: no activation email, user can log in immediately
            response_message = "Registration successful. You can now log in."

        return JsonResponse({
            "success": True,
            "username": user.username,
            "message": response_message,
        })

    except Exception as e:
        # If you want less detail on live, you can hide str(e) when not DEBUG
        error_msg = str(e) if settings.DEBUG else "Internal server error."
        return JsonResponse({"success": False, "error": error_msg}, status=500)


# --------------------------
# DASHBOARD
# --------------------------
@login_required
def dashboard(request):
    return render(request, "pets/dashboard.html")


# --------------------------
# PET MANAGEMENT
# --------------------------
@login_required
def ajax_user_pets(request):
    # Only fetch pets that belong to the currently logged-in user
    pets = Pet.objects.filter(owner=request.user).values(
        'id', 'type', 'name', 'age', 'weight', 'breed', 'surgery_type', 'surgery_reason'
    )
    return JsonResponse(list(pets), safe=False)
@login_required
def create_pet(request):
    if request.method == 'POST':
        form = PetForm(request.POST)
        if form.is_valid():
            pet = form.save(commit=False)
            pet.owner = request.user
            pet.save()
            return redirect('dashboard')
    else:
        form = PetForm()
    return render(request, 'pets/pet_form.html', {'form': form})


@login_required
def create_pet_ajax(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Not authenticated'}, status=401)
    if request.method != "POST":
        return JsonResponse({"success": False, "errors": "Invalid request method"}, status=400)

    pet_id = request.POST.get('pet_id')
    if pet_id:
        # update existing pet
        try:
            pet = Pet.objects.get(id=pet_id, owner=request.user)
        except Pet.DoesNotExist:
            return JsonResponse({"success": False, "errors": "Pet not found"}, status=404)
        form = PetForm(request.POST, instance=pet)
    else:
        # create new pet
        form = PetForm(request.POST)

    if form.is_valid():
        pet = form.save(commit=False)
        pet.owner = request.user
        surgery_date = request.POST.get('surgery_date')
        if surgery_date:
            pet.surgery_date = parse_date(surgery_date)
        pet.save()
        return JsonResponse({"success": True, "pet_id": pet.id})
    return JsonResponse({"success": False, "errors": form.errors}, status=400)



@login_required
def user_pets_json(request):
    """
    Return all pets belonging to the current user
    """
    pets = Pet.objects.filter(owner=request.user).values('id', 'type', 'name', 'age', 'weight', 'breed', 'surgery_type', 'surgery_date','surgery_reason')
    return JsonResponse(list(pets), safe=False)


# --------------------------
# LOG MANAGEMENT
# --------------------------
@login_required
def create_log_ajax(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'errors': 'Invalid request method'}, status=400)

    pet_id = request.POST.get('pet')
    try:
        pet = Pet.objects.get(id=pet_id, owner=request.user)
    except Pet.DoesNotExist:
        return JsonResponse({'success': False, 'errors': 'Pet not found'}, status=404)

    date = parse_date(request.POST.get('date'))
    food = request.POST.get('food')
    energy = request.POST.get('energy')
    notes = request.POST.get('notes', '')
    photo = request.FILES.get('photo')

    log = DailyLog.objects.create(
        pet=pet,
        date=date,
        food=food,
        energy=energy,
        notes=notes,
        photo=photo
    )

    meds = json.loads(request.POST.get('medications', '[]'))
    for m in meds:
        if m.get('name'):
            Medication.objects.create(
                log=log,
                name=m['name'],
                dosage=int(m.get('dosage') or 0),
                times=int(m.get('times') or 0)
            )

    photo_url = log.photo.url if log.photo else None
    return JsonResponse({'success': True, 'log_id': log.id, 'photo_url': photo_url})


@login_required
def pet_logs_json(request, pet_id):
    """
    Return all logs for a specific pet, belonging to the current user
    """
    try:
        pet = Pet.objects.get(id=pet_id, owner=request.user)
    except Pet.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Pet not found'}, status=404)

    logs = []
    for log in DailyLog.objects.filter(pet=pet).order_by('-date'):
        meds = list(log.meds.values('name', 'dosage', 'times'))  # use related_name 'meds'
        logs.append({
            'id': log.id,
            'date': log.date.strftime('%Y-%m-%d') if log.date else None,
            'food': log.food or '',
            'energy': log.energy or '',
            'notes': log.notes or '',
            'meds': meds,
            'photo_url': log.photo.url if log.photo and log.photo.name else None
        })

    return JsonResponse({'success': True, 'logs': logs})

# --------------------------
# VET AND APPOINTMENT MANAGEMENT
# --------------------------
@login_required
@ensure_csrf_cookie     # ensure csrftoken cookie is set on GET
@never_cache            # prevent cross-user caching
@require_http_methods(["GET", "POST"])
def vet_info_view(request):
    vet, _ = VetInfo.objects.get_or_create(owner=request.user)

    if request.method == "GET":
        return JsonResponse(_serialize_vet(vet))

    # POST
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("Invalid JSON")

    clinic_name = (data.get("clinic_name") or "").strip()
    phone       = (data.get("phone") or "").strip()
    email       = (data.get("email") or "").strip()
    next_raw    = (data.get("next_appointment") or "").strip()

    if not clinic_name:
        return JsonResponse({"error": "Clinic name is required."}, status=400)

    vet.clinic_name = clinic_name
    vet.phone = phone
    vet.email = email

    if next_raw:
        dt = parse_datetime(next_raw)
        if dt and dt.tzinfo is None:
            dt = make_aware(dt)
        vet.next_appointment = dt
    else:
        vet.next_appointment = None

    vet.save()
    resp = JsonResponse(_serialize_vet(vet))
    resp["Cache-Control"] = "no-store"   # extra paranoid
    return resp

def _serialize_vet(vet):
    return {
        "clinic_name": vet.clinic_name,
        "phone": vet.phone,
        "email": vet.email,
        "next_appointment": vet.next_appointment.isoformat() if vet.next_appointment else None,
    }
# --------------------------
# LOGS
# --------------------------
@login_required
@csrf_exempt  # remove in production, use proper CSRF headers
@require_http_methods(["PUT", "POST"])  # allow PUT and fallback POST
def ajax_update_log(request, log_id):
    try:
        log = DailyLog.objects.get(id=log_id, pet__owner=request.user)
    except DailyLog.DoesNotExist:
        return JsonResponse({"success": False, "error": "Log not found"}, status=404)

    # Because Django doesn't parse PUT automatically like POST, we need to use request.POST only if it's POST
    # If it's PUT, request.body contains the raw data
    if request.method == "PUT":
        from django.http import QueryDict
        put_data = QueryDict(request.body)
        data = put_data.copy()
        files = request.FILES
    else:
        data = request.POST
        files = request.FILES

    # Update fields
    log.date = parse_date(data.get("date")) or log.date
    log.food = data.get("food", log.food)
    log.energy = data.get("energy", log.energy)
    log.notes = data.get("notes", log.notes)
    
    # Handle photo
    photo = files.get("photo")
    if photo:
        log.photo = photo

    log.save()

    # Update medications
    meds_data = json.loads(data.get("medications", "[]"))
    # Delete old meds and create new ones
    log.meds.all().delete()
    for m in meds_data:
        if m.get("name"):
            Medication.objects.create(
                log=log,
                name=m['name'],
                dosage=int(m.get('dosage') or 0),
                times=int(m.get('times') or 0)
            )

    return JsonResponse({
        "success": True,
        "id": log.id,
        "photo_url": log.photo.url if log.photo else None
    })

@csrf_exempt
def ajax_delete_log(request, log_id):
    if request.method == "POST":
        try:
            log = DailyLog.objects.get(id=log_id, pet__owner=request.user)
            log.delete()
            return JsonResponse({"success": True})
        except DailyLog.DoesNotExist:
            return JsonResponse({"success": False, "error": "Log not found"})
    return JsonResponse({"success": False, "error": "Invalid request"})





@require_POST
@csrf_exempt  # or remove if you're handling CSRF tokens from JS properly
def ai_helper(request):
    option = request.POST.get("option", "summary")
    logs_raw = request.POST.get("logs", "[]")
    question = request.POST.get("question", "")

    try:
        logs = json.loads(logs_raw)
    except json.JSONDecodeError:
        logs = []

    flags = compute_recovery_flags(logs)
    red_flag_level = flags["red_flag_level"]
    rule_summary_text = flags["rule_summary_text"]
    recent_logs_text = flags["recent_logs_text"]

    if option == "summary":
        prompt = f"""
You are helping a pet owner understand their dog or cat's recovery after surgery.

You will receive:
- A simple rule-based risk summary from the app (this is NOT a diagnosis).
- A list of the last few logs with food %, energy level, and notes.

Your tasks:
1. Explain, in simple and calm language, how the recovery seems to be going overall.
2. Comment separately on:
   - appetite,
   - energy,
   - wound/other symptoms mentioned in the notes.
3. Use the rule-based risk summary to classify the situation as:
   - "On track"
   - "Needs monitoring"
   - "Contact a vet soon"

Safety rules:
- You are NOT a vet and cannot diagnose.
- Never say that there is "no need" to see a vet.
- If the risk level is "high", advise contacting a vet soon (same day if the owner is worried).
- If the owner is ever unsure or worried, gently remind them to contact their vet.

Always respond in this exact structure (short paragraphs, 1–3 sentences each):

Overall status:
- ...

Appetite:
- ...

Energy:
- ...

Wound / other notes:
- ...

Advice:
- Include a short reminder to follow the vet's instructions.
- Include a gentle reminder to keep giving prescribed medication as the vet instructed, unless the vet says otherwise.
- Include a reminder to contact a vet urgently for severe symptoms or if they feel something is wrong.

Rule-based risk summary (from the app, do NOT just repeat it, use it to guide your explanation):
{rule_summary_text}

Rule-based risk level: {red_flag_level}

Recent logs (newest first):
{recent_logs_text}
"""
    else:
        # follow-up question mode
        prompt = f"""
You are helping a pet owner understand their dog or cat's recovery after surgery.

You have:
- A rule-based risk summary from the app (NOT a diagnosis).
- A list of recent logs (food %, energy, notes).
- A specific question from the owner.

Answer the question in a calm, clear way based on the logs and risk summary.

Safety rules:
- You are NOT a vet and cannot diagnose.
- Never guarantee that everything is fine.
- Encourage the owner to contact their own vet if they are worried.

At the end, add 2–3 short bullet points that:
- remind them to follow the vet's instructions,
- remind them to keep giving medication as the vet instructed (unless the vet says otherwise),
- remind them to contact a vet urgently for severe symptoms or if something feels wrong.

Rule-based risk summary:
{rule_summary_text}

Rule-based risk level: {red_flag_level}

Recent logs (newest first):
{recent_logs_text}

Owner's question:
{question}
"""

    ai_text = call_gemini_model(prompt)
    return JsonResponse({"generated_text": ai_text})
