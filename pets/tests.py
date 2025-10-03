from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import Pet, DailyLog, Medication

User = get_user_model()

class PetModelsTestCase(TestCase):

    def setUp(self):
        # Create a user
        self.user = User.objects.create_user(username='testuser', password='testpass')

        # Create a pet
        self.pet = Pet.objects.create(
            owner=self.user,
            type='Dog',
            name='Buddy',
            age=5,
            weight=20.5,
            breed='Labrador',
            surgeryType='Spay',
            surgeryReason='Routine'
        )

        # Create a daily log for the pet
        self.log = DailyLog.objects.create(
            pet=self.pet,
            date='2025-09-27',
            food='100%',
            energy='High',
            notes='Good day!',
        )

        # Create a medication for the log
        self.med = Medication.objects.create(
            log=self.log,
            name='Painkiller',
            dosage=50,
            times=2
        )

    def test_pet_creation(self):
        self.assertEqual(self.pet.name, 'Buddy')
        self.assertEqual(self.pet.owner, self.user)
        self.assertEqual(self.pet.type, 'Dog')

    def test_dailylog_creation(self):
        self.assertEqual(self.log.pet, self.pet)
        self.assertEqual(self.log.food, '100%')
        self.assertEqual(self.log.energy, 'High')

    def test_medication_creation(self):
        self.assertEqual(self.med.log, self.log)
        self.assertEqual(self.med.name, 'Painkiller')
        self.assertEqual(self.med.dosage, 50)
        self.assertEqual(self.med.times, 2)

    def test_pet_logs_relation(self):
        self.assertIn(self.log, self.pet.logs.all())

    def test_log_medications_relation(self):
        self.assertIn(self.med, self.log.meds.all())

    def test_dailylog_with_photo(self):
        # Create a fake image file
        image = SimpleUploadedFile(
            name='test_photo.jpg',
            content=b'\x47\x49\x46\x38\x37\x61',  # minimal GIF header
            content_type='image/gif'
        )
        log_with_photo = DailyLog.objects.create(
            pet=self.pet,
            date='2025-09-28',
            food='75%',
            energy='Normal',
            notes='Slightly tired',
            photo=image
        )
        self.assertTrue(log_with_photo.photo.name.endswith('test_photo.jpg'))
