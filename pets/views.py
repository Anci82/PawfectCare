from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .forms import PetForm, DailyLogForm, MedicationForm
from .models import Pet, DailyLog, Medication
import json
from datetime import timedelta
import requests
import base64
from django.views.decorators.http import require_POST
import os
from decouple import config



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
        login(request, user)
        return JsonResponse({"success": True, "username": user.username})
    return JsonResponse({"success": False, "error": "Invalid credentials"})


@csrf_exempt
def user_logout(request):
    logout(request)
    return JsonResponse({"success": True})


@csrf_exempt
def user_register(request):
    if request.method != 'POST':
        return JsonResponse({"success": False, "error": "POST required"}, status=400)

    email = request.POST.get('email')
    username = request.POST.get('username') or email.split('@')[0]
    password = request.POST.get('password')

    if User.objects.filter(email=email).exists():
        return JsonResponse({"success": False, "error": "Email already in use"}, status=400)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        return JsonResponse({"success": True, "username": user.username})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


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


import os
import requests
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
# Note: For production use, install the Google GenAI SDK (pip install google-genai) 
# for better handling, but this 'requests' example works perfectly for direct API calls.

# --- Configuration ---
# It is best practice to secure your API key as an environment variable.
# The key for Gemini is passed as a query parameter in the URL.
GEMINI_API_KEY = config("GEMINI_API_KEY")
GEMINI_MODEL_NAME = "gemini-2.5-flash-preview-05-20" # A fast and capable model

def call_gemini_model(prompt):
    """
    Sends a POST request to the Gemini API to generate content.
    """
    if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_DEFAULT_API_KEY_HERE":
        return "Error: GEMINI_API_KEY not configured."

    # 1. Gemini API Endpoint Structure
    # The API key is included as a query parameter.
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL_NAME}:generateContent?key={GEMINI_API_KEY}"
    )

    # 2. Gemini API Payload Structure
    # The prompt must be wrapped in a 'contents' array with 'parts'.
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    # Standard JSON headers
    headers = {"Content-Type": "application/json"}

    try:
        # Send the POST request
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status() # Raise exception for bad status codes (4xx or 5xx)
        
        result = response.json()
        
        # 3. Gemini API Response Parsing
        # The generated text is typically nested deeply within the response object.
        generated_text = result['candidates'][0]['content']['parts'][0]['text']
        
        return generated_text

    except requests.exceptions.RequestException as e:
        # Handle connection errors, timeouts, and HTTP errors
        return f"API Request Error: {str(e)}"
    except KeyError:
        # Handle errors if the JSON structure is unexpected (e.g., block reason)
        return f"Error: Unexpected response format from API. Details: {json.dumps(result, indent=2)}"


@csrf_exempt  # for dev only
@require_POST
def ai_helper(request):
    try:
        option = request.POST.get("option", "summary")
        question = request.POST.get("question", "").strip()
        logs = json.loads(request.POST.get("logs", "[]"))

        # Format recent logs for the prompt
        recent_logs = []
        for log in logs[-7:]:
            meds = ", ".join(
                f"{m.get('name','—')} ({m.get('dosage',0)}mg x {m.get('times',0)})"
                for m in log.get("meds", [])
            )
            recent_logs.append(
                f"{log.get('date','?')}: Food {log.get('food','—')}, "
                f"Meds {meds or '—'}, Energy {log.get('energy','?')}, "
                f"Notes {log.get('notes','—')}, "
                f"Photo {'uploaded' if log.get('photo') else 'none'}"
            )
        recent_logs_text = "\n".join(recent_logs)

        # Build base prompt
        prompt = f"Recovery logs (last 7 days):\n{recent_logs_text}\n\n"

        if option == "question" and question:
            prompt += f"""Owner's question: "{question}"

            Answer clearly in 2–4 short sentences.
            Highlight the most important advice or warning signs if relevant.
            """
        else:
            prompt += """
            Please provide a concise recovery analysis based on the logs.

            - Use short bullet points (max 6).
            - Mention both positive progress and any concerns.
            - Highlight what the owner should pay attention to (e.g., energy, appetite, wounds).
            - Keep the answer under 150 words.
            - Avoid generic advice; focus on specifics from the logs.
            - If unsure, suggest consulting a vet.
            """
        # Call Gemini
        ai_response = call_gemini_model(prompt)

    except Exception as e:
        ai_response = f"An unexpected error occurred: {str(e)}"

    return JsonResponse({"generated_text": ai_response})