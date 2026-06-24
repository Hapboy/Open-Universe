// Open Universe (Hayverse) Node Studio - Core Application Logic

// 1. PWA & Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}

// PWA Install Prompt Handler
let deferredInstallPrompt = null;
const btnInstall = document.getElementById('btnInstall');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (btnInstall) btnInstall.hidden = false;
});

if (btnInstall) {
  btnInstall.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log(`PWA installation outcome: ${outcome}`);
    deferredInstallPrompt = null;
    btnInstall.hidden = true;
  });
}

// 2. Data Models and Types
const PORT_TYPES = {
  IMAGE: 'Image',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  TEXT: 'Text'
};

// Preset lists for nodes
const FACIAL_REFS = [
  { name: 'Ара Гехецик (Канон)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { name: 'Анаит (Канон)', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { name: 'Давид Сасунский', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' }
];

const HIGGSFIELD_PRESETS = ['Орбита (360°)', 'Crash-Zoom', 'Bullet-Time', 'Панорамирование', 'Наезд снизу'];

const DEFAULT_PINS = [
  { id: 'pin1', title: 'Армянский орнамент', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300' },
  { id: 'pin2', title: 'Старый Конд эскиз', image: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=300' },
  { id: 'pin3', title: 'Горный пейзаж Гарни', image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300' },
  { id: 'pin4', title: 'Национальный Тараз', image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300' }
];

// Node Definitions (Templates)
const NODE_TEMPLATES = {
  // Pinterest Board Connector Node
  pinterest_board: {
    type: 'pinterest_board',
    label: 'Pinterest Доска',
    icon: 'ti-social',
    color: 'var(--color-node-pinterest)',
    inputs: [],
    outputs: [
      { name: 'Pin Image', type: PORT_TYPES.IMAGE }
    ],
    params: {
      boardId: '',
      boardName: 'Выберите доску...',
      selectedPin: DEFAULT_PINS[0].image,
      pins: DEFAULT_PINS
    }
  },
  
  // Higgsfield Soul (Image Gen) Node
  higgsfield_soul: {
    type: 'higgsfield_soul',
    label: 'Higgsfield Soul',
    icon: 'ti-sparkles',
    color: 'var(--color-node-higgsfield)',
    inputs: [
      { name: 'Face Ref', type: PORT_TYPES.IMAGE },
      { name: 'Style Prompt', type: PORT_TYPES.TEXT }
    ],
    outputs: [
      { name: 'Generated Frame', type: PORT_TYPES.IMAGE }
    ],
    params: {
      prompt: 'Эстетичный кадр, армянский авангард, свет Сарьяна',
      faceWeight: 0.8,
      seed: 42
    }
  },
  
  // Higgsfield Camera Motion Node
  higgsfield_camera: {
    type: 'higgsfield_camera',
    label: 'Higgsfield Motion',
    icon: 'ti-video',
    color: 'var(--color-node-higgsfield)',
    inputs: [
      { name: 'Frame Input', type: PORT_TYPES.IMAGE }
    ],
    outputs: [
      { name: 'Camera Video', type: PORT_TYPES.VIDEO }
    ],
    params: {
      motionPreset: 'Орбита (360°)',
      speed: 1.2
    }
  },
  
  // Higgsfield Speak Node
  higgsfield_speak: {
    type: 'higgsfield_speak',
    label: 'Higgsfield Speak',
    icon: 'ti-message-chatbot',
    color: 'var(--color-node-higgsfield)',
    inputs: [
      { name: 'Avatar Frame', type: PORT_TYPES.IMAGE },
      { name: 'Audio Voice', type: PORT_TYPES.AUDIO }
    ],
    outputs: [
      { name: 'Lipsync Video', type: PORT_TYPES.VIDEO }
    ],
    params: {
      expression: 'Эмоциональный диалог',
      language: 'Армянский'
    }
  },
  
  // Output Scene Node
  output_scene: {
    type: 'output_scene',
    label: 'Выходная Сцена',
    icon: 'ti-movie',
    color: 'var(--color-node-scene)',
    inputs: [
      { name: 'Visual Render', type: PORT_TYPES.IMAGE },
      { name: 'Motion Render', type: PORT_TYPES.VIDEO }
    ],
    outputs: [],
    params: {
      renderingEngine: 'Hayverse Realtime Veo 3'
    }
  },

  // Helper/Text Node
  text_prompt: {
    type: 'text_prompt',
    label: 'Текстовый Промпт',
    icon: 'ti-notes',
    color: 'var(--color-node-util)',
    inputs: [],
    outputs: [
      { name: 'Text Out', type: PORT_TYPES.TEXT }
    ],
    params: {
      text: 'Винтажные тона, Кондский дворик в дымке'
    }
  }
};

// 3. Application State
const state = {
  theme: 'dark',
  apiKeys: {
    pinterestToken: localStorage.getItem('hv_pinterest_token') || '',
    higgsfieldKey: localStorage.getItem('hv_higgsfield_key') || ''
  },
  currentUser: JSON.parse(localStorage.getItem('hv_current_user')) || null,
  team: [
    { name: 'Арам', charName: 'Аракс', side: 'moct', role: 'Разработчик', isMe: false },
    { name: 'Сона', charName: 'Ани', side: 'urvakan', role: 'Стилист', isMe: false },
    { name: 'Карен', charName: 'Давид', side: 'rambalkoshe', role: 'Художник', isMe: false }
  ],
  nodes: [],
  connections: [],
  selectedNodeId: null,
  
  // Movie / Player States
  movieTime: 330,
  isPlaying: false,
  activeSceneIndex: 3,
  
  // Dragging connection helpers
  activeDragPort: null
};

// Scenarios/Scenes configuration
const SCENES = [
  { id: 'sc1', num: '01', title: 'Пролог · Севан', sub: '— Море помнит больше, чем мы.', color: '#CFE8FB', sky: '#272252', ground: '#23233a' },
  { id: 'sc2', num: '02', title: 'Дорога в горах', sub: '— Куда ведёт эта тропа? — Домой.', color: '#FBEAF0', sky: '#FAEEDA', ground: '#C0DD97' },
  { id: 'sc3', num: '03', title: 'Рынок Вернисаж', sub: '— Эту вещь делал мой дед.', color: '#FAEEDA', sky: '#F5C4B3', ground: '#97C459' },
  { id: 'sc4', num: '04', title: 'Утро в Конде', sub: '— В Конде солнце приходит позже всех.', color: '#E1F5EE', sky: '#FAEEDA', ground: '#5DCAA5' },
  { id: 'sc5', num: '05', title: 'Мастерская', sub: '— Краска ещё живая, не трогай.', color: '#E6F1FB', sky: '#CFE8FB', ground: '#97C459' },
  { id: 'sc6', num: '06', title: 'Закат · Каскад', sub: '— Город горит, но не сгорает.', color: '#FCEBEB', sky: '#F5C4B3', ground: '#23233a' },
  { id: 'sc7', num: '07', title: 'Двор', sub: '— Здесь все друг другу родня.', color: '#EAF3DE', sky: '#FAEEDA', ground: '#C0DD97' },
  { id: 'sc8', num: '08', title: 'Финал · Канон', sub: '— Мы остаёмся. Всегда остаёмся.', color: '#EEEDFE', sky: '#26215C', ground: '#1c1c2e' }
];

// 4. API Mock & Live Services
const PinterestService = {
  async fetchBoards(token) {
    const MOCK = [
      { id: 'board_art', name: 'Армянский Авангард' },
      { id: 'board_kond', name: 'Конд Архитектура' },
      { id: 'board_taraz', name: 'Тараз & Одежда' }
    ];
    if (!token) return MOCK;
    try {
      showToast('Загрузка досок Pinterest...');
      const response = await fetch('https://api.pinterest.com/v5/boards', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Ошибка авторизации Pinterest');
      const data = await response.json();
      return data.items || [];
    } catch (err) {
      console.warn('Pinterest API error, falling back to mock:', err);
      showToast('Pinterest API: Ошибка CORS/Авторизации. Включен симулятор.');
      return [
        { id: 'board_art', name: 'Армянский Авангард' },
        { id: 'board_kond', name: 'Конд Архитектура' },
        { id: 'board_taraz', name: 'Тараз & Одежда' }
      ];
    }
  },
  
  async fetchPins(token, boardId) {
    if (!token || boardId.startsWith('mock_') || !boardId) {
      // Return simulated Pins based on selected board type
      if (boardId === 'board_kond') {
        return [
          { id: 'pk1', title: 'Узкие улочки Конда', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300' },
          { id: 'pk2', title: 'Старый дом с эркером', image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300' },
          { id: 'pk3', title: 'Красная крыша', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300' }
        ];
      } else if (boardId === 'board_taraz') {
        return [
          { id: 'pt1', title: 'Вышивка Loom Weaving', image: 'https://images.unsplash.com/photo-1618220179428-22790b461013?w=300' },
          { id: 'pt2', title: 'Красный пояс тараз', image: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?w=300' }
        ];
      }
      return DEFAULT_PINS;
    }
    
    try {
      const response = await fetch(`https://api.pinterest.com/v5/boards/${boardId}/pins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Ошибка получения пинов');
      const data = await response.json();
      return (data.items || []).map(p => ({
        id: p.id,
        title: p.title || 'Pinterest Pin',
        image: p.media?.images?.['400x300']?.url || p.media?.images?.originals?.url || DEFAULT_PINS[0].image
      }));
    } catch (err) {
      console.warn('Pinterest API error loading pins:', err);
      return DEFAULT_PINS;
    }
  }
};

const HiggsfieldService = {
  async runSoul(apiKey, prompt, faceRefUrl) {
    if (apiKey) {
      try {
        showToast('Higgsfield Soul: Запуск генерации...');
        const response = await fetch('https://api.higgsfield.ai/v1/soul/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ prompt, face_reference_url: faceRefUrl })
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        return data.image_url;
      } catch (e) {
        console.warn('Higgsfield API error, using simulation.');
      }
    }
    // Simulate beautiful generated output
    showToast('Higgsfield Soul: Кадр успешно сгенерирован (симуляция)');
    return faceRefUrl || DEFAULT_PINS[1].image;
  },

  async runMotion(apiKey, frameUrl, preset) {
    showToast(`Higgsfield Motion: Пресет ${preset} применен к кадру`);
    return true; // Returns completion status
  },

  async runSpeak(apiKey, avatarUrl, speechText) {
    showToast(`Higgsfield Speak: Липсинк завершен для: "${speechText.substring(0, 15)}..."`);
    return true;
  }
};

// 5. Node Editor Engine (Drag, Connect, Ports)
const canvas = document.getElementById('canvas');
const canvasWrap = document.getElementById('canvasWrap');
const wiresSvg = document.getElementById('wires');

// Setup Palette
function initPalette() {
  const palette = document.getElementById('palette');
  palette.innerHTML = '';
  
  const groups = {
    'Источники & Сетки': ['pinterest_board', 'text_prompt'],
    'Нейросети (Higgsfield AI)': ['higgsfield_soul', 'higgsfield_camera', 'higgsfield_speak'],
    'Выводы графа': ['output_scene']
  };
  
  for (const [groupName, keys] of Object.entries(groups)) {
    const sec = document.createElement('div');
    sec.className = 'palette-section';
    sec.innerHTML = `<div class="palette-h">${groupName}</div>`;
    
    keys.forEach(k => {
      const temp = NODE_TEMPLATES[k];
      const item = document.createElement('div');
      item.className = 'palette-item';
      item.draggable = true;
      item.innerHTML = `<i class="ti ${temp.icon}"></i><span>${temp.label}</span>`;
      item.style.setProperty('--nc', temp.color);
      
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('node-template-type', k);
      });
      sec.appendChild(item);
    });
    
    palette.appendChild(sec);
  }
}

// Drag & Drop onto Canvas
canvasWrap.addEventListener('dragover', (e) => e.preventDefault());
canvasWrap.addEventListener('drop', (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData('node-template-type');
  if (!NODE_TEMPLATES[type]) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left - 110;
  const y = e.clientY - rect.top - 40;
  
  createNode(type, x, y);
});

function createNode(type, x, y) {
  const template = NODE_TEMPLATES[type];
  const id = `node_${Date.now()}`;
  
  const newNode = {
    id,
    type,
    label: template.label,
    icon: template.icon,
    color: template.color,
    x: Math.max(0, x),
    y: Math.max(0, y),
    inputs: template.inputs.map((inp, idx) => ({ ...inp, id: `${id}_in_${idx}` })),
    outputs: template.outputs.map((out, idx) => ({ ...out, id: `${id}_out_${idx}` })),
    params: JSON.parse(JSON.stringify(template.params))
  };
  
  state.nodes.push(newNode);
  renderNodes();
  selectNode(id);
  
  // Trigger board fetch if it is a Pinterest node
  if (type === 'pinterest_board') {
    loadPinterestBoardsForNode(newNode);
  }
}

function renderNodes() {
  // Remove existing nodes DOM (excluding SVG wires)
  const existingNodeElems = canvas.querySelectorAll('.node');
  existingNodeElems.forEach(el => el.remove());
  
  state.nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = `node ${state.selectedNodeId === node.id ? 'sel' : ''}`;
    el.id = node.id;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.setProperty('--nc', node.color);
    
    // Node Header
    const h = document.createElement('div');
    h.className = 'node-h';
    h.innerHTML = `<i class="ti ${node.icon}"></i><span>${node.label}</span>`;
    el.appendChild(h);
    
    // Node Body
    const body = document.createElement('div');
    body.className = 'node-body';
    let valStr = '';
    if (node.type === 'pinterest_board') {
      valStr = node.params.boardName;
    } else if (node.type === 'higgsfield_soul') {
      valStr = node.params.prompt;
    } else if (node.type === 'higgsfield_camera') {
      valStr = node.params.motionPreset;
    } else if (node.type === 'higgsfield_speak') {
      valStr = node.params.expression;
    } else if (node.type === 'text_prompt') {
      valStr = node.params.text;
    } else {
      valStr = node.params.renderingEngine || 'Активен';
    }
    body.innerHTML = `<div class="node-title-val">${valStr}</div>`;
    el.appendChild(body);
    
    // Ports Row
    const ports = document.createElement('div');
    ports.className = 'node-ports';
    
    // Render Inputs
    node.inputs.forEach((inp, idx) => {
      const portEl = document.createElement('div');
      portEl.className = 'port port-in';
      portEl.id = inp.id;
      portEl.style.setProperty('--nc', node.color);
      portEl.setAttribute('data-type', inp.type);
      portEl.style.top = `${10 + idx * 20}px`;
      portEl.addEventListener('pointerdown', (e) => handlePortDragStart(e, inp, 'input', node));
      ports.appendChild(portEl);
    });
    
    // Render Outputs
    node.outputs.forEach((out, idx) => {
      const portEl = document.createElement('div');
      portEl.className = 'port port-out';
      portEl.id = out.id;
      portEl.style.setProperty('--nc', node.color);
      portEl.setAttribute('data-type', out.type);
      portEl.style.top = `${10 + idx * 20}px`;
      portEl.addEventListener('pointerdown', (e) => handlePortDragStart(e, out, 'output', node));
      ports.appendChild(portEl);
    });
    
    el.appendChild(ports);
    
    // Mouse Dragging for Node positioning
    attachNodeDrag(el, node);
    
    // Selection
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNode(node.id);
    });
    
    canvas.appendChild(el);
  });
  
  drawWires();
}

function attachNodeDrag(el, node) {
  let startX, startY;
  let origX, origY;
  let isMoving = false;
  
  el.addEventListener('pointerdown', (e) => {
    // Prevent dragging node if clicking on ports
    if (e.target.classList.contains('port')) return;
    
    isMoving = true;
    startX = e.clientX;
    startY = e.clientY;
    origX = node.x;
    origY = node.y;
    el.setPointerCapture(e.pointerId);
  });
  
  el.addEventListener('pointermove', (e) => {
    if (!isMoving) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    node.x = Math.max(0, origX + dx);
    node.y = Math.max(0, origY + dy);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    drawWires();
  });
  
  el.addEventListener('pointerup', (e) => {
    if (isMoving) {
      el.releasePointerCapture(e.pointerId);
      isMoving = false;
    }
  });
}

// 6. Port Wiring Logic (Interactive Drag Connections)
function handlePortDragStart(e, port, dir, node) {
  e.stopPropagation();
  e.preventDefault();
  state.activeDragPort = { port, dir, node, startX: e.clientX, startY: e.clientY };
  canvas.addEventListener('pointermove', handlePortDragMove);
  canvas.addEventListener('pointerup', handlePortDragEnd);
}

function handlePortDragMove(e) {
  if (!state.activeDragPort) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  
  const portEl = document.getElementById(state.activeDragPort.port.id);
  const portRect = portEl.getBoundingClientRect();
  const startX = portRect.left + portRect.width / 2 - rect.left;
  const startY = portRect.top + portRect.height / 2 - rect.top;
  
  drawTempWire(startX, startY, mouseX, mouseY);
}

function handlePortDragEnd(e) {
  canvas.removeEventListener('pointermove', handlePortDragMove);
  canvas.removeEventListener('pointerup', handlePortDragEnd);
  
  const tempPath = document.getElementById('temp-wire');
  if (tempPath) tempPath.remove();
  
  const targetPortEl = document.elementFromPoint(e.clientX, e.clientY);
  if (targetPortEl && targetPortEl.classList.contains('port')) {
    const targetNodeEl = targetPortEl.closest('.node');
    const targetNode = state.nodes.find(n => n.id === targetNodeEl.id);
    const targetPortId = targetPortEl.id;
    
    // Find target port definition
    let targetPort = null;
    let targetDir = '';
    
    const isInput = targetPortEl.classList.contains('port-in');
    targetDir = isInput ? 'input' : 'output';
    
    if (isInput) {
      targetPort = targetNode.inputs.find(p => p.id === targetPortId);
    } else {
      targetPort = targetNode.outputs.find(p => p.id === targetPortId);
    }
    
    if (targetPort && targetNode) {
      connectPorts(state.activeDragPort, { port: targetPort, dir: targetDir, node: targetNode });
    }
  }
  
  state.activeDragPort = null;
}

function connectPorts(source, target) {
  // Connections must go from Output to Input (or vice-versa)
  if (source.dir === target.dir) {
    showToast('Нельзя соединить порты одного направления!');
    return;
  }
  
  const output = source.dir === 'output' ? source : target;
  const input = source.dir === 'input' ? source : target;
  
  // Port Type verification
  if (output.port.type !== input.port.type) {
    showToast(`Несовместимые типы данных! Порт требует: ${input.port.type}, а вы подаете: ${output.port.type}`);
    return;
  }
  
  // Prevent duplicate connections or multiple inputs on same port
  const existingIndex = state.connections.findIndex(c => c.toPortId === input.port.id);
  if (existingIndex !== -1) {
    // Remove old connection
    state.connections.splice(existingIndex, 1);
  }
  
  state.connections.push({
    fromNodeId: output.node.id,
    fromPortId: output.port.id,
    toNodeId: input.node.id,
    toPortId: input.port.id,
    type: output.port.type
  });
  
  showToast('Связь успешно создана!');
  renderNodes();
  executeGraph();
}

function drawTempWire(x1, y1, x2, y2) {
  let tempPath = document.getElementById('temp-wire');
  if (!tempPath) {
    tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.id = 'temp-wire';
    tempPath.style.stroke = '#ef9f27';
    tempPath.style.strokeWidth = '2.5';
    tempPath.style.fill = 'none';
    tempPath.style.strokeDasharray = '5, 5';
    wiresSvg.appendChild(tempPath);
  }
  
  const dx = Math.abs(x2 - x1) * 0.5;
  const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  tempPath.setAttribute('d', path);
}

function drawWires() {
  // Clear connections except temp wires
  const paths = wiresSvg.querySelectorAll('path:not(#temp-wire)');
  paths.forEach(p => p.remove());
  
  state.connections.forEach(conn => {
    const fromEl = document.getElementById(conn.fromPortId);
    const toEl = document.getElementById(conn.toPortId);
    
    if (!fromEl || !toEl) return;
    
    const rect = canvas.getBoundingClientRect();
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    
    const x1 = fromRect.left + fromRect.width / 2 - rect.left;
    const y1 = fromRect.top + fromRect.height / 2 - rect.top;
    const x2 = toRect.left + toRect.width / 2 - rect.left;
    const y2 = toRect.top + toRect.height / 2 - rect.top;
    
    const dx = Math.abs(x2 - x1) * 0.5;
    const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    
    // Choose connection color based on port types
    let strokeColor = 'var(--color-text-tertiary)';
    if (conn.type === PORT_TYPES.IMAGE) strokeColor = 'var(--color-node-scene)';
    else if (conn.type === PORT_TYPES.VIDEO) strokeColor = 'var(--color-node-higgsfield)';
    else if (conn.type === PORT_TYPES.TEXT) strokeColor = 'var(--color-node-pinterest)';
    
    path.style.stroke = strokeColor;
    path.style.fill = 'none';
    path.style.strokeWidth = '2.5';
    
    wiresSvg.appendChild(path);
  });
}

// Execute logic in node tree (Propagate inputs to outputs)
async function executeGraph() {
  document.getElementById('statJobs').textContent = 'очередь: 1';
  let graphChanged = false;
  
  // Track resolved node outputs in local dictionary
  const resolvedOutputs = {};
  
  // Simple iteration to resolve simple inputs/outputs.
  // In a real system, we'd do a topological sort. For this node editor, we run sequentially.
  for (let i = 0; i < state.nodes.length; i++) {
    for (const node of state.nodes) {
      if (node.type === 'pinterest_board') {
        resolvedOutputs[node.outputs[0].id] = node.params.selectedPin;
      }
      else if (node.type === 'text_prompt') {
        resolvedOutputs[node.outputs[0].id] = node.params.text;
      }
      else if (node.type === 'higgsfield_soul') {
        // Inputs: Face Ref (0), Style Prompt (1)
        const faceConn = state.connections.find(c => c.toPortId === node.inputs[0].id);
        const promptConn = state.connections.find(c => c.toPortId === node.inputs[1].id);
        
        const faceVal = faceConn ? resolvedOutputs[faceConn.fromPortId] : null;
        const promptVal = promptConn ? resolvedOutputs[promptConn.fromPortId] : node.params.prompt;
        
        // Simulates triggering the Higgsfield API call
        const key = state.apiKeys.higgsfieldKey;
        const outputVal = await HiggsfieldService.runSoul(key, promptVal, faceVal);
        
        resolvedOutputs[node.outputs[0].id] = outputVal;
      }
      else if (node.type === 'higgsfield_camera') {
        const frameConn = state.connections.find(c => c.toPortId === node.inputs[0].id);
        const frameVal = frameConn ? resolvedOutputs[frameConn.fromPortId] : null;
        
        await HiggsfieldService.runMotion(state.apiKeys.higgsfieldKey, frameVal, node.params.motionPreset);
        resolvedOutputs[node.outputs[0].id] = frameVal; // outputs video rendering
      }
      else if (node.type === 'higgsfield_speak') {
        const avatarConn = state.connections.find(c => c.toPortId === node.inputs[0].id);
        const avatarVal = avatarConn ? resolvedOutputs[avatarConn.fromPortId] : null;
        
        await HiggsfieldService.runSpeak(state.apiKeys.higgsfieldKey, avatarVal, node.params.expression);
        resolvedOutputs[node.outputs[0].id] = avatarVal;
      }
    }
  }
  
  // Find output scene node and apply override
  const outNode = state.nodes.find(n => n.type === 'output_scene');
  if (outNode) {
    const visualConn = state.connections.find(c => c.toPortId === outNode.inputs[0].id);
    const motionConn = state.connections.find(c => c.toPortId === outNode.inputs[1].id);
    
    if (visualConn && resolvedOutputs[visualConn.fromPortId]) {
      // Set custom render image
      window.customRenderImage = resolvedOutputs[visualConn.fromPortId];
      graphChanged = true;
    } else if (motionConn && resolvedOutputs[motionConn.fromPortId]) {
      window.customRenderImage = resolvedOutputs[motionConn.fromPortId];
      graphChanged = true;
    } else {
      window.customRenderImage = null;
    }
  }
  
  document.getElementById('statJobs').textContent = 'очередь: 0';
  
  if (graphChanged) {
    showToast('Кадр фильма обновлен на основе выходов графа!');
  }
  renderPlayer();
}

// 7. Pinterest Node Loader (Boards & Pins list integration)
async function loadPinterestBoardsForNode(node) {
  const boards = await PinterestService.fetchBoards(state.apiKeys.pinterestToken);
  node.params.boards = boards;
  
  if (boards.length > 0 && !node.params.boardId) {
    node.params.boardId = boards[0].id;
    node.params.boardName = boards[0].name;
    loadPinterestPinsForNode(node, boards[0].id);
  }
  
  if (state.selectedNodeId === node.id) {
    renderInspector();
  }
}

async function loadPinterestPinsForNode(node, boardId) {
  const pins = await PinterestService.fetchPins(state.apiKeys.pinterestToken, boardId);
  node.params.pins = pins;
  
  if (pins.length > 0) {
    node.params.selectedPin = pins[0].image;
  }
  
  if (state.selectedNodeId === node.id) {
    renderInspector();
  }
  
  executeGraph();
}

// 8. Inspector Rendering and Param Editors
function selectNode(id) {
  state.selectedNodeId = id;
  const nodes = canvas.querySelectorAll('.node');
  nodes.forEach(n => n.classList.toggle('sel', n.id === id));
  
  const selectedNode = state.nodes.find(n => n.id === id);
  if (selectedNode) {
    document.getElementById('statSel').textContent = `${selectedNode.label} (${selectedNode.id})`;
  } else {
    document.getElementById('statSel').textContent = '—';
  }
  
  renderInspector();
}

// Cancel selection if clicking on stage
canvas.addEventListener('click', () => {
  selectNode(null);
});

function renderInspector() {
  const container = document.getElementById('inspector');
  container.innerHTML = '';
  
  if (!state.selectedNodeId) {
    container.innerHTML = `<div class="insp-empty">Выбери ноду на холсте, чтобы настроить её свойства и API параметры.</div>`;
    
    // Always render global Player at top of inspector even when no node selected
    renderGlobalPlayerSection(container);
    return;
  }
  
  const node = state.nodes.find(n => n.id === state.selectedNodeId);
  if (!node) return;
  
  // Insp Header
  const h = document.createElement('div');
  h.className = 'insp-section';
  h.innerHTML = `
    <div class="insp-h" style="--nc: ${node.color}">
      <i class="ti ${node.icon}"></i>
      <span>Свойства: ${node.label}</span>
    </div>
    <div class="fld">
      <span>Имя ноды</span>
      <input type="text" id="insp-node-label" value="${node.label}">
    </div>
    <button class="btn" id="btnDeleteNode" style="color: var(--color-text-danger); border-color: var(--color-text-danger); margin-top: 6px;"><i class="ti ti-trash"></i> Удалить ноду</button>
  `;
  container.appendChild(h);
  
  document.getElementById('insp-node-label').addEventListener('input', (e) => {
    node.label = e.target.value;
    const nodeEl = document.getElementById(node.id);
    if (nodeEl) nodeEl.querySelector('.node-h span').textContent = node.label;
  });
  
  document.getElementById('btnDeleteNode').onclick = () => {
    deleteNode(node.id);
  };
  
  // Params Section
  const paramsSection = document.createElement('div');
  paramsSection.className = 'insp-section';
  paramsSection.innerHTML = `<h5>Параметры ноды</h5><br>`;
  
  if (node.type === 'pinterest_board') {
    const boards = node.params.boards || [];
    const pins = node.params.pins || [];
    
    let boardOptions = boards.map(b => `<option value="${b.id}" ${node.params.boardId === b.id ? 'selected' : ''}>${b.name}</option>`).join('');
    if (boards.length === 0) {
      boardOptions = `<option value="">Сначала введите API Pinterest в настройках...</option>`;
    }
    
    paramsSection.innerHTML += `
      <div class="fld">
        <span>Pinterest Доска</span>
        <select id="insp-pin-board">${boardOptions}</select>
      </div>
      <div class="fld">
        <span>Выберите изображение (Pin)</span>
        <div class="pinterest-pins-grid">
          ${pins.map(p => `
            <div class="pinterest-pin-item ${node.params.selectedPin === p.image ? 'sel' : ''}" 
                 style="background-image: url('${p.image}')" 
                 title="${p.title}" 
                 data-img="${p.image}">
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    container.appendChild(paramsSection);
    
    const boardSel = document.getElementById('insp-pin-board');
    boardSel.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const selectedName = e.target.options[e.target.selectedIndex].text;
      node.params.boardId = selectedId;
      node.params.boardName = selectedName;
      
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) nodeEl.querySelector('.node-title-val').textContent = selectedName;
      
      loadPinterestPinsForNode(node, selectedId);
    });
    
    const pinItems = paramsSection.querySelectorAll('.pinterest-pin-item');
    pinItems.forEach(item => {
      item.onclick = () => {
        pinItems.forEach(pi => pi.classList.remove('sel'));
        item.classList.add('sel');
        node.params.selectedPin = item.dataset.img;
        executeGraph();
      };
    });
  } 
  else if (node.type === 'higgsfield_soul') {
    paramsSection.innerHTML += `
      <div class="fld">
        <span>Промпт стилизации (Prompt)</span>
        <input type="text" id="insp-soul-prompt" value="${node.params.prompt}">
      </div>
      <div class="fld">
        <span>Влияние лица (Face Weight)</span>
        <input type="range" id="insp-soul-weight" min="0" max="1" step="0.1" value="${node.params.faceWeight}">
      </div>
    `;
    container.appendChild(paramsSection);
    
    document.getElementById('insp-soul-prompt').addEventListener('change', (e) => {
      node.params.prompt = e.target.value;
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) nodeEl.querySelector('.node-title-val').textContent = node.params.prompt;
      executeGraph();
    });
    
    document.getElementById('insp-soul-weight').addEventListener('input', (e) => {
      node.params.faceWeight = parseFloat(e.target.value);
    });
  }
  else if (node.type === 'higgsfield_camera') {
    const presets = HIGGSFIELD_PRESETS.map(p => `<option value="${p}" ${node.params.motionPreset === p ? 'selected' : ''}>${p}</option>`).join('');
    
    paramsSection.innerHTML += `
      <div class="fld">
        <span>Движение камеры (Пресет)</span>
        <select id="insp-cam-preset">${presets}</select>
      </div>
    `;
    container.appendChild(paramsSection);
    
    document.getElementById('insp-cam-preset').addEventListener('change', (e) => {
      node.params.motionPreset = e.target.value;
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) nodeEl.querySelector('.node-title-val').textContent = node.params.motionPreset;
      executeGraph();
    });
  }
  else if (node.type === 'higgsfield_speak') {
    paramsSection.innerHTML += `
      <div class="fld">
        <span>Мимика / Липсинк Текст</span>
        <input type="text" id="insp-speak-expr" value="${node.params.expression}">
      </div>
    `;
    container.appendChild(paramsSection);
    
    document.getElementById('insp-speak-expr').addEventListener('change', (e) => {
      node.params.expression = e.target.value;
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) nodeEl.querySelector('.node-title-val').textContent = node.params.expression;
      executeGraph();
    });
  }
  else if (node.type === 'text_prompt') {
    paramsSection.innerHTML += `
      <div class="fld">
        <span>Текстовое значение</span>
        <input type="text" id="insp-text-val" value="${node.params.text}">
      </div>
    `;
    container.appendChild(paramsSection);
    
    document.getElementById('insp-text-val').addEventListener('change', (e) => {
      node.params.text = e.target.value;
      const nodeEl = document.getElementById(node.id);
      if (nodeEl) nodeEl.querySelector('.node-title-val').textContent = node.params.text;
      executeGraph();
    });
  }
  
  // Render Global movie player at bottom of inspector
  renderGlobalPlayerSection(container);
}

function deleteNode(nodeId) {
  // Remove node
  state.nodes = state.nodes.filter(n => n.id !== nodeId);
  // Remove connected wires
  state.connections = state.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
  
  state.selectedNodeId = null;
  renderNodes();
  executeGraph();
}

// 9. Generative SVG Film Player with Multiplayer Rendering
function renderGlobalPlayerSection(container) {
  const sec = document.createElement('div');
  sec.className = 'insp-section';
  sec.style.borderTop = '1px solid var(--color-border)';
  sec.innerHTML = `
    <div class="insp-h"><i class="ti ti-video"></i> Генеративный плеер</div>
    <div class="player-container">
      <div class="player-view" id="playerView">
        <svg id="playerSvg" viewBox="0 0 480 300"></svg>
        <div class="player-overlay player-tc" id="playerTC">05:30</div>
        <div class="player-overlay player-sc" id="playerSC">SCENE 04</div>
        <div class="player-overlay player-sub" id="playerSub">— В Конде солнце приходит позже всех.</div>
      </div>
      <div class="player-controls">
        <button class="play-btn" id="playerPlay"><i class="ti ${state.isPlaying ? 'ti-player-pause' : 'ti-player-play'}"></i></button>
        <div class="scrub-bar" id="playerScrub">
          <div class="scrub-progress" id="playerScrubProgress"></div>
          <div class="scrub-handle" id="playerScrubHandle"></div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(sec);
  
  // Attach Player Control events
  const playBtn = document.getElementById('playerPlay');
  playBtn.onclick = () => {
    state.isPlaying = !state.isPlaying;
    playBtn.querySelector('i').className = `ti ${state.isPlaying ? 'ti-player-pause' : 'ti-player-play'}`;
  };
  
  const scrubBar = document.getElementById('playerScrub');
  scrubBar.onclick = (e) => {
    const rect = scrubBar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    state.movieTime = Math.max(0, Math.min(872, pct * 872));
    
    // Find matching active scene index
    const totalScenes = SCENES.length;
    const sceneLen = 872 / totalScenes;
    state.activeSceneIndex = Math.min(totalScenes - 1, Math.floor(state.movieTime / sceneLen));
    
    renderPlayer();
  };
  
  renderPlayer();
}

function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  return (Math.floor(s/60)+'').padStart(2,'0')+':'+((s%60)+'').padStart(2,'0');
}

// Visual SVG generator for scenes and characters
function renderPlayer() {
  const svg = document.getElementById('playerSvg');
  if (!svg) return;
  
  const currentScene = SCENES[state.activeSceneIndex];
  
  // Setup Scrub UI
  const pct = (state.movieTime / 872) * 100;
  const progressEl = document.getElementById('playerScrubProgress');
  const handleEl = document.getElementById('playerScrubHandle');
  if (progressEl) progressEl.style.width = `${pct}%`;
  if (handleEl) handleEl.style.left = `${pct}%`;
  
  const tcEl = document.getElementById('playerTC');
  const scEl = document.getElementById('playerSC');
  const subEl = document.getElementById('playerSub');
  if (tcEl) tcEl.textContent = fmtTime(state.movieTime);
  if (scEl) scEl.textContent = `${currentScene.num} · ${currentScene.title}`;
  if (subEl) subEl.textContent = currentScene.sub;
  
  // Draw SVG visual frame
  let html = `<rect width="480" height="300" fill="${currentScene.sky}"/>`;
  
  // Draw background elements (mountains / city skyline / sun)
  html += `<circle cx="340" cy="80" r="36" fill="#FCD599" opacity="0.8"/>`;
  html += `<polygon points="0,300 120,180 240,300" fill="#2c2a38" opacity="0.7" />`;
  html += `<polygon points="120,300 280,140 440,300" fill="#1b1a26" opacity="0.8" />`;
  
  // Draw ground
  html += `<rect x="0" y="220" width="480" height="80" fill="${currentScene.ground}"/>`;
  
  // Override background if custom graph output is connected
  if (window.customRenderImage) {
    html += `
      <g opacity="0.95">
        <rect x="30" y="40" width="420" height="170" rx="10" fill="#222" stroke="var(--color-bg-accent)" stroke-width="2"/>
        <image href="${window.customRenderImage}" x="34" y="44" width="412" height="162" preserveAspectRatio="xMidYMid slice"/>
        <rect x="40" y="50" width="130" height="24" rx="4" fill="rgba(0,0,0,0.6)"/>
        <text x="50" y="66" fill="#fff" font-size="10" font-family="sans-serif">Higgsfield Soul Live</text>
      </g>
    `;
  }
  
  // Draw Fictional Characters (Ara Gehetsik & Anahit)
  if (state.activeSceneIndex !== 7) { // Scenes 1-7
    // Ara Gehetsik
    html += drawSVGActor(120, 235, '#E24B4A', '#E8B07A', 'Ара Гехецик');
    // Anahit
    html += drawSVGActor(170, 240, '#378ADD', '#E6A878', 'Анаит');
  } else {
    // Scene 08 - FINAL ASSEMBLY: ALL FICTIONAL CHARACTERS + ALL REGISTERED DEVELOPERS PARTICIPATE!
    html += drawSVGActor(80, 245, '#E24B4A', '#E8B07A', 'Ара Гехецик');
    html += drawSVGActor(130, 250, '#378ADD', '#E6A878', 'Анаит');
    
    // Draw team developers
    let startX = 200;
    state.team.forEach((dev, idx) => {
      const actorColor = dev.side === 'urvakan' ? 'var(--color-node-higgsfield)' : dev.side === 'rambalkoshe' ? 'var(--color-node-util)' : 'var(--color-node-scene)';
      html += drawSVGActor(startX, 240 + (idx % 2)*5, actorColor, '#D8995F', `${dev.charName} (${dev.name})`, dev.role);
      startX += 65;
    });
    
    // Draw current user's developer character if registered
    if (state.currentUser) {
      const dev = state.currentUser;
      const actorColor = dev.side === 'urvakan' ? 'var(--color-node-higgsfield)' : dev.side === 'rambalkoshe' ? 'var(--color-node-util)' : 'var(--color-node-scene)';
      html += drawSVGActor(startX, 242, actorColor, '#EBB98C', `${dev.charName} (Вы)`, dev.role, true);
    }
  }
  
  svg.innerHTML = html;
}

function drawSVGActor(x, feetY, clothesColor, skinColor, name, role = '', highlight = false) {
  const h = 32;
  const outline = highlight ? 'stroke="#ef9f27" stroke-width="2"' : '';
  
  let g = `
    <g>
      <!-- Clothes / Body -->
      <line x1="${x}" y1="${feetY - h}" x2="${x}" y2="${feetY - h * 0.45}" stroke="${clothesColor}" stroke-width="8" stroke-linecap="round" ${outline}/>
      <!-- Head -->
      <circle cx="${x}" cy="${feetY - h - 5}" r="6" fill="${skinColor}" ${outline}/>
      <!-- Legs -->
      <line x1="${x}" y1="${feetY - h * 0.45}" x2="${x - 6}" y2="${feetY}" stroke="${clothesColor}" stroke-width="4.5" stroke-linecap="round" />
      <line x1="${x}" y1="${feetY - h * 0.45}" x2="${x + 6}" y2="${feetY}" stroke="${clothesColor}" stroke-width="4.5" stroke-linecap="round" />
  `;
  
  // Specific role item drawings
  if (role.toLowerCase() === 'разработчик' || role.toLowerCase() === 'developer') {
    // Draw a small laptop
    g += `<rect x="${x + 4}" y="${feetY - 22}" width="10" height="7" rx="1" fill="#bbb" />`;
    g += `<line x1="${x + 4}" y1="${feetY - 15}" x2="${x + 14}" y2="${feetY - 15}" stroke="#999" stroke-width="2" />`;
  } else if (role.toLowerCase() === 'художник' || role.toLowerCase() === 'artist') {
    // Draw a brush / palette
    g += `<circle cx="${x - 10}" cy="${feetY - 16}" r="4" fill="#a4d" opacity="0.8"/>`;
    g += `<line x1="${x - 10}" y1="${feetY - 16}" x2="${x - 6}" y2="${feetY - 14}" stroke="#fff" stroke-width="1.5" />`;
  } else if (role.toLowerCase() === 'режиссер' || role.toLowerCase() === 'director') {
    // Megaphone
    g += `<polygon points="${x + 4},${feetY - 24} ${x + 14},${feetY - 28} ${x + 14},${feetY - 20}" fill="#ef9f27" />`;
  }

  // Name Tag
  g += `
      <rect x="${x - 24}" y="${feetY - h - 22}" width="48" height="10" rx="2" fill="rgba(20,20,20,0.8)"/>
      <text x="${x}" y="${feetY - h - 14}" fill="#fff" font-size="6.5" font-family="sans-serif" text-anchor="middle" font-weight="600">${name}</text>
    </g>
  `;
  return g;
}

// 10. Multiplayer developer registration & Factions dashboard
function showOnboardingModal() {
  const modal = document.getElementById('onboard');
  if (!state.currentUser) {
    modal.removeAttribute('hidden');
    buildOnboardingForm();
  }
}

function buildOnboardingForm() {
  const form = document.getElementById('onboardForm');
  form.innerHTML = `
    <div class="fld">
      <span>Имя разработчика</span>
      <input type="text" id="reg-name" placeholder="Введите имя..." required>
    </div>
    <div class="fld">
      <span>Имя персонажа во вселенной</span>
      <input type="text" id="reg-char" placeholder="Введите имя персонажа..." required>
    </div>
    <div class="fld">
      <span>Выберите фракцию / сторону сценария</span>
      <select id="reg-side">
        <option value="urvakan">Urvakan (Авангард, музыкальные архивы)</option>
        <option value="rambalkoshe">Rambalkoshe (Визуальное искусство, модерн)</option>
        <option value="moct">Moct (Современная архитектура, мосты культур)</option>
      </select>
    </div>
    <div class="fld">
      <span>Выберите роль во вселенной</span>
      <select id="reg-role">
        <option value="Режиссер">Режиссер (Director)</option>
        <option value="Разработчик">Разработчик (Developer)</option>
        <option value="Художник">Художник (Artist)</option>
        <option value="Стилист">Стилист (Stylist)</option>
      </select>
    </div>
    <br>
    <button class="btn pri" id="btnRegister">Войти в команду</button>
  `;
  
  document.getElementById('btnRegister').onclick = () => {
    const name = document.getElementById('reg-name').value.trim();
    const charName = document.getElementById('reg-char').value.trim();
    const side = document.getElementById('reg-side').value;
    const role = document.getElementById('reg-role').value;
    
    if (!name || !charName) {
      showToast('Заполните все текстовые поля!');
      return;
    }
    
    const newUser = { name, charName, side, role, isMe: true };
    state.currentUser = newUser;
    localStorage.setItem('hv_current_user', JSON.stringify(newUser));
    
    document.getElementById('onboard').setAttribute('hidden', 'true');
    showToast(`Вы вошли под персонажем ${charName} во фракцию ${side.toUpperCase()}!`);
    updateTeamList();
    renderPlayer();
  };
}

function updateTeamList() {
  const countEl = document.getElementById('teamCount');
  const listEl = document.getElementById('teamBody');
  if (!listEl) return;
  
  const allDevs = [...state.team];
  if (state.currentUser) {
    allDevs.push(state.currentUser);
  }
  
  countEl.textContent = allDevs.length;
  
  listEl.innerHTML = `
    <div class="dev-list">
      ${allDevs.map(dev => `
        <div class="dev-item">
          <div class="dev-avatar" style="background: ${dev.side === 'urvakan' ? 'var(--color-node-higgsfield)' : dev.side === 'rambalkoshe' ? 'var(--color-node-util)' : 'var(--color-node-scene)'}">
            ${dev.name.slice(0, 2).toUpperCase()}
          </div>
          <div class="dev-info">
            <div class="dev-name">${dev.name} ${dev.isMe ? '<strong>(Вы)</strong>' : ''}</div>
            <div class="dev-char">Персонаж: ${dev.charName} · Роль: ${dev.role}</div>
          </div>
          <div class="dev-badge ${dev.side}">${dev.side.toUpperCase()}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// 11. Settings & API configurations
function setupSettings() {
  const form = document.getElementById('settingsForm');
  form.innerHTML = `
    <div class="fld">
      <span>Pinterest Access Token</span>
      <input type="text" id="set-pin-token" value="${state.apiKeys.pinterestToken}" placeholder="Введите Pinterest API токен...">
    </div>
    <div class="fld">
      <span>Higgsfield AI Key</span>
      <input type="text" id="set-higgs-key" value="${state.apiKeys.higgsfieldKey}" placeholder="Введите API ключ Higgsfield...">
    </div>
    <br>
    <button class="btn pri" id="btnSaveSettings">Сохранить</button>
  `;
  
  document.getElementById('btnSaveSettings').onclick = () => {
    const pinToken = document.getElementById('set-pin-token').value.trim();
    const higgsKey = document.getElementById('set-higgs-key').value.trim();
    
    state.apiKeys.pinterestToken = pinToken;
    state.apiKeys.higgsfieldKey = higgsKey;
    
    localStorage.setItem('hv_pinterest_token', pinToken);
    localStorage.setItem('hv_higgsfield_key', higgsKey);
    
    document.getElementById('settings').setAttribute('hidden', 'true');
    showToast('Настройки сохранены! Обновление графа...');
    
    // Check if Pinterest token configured and update board nodes
    state.nodes.forEach(n => {
      if (n.type === 'pinterest_board') {
        loadPinterestBoardsForNode(n);
      }
    });
    
    executeGraph();
  };
}

// 12. Modal and Global click behaviors
document.getElementById('btnSettings').onclick = () => {
  document.getElementById('settings').removeAttribute('hidden');
};

document.getElementById('btnTeam').onclick = () => {
  document.getElementById('team').removeAttribute('hidden');
};

document.querySelectorAll('[data-close]').forEach(btn => {
  btn.onclick = () => {
    const modalId = btn.dataset.close;
    document.getElementById(modalId).setAttribute('hidden', 'true');
  };
});

// Toast Manager
let toastTimeout = null;
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('show');
  
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// Dark/Light Theme Switcher
const btnTheme = document.getElementById('btnTheme');
btnTheme.onclick = () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', state.theme);
  btnTheme.querySelector('i').className = `ti ${state.theme === 'dark' ? 'ti-sun' : 'ti-moon'}`;
};

// "Прогнать граф" Execution Button
document.getElementById('btnRun').onclick = () => {
  executeGraph();
};

// 13. Game loop / Time scrubber automation
setInterval(() => {
  if (state.isPlaying) {
    state.movieTime += 2;
    if (state.movieTime >= 872) state.movieTime = 0;
    
    const totalScenes = SCENES.length;
    const sceneLen = 872 / totalScenes;
    state.activeSceneIndex = Math.min(totalScenes - 1, Math.floor(state.movieTime / sceneLen));
    
    renderPlayer();
  }
}, 100);

// Initialize Application
initPalette();
setupSettings();
updateTeamList();
showOnboardingModal();

// Pre-create basic nodes for user demo
createNode('pinterest_board', 60, 80);
createNode('higgsfield_soul', 360, 80);
createNode('output_scene', 660, 80);
