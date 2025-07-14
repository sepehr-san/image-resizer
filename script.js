const dropZone         = document.getElementById("drop-zone");
const fileInput        = document.getElementById("file-input");
const landscapeBtn     = document.getElementById("landscapeBtn");
const mobileBtn        = document.getElementById("mobileBtn");
const saveBtn          = document.getElementById("save-btn");
const paintModeToggle  = document.getElementById("paintModeToggle");
const cropModeToggle   = document.getElementById("cropModeToggle");

const baseCanvas       = document.getElementById("base-canvas");
const drawCanvas       = document.getElementById("draw-canvas");
const baseCtx          = baseCanvas.getContext("2d");
const drawCtx          = drawCanvas.getContext("2d");
const canvasContainer  = document.getElementById("canvas-container");

let targetWidth   = 1024, targetHeight = 576;
let originalFilename = "image";

// state for cropping
let img, imgX = 0, imgY = 0, imgScale = 1;
let isDragging = false, dragStartX = 0, dragStartY = 0;

// state for painting
let drawing = false;

// ——— Size buttons ———
landscapeBtn.addEventListener("click", () => {
  targetWidth = 1024; targetHeight = 576;
  landscapeBtn.classList.add("active");
  mobileBtn.classList.remove("active");
});
mobileBtn.addEventListener("click", () => {
  targetWidth = 340; targetHeight = 650;
  mobileBtn.classList.add("active");
  landscapeBtn.classList.remove("active");
});

// ——— File drop / select ———
dropZone.addEventListener("click", () => fileInput.click());
["dragover","dragleave","drop"].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.toggle("hover", evt==="dragover");
    if(evt==="drop"){
      const f = e.dataTransfer.files[0];
      if(f && f.type.startsWith("image/")){
        originalFilename = f.name.replace(/\.[^/.]+$/,"");
        processImage(f);
      }
    }
  });
});
fileInput.addEventListener("change", () => {
  const f = fileInput.files[0];
  if(f && f.type.startsWith("image/")){
    originalFilename = f.name.replace(/\.[^/.]+$/,"");
    processImage(f);
  }
});

