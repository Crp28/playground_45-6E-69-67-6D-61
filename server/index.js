const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const doctorCardsRaw = require('../src/doctor.json');

const app = express();
const PORT = process.env.PORT || 4000;
const API_PREFIX = '/api';

app.use(cors({ origin: true }));
app.use(express.json());

const ROLES = {
  DOCTOR: '医生',
  PATIENT: '病患',
};

const PLAYER_COLORS = ['#4A90E2', '#E94E77', '#F5A623', '#7ED321', '#B8E986', '#50E3C2', '#9013FE', '#D0021B'];

const makeDoctorKey = (name, idx) => {
  if (typeof name === 'string' && name.trim()) {
    return `doctor-${idx}-${name.trim().replace(/\s+/g, '')}`;
  }
  return `doctor-${idx}`;
};

const DOCTOR_CARDS = doctorCardsRaw.map((card, idx) => ({
  key: makeDoctorKey(card.名称, idx),
  name: card.名称 || `医生${idx + 1}`,
  tags: Array.isArray(card.标签) ? card.标签 : [],
  endurance: card.耐痛 ?? '',
  primary: card.主要能力 || '',
  secondary: card.次要能力 || '',
}));

const rooms = new Map();

const createPlayer = (id) => ({
  id,
  name: `玩家${id}`,
  role: id === 1 ? ROLES.DOCTOR : ROLES.PATIENT,
  color: PLAYER_COLORS[(id - 1) % PLAYER_COLORS.length],
  controllerId: null,
  doctorCard: null,
});

const createRoom = (code) => {
  const players = [1, 2, 3, 4].map(createPlayer);
  return {
    code,
    players,
    hostControllerId: null,
    hostPlayerId: players[0].id,
    createdAt: Date.now(),
  };
};

const getRoom = (code) => rooms.get(code);

const ensureRoom = (code) => {
  if (!rooms.has(code)) {
    rooms.set(code, createRoom(code));
  }
  return rooms.get(code);
};

const serializeRoom = (room) => ({
  code: room.code,
  hostPlayerId: room.hostPlayerId,
  players: room.players.map((player) => ({
    id: player.id,
    name: player.name,
    role: player.role,
    color: player.color,
    doctorCard: player.doctorCard,
    occupied: Boolean(player.controllerId),
    isHost: player.controllerId === room.hostControllerId,
  })),
});

const serializeRoomSummary = (room) => {
  const hostPlayer = room.players.find((p) => p.controllerId === room.hostControllerId);
  const occupiedCount = room.players.filter((p) => p.controllerId).length;
  const totalPositions = room.players.length;
  
  return {
    code: room.code,
    hostName: hostPlayer?.name || '未知',
    currentPlayers: occupiedCount,
    totalPositions: totalPositions,
    createdAt: room.createdAt,
  };
};

const transferHost = (room) => {
  // Find the next occupied player to become host
  const nextHost = room.players.find((p) => p.controllerId && p.controllerId !== room.hostControllerId);
  if (nextHost) {
    room.hostControllerId = nextHost.controllerId;
    room.hostPlayerId = nextHost.id;
  }
};

const removePlayerFromRoom = (room, token) => {
  const player = findPlayerByController(room, token);
  if (player) {
    player.controllerId = null;
    player.name = `玩家${player.id}`;
    
    // If this was the host, transfer to another player
    if (token === room.hostControllerId) {
      transferHost(room);
    }
    
    // Check if room is now empty
    const hasPlayers = room.players.some((p) => p.controllerId);
    return !hasPlayers;
  }
  return false;
};

const findPlayerByController = (room, token) => room.players.find((p) => p.controllerId === token);

const assertHost = (room, token) => {
  if (!token || token !== room.hostControllerId) {
    const err = new Error('只有房主可以执行此操作');
    err.status = 403;
    throw err;
  }
};

