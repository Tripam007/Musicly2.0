import cv2
import numpy as np
import os

input_path = 'd:/apps/Musicly/public/assets/images/train_interior_raw.jpg'
output_path = 'd:/apps/Musicly/public/assets/images/train_window_frame.png'

img = cv2.imread(input_path, cv2.IMREAD_COLOR)
if img is None:
    print(f"Error loading {input_path}")
    exit(1)

h, w, c = img.shape
print(f"Image loaded: {w}x{h}")

# Convert to HSV to cleanly segment bright pure chroma green
hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
lower_green = np.array([35, 70, 70])
upper_green = np.array([85, 255, 255])

green_mask = cv2.inRange(hsv, lower_green, upper_green)

# Find connected components or contours to keep only the 3 main window openings
# and ignore any small green specs if any
num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(green_mask)

# Find the 3 largest green components (the central window and two side windows)
areas = stats[1:, cv2.CC_STAT_AREA]
sorted_indices = np.argsort(areas)[::-1]

clean_window_mask = np.zeros((h, w), dtype=np.uint8)
# Keep up to 3 largest components if they are substantial in size (> 10000 pixels)
for idx in sorted_indices[:3]:
    if areas[idx] > 10000:
        clean_window_mask[labels == (idx + 1)] = 255

# Morphological clean up to smooth the edges and eliminate green fringe
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
clean_window_mask = cv2.morphologyEx(clean_window_mask, cv2.MORPH_CLOSE, kernel)

# Blur the mask slightly for smooth anti-aliased edge alpha transition
# We dilate the mask very slightly (1px) so no green pixels remain on the inner rim
dilated_mask = cv2.dilate(clean_window_mask, kernel, iterations=2)
blurred_mask = cv2.GaussianBlur(dilated_mask.astype(np.float32), (5, 5), 1.2)

# Alpha channel: 255 for train interior (opaque), 0 for window cutout (transparent)
alpha = 255.0 - blurred_mask
alpha = np.clip(alpha, 0, 255).astype(np.uint8)

# Desaturate any slight green spill on the border pixels
# For pixels where blurred_mask is between 5 and 250, remove any residual green
b, g, r = cv2.split(img)
edge_zone = (blurred_mask > 2) & (blurred_mask < 254)
g[edge_zone] = np.minimum(g[edge_zone], np.maximum(b[edge_zone], r[edge_zone]))
clean_bgr = cv2.merge([b, g, r])

# Combine into 4-channel BGRA PNG
rgba = cv2.merge([clean_bgr, alpha])

cv2.imwrite(output_path, rgba, [cv2.IMWRITE_PNG_COMPRESSION, 4])
print(f"Successfully generated transparent frame: {output_path} ({os.path.getsize(output_path)} bytes)")
