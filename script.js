const myImage = new Image();
myImage.src = "./bestPicture6.jpg";

const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");

function setMusicPlaying(isPlaying) {
  musicToggle.classList.toggle("is-muted", !isPlaying);
  musicToggle.setAttribute("aria-label", isPlaying ? "Выключить музыку" : "Включить музыку");
}

async function playMusic() {
  if (!bgMusic) return;
  try {
    await bgMusic.play();
    setMusicPlaying(true);
  } catch {
    setMusicPlaying(false);
  }
}

function pauseMusic() {
  if (!bgMusic) return;
  bgMusic.pause();
  setMusicPlaying(false);
}

if (musicToggle && bgMusic) {
  musicToggle.addEventListener("click", () => {
    if (bgMusic.paused) {
      playMusic();
    } else {
      pauseMusic();
    }
  });
}

const SILHOUETTE_BRIGHTNESS_MIN = 0.40;
const MOUSE_RADIUS = 140;
const MOUSE_FORCE = 2.8;
const NUMBER_OF_PARTICLES = 4000;

myImage.addEventListener("load", function () {
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext("2d");
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const particlesArray = [];
  const mappedImage = [];
  const silhouetteSpawnPoints = [];
  const mouse = { x: -1000, y: -1000, onCanvas: false };

  for (let y = 0; y < canvas.height; y++) {
    const row = [];
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * pixels.width + x) * 4;
      const red = pixels.data[index];
      const green = pixels.data[index + 1];
      const blue = pixels.data[index + 2];
      const brightness = calculateRelativeBrightness(red, green, blue);
      row.push([brightness, red, green, blue]);
      if (brightness > SILHOUETTE_BRIGHTNESS_MIN) {
        silhouetteSpawnPoints.push({ x, y });
      }
    }
    mappedImage.push(row);
  }

  function calculateRelativeBrightness(red, green, blue) {
    return (
      Math.sqrt(
        red * red * 0.299 + green * green * 0.587 + blue * blue * 0.114
      ) / 180
    );
  }

  function getSampleAt(x, y) {
    const py = Math.min(canvas.height - 1, Math.max(0, Math.floor(y)));
    const px = Math.min(canvas.width - 1, Math.max(0, Math.floor(x)));
    return mappedImage[py][px];
  }

  function toNeonColor(red, green, blue, brightness) {
    const boost = 1.12 + brightness * 0.4;
    let r = Math.min(255, red * boost + 6);
    let g = Math.min(255, green * boost + 4);
    let b = Math.min(255, blue * boost + 12);

    if (brightness > 0.5) {
      const mix = (brightness - 0.5) * 0.18;
      r = r * (1 - mix) + Math.min(255, r + 25) * mix;
      g = g * (1 - mix) + Math.min(255, g + 45) * mix;
      b = b * (1 - mix) + Math.min(255, b + 70) * mix;
    }

    return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
  }

  function pickSpawnPoint() {
    if (silhouetteSpawnPoints.length === 0) {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.2,
      };
    }
    const point =
      silhouetteSpawnPoints[
        Math.floor(Math.random() * silhouetteSpawnPoints.length)
      ];
    return { x: point.x, y: point.y };
  }

  function applyMouseForce(particle) {
    if (!mouse.onCanvas) return;

    const dx = particle.x - mouse.x;
    const dy = particle.y - mouse.y;
    const distance = Math.hypot(dx, dy);
    if (distance > MOUSE_RADIUS || distance < 1) return;

    const force = (1 - distance / MOUSE_RADIUS) * MOUSE_FORCE;
    particle.x += (dx / distance) * force;
    particle.y += (dy / distance) * force * 0.5;
  }

  class Particle {
    constructor() {
      const spawn = pickSpawnPoint();
      this.x = spawn.x;
      this.y = spawn.y;
      this.speed = 0;
      this.velocity = Math.random() * 0.5;
      this.size = Math.random() * 1.4 + 0.8;
      this.color = "rgb(0, 0, 0)";
      this.glowColor = "rgb(0, 0, 0)";
    }

    resetPosition() {
      const spawn = pickSpawnPoint();
      this.x = spawn.x;
      this.y = spawn.y;
    }

    updateColorFromSample(sample) {
      const brightness = sample[0];
      const red = sample[1];
      const green = sample[2];
      const blue = sample[3];
      this.color = toNeonColor(red, green, blue, brightness);
      this.glowColor = this.color;
      this.speed = brightness;
    }

    update() {
      const sample = getSampleAt(this.x, this.y);
      this.updateColorFromSample(sample);

      const movement = 3 - this.speed + this.velocity;
      this.y += movement;
      applyMouseForce(this);

      if (this.y > canvas.height) {
        this.resetPosition();
      }
      if (this.x < 0) this.x = canvas.width;
      if (this.x > canvas.width) this.x = 0;
    }

    draw() {
      ctx.shadowBlur = 7;
      ctx.shadowColor = this.glowColor;
      ctx.beginPath();
      ctx.fillStyle = this.color;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function getCanvasPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener("mousemove", (event) => {
    const pointer = getCanvasPointer(event);
    mouse.x = pointer.x;
    mouse.y = pointer.y;
    mouse.onCanvas = true;
  });

  canvas.addEventListener("mouseleave", () => {
    mouse.onCanvas = false;
  });

  canvas.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length === 0) return;
      event.preventDefault();
      const touch = event.touches[0];
      const pointer = getCanvasPointer(touch);
      mouse.x = pointer.x;
      mouse.y = pointer.y;
      mouse.onCanvas = true;
    },
    { passive: false }
  );

  canvas.addEventListener("touchend", () => {
    mouse.onCanvas = false;
  });

  for (let i = 0; i < NUMBER_OF_PARTICLES; i++) {
    particlesArray.push(new Particle());
  }

  function drawBackgroundFade() {
    ctx.globalAlpha = 0.04;
    const gradient = ctx.createRadialGradient(
      canvas.width * 0.5,
      canvas.height * 0.45,
      0,
      canvas.width * 0.5,
      canvas.height * 0.5,
      canvas.width * 0.75
    );
    gradient.addColorStop(0, "rgb(12, 8, 28)");
    gradient.addColorStop(1, "rgb(0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function animate() {
    drawBackgroundFade();
    for (let i = 0; i < particlesArray.length; i++) {
      const particle = particlesArray[i];
      particle.update();
      ctx.globalAlpha = 0.15 + particle.speed * 0.55;
      particle.draw();
    }
    requestAnimationFrame(animate);
  }

  animate();
});
