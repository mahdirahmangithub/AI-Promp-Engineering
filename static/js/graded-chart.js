class GradedChart {
  static defaults = {
    mainGradeHeight: 10,
    subGradeHeight: 6,
    fontSize: 10,
    gradeSpacing: 60,
    subGrades: 6,
    numberSpacing: 8,
    sensitivity: 0.5,
    touchSensitivity: 1.5, // Higher sensitivity for better touch response
    easingFactor: 0.1,
    momentum: 0.92,
    springStiffness: 0.3,
    springDamping: 0.75,
    springMass: 1,
    elasticThreshold: 0.4,
    edgeWidth: 130,
    minScale: 0.8,
    scaleExponent: 0.3,
  };

  constructor(element) {
    this.element = element;
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
    this.offset = 0;
    this.targetOffset = 0;
    this.velocity = 0;
    this.springVelocity = 0;
    this.lastDelta = 0;

    this.config = { ...GradedChart.defaults };

    this.setupCanvas();
    this.setupEventListeners();
    this.startAnimation();
  }

  setupCanvas() {
    this.element.style.position = "relative";
    this.element.style.overflow = "hidden";
    this.element.style.display = "block";

    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.element.appendChild(this.canvas);

    this.updateCanvasSize();
  }

  updateCanvasSize() {
    const rect = this.element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(rect.width * dpr, 1);
    this.canvas.height = Math.max(rect.height * dpr, 1);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  setupEventListeners() {
    window.addEventListener("resize", () => this.updateCanvasSize());

    // Mouse event variables
    let lastMouseX = 0;
    let isFirstMove = true;
    let isMoving = false;
    let moveTimeout;

    // Touch event variables
    let lastTouchX = 0;
    let isTouching = false;
    let touchTimeout;

    // Mouse events
    document.addEventListener("mousemove", (e) => {
      if (isFirstMove) {
        lastMouseX = e.clientX;
        isFirstMove = false;
        return;
      }

      isMoving = true;
      clearTimeout(moveTimeout);

      const mouseX = e.clientX;
      const centerX = window.innerWidth / 2;
      const mouseDelta = mouseX - lastMouseX;

      const distanceFromCenter = Math.abs(mouseX - centerX);
      const sensitivityMultiplier = 1 + distanceFromCenter / centerX;

      this.targetOffset += mouseDelta * this.config.sensitivity * sensitivityMultiplier;
      this.velocity = mouseDelta * this.config.sensitivity * sensitivityMultiplier;

      lastMouseX = mouseX;

      moveTimeout = setTimeout(() => {
        isMoving = false;
        this.springVelocity = this.velocity;
      }, 50);
    });

    // Touch events with improved responsiveness
    this.element.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return;

        // Store initial touch position
        lastTouchX = e.touches[0].clientX;
        isTouching = true;

        // Reset velocity to ensure immediate response
        this.velocity = 0;
        this.springVelocity = 0;

        // Prevent default only after we've confirmed we want to handle this touch
        e.preventDefault();
      },
      { passive: false }
    );

    this.element.addEventListener(
      "touchmove",
      (e) => {
        if (!isTouching || e.touches.length !== 1) return;

        // Prevent default to avoid scrolling
        e.preventDefault();

        // Clear any pending timeouts
        clearTimeout(touchTimeout);

        const touchX = e.touches[0].clientX;
        const centerX = window.innerWidth / 2;
        const touchDelta = touchX - lastTouchX;

        // Increase touch sensitivity for better responsiveness
        const distanceFromCenter = Math.abs(touchX - centerX);
        const sensitivityMultiplier = 1.5 + distanceFromCenter / centerX;

        // Apply immediate movement with enhanced sensitivity
        this.targetOffset += touchDelta * this.config.touchSensitivity * sensitivityMultiplier;

        // Set velocity for momentum
        this.velocity = touchDelta * this.config.touchSensitivity * sensitivityMultiplier;

        // Apply some of the movement directly to offset for instant feedback
        this.offset += touchDelta * this.config.touchSensitivity * sensitivityMultiplier * 0.5;

        // Update last touch position
        lastTouchX = touchX;

        // Set timeout for spring physics
        touchTimeout = setTimeout(() => {
          this.springVelocity = this.velocity;
        }, 16); // Reduced timeout for more responsive feel
      },
      { passive: false }
    );

    this.element.addEventListener(
      "touchend",
      (e) => {
        if (!isTouching) return;

        isTouching = false;

        // Apply final velocity with some boost for better inertia
        const boostFactor = 1.2;
        this.velocity *= boostFactor;
        this.springVelocity = this.velocity;

        // Optional: Prevent default only if we were handling the touch
        e.preventDefault();
      },
      { passive: false }
    );

    this.element.addEventListener(
      "touchcancel",
      (e) => {
        isTouching = false;
        this.springVelocity = this.velocity;

        // Optional: Prevent default
        e.preventDefault();
      },
      { passive: false }
    );
  }

  applySpringPhysics(delta) {
    const { springStiffness, springDamping, springMass } = this.config;

    const springForce = -springStiffness * delta;
    const dampingForce = -springDamping * this.springVelocity;
    const totalForce = springForce + dampingForce;
    const acceleration = totalForce / springMass;

    this.springVelocity += acceleration;
    return this.springVelocity;
  }

  startAnimation() {
    let lastTimestamp = 0;

    const animate = (timestamp) => {
      // Calculate time delta for smoother animations
      const deltaTime = lastTimestamp ? (timestamp - lastTimestamp) / 16.67 : 1; // Normalize to ~60fps
      lastTimestamp = timestamp;

      // Apply velocity with time-based adjustment
      if (Math.abs(this.velocity) > 0.01) {
        this.targetOffset += this.velocity * deltaTime;
        this.velocity *= Math.pow(this.config.momentum, deltaTime);
      }

      const delta = this.targetOffset - this.offset;
      const absDelta = Math.abs(delta);

      // Apply appropriate physics based on distance
      if (absDelta < this.config.elasticThreshold) {
        const springDelta = this.applySpringPhysics(delta) * deltaTime;
        this.offset += springDelta;
      } else {
        const acceleration = delta * this.config.easingFactor * deltaTime;
        this.offset += acceleration;
      }

      this.lastDelta = delta;
      this.draw();
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  getEdgeScale(x, width) {
    const { edgeWidth, minScale, scaleExponent } = this.config;

    const distanceFromLeft = x;
    const distanceFromRight = width - x;

    let scale;
    if (distanceFromLeft < edgeWidth) {
      scale = distanceFromLeft / edgeWidth;
    } else if (distanceFromRight < edgeWidth) {
      scale = distanceFromRight / edgeWidth;
    } else {
      scale = 1;
    }

    scale = Math.max(minScale, Math.min(1, Math.pow(scale, scaleExponent)));

    return scale;
  }

  draw() {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    const textColor = getComputedStyle(document.documentElement).getPropertyValue("--color-blueprint-primary").trim();

    const { gradeSpacing } = this.config;
    const visibleWidth = rect.width;
    const visibleHeight = rect.height;
    const extraGrades = Math.ceil(visibleWidth / gradeSpacing) + 2;
    const startGrade = Math.floor(-this.offset / gradeSpacing) - extraGrades;
    const endGrade = Math.ceil((-this.offset + visibleWidth) / gradeSpacing) + extraGrades;

    ctx.strokeStyle = textColor;
    ctx.fillStyle = textColor;
    ctx.font = `${this.config.fontSize}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const centerY = visibleHeight / 2;

    // Draw sub-grades first
    for (let i = startGrade; i <= endGrade; i++) {
      const x = i * gradeSpacing + this.offset;

      if (i < endGrade) {
        const subSpacing = gradeSpacing / (this.config.subGrades + 1);
        for (let j = 1; j <= this.config.subGrades; j++) {
          const subX = x + j * subSpacing;
          const subScale = this.getEdgeScale(subX, visibleWidth);

          ctx.save();
          ctx.translate(subX, centerY);
          ctx.scale(subScale, subScale);

          // Center the line vertically
          ctx.beginPath();
          ctx.moveTo(0, -this.config.subGradeHeight / 2);
          ctx.lineTo(0, this.config.subGradeHeight / 2);
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    // Draw main grades
    for (let i = startGrade; i <= endGrade; i++) {
      const x = i * gradeSpacing + this.offset;
      const scale = this.getEdgeScale(x, visibleWidth);

      ctx.save();
      ctx.translate(x, centerY);
      ctx.scale(scale, scale);

      // Center the line vertically
      ctx.beginPath();
      ctx.moveTo(0, -this.config.mainGradeHeight / 2);
      ctx.lineTo(0, this.config.mainGradeHeight / 2);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Position number below the line
      const number = i * 4 + 14;
      ctx.fillText(number.toString(), 0, this.config.mainGradeHeight / 2 + this.config.numberSpacing + this.config.fontSize / 2);

      ctx.restore();
    }

    ctx.restore();
  }
}

function initGradedCharts() {
  document.querySelectorAll("[graded-chart]").forEach((element) => new GradedChart(element));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGradedCharts);
} else {
  initGradedCharts();
}
