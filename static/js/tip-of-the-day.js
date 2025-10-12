const tipEl = document.getElementById("tip-of-the-day");
let toggle = true; // true = cat, false = dog

const dogFacts = [
  "Dogs can learn more than 1000 words and gestures.",
  "Dogs have a sense of time and can miss you.",
  "A dog's nose print is unique, like a human fingerprint.",
  "Dogs sweat through their paws.",
  "The Basenji dog is known as the 'barkless dog'.",
  "Dogs have three eyelids.",
  "Dalmatians are born completely white and develop spots as they age.",
  "A Greyhound can run up to 45 mph.",
  "Dogs curl up to conserve body heat and protect vital organs while sleeping.",
  "Some dogs can detect diseases like cancer by scent.",
  "Dogs have been domesticated for over 14,000 years.",
  "The Saluki is the oldest known breed of domesticated dog.",
  "A dog's sense of smell is up to 100,000 times more sensitive than humans'.",
  "Chow Chows have blue-black tongues.",
  "The Newfoundland breed is an excellent swimmer and rescuer.",
  "Dogs can hear frequencies as high as 65,000 Hz.",
  "Puppies are born deaf, blind, and toothless.",
  "The world's smallest dog breed is the Chihuahua.",
  "Bloodhounds can track scents over great distances.",
  "Dogs dream just like humans during REM sleep.",
  "Tail wagging communicates emotions.",
  "Dogs can read human emotions from facial expressions.",
  "Some dogs have webbed feet for swimming.",
  "A dog’s whiskers are touch-sensitive and help them navigate.",
  "Golden Retrievers are one of the most popular family dogs.",
  "Dogs can see in dim light better than humans.",
  "The average dog can run about 19 mph.",
  "Dogs yawn to communicate and calm themselves.",
  "Greyhounds are the fastest dog breed.",
  "The Beagle's sense of smell is phenomenal for hunting.",
  "Dogs have been shown to understand basic arithmetic.",
  "The Siberian Husky has a wolf-like appearance and incredible endurance.",
  "Some dogs have heterochromia – two different colored eyes.",
  "The Labrador Retriever originated as a fisherman's helper.",
  "Dogs’ noses are wet to help absorb scent chemicals.",
  "The Poodle is one of the smartest dog breeds.",
  "Dogs can suffer from separation anxiety when left alone.",
  "Shih Tzus were bred to be royal lapdogs in China.",
  "A dog’s sense of hearing is about four times as acute as humans'.",
  "Dogs can detect earthquakes before they happen.",
  "Some dogs are natural herders due to instinct.",
  "The Dachshund was originally bred to hunt badgers.",
  "Dogs have a third eyelid called the 'haw'.",
  "Certain dog breeds are hypoallergenic.",
  "Dogs can sense fear and stress in humans.",
  "The Alaskan Malamute is a powerful sled dog.",
  "Dogs can recognize themselves in mirrors (rarely).",
  "Some dogs are trained to detect medical conditions like seizures.",
  "The Belgian Malinois is popular in police and military work.",
  "Dogs communicate using body language, vocalizations, and facial expressions.",
  "Dogs have been known to save human lives in emergencies.",
  "The Australian Shepherd is not from Australia—it’s American.",
  "A dog's sense of smell allows them to detect drugs and explosives.",
  "The Border Collie is considered the smartest dog breed.",
  "Dogs can distinguish between over 250 different smells.",
  "The oldest known dog lived to be 29 years old.",
  "Dogs can experience jealousy.",
  "The Great Dane is one of the tallest dog breeds.",
  "Dogs can help reduce stress and anxiety in humans.",
  "The Akita breed is known for loyalty.",
  "Dogs have sweat glands only in their paw pads.",
  "A dog's nose can detect a teaspoon of sugar in a million gallons of water.",
  "The Shiba Inu is an ancient Japanese breed.",
  "Dogs use scent to mark territory and communicate.",
  "The Corgi was a favorite of Queen Elizabeth II.",
  "Dogs’ sense of smell can detect changes in human body chemistry.",
  "The Boxer is known for being playful and energetic.",
  "Dogs can learn commands from as early as 8 weeks old.",
  "The Italian Greyhound is the smallest of the sighthounds.",
  "Some dogs have extraordinary memories for people and places.",
  "The Pomeranian was a favorite among European royalty.",
  "Dogs can detect changes in weather, like storms, before they occur.",
  "The Bernese Mountain Dog is known for its strength and gentle nature.",
  "Dogs can be trained to assist people with disabilities.",
  "The Scottish Terrier is often called a 'Scottie'.",
  "Dogs can sense when someone is in danger or upset.",
  "The Maltese breed is known for its long, silky coat.",
  "Dogs often tilt their heads to hear better or understand humans.",
  "The English Bulldog was originally used for bull-baiting.",
  "Dogs can distinguish between happy and angry voices.",
  "The French Bulldog is popular for apartment living.",
  "Dogs can be trained to detect low blood sugar levels in diabetics.",
  "The American Eskimo Dog is known for its fluffy coat.",
  "Dogs are capable of empathy toward humans and other animals.",
  "The Cavalier King Charles Spaniel is very affectionate.",
  "Dogs can detect the presence of certain bacteria and diseases.",
  "The Basset Hound has one of the best noses for tracking scents.",
  "Dogs can be taught to play simple games like fetch or hide-and-seek.",
  "The Samoyed breed is known for its 'smiling' face.",
  "Dogs can detect cancer and other diseases by smelling breath or skin.",
  "The Weimaraner is nicknamed the 'grey ghost'.",
  "Dogs can remember locations of objects and people.",
  "The Rottweiler is known for its strength and guarding instincts.",
  "Dogs can be trained for search and rescue missions.",
  "The Staffordshire Bull Terrier is known as a 'nanny dog'.",
  "Dogs have been used as therapy animals for centuries.",
  "The Keeshond is known for its fox-like expression and friendly nature.",
  "Dogs have varying sleep cycles depending on breed and age.",
  "The Lhasa Apso was originally a sentinel dog in Tibetan monasteries.",
  "Dogs have a Jacobson's organ that helps them detect pheromones.",
  "The Japanese Chin was a favorite of Chinese royalty.",
  "Dogs can experience grief and mourning when a companion dies.",
  "The Toy Poodle is highly intelligent and trainable.",
  "Dogs can detect human emotions through scent changes.",
  "The Hound breeds were often used for hunting by scent or sight.",
  "Dogs can develop unique bonds with their owners and families.",
  "The Norwegian Elkhound was used for hunting moose.",
  "Dogs’ sense of taste is not as refined as humans, but they can detect sweetness and salt.",
  "The Belgian Sheepdog is highly trainable and loyal.",
  "Dogs are capable of learning routines and anticipating events.",
  "The Irish Wolfhound is the tallest dog breed.",
  "Dogs can sense magnetic fields and may use them to navigate.",
  "The Chinese Shar-Pei is known for its wrinkled skin.",
  "Dogs can be trained to alert owners of seizures or heart attacks.",
  "The Vizsla is a highly energetic and affectionate hunting dog.",
  "Dogs have been shown to understand human pointing gestures.",
  "The Shih Tzu has been bred for companionship and royal courts."
];

let dogIndex = 0;

async function fetchTip() {
  try {
    let tip;
    if (toggle) {
      // Cat tip from API
      const res = await fetch("https://catfact.ninja/fact");
      const data = await res.json();
      tip = "🐱 " + data.fact;
    } else {
      // Dog tip from local array
      tip = "🐶 " + dogFacts[dogIndex];
      dogIndex = (dogIndex + 1) % dogFacts.length;
    }

    // fade out/in for smooth effect
    tipEl.style.opacity = 0;
    setTimeout(() => {
      tipEl.innerText = tip;
      tipEl.style.opacity = 1;
    }, 500);

    toggle = !toggle;
  } catch (err) {
    console.error("Failed to fetch tip:", err);
    tipEl.innerText = "Could not load tip 😿";
  }
}

// Initial fetch
fetchTip();

// Rotate every 3 minutes
setInterval(fetchTip, 60000); // 180000ms = 3 minutes
