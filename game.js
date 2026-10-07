const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let W = 0;
let H = 0;

const TILE = 70;

let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

let dragging = false;
let lastX = 0;
let lastY = 0;

let selected = null;

const player = {
    x: 0,
    y: 0,
    name: "Твоё королевство",
    type: "player"
};

const kingdoms = [
    {
        x: 6,
        y: -4,
        name: "Северный союз",
        power: 72,
        type: "kingdom"
    },
    {
        x: -7,
        y: -2,
        name: "Волчьи земли",
        power: 91,
        type: "kingdom"
    },
    {
        x: 5,
        y: 6,
        name: "Каменная держава",
        power: 118,
        type: "kingdom"
    },
    {
        x: -6,
        y: 6,
        name: "Зелёное княжество",
        power: 64,
        type: "kingdom"
    }
];

function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    draw();
}

window.addEventListener("resize", resize);


// --------------------------------------------------
// МИР
// --------------------------------------------------

function hash(x, y) {
    let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

function getTerrain(x, y) {
    const n = hash(x, y);

    if (n < 0.12) return "forest";
    if (n < 0.19) return "stone";
    if (n < 0.28) return "food";

    return "plain";
}


// --------------------------------------------------
// КАМЕРА
// --------------------------------------------------

function worldToScreen(x, y) {
    return {
        x: W / 2 + (x * TILE - camera.x) * camera.zoom,
        y: H / 2 + (y * TILE - camera.y) * camera.zoom
    };
}

function screenToWorld(px, py) {
    return {
        x: Math.floor(
            (px - W / 2) / camera.zoom / TILE +
            camera.x / TILE
        ),
        y: Math.floor(
            (py - H / 2) / camera.zoom / TILE +
            camera.y / TILE
        )
    };
}


// --------------------------------------------------
// РИСОВАНИЕ
// --------------------------------------------------

function draw() {
    ctx.clearRect(0, 0, W, H);

    drawMap();
    drawResources();
    drawKingdoms();
    drawPlayer();
    drawSelection();
}

function drawMap() {

    const tilesX = Math.ceil(W / TILE / camera.zoom) + 3;
    const tilesY = Math.ceil(H / TILE / camera.zoom) + 3;

    const centerX = Math.floor(camera.x / TILE);
    const centerY = Math.floor(camera.y / TILE);

    for (let y = centerY - tilesY; y <= centerY + tilesY; y++) {

        for (let x = centerX - tilesX; x <= centerX + tilesX; x++) {

            const p = worldToScreen(x, y);

            const size = TILE * camera.zoom;

            // земля
            ctx.fillStyle = "#263b27";
            ctx.fillRect(p.x, p.y, size, size);

            // сетка
            ctx.strokeStyle = "rgba(255,255,255,0.07)";
            ctx.strokeRect(p.x, p.y, size, size);
        }
    }
}


function drawResources() {

    const tilesX = Math.ceil(W / TILE / camera.zoom) + 3;
    const tilesY = Math.ceil(H / TILE / camera.zoom) + 3;

    const centerX = Math.floor(camera.x / TILE);
    const centerY = Math.floor(camera.y / TILE);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let y = centerY - tilesY; y <= centerY + tilesY; y++) {

        for (let x = centerX - tilesX; x <= centerX + tilesX; x++) {

            // Не рисуем ресурс в центре столицы
            if (x === 0 && y === 0) continue;

            const terrain = getTerrain(x, y);

            let icon = "";

            if (terrain === "forest") icon = "🌲";
            if (terrain === "stone") icon = "🪨";
            if (terrain === "food") icon = "🌾";

            if (!icon) continue;

            const p = worldToScreen(x + 0.5, y + 0.5);

            ctx.font = `${32 * camera.zoom}px Arial`;
            ctx.fillText(icon, p.x, p.y);
        }
    }
}


// --------------------------------------------------
// КОРОЛЕВСТВА
// --------------------------------------------------

function drawPlayer() {

    const p = worldToScreen(player.x + 0.5, player.y + 0.5);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `${42 * camera.zoom}px Arial`;
    ctx.fillText("🏰", p.x, p.y);

    if (camera.zoom > 0.65) {

        ctx.font = `${13 * camera.zoom}px Arial`;
        ctx.fillStyle = "white";

        ctx.fillText(
            player.name,
            p.x,
            p.y + 38 * camera.zoom
        );
    }
}


function drawKingdoms() {

    kingdoms.forEach(k => {

        const p = worldToScreen(k.x + 0.5, k.y + 0.5);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.font = `${38 * camera.zoom}px Arial`;
        ctx.fillText("🏯", p.x, p.y);

        if (camera.zoom > 0.65) {

            ctx.font = `${12 * camera.zoom}px Arial`;
            ctx.fillStyle = "white";

            ctx.fillText(
                k.name,
                p.x,
                p.y + 34 * camera.zoom
            );

            ctx.fillStyle = "#ffd166";

            ctx.fillText(
                "⚔ " + k.power,
                p.x,
                p.y + 49 * camera.zoom
            );
        }
    });
}


// --------------------------------------------------
// ВЫБОР
// --------------------------------------------------

function drawSelection() {

    if (!selected) return;

    const p = worldToScreen(
        selected.x + 0.5,
        selected.y + 0.5
    );

    const size = TILE * camera.zoom;

    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 3;

    ctx.strokeRect(
        p.x - size / 2,
        p.y - size / 2,
        size,
        size
    );
}


// --------------------------------------------------
// НАЖАТИЕ
// --------------------------------------------------

function handleTap(clientX, clientY) {

    const world = screenToWorld(clientX, clientY);

    // Проверяем королевства
    for (const k of kingdoms) {

        if (k.x === world.x && k.y === world.y) {

            selected = k;

            showInfo(
                "🏯 " + k.name,
                "Сила армии: " + k.power
            );

            draw();
            return;
        }
    }

    // Проверяем столицу
    if (world.x === 0 && world.y === 0) {

        selected = player;

        showInfo(
            "🏰 Твоё королевство",
            "Столица игрока"
        );

        draw();
        return;
    }

    // Ресурс
    const terrain = getTerrain(world.x, world.y);

    if (terrain !== "plain") {

        selected = {
            x: world.x,
            y: world.y
        };

        let name = "";

        if (terrain === "forest") name = "🌲 Лес";
        if (terrain === "stone") name = "🪨 Камень";
        if (terrain === "food") name = "🌾 Поле";

        showInfo(
            name,
            "Ресурс этой территории"
        );

        draw();
        return;
    }

    selected = null;
    hideInfo();

    draw();
}


// --------------------------------------------------
// ИНФОРМАЦИОННОЕ ОКНО
// --------------------------------------------------

function showInfo(title, description) {

    let panel = document.getElementById("infoPanel");

    if (!panel) {

        panel = document.createElement("div");

        panel.id = "infoPanel";

        panel.style.position = "fixed";
        panel.style.left = "50%";
        panel.style.bottom = "90px";
        panel.style.transform = "translateX(-50%)";
        panel.style.background = "rgba(15,20,18,0.95)";
        panel.style.color = "white";
        panel.style.padding = "14px 20px";
        panel.style.borderRadius = "14px";
        panel.style.zIndex = "1000";
        panel.style.minWidth = "220px";
        panel.style.textAlign = "center";
        panel.style.boxShadow = "0 5px 20px rgba(0,0,0,0.5)";

        document.body.appendChild(panel);
    }

    panel.innerHTML =
        "<b>" + title + "</b><br>" +
        "<span style='opacity:.75'>" +
        description +
        "</span>";
}


function hideInfo() {

    const panel = document.getElementById("infoPanel");

    if (panel) {
        panel.remove();
    }
}


// --------------------------------------------------
// СЕНСОРНОЕ УПРАВЛЕНИЕ
// --------------------------------------------------

canvas.addEventListener("pointerdown", e => {

    dragging = true;

    lastX = e.clientX;
    lastY = e.clientY;

    canvas.setPointerCapture(e.pointerId);
});


canvas.addEventListener("pointermove", e => {

    if (!dragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;

    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;

    lastX = e.clientX;
    lastY = e.clientY;

    draw();
});


canvas.addEventListener("pointerup", e => {

    dragging = false;

    canvas.releasePointerCapture(e.pointerId);
});


canvas.addEventListener("pointercancel", () => {
    dragging = false;
});


// Обычный клик мыши / тап
canvas.addEventListener("click", e => {

    if (Math.abs(e.clientX - lastX) < 5) {
        handleTap(e.clientX, e.clientY);
    }
});


// --------------------------------------------------
// МАСШТАБИРОВАНИЕ
// --------------------------------------------------

canvas.addEventListener(
    "wheel",
    e => {

        e.preventDefault();

        const oldZoom = camera.zoom;

        if (e.deltaY < 0) {
            camera.zoom *= 1.1;
        } else {
            camera.zoom *= 0.9;
        }

        camera.zoom = Math.max(
            0.5,
            Math.min(2.2, camera.zoom)
        );

        // сохраняем точку под курсором
        const mouseWorldX =
            camera.x +
            (e.clientX - W / 2) / oldZoom;

        const mouseWorldY =
            camera.y +
            (e.clientY - H / 2) / oldZoom;

        camera.x =
            mouseWorldX -
            (e.clientX - W / 2) / camera.zoom;

        camera.y =
            mouseWorldY -
            (e.clientY - H / 2) / camera.zoom;

        draw();
    },
    { passive: false }
);


// --------------------------------------------------
// КНОПКА "ЦЕНТР"
// --------------------------------------------------

const centerButton =
    document.querySelector("button");

if (centerButton) {

    // Ищем кнопку, которая содержит слово "Центр"
    const buttons =
        document.querySelectorAll("button");

    buttons.forEach(button => {

        if (button.textContent.includes("Центр")) {

            button.addEventListener("click", () => {

                camera.x = 0;
                camera.y = 0;
                camera.zoom = 1;

                selected = null;

                hideInfo();

                draw();
            });
        }
    });
}


// --------------------------------------------------
// TELEGRAM
// --------------------------------------------------

if (window.Telegram && Telegram.WebApp) {

    Telegram.WebApp.ready();

    Telegram.WebApp.expand();
}


// --------------------------------------------------
// СТАРТ
// --------------------------------------------------

resize();
