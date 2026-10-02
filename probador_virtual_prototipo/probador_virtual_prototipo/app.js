import {
  PoseLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("start");
const togglePoseButton = document.getElementById("togglePose");
const message = document.getElementById("message");
const offsetYControl = document.getElementById("offsetY");
const scaleControl = document.getElementById("scale");

const shirt = new Image();
shirt.src = "./assets/Polera.png";

let poseLandmarker;
let stream;
let running = false;
let showPose = true;
let lastVideoTime = -1;

// Suavizado para evitar que la prenda "salte".
let smooth = null;

async function createPoseLandmarker() {
  message.textContent = "Cargando detector corporal…";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
    },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.55,
    minPosePresenceConfidence: 0.55,
    minTrackingConfidence: 0.55
  });

  message.textContent = "Detector listo.";
}

async function startCamera() {
  if (!poseLandmarker) {
    await createPoseLandmarker();
  }

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }

  stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  });

  video.srcObject = stream;
  await video.play();

  startButton.textContent = "Cámara activa";
  startButton.disabled = true;
  togglePoseButton.disabled = false;
  message.textContent = "Ponte de frente y deja hombros y caderas visibles.";
  running = true;

  requestAnimationFrame(render);
}

function resizeCanvas() {
  if (!video.videoWidth || !video.videoHeight) return;

  if (canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
}

function point(landmark) {
  return {
    x: landmark.x * canvas.width,
    y: landmark.y * canvas.height,
    visibility: landmark.visibility ?? 1
  };
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothValue(current) {
  if (!smooth) {
    smooth = { ...current };
    return smooth;
  }

  const amount = 0.35;

  for (const key of Object.keys(current)) {
    smooth[key] = lerp(smooth[key], current[key], amount);
  }

  return smooth;
}

function drawPoseDebug(lm) {
  if (!showPose) return;

  const indices = [11, 12, 23, 24];

  ctx.save();
  ctx.fillStyle = "#ffffff";

  for (const index of indices) {
    const p = point(lm[index]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = 3;

  const ls = point(lm[11]);
  const rs = point(lm[12]);
  const lh = point(lm[23]);
  const rh = point(lm[24]);

  ctx.beginPath();
  ctx.moveTo(ls.x, ls.y);
  ctx.lineTo(rs.x, rs.y);
  ctx.moveTo(lh.x, lh.y);
  ctx.lineTo(rh.x, rh.y);
  ctx.moveTo((ls.x + rs.x) / 2, (ls.y + rs.y) / 2);
  ctx.lineTo((lh.x + rh.x) / 2, (lh.y + rh.y) / 2);
  ctx.stroke();

  ctx.restore();
}

function drawShirt(lm) {
  const ls = point(lm[11]);
  const rs = point(lm[12]);
  const lh = point(lm[23]);
  const rh = point(lm[24]);

  const shoulderCenter = {
    x: (ls.x + rs.x) / 2,
    y: (ls.y + rs.y) / 2
  };

  const hipCenter = {
    x: (lh.x + rh.x) / 2,
    y: (lh.y + rh.y) / 2
  };

  const shoulderWidth = Math.hypot(rs.x - ls.x, rs.y - ls.y);
  const torsoHeight = Math.hypot(
    hipCenter.x - shoulderCenter.x,
    hipCenter.y - shoulderCenter.y
  );

  if (shoulderWidth < 30 || torsoHeight < 50) return;

  const angle = Math.atan2(rs.y - ls.y, rs.x - ls.x);

  // La polera está preparada para cubrir aproximadamente desde hombros hasta cadera.
  const userScale = Number(scaleControl.value);
  const width = shoulderWidth * 2.05 * userScale;
  const height = torsoHeight * 1.18 * userScale;

  // El PNG comienza ligeramente por encima de la línea de hombros.
  const verticalOffset =
    torsoHeight * Number(offsetYControl.value);

  const topY =
    shoulderCenter.y - torsoHeight * 0.12 + verticalOffset;

  const values = smoothValue({
    x: shoulderCenter.x,
    y: topY,
    width,
    height,
    angle
  });

  ctx.save();
  ctx.translate(values.x, values.y);
  ctx.rotate(values.angle);

  // Dibujamos el PNG centrado.
  ctx.drawImage(
    shirt,
    -values.width / 2,
    0,
    values.width,
    values.height
  );

  ctx.restore();
}

function render() {
  if (!running) return;

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (shirt.complete && shirt.naturalWidth > 0 && video.readyState >= 2) {
    if (video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;

      const result = poseLandmarker.detectForVideo(
        video,
        performance.now()
      );

      const lm = result.landmarks?.[0];

      if (lm) {
        drawShirt(lm);
        drawPoseDebug(lm);
        message.style.display = "none";
      } else {
        smooth = null;
        message.style.display = "block";
        message.textContent = "No encuentro el cuerpo. Aléjate un poco de la cámara.";
      }
    }
  }

  requestAnimationFrame(render);
}

startButton.addEventListener("click", async () => {
  try {
    await startCamera();
  } catch (error) {
    console.error(error);
    message.textContent =
      "No se pudo activar la cámara. Revisa el permiso del navegador.";
  }
});

togglePoseButton.addEventListener("click", () => {
  showPose = !showPose;
  togglePoseButton.textContent =
    showPose ? "Ocultar puntos" : "Mostrar puntos";
});

window.addEventListener("beforeunload", () => {
  stream?.getTracks().forEach(track => track.stop());
});
