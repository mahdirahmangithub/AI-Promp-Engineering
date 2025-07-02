// webgl-overlay.js

// Wait for the DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Create a canvas element dynamically
  const canvas = document.createElement("canvas");
  canvas.id = "webglOverlay";
  document.body.appendChild(canvas);

  // Get the WebGL context
  const gl = canvas.getContext("webgl", { antialias: false }); // Disable antialiasing for better performance
  if (!gl) {
    console.error("WebGL not supported");
    alert("Your browser does not support WebGL. Please use a modern browser like Chrome, Firefox, or Edge.");
    return;
  }

  // Set canvas size to match the window and style it as an overlay
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resizeCanvas();
  window.addEventListener("resize", throttle(resizeCanvas, 250)); // Throttle resize to reduce frequent calls

  // Throttle function to limit event frequency
  function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Vertex shader (simple position and UV mapping for full screen)
  const vertexShaderSource = `
        attribute vec2 a_position;
        attribute vec2 a_texCoord;
        varying vec2 v_texCoord;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
            v_texCoord = a_texCoord;
        }
    `;

  // Fragment shader (fixed dark mode, steady noise, and displacement)
  const fragmentShaderSource = `
        precision mediump float;
        varying vec2 v_texCoord;
        uniform vec2 u_resolution;
        uniform float u_time; // Steady time for constant noise speed
        uniform sampler2D u_displacement;
        uniform float u_grain; // Fixed grain intensity
        uniform float u_frequency; // Fixed frequency for steady noise

        // Random noise function (optimized for consistency)
        highp float random(vec2 co) {
            highp float a = 12.9898;
            highp float b = 78.233;
            highp float c = 43758.5453;
            highp float dt = dot(co.xy, vec2(a, b));
            highp float sn = mod(dt, 3.14159265359);
            return fract(sin(sn) * c);
        }

        // Displacement function using the displacement texture
        vec2 getDisplacement(vec2 uv, sampler2D disp, float intensity) {
            vec4 dispValue = texture2D(disp, uv * 0.55); // Sample displacement, scaled down
            vec2 dispVec = vec2(dispValue.r, dispValue.g); // Use red and green channels
            return dispVec * intensity * 2.0 - intensity; // Normalize to [-intensity, intensity]
        }

        void main() {
            vec2 uv = v_texCoord;
            vec2 resolution = u_resolution;

            // Generate steady procedural grain with constant speed
            float grain = random(gl_FragCoord.xy * u_frequency + u_time * 0.01); // Constant speed (0.01 for smooth, steady motion)
            grain = smoothstep(0.7, 0.76, grain) * 0.08; // Fixed grain intensity

            // Fixed dark background color (#181616 or RGB [24, 22, 22])
            vec3 bgColor = vec3(24.0/255.0, 22.0/255.0, 22.0/255.0);
            
            // Apply steady displacement from displacement.jpg
            float displacementIntensity = 0.05; // Fixed intensity for consistent effect
            vec2 displacedUV = uv + getDisplacement(uv, u_displacement, displacementIntensity);

            // Ensure displaced UV stays within [0, 1]
            displacedUV = clamp(displacedUV, 0.0, 1.0);

            // Apply grain to the final color, with a slight transparency for overlay
            vec3 finalColor = bgColor + vec3(grain) * u_grain;
            gl_FragColor = vec4(finalColor, 0.5); // Alpha set to 0.5 for semi-transparency as overlay
        }
    `;

  // Create and compile shaders (optimized for minimal checks)
  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  // Create and link program (minimize error logging for production)
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  // Create buffer for a full-screen quad (single allocation, no repeated rebinding)
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  const positions = new Float32Array([
    -1,
    -1, // Bottom-left
    1,
    -1, // Bottom-right
    -1,
    1, // Top-left
    -1,
    1, // Top-left
    1,
    -1, // Bottom-right
    1,
    1, // Top-right
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  const texCoords = new Float32Array([
    0,
    0, // Bottom-left
    1,
    0, // Bottom-right
    0,
    1, // Top-left
    0,
    1, // Top-left
    1,
    0, // Bottom-right
    1,
    1, // Top-right
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

  // Load displacement.jpg as a texture (optimized with single binding)
  function loadTexture(url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // Use NEAREST for performance
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    const image = new Image();
    image.crossOrigin = "Anonymous"; // Handle CORS if needed
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url; // Updated path to "../static/textures/displacement.jpg"
    return texture;
  }

  // Load the displacement texture (single creation, no repeated updates)
  const displacementTexture = loadTexture("../static/textures/displacement.jpg"); // Updated path

  // Set up attribute and uniform locations (once, no repeated lookups)
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
  const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
  const timeLocation = gl.getUniformLocation(program, "u_time");
  const grainLocation = gl.getUniformLocation(program, "u_grain");
  const frequencyLocation = gl.getUniformLocation(program, "u_frequency");
  const displacementLocation = gl.getUniformLocation(program, "u_displacement");

  // Enable blending for transparency (once, no repeated calls)
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Constants for steady, efficient rendering
  const GRAIN_INTENSITY = 1.0; // Fixed grain intensity
  const NOISE_FREQUENCY = 0.0005; // Fixed frequency for steady noise
  let time = 0; // Manual time tracking for constant speed

  // Render loop (optimized for steady, constant speed)
  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Bind buffers (once per frame, no rebinding)
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms (minimal updates, constant values where possible)
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time); // Use manual time for constant speed
    gl.uniform1f(grainLocation, GRAIN_INTENSITY);
    gl.uniform1f(frequencyLocation, NOISE_FREQUENCY);

    // Bind displacement texture (once per frame)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, displacementTexture);
    gl.uniform1i(displacementLocation, 0);

    // Draw the quad (single draw call per frame)
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // Increment time at a constant rate for smooth, steady noise
    time += 0.016; // ~60 FPS (1/60 second), ensuring constant speed
    requestAnimationFrame(render);
  }

  // Start the animation with constant speed
  render();
});
