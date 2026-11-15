const GRID_SIZE = 24;
const INK_WIDTH = 3;

export function restoreScratchpad(draft) {
  if (!draft) return null;
  const {width, height, strokes} = draft;
  const dimension = value => Number.isInteger(value) && value > 0 && value <= 4096;
  if (!dimension(width) || !dimension(height) || !Array.isArray(strokes) || !strokes.length) return null;
  const valid = strokes.every(stroke => Array.isArray(stroke) && stroke.length >= 2 && stroke.length % 2 === 0
    && stroke.every((point, i) => Number.isInteger(point) && point >= 0 && point <= (i % 2 ? height : width)));
  return valid ? {width, height, strokes} : null;
}

export function mountScratchpad(dialog, draft, onChange) {
  const canvas = dialog.querySelector('canvas');
  const ink = canvas.getContext('2d');
  if (!ink) return () => {};
  const paper = canvas.parentElement;
  const undo = dialog.querySelector('[data-scratchpad-undo]');
  const clear = dialog.querySelector('[data-scratchpad-clear]');
  const strokes = [...(draft?.strokes ?? [])];
  let width = draft?.width ?? 0;
  let height = draft?.height ?? 0;
  let drawing = null;

  function draw(stroke, from = 0) {
    ink.beginPath();
    if (stroke.length === 2) {
      ink.arc(stroke[0], stroke[1], INK_WIDTH / 2, 0, 2 * Math.PI);
      ink.fill();
      return;
    }
    ink.moveTo(stroke[from], stroke[from + 1]);
    for (let i = from + 2; i < stroke.length; i += 2) ink.lineTo(stroke[i], stroke[i + 1]);
    ink.stroke();
  }

  function resize() {
    const availableWidth = paper.clientWidth, availableHeight = paper.clientHeight;
    if (!availableWidth || !availableHeight) return;
    if (!strokes.length && !drawing) {
      width = availableWidth;
      height = availableHeight;
    }
    // Fit the original grid uniformly so handwriting keeps its proportions on rotation.
    const scale = Math.min(availableWidth / width, availableHeight / height);
    const density = Math.min(globalThis.devicePixelRatio || 1, 3);
    canvas.style.width = `${width * scale}px`;
    canvas.style.height = `${height * scale}px`;
    canvas.style.setProperty('--grid-size', `${GRID_SIZE * scale}px`);
    canvas.width = Math.max(1, Math.round(width * scale * density));
    canvas.height = Math.max(1, Math.round(height * scale * density));
    ink.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    ink.strokeStyle = ink.fillStyle = '#203c34';
    ink.lineWidth = INK_WIDTH;
    ink.lineJoin = ink.lineCap = 'round';
    strokes.forEach(stroke => draw(stroke));
    if (drawing) draw(drawing.stroke);
  }

  function syncButtons() {
    undo.disabled = clear.disabled = !strokes.length || Boolean(drawing);
  }

  function changed() {
    syncButtons();
    onChange(strokes.length ? {width, height, strokes:[...strokes]} : null);
  }

  function extend(event) {
    const {left, top, width:displayWidth, height:displayHeight} = canvas.getBoundingClientRect();
    if (!displayWidth || !displayHeight) return;
    const stroke = drawing.stroke, length = stroke.length;
    const moves = event.getCoalescedEvents?.();
    for (const point of moves?.length ? moves : [event]) {
      const x = Math.round(Math.max(0, Math.min(width, (point.clientX - left) * width / displayWidth)));
      const y = Math.round(Math.max(0, Math.min(height, (point.clientY - top) * height / displayHeight)));
      if (x !== stroke.at(-2) || y !== stroke.at(-1)) stroke.push(x, y);
    }
    if (stroke.length !== length) draw(stroke, Math.max(0, length - 2));
  }

  function finish() {
    if (!drawing) return;
    const {stroke} = drawing;
    drawing = null;
    if (!stroke.length) { syncButtons(); return; }
    strokes.push(stroke);
    changed();
  }

  const events = new AbortController();
  const options = {signal:events.signal};
  canvas.addEventListener('pointerdown', event => {
    if (drawing || event.button !== 0) return;
    drawing = {id:event.pointerId, stroke:[]};
    canvas.setPointerCapture(event.pointerId);
    extend(event);
    syncButtons();
  }, options);
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId === drawing?.id) extend(event);
  }, options);
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    canvas.addEventListener(name, event => {
      if (event.pointerId !== drawing?.id) return;
      if (name === 'pointerup') extend(event);
      finish();
    }, options);
  }
  canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
  undo.addEventListener('click', () => { strokes.pop(); resize(); changed(); }, options);
  clear.addEventListener('click', () => { strokes.length = 0; resize(); changed(); }, options);

  resize();
  syncButtons();
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (observer) observer.observe(paper);
  else window.addEventListener('resize', resize, options);
  return () => {
    observer?.disconnect();
    events.abort();
    finish();
  };
}
