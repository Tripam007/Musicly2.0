/**
 * FloatingObjects.jsx
 * Deterministic architectural elements and camera projection helpers
 * for Musicly's dark cinematic reflective studio.
 *
 * Exactly 4 purposeful, coherent sculptural elements with deterministic motion:
 * 1. Monolithic Matte Cube (Midground left - dark basalt stone, slow micro-rotation)
 * 2. Translucent Smoked Glass Slab (Midground right - fine specular rim, subtle drift)
 * 3. Distant Architectural Ring / Pillar (Deep background - vast spatial depth anchor)
 * 4. Ambient Studio Light (Volumetric amber illumination gently steered by mouse)
 */

// Camera projection helper with perspective foreshortening
export function project3D(x, y, z, width, height, camera) {
  const fov = 750;
  const relZ = z - camera.z;
  if (relZ <= 10) return null; // Behind or clipping camera plane

  const scale = fov / relZ;
  const projX = (x - camera.x) * scale + width / 2;
  const projY = (y - camera.y) * scale + height / 2;

  return { x: projX, y: projY, scale, relZ };
}

// 4 Coherent, architectural elements in unified coordinate space
export function createGeometricScene() {
  return [
    // 1. Monolithic Matte Cube (Midground Left)
    {
      type: 'cube',
      id: 'monolith-cube',
      x: -260,
      y: 35,
      z: 820,
      size: 136,
      rotX: 0.32,
      rotY: 0.48,
      rotZ: 0.10,
      rotSpeedX: 0.00045,
      rotSpeedY: 0.00075,
      floatSpeed: 0.0006,
      floatAmp: 10,
      floatPhase: 0.3
    },
    // 2. Translucent Smoked Glass Slab (Midground Right)
    {
      type: 'plane',
      id: 'smoked-glass-slab',
      x: 235,
      y: 75,
      z: 760,
      width: 210,
      height: 135,
      rotX: 0.22,
      rotY: -0.36,
      rotZ: 0.06,
      rotSpeedY: 0.0004,
      floatSpeed: 0.0007,
      floatAmp: 8,
      floatPhase: 3.5
    },
    // 3. Distant Architectural Ring (Background Left - deep perspective anchor)
    {
      type: 'ring',
      id: 'distant-ring',
      x: -160,
      y: -90,
      z: 1180,
      outerRadius: 65,
      innerRadius: 52,
      rotX: 0.45,
      rotY: 0.25,
      rotSpeedY: 0.0003,
      floatSpeed: 0.0004,
      floatAmp: 6,
      floatPhase: 1.8
    }
  ];
}

// Minimal deterministic dust particles drifting gracefully in the amber light cone
export function createDustParticles(count = 20) {
  return Array.from({ length: count }, (_, i) => {
    const seed = i / count;
    return {
      x: (Math.sin(seed * 28.5) * 0.5) * 1200,
      y: (Math.cos(seed * 21.3) * 0.5) * 650,
      z: 320 + (seed * 850),
      size: 1.0 + (seed * 1.5),
      speedX: Math.sin(seed * 11) * 0.06,
      speedY: -0.10 - (seed * 0.12),
      speedZ: Math.cos(seed * 14) * 0.04,
      opacity: 0.12 + (seed * 0.26),
      phase: seed * Math.PI * 2
    };
  });
}
