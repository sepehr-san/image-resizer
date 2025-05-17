const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const landscapeBtn = document.getElementById("landscapeBtn");
const mobileBtn = document.getElementById("mobileBtn");
const saveBtn = document.getElementById("save-btn");
const paintModeToggle = document.getElementById("paintModeToggle");

const baseCanvas = document.getElementById("base-canvas");
const drawCanvas = document.getElementById("draw-canvas");
const baseCtx = baseCanvas.getContext("2d");
const drawCtx = drawCanvas.getContext("2d");
const canvasContainer = document.getElementById("canvas-container");

let targetWidth = 1024;
let targetHeight = 576;
let originalFilename = "image";

landscapeBtn.addEventListener("click", () => {
  targetWidth = 1024;
  targetHeight = 576;
  landscapeBtn.classList.add("active");
  mobileBtn.classList.remove("active");
});

mobileBtn.addEventListener("click", () => {
  targetWidth = 340;
  targetHeight = 650;
  mobileBtn.classList.add("active");
  landscapeBtn.classList.remove("active");
});

dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("hover");
});
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("hover");
});
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("hover");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) {
    originalFilename = file.name.replace(/\.[^/.]+$/, "");
    processImage(file);
  }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file && file.type.startsWith("image/")) {
    originalFilename = file.name.replace(/\.[^/.]+$/, "");
    processImage(file);
  }
});

function processImage(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      baseCanvas.width = drawCanvas.width = targetWidth;
      baseCanvas.height = drawCanvas.height = targetHeight;

      const imgRatio = img.width / img.height;
      const canvasRatio = targetWidth / targetHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgRatio > canvasRatio) {
        drawHeight = targetHeight;
        drawWidth = img.width * (targetHeight / img.height);
        offsetX = (targetWidth - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = targetWidth;
        drawHeight = img.height * (targetWidth / img.width);
        offsetX = 0;
        offsetY = (targetHeight - drawHeight) / 2;
      }

      baseCtx.clearRect(0, 0, targetWidth, targetHeight);
      drawCtx.clearRect(0, 0, targetWidth, targetHeight);
      baseCtx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      if (paintModeToggle.checked) {
        canvasContainer.style.display = "block";
        saveBtn.style.display = "inline-block";
      } else {
        canvasContainer.style.display = "none";
        saveBtn.style.display = "none";
        // Auto download immediately
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = targetWidth;
        tempCanvas.height = targetHeight;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(baseCanvas, 0, 0);
        tempCanvas.toBlob(
          (blob) => {
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `resized_${originalFilename}.webp`;
            link.click();
          },
          "image/webp",
          1.0
        );
      }
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

let drawing = false;

function getXY(e) {
  const rect = drawCanvas.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const x = (clientX - rect.left) * (drawCanvas.width / rect.width);
  const y = (clientY - rect.top) * (drawCanvas.height / rect.height);
  return [x, y];
}

function startDrawing(e) {
  if (!paintModeToggle.checked) return;
  drawing = true;
  drawCtx.beginPath();
  const [x, y] = getXY(e);
  drawCtx.moveTo(x, y);
}

function draw(e) {
  if (!drawing || !paintModeToggle.checked) return;
  const [x, y] = getXY(e);
  drawCtx.strokeStyle = "rgba(255, 0, 0, 0.2)";
  drawCtx.lineWidth = 10;
  drawCtx.lineCap = "round";
  drawCtx.lineTo(x, y);
  drawCtx.stroke();
}

drawCanvas.addEventListener("mousedown", startDrawing);
drawCanvas.addEventListener("mousemove", draw);
drawCanvas.addEventListener("mouseup", () => (drawing = false));
drawCanvas.addEventListener("mouseleave", () => (drawing = false));
drawCanvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  startDrawing(e);
});
drawCanvas.addEventListener("touchmove", (e) => {
  e.preventDefault();
  draw(e);
});
drawCanvas.addEventListener("touchend", () => (drawing = false));

saveBtn.addEventListener("click", () => {
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext("2d");

  finalCtx.drawImage(baseCanvas, 0, 0);
  finalCtx.drawImage(drawCanvas, 0, 0);

  finalCanvas.toBlob(
    (blob) => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `resized_${originalFilename}.webp`;
      link.click();
    },
    "image/webp",
    1.0
  );
});
