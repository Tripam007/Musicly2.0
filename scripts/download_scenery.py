import urllib.request
import os
import cv2

# High-resolution aesthetic royalty-free Unsplash photography matching the exact chapter requirements
CHAPTERS = {
    # Chapter 2: The City — Beautiful skyline, bridge, river, warm golden sunlight
    'train_city.jpg': 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2400&q=85',
    # Chapter 3: The Mountains — Large majestic mountains, winding valleys, atmospheric mist, lush pine forests
    'train_mountains.jpg': 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=85',
    # Chapter 4: The Night Journey — Dark blue evening/night sky, distant sparkling city lights, peaceful starry night
    'train_night.jpg': 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=2400&q=85',
    # Chapter 5: Arrival — Vibrant atmospheric horizon blending into Musicly (Afterglow golden dusk)
    'train_arrival.jpg': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85',
}

headers = {'User-Agent': 'Mozilla/5.0'}
output_dir = 'd:/apps/Musicly/public/assets/images'

for filename, url in CHAPTERS.items():
    dest_path = os.path.join(output_dir, filename)
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as response, open(dest_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved {filename} ({os.path.getsize(dest_path)} bytes)")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