// ——— Main image loader & setup ———
function processImage(file){
  const reader = new FileReader();
  reader.onload = e => {
    img = new Image();
    img.onload = () => {
      baseCanvas.width = drawCanvas.width = targetWidth;
      baseCanvas.height = drawCanvas.height = targetHeight;

      // initial scale & centering
      const fitRatio = Math.max(targetWidth / img.width, targetHeight / img.height);
      imgScale = fitRatio;
      imgX = (targetWidth - img.width * imgScale) / 2;
      imgY = (targetHeight - img.height * imgScale) / 2;

      drawCtx.clearRect(0,0,targetWidth,targetHeight);

      if(cropModeToggle.checked){
        enterCropMode();
      } else if(paintModeToggle.checked){
        enterPaintMode();
      } else {
        exitAllModesAndAutoDownload();
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ——— Draw base image ———
function redrawBase(){
  baseCtx.clearRect(0,0,targetWidth,targetHeight);
  baseCtx.drawImage(img, imgX, imgY, img.width * imgScale, img.height * imgScale);

  //baseCtx.save();
  //baseCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  //baseCtx.lineWidth   = 2;
  //baseCtx.strokeRect(0, 0, targetWidth, targetHeight);
  //baseCtx.restore();
}

// ——— Mode handlers ———
function enterCropMode(){
  canvasContainer.style.display = "block";
  saveBtn.style.display      = "inline-block";
  baseCanvas.style.display   = "block";
  drawCanvas.style.display   = "none";
  redrawBase();
}

function enterPaintMode(){
  canvasContainer.style.display = "block";
  saveBtn.style.display      = "inline-block";
  baseCanvas.style.display   = "block";
  drawCanvas.style.display   = "block";
  redrawBase();
}

async function exitAllModesAndAutoDownload(){
  canvasContainer.style.display = "none";
  saveBtn.style.display = "none";
  redrawBase();
  const tmp = document.createElement("canvas");
  tmp.width = targetWidth;
  tmp.height = targetHeight;
  tmp.getContext("2d").drawImage(baseCanvas, 0, 0);

  const blob = await exportCanvasBelowSize(tmp);

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ramzinex-${originalFilename}.webp`;
  link.click();
}


// ——— Utility: map pointer/touch to canvas coords ———
function getXY(e, canvas){
  const rect = canvas.getBoundingClientRect();
  const p = (e.touches && e.touches[0]) || e;
  return [
    (p.clientX - rect.left) * (canvas.width / rect.width),
    (p.clientY - rect.top ) * (canvas.height / rect.height)
  ];
}

// ——— Clamp image to cover frame ———
function clampImagePosition(){
  const minX = targetWidth - img.width * imgScale;
  const minY = targetHeight - img.height * imgScale;
  // X between [minX, 0]
  imgX = Math.min(0, Math.max(imgX, minX));
  // Y between [minY, 0]
  imgY = Math.min(0, Math.max(imgY, minY));
}

// ——— Crop Drag Handlers on baseCanvas ———
baseCanvas.addEventListener("mousedown", e => {
  if(!cropModeToggle.checked) return;
  isDragging = true;
  const [x,y] = getXY(e, baseCanvas);
  dragStartX = x - imgX;
  dragStartY = y - imgY;
});
baseCanvas.addEventListener("mousemove", e => {
  if(!isDragging || !cropModeToggle.checked) return;
  const [x,y] = getXY(e, baseCanvas);
  imgX = x - dragStartX;
  imgY = y - dragStartY;
  clampImagePosition();
  redrawBase();
});
["mouseup","mouseleave"].forEach(evt =>
  baseCanvas.addEventListener(evt, () => {
    if(cropModeToggle.checked) isDragging = false;
  })
);
// touch
baseCanvas.addEventListener("touchstart", e => {
  if(!cropModeToggle.checked) return;
  e.preventDefault();
  isDragging = true;
  const [x,y] = getXY(e, baseCanvas);
  dragStartX = x - imgX;
  dragStartY = y - imgY;
});
baseCanvas.addEventListener("touchmove", e => {
  if(!isDragging || !cropModeToggle.checked) return;
  e.preventDefault();
  const [x,y] = getXY(e, baseCanvas);
  imgX = x - dragStartX;
  imgY = y - dragStartY;
  clampImagePosition();
  redrawBase();
});
baseCanvas.addEventListener("touchend", () => {
  if(cropModeToggle.checked) isDragging = false;
});

// ——— Paint Handlers on drawCanvas ———
function startPainting(e){
  if(!paintModeToggle.checked || cropModeToggle.checked) return;
  drawing = true;
  drawCtx.beginPath();
  const [x,y] = getXY(e, drawCanvas);
  drawCtx.moveTo(x,y);
}
function paint(e){
  if(!drawing || !paintModeToggle.checked || cropModeToggle.checked) return;
  const [x,y] = getXY(e, drawCanvas);
  drawCtx.lineTo(x,y);
  drawCtx.strokeStyle = "rgba(255,0,0,0.2)";
  drawCtx.lineWidth   = 10;
  drawCtx.lineCap     = "round";
  drawCtx.stroke();
}
drawCanvas.addEventListener("mousedown", startPainting);
drawCanvas.addEventListener("mousemove", paint);
["mouseup","mouseleave"].forEach(evt =>
  drawCanvas.addEventListener(evt, () => drawing = false)
);
// touch
drawCanvas.addEventListener("touchstart", e => {
  if(cropModeToggle.checked) return;
  e.preventDefault();
  startPainting(e);
});
drawCanvas.addEventListener("touchmove", e => {
  if(cropModeToggle.checked) return;
  e.preventDefault();
  paint(e);
});
drawCanvas.addEventListener("touchend", () => drawing = false);

// ——— Save Button ———
saveBtn.addEventListener("click", async () => {
  const out = document.createElement("canvas");
  out.width = targetWidth;
  out.height = targetHeight;
  const ctx = out.getContext("2d");
  ctx.drawImage(baseCanvas, 0, 0);
  if (paintModeToggle.checked && !cropModeToggle.checked) {
    ctx.drawImage(drawCanvas, 0, 0);
  }
  const blob = await exportCanvasBelowSize(out);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ramzinex-${originalFilename}.webp`;
  link.click();
});


// change image quality based on output size
async function exportCanvasBelowSize(canvas, maxSizeBytes = 100 * 1024, mimeType = "image/webp") {
  let quality = 1;
  const minQuality = 0.3;
  const decrement = 0.05;

  return new Promise((resolve) => {
    function tryExport() {
      canvas.toBlob((blob) => {
        if (blob.size <= maxSizeBytes || quality <= minQuality) {
          resolve(blob);
        } else {
          quality -= decrement;
          tryExport();
        }
      }, mimeType, quality);
    }
    tryExport();
  });
}
