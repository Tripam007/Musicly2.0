import React, { useEffect, useRef } from 'react';

/**
 * LiquidGlassCanvas
 * 
 * Inspired by https://github.com/dashersw/liquid-glass-js
 * Real-time WebGL Apple Liquid Glass refraction, specular caustic rim lighting,
 * and Gaussian multi-sampled chromatic glass shaders.
 */
export default function LiquidGlassCanvas({
  borderRadius = 36,
  tintOpacity = 0.28,
  blurRadius = 6.0,
  edgeIntensity = 0.035,
  rimIntensity = 0.065,
  cornerBoost = 0.035,
  warp = true,
  backdropImage = '/assets/images/ghazals_bg.png',
  className = '',
  style = {}
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let gl;
    try {
      gl = canvas.getContext('webgl', { 
        preserveDrawingBuffer: true, 
        alpha: true, 
        antialias: true,
        premultipliedAlpha: false
      });
    } catch (e) {
      console.warn('WebGL not supported for Liquid Glass:', e);
      return;
    }

    if (!gl) return;

    // Vertex shader
    const vsSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      varying vec2 v_texcoord;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
      }
    `;

    // Fragment shader based on dashersw/liquid-glass-js
    const fsSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform vec2 u_textureSize;
      uniform float u_blurRadius;
      uniform float u_borderRadius;
      uniform float u_warp;
      uniform float u_edgeIntensity;
      uniform float u_rimIntensity;
      uniform float u_baseIntensity;
      uniform float u_edgeDistance;
      uniform float u_rimDistance;
      uniform float u_baseDistance;
      uniform float u_cornerBoost;
      uniform float u_rippleEffect;
      uniform float u_tintOpacity;
      uniform vec2 u_mousePos;
      varying vec2 v_texcoord;

      float roundedRectDistance(vec2 coord, vec2 size, float radius) {
        vec2 center = size * 0.5;
        vec2 pixelCoord = coord * size;
        vec2 toCorner = abs(pixelCoord - center) - (center - radius);
        float outsideCorner = length(max(toCorner, 0.0));
        float insideCorner = min(max(toCorner.x, toCorner.y), 0.0);
        return (outsideCorner + insideCorner - radius);
      }

      void main() {
        vec2 coord = v_texcoord;
        vec2 containerSize = u_resolution;
        
        float distFromEdgeShape = -roundedRectDistance(coord, containerSize, u_borderRadius);
        vec2 center = vec2(0.5, 0.5);
        vec2 shapeNormal = normalize(coord - center);
        distFromEdgeShape = max(distFromEdgeShape, 0.0);
        
        float distFromLeft = coord.x;
        float distFromRight = 1.0 - coord.x;
        float distFromTop = coord.y;
        float distFromBottom = 1.0 - coord.y;
        float distFromEdge = distFromEdgeShape / max(min(containerSize.x, containerSize.y), 1.0);
        
        float normalizedDistance = distFromEdge * min(containerSize.x, containerSize.y);
        float baseIntensity = 1.0 - exp(-normalizedDistance * u_baseDistance);
        float edgeIntensity = exp(-normalizedDistance * u_edgeDistance);
        float rimIntensity = exp(-normalizedDistance * u_rimDistance);
        
        float baseComponent = u_warp > 0.5 ? baseIntensity * u_baseIntensity : 0.0;
        float totalIntensity = baseComponent + edgeIntensity * u_edgeIntensity + rimIntensity * u_rimIntensity;
        
        vec2 baseRefraction = shapeNormal * totalIntensity;
        
        float cornerProximityX = min(distFromLeft, distFromRight);
        float cornerProximityY = min(distFromTop, distFromBottom);
        float cornerDistance = max(cornerProximityX, cornerProximityY);
        float cornerNormalized = cornerDistance * min(containerSize.x, containerSize.y);
        
        float cornerBoost = exp(-cornerNormalized * 0.3) * u_cornerBoost;
        vec2 cornerRefraction = shapeNormal * cornerBoost;
        
        vec2 perpendicular = vec2(-shapeNormal.y, shapeNormal.x);
        float rippleEffect = sin(distFromEdge * 28.0) * u_rippleEffect * rimIntensity;
        vec2 textureRefraction = perpendicular * rippleEffect;
        
        // Fluid interactive pointer displacement
        vec2 mouseDelta = coord - u_mousePos;
        float mouseDist = length(mouseDelta);
        vec2 mouseRefraction = normalize(mouseDelta + 0.0001) * exp(-mouseDist * 4.5) * 0.012;

        vec2 totalRefraction = baseRefraction + cornerRefraction + textureRefraction + mouseRefraction;
        vec2 textureCoord = coord + totalRefraction;
        
        // Multi-sample Gaussian blur with chromatic dispersion
        vec4 color = vec4(0.0);
        vec2 texelSize = 1.0 / max(u_textureSize, vec2(1.0, 1.0));
        float sigma = max(u_blurRadius * 0.5, 1.0);
        vec2 blurStep = texelSize * sigma;
        
        float totalWeight = 0.0;
        for(float i = -3.0; i <= 3.0; i += 1.0) {
          for(float j = -3.0; j <= 3.0; j += 1.0) {
            float d = length(vec2(i, j));
            if (d > 3.5) continue;
            float weight = exp(-(d * d) / (2.0 * sigma * sigma));
            vec2 offset = vec2(i, j) * blurStep;
            
            // Chromatic dispersion along caustic lens refraction
            float r = texture2D(u_image, textureCoord + offset + totalRefraction * 0.015).r;
            float g = texture2D(u_image, textureCoord + offset).g;
            float b = texture2D(u_image, textureCoord + offset - totalRefraction * 0.015).b;
            color += vec4(r, g, b, 1.0) * weight;
            totalWeight += weight;
          }
        }
        color /= max(totalWeight, 0.001);
        
        // Vertical glass gradient tint (specular top, rich deep base)
        float gradientPos = coord.y;
        vec3 topTint = vec3(1.0, 1.0, 1.0);
        vec3 bottomTint = vec3(0.08, 0.11, 0.18);
        vec3 gradientTint = mix(topTint, bottomTint, gradientPos);
        
        // Caustic rim & corner highlights
        float rimHighlight = pow(rimIntensity, 2.2) * 0.65;
        float topEdgeHighlight = exp(-coord.y * 35.0) * 0.28;
        
        vec3 finalColor = mix(color.rgb, gradientTint, u_tintOpacity) + vec3(rimHighlight + topEdgeHighlight);
        
        // Soft rounded rect mask
        float maskDist = roundedRectDistance(coord, containerSize, u_borderRadius);
        float mask = 1.0 - smoothstep(-1.2, 1.2, maskDist);
        
        gl_FragColor = vec4(finalColor, mask * 0.94);
      }
    `;

    // Compile helper
    const createShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.warn('Shader compile failed:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Program link failed:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Buffers for full-screen quad
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,  1, 1,  0, 0,
      0, 0,  1, 1,  1, 0
    ]), gl.STATIC_DRAW);

    // Uniform locations
    const posLoc = gl.getAttribLocation(program, 'a_position');
    const texLoc = gl.getAttribLocation(program, 'a_texcoord');
    const resLoc = gl.getUniformLocation(program, 'u_resolution');
    const texSizeLoc = gl.getUniformLocation(program, 'u_textureSize');
    const blurLoc = gl.getUniformLocation(program, 'u_blurRadius');
    const radiusLoc = gl.getUniformLocation(program, 'u_borderRadius');
    const warpLoc = gl.getUniformLocation(program, 'u_warp');
    const edgeIntLoc = gl.getUniformLocation(program, 'u_edgeIntensity');
    const rimIntLoc = gl.getUniformLocation(program, 'u_rimIntensity');
    const baseIntLoc = gl.getUniformLocation(program, 'u_baseIntensity');
    const edgeDistLoc = gl.getUniformLocation(program, 'u_edgeDistance');
    const rimDistLoc = gl.getUniformLocation(program, 'u_rimDistance');
    const baseDistLoc = gl.getUniformLocation(program, 'u_baseDistance');
    const cornerBoostLoc = gl.getUniformLocation(program, 'u_cornerBoost');
    const rippleLoc = gl.getUniformLocation(program, 'u_rippleEffect');
    const tintLoc = gl.getUniformLocation(program, 'u_tintOpacity');
    const mouseLoc = gl.getUniformLocation(program, 'u_mousePos');
    const imageLoc = gl.getUniformLocation(program, 'u_image');

    // Create 1x1 fallback texture first while image loads
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
      gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([20, 24, 38, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let textureWidth = 1920;
    let textureHeight = 1080;

    // Load backdrop texture
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = backdropImage || '/assets/images/ghazals_bg.png';
    img.onload = () => {
      if (!gl) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      textureWidth = img.width || 1920;
      textureHeight = img.height || 1080;
    };
    img.onerror = () => {
      // Create rich procedural gradient canvas fallback
      const fallCanvas = document.createElement('canvas');
      fallCanvas.width = 512;
      fallCanvas.height = 512;
      const ctx = fallCanvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0, '#1a1f35');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 512, 512);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fallCanvas);
      }
    };

    // Resize canvas to parent
    const updateSize = () => {
      if (!canvas || !gl) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.ceil(rect.width * dpr);
      const height = Math.ceil(rect.height * dpr);

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };

    updateSize();

    // Mouse move listener on parent
    const handleMouseMove = (e) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      mousePosRef.current = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    };

    const parentElem = canvas.parentElement;
    if (parentElem) {
      parentElem.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Render loop
    const render = () => {
      if (!gl || !canvas) return;

      updateSize();

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(texSizeLoc, textureWidth, textureHeight);
      gl.uniform1f(blurLoc, blurRadius);
      gl.uniform1f(radiusLoc, borderRadius * (canvas.width / (canvas.parentElement?.clientWidth || 1)));
      gl.uniform1f(warpLoc, warp ? 1.0 : 0.0);
      gl.uniform1f(edgeIntLoc, edgeIntensity);
      gl.uniform1f(rimIntLoc, rimIntensity);
      gl.uniform1f(baseIntLoc, 0.01);
      gl.uniform1f(edgeDistLoc, 0.15);
      gl.uniform1f(rimDistLoc, 0.8);
      gl.uniform1f(baseDistLoc, 0.1);
      gl.uniform1f(cornerBoostLoc, cornerBoost);
      gl.uniform1f(rippleLoc, 0.08);
      gl.uniform1f(tintLoc, tintOpacity);
      gl.uniform2f(mouseLoc, mousePosRef.current.x, mousePosRef.current.y);

      // Texture
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(imageLoc, 0);

      // Draw
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (parentElem) {
        parentElem.removeEventListener('mousemove', handleMouseMove);
      }
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
        gl.deleteBuffer(posBuffer);
        gl.deleteBuffer(texBuffer);
        gl.deleteTexture(texture);
      }
    };
  }, [backdropImage, borderRadius, tintOpacity, blurRadius, edgeIntensity, rimIntensity, cornerBoost, warp]);

  return (
    <canvas
      ref={canvasRef}
      className={`liquid-glass-webgl-canvas ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: `${borderRadius}px`,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        ...style
      }}
      aria-hidden="true"
    />
  );
}