app.post(`${API_PREFIX}/rooms/:code/join`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { name, token, createIfNotExists } = req.body || {};
    let room = getRoom(code);
    
    // If room doesn't exist and createIfNotExists is not true, return error
    if (!room && !createIfNotExists) {
      return res.status(404).json({ message: '房间不存在' });
    }
    
    if (!room) {
      room = ensureRoom(code);
    }

    if (token) {
      const existingPlayer = findPlayerByController(room, token);
      if (existingPlayer) {
        if (name?.trim()) existingPlayer.name = name.trim();
        return res.json({
          playerToken: token,
          controlledPlayerId: existingPlayer.id,
          isHost: token === room.hostControllerId,
          room: serializeRoom(room),
        });
      }
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: '请输入昵称' });
    }

    const newToken = crypto.randomUUID();
    let targetPlayer;

    if (!room.hostControllerId) {
      targetPlayer = room.players[0];
      room.hostControllerId = newToken;
    } else {
      targetPlayer = room.players.find((p) => !p.controllerId);
      if (!targetPlayer) {
        const nextId = room.players[room.players.length - 1].id + 1;
        targetPlayer = createPlayer(nextId);
        room.players.push(targetPlayer);
      }
    }

    targetPlayer.controllerId = newToken;
    targetPlayer.name = name.trim();
    if (targetPlayer.role !== ROLES.DOCTOR) {
      targetPlayer.doctorCard = null;
    }

    res.json({
      playerToken: newToken,
      controlledPlayerId: targetPlayer.id,
      isHost: newToken === room.hostControllerId,
      room: serializeRoom(room),
    });
  } catch (err) {
    next(err);
  }
});

app.get(`${API_PREFIX}/rooms/:code`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const room = getRoom(code);
    if (!room) return res.status(404).json({ message: '房间不存在' });
    res.json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
});

app.patch(`${API_PREFIX}/rooms/:code/roles`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { playerId, role, token } = req.body || {};
    const room = getRoom(code);
    if (!room) return res.status(404).json({ message: '房间不存在' });
    assertHost(room, token);
    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({ message: '无效身份' });
    }
    const player = room.players.find((p) => p.id === Number(playerId));
    if (!player) return res.status(404).json({ message: '玩家不存在' });
    player.role = role;
    if (role !== ROLES.DOCTOR) {
      player.doctorCard = null;
    }
    res.json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
});

app.post(`${API_PREFIX}/rooms/:code/randomize-roles`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { token } = req.body || {};
    const room = getRoom(code);
    if (!room) return res.status(404).json({ message: '房间不存在' });
    assertHost(room, token);
    room.players.forEach((player) => {
      player.role = ROLES.PATIENT;
      player.doctorCard = null;
    });
    const randomIndex = Math.floor(Math.random() * room.players.length);
    room.players[randomIndex].role = ROLES.DOCTOR;
    res.json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
});

app.post(`${API_PREFIX}/rooms/:code/doctor-card`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { playerId, cardKey, token } = req.body || {};
    const room = getRoom(code);
    if (!room) return res.status(404).json({ message: '房间不存在' });
    if (!token) return res.status(403).json({ message: '未授权' });
    const player = room.players.find((p) => p.id === Number(playerId));
    if (!player) return res.status(404).json({ message: '玩家不存在' });
    if (player.controllerId !== token) {
      return res.status(403).json({ message: '只能为自己控制的医生选择卡牌' });
    }
    if (player.role !== ROLES.DOCTOR) {
      return res.status(400).json({ message: '当前身份不是医生' });
    }
    const card = DOCTOR_CARDS.find((c) => c.key === cardKey);
    if (!card) return res.status(400).json({ message: '无效卡牌' });
    player.doctorCard = card;
    res.json({ room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
});

// Get list of all rooms
app.get(`${API_PREFIX}/rooms`, (req, res, next) => {
  try {
    const roomList = Array.from(rooms.values())
      .filter((room) => {
        // Only include rooms that have at least one player
        return room.players.some((p) => p.controllerId);
      })
      .map(serializeRoomSummary)
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first
    
    res.json({ rooms: roomList });
  } catch (err) {
    next(err);
  }
});

// Leave room
app.post(`${API_PREFIX}/rooms/:code/leave`, (req, res, next) => {
  try {
    const code = req.params.code.trim().toUpperCase();
    const { token } = req.body || {};
    const room = getRoom(code);
    if (!room) return res.status(404).json({ message: '房间不存在' });
    if (!token) return res.status(403).json({ message: '未授权' });
    
    const isEmpty = removePlayerFromRoom(room, token);
    
    // If room is empty, delete it
    if (isEmpty) {
      rooms.delete(code);
      return res.json({ message: '已离开房间，房间已关闭' });
    }
    
    res.json({ message: '已离开房间', room: serializeRoom(room) });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || '服务器错误' });
});

app.listen(PORT, () => {
  console.log(`Lobby backend listening on port ${PORT}`);
});
