'use strict';
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, game: 'Kingdoms Crusader World' }));

const players = new Map();
const alliances = new Map();
const marches = new Map();
const forts = new Map();
let nextId = 1;
const now = () => Date.now();
const safeText = (value, max = 180) => String(value || '').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, max);
const publicPlayer = p => ({ id:p.id, name:p.name, x:p.x, y:p.y, allianceId:p.allianceId, power:p.power, online:p.online });

function snapshot() {
  return {
    players: [...players.values()].map(publicPlayer),
    alliances: [...alliances.values()].map(a => ({ id:a.id, name:a.name, tag:a.tag, leaderId:a.leaderId, members:a.members.length, level:a.level })),
    marches: [...marches.values()],
    forts: [...forts.values()]
  };
}
function emitWorld() { io.emit('world:update', snapshot()); }
function sendError(socket, message) { socket.emit('game:error', { message }); }

io.on('connection', socket => {
  socket.emit('world:snapshot', snapshot());
  socket.on('player:join', data => {
    const name = safeText(data && data.name, 20) || 'Безымянный лорд';
    let p = players.get(socket.id);
    if (!p) p = { id:socket.id, name, x:Math.floor(Math.random()*81)-40, y:Math.floor(Math.random()*81)-40, allianceId:null, power:100, online:true };
    p.name = name; p.online = true; players.set(socket.id, p);
    socket.emit('player:ready', publicPlayer(p)); emitWorld();
  });
  socket.on('alliance:create', data => {
    const p = players.get(socket.id); if (!p) return sendError(socket, 'Сначала войдите в игру.');
    if (p.allianceId) return sendError(socket, 'Вы уже состоите в альянсе.');
    const name = safeText(data && data.name, 28);
    const tag = safeText(data && data.tag, 5).toUpperCase();
    if (name.length < 3 || tag.length < 2) return sendError(socket, 'Название — от 3 символов, тег — от 2.');
    if ([...alliances.values()].some(a => a.name.toLowerCase() === name.toLowerCase() || a.tag === tag)) return sendError(socket, 'Такое название или тег уже заняты.');
    const a = { id:'a'+nextId++, name, tag, leaderId:p.id, members:[p.id], level:1, createdAt:now() };
    alliances.set(a.id, a); p.allianceId = a.id;
    io.emit('alliance:notice', { text:p.name+' создал альянс ['+tag+'] '+name });
    socket.emit('alliance:joined', { alliance:a }); emitWorld();
  });
  socket.on('alliance:join', data => {
    const p = players.get(socket.id); const a = alliances.get(String(data && data.id || ''));
    if (!p || !a) return sendError(socket, 'Игрок или альянс не найден.');
    if (p.allianceId) return sendError(socket, 'Сначала покиньте текущий альянс.');
    if (a.members.length >= 30) return sendError(socket, 'В альянсе нет свободных мест.');
    a.members.push(p.id); p.allianceId = a.id;
    io.to(a.members).emit('alliance:notice', { text:p.name+' вступил в альянс.' });
    socket.emit('alliance:joined', { alliance:a }); emitWorld();
  });
  socket.on('alliance:leave', () => {
    const p = players.get(socket.id); if (!p || !p.allianceId) return;
    const a = alliances.get(p.allianceId);
    if (a) { a.members = a.members.filter(id => id !== p.id); if (!a.members.length) alliances.delete(a.id); else if (a.leaderId === p.id) a.leaderId = a.members[0]; }
    p.allianceId = null; socket.emit('alliance:left'); emitWorld();
  });
  socket.on('alliance:chat', data => {
    const p = players.get(socket.id); if (!p || !p.allianceId) return sendError(socket, 'Для чата нужен альянс.');
    const a = alliances.get(p.allianceId); const text = safeText(data && data.text, 240);
    if (!a || !text) return;
    io.to(a.members).emit('alliance:chat', { playerId:p.id, name:p.name, text, at:now() });
  });
  socket.on('march:start', data => {
    const p = players.get(socket.id); if (!p) return sendError(socket, 'Сначала войдите в игру.');
    const x = Number(data && data.x), y = Number(data && data.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x)>500 || Math.abs(y)>500) return sendError(socket, 'Неверные координаты цели.');
    const distance = Math.hypot(x-p.x, y-p.y);
    if (distance < 1) return sendError(socket, 'Выберите цель подальше от замка.');
    const id = 'm'+nextId++;
    const duration = Math.max(5000, Math.round(distance * 1200));
    const march = { id, ownerId:p.id, ownerName:p.name, from:{x:p.x,y:p.y}, to:{x,y}, startedAt:now(), arrivesAt:now()+duration, status:'marching', allianceId:p.allianceId };
    marches.set(id, march); io.emit('march:update', march);
    setTimeout(() => {
      const m = marches.get(id); if (!m) return;
      m.status = 'arrived';
      const targetFort = [...forts.values()].find(f => Math.hypot(f.x-x, f.y-y)<3);
      if (targetFort && targetFort.allianceId !== m.allianceId) { targetFort.durability = Math.max(0,targetFort.durability-10); if (targetFort.durability===0) targetFort.allianceId=m.allianceId; }
      io.emit('march:update', m); emitWorld();
      setTimeout(() => { marches.delete(id); emitWorld(); }, 15000);
    }, duration);
  });
  socket.on('fort:build', data => {
    const p = players.get(socket.id); if (!p || !p.allianceId) return sendError(socket, 'Форт могут строить только участники альянса.');
    const x=Number(data && data.x), y=Number(data && data.y);
    if (!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>500||Math.abs(y)>500) return sendError(socket,'Неверные координаты.');
    if ([...forts.values()].some(f=>Math.hypot(f.x-x,f.y-y)<5)) return sendError(socket,'Слишком близко к другому форту.');
    const id='f'+nextId++; const fort={id,x,y,allianceId:p.allianceId,ownerId:p.id,durability:100,createdAt:now()};
    forts.set(id,fort); io.emit('fort:update',fort); emitWorld();
  });
  socket.on('disconnect', () => {
    const p=players.get(socket.id); if (p) { p.online=false; emitWorld(); }
  });
});

setInterval(() => {
  const t=now();
  for (const [id,m] of marches) if (m.status==='marching' && m.arrivesAt<=t) m.status='arrived';
  emitWorld();
}, 10000).unref();

server.listen(PORT, () => console.log('Kingdoms server listening on port '+PORT));