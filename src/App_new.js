import React, { useState, useEffect } from 'react';
import Lobby from './Lobby';
import doctorCardsRaw from './doctor.json';

const API_BASE = 'http://localhost:4000/api';

const ROLES = {
  DOCTOR: '医生',
  PATIENT: '病患',
};

// Generate doctor cards from JSON
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

function App() {
  // State management
  const [gamePhase, setGamePhase] = useState('lobby'); // 'lobby' | 'game'
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerToken, setPlayerToken] = useState(null);
  const [controlledPlayerId, setControlledPlayerId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [players, setPlayers] = useState([]);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Load saved token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('playerToken');
    const savedRoom = localStorage.getItem('roomCode');
    if (savedToken) {
      setPlayerToken(savedToken);
    }
    if (savedRoom) {
      setRoomCode(savedRoom);
    }
  }, []);

  // Join room
  const handleJoinRoom = async () => {
    if (!roomCode.trim()) {
      setJoinError('请输入房间码');
      return;
    }
    if (!playerName.trim()) {
      setJoinError('请输入昵称');
      return;
    }

    setJoinLoading(true);
    setJoinError('');

    try {
      const response = await fetch(`${API_BASE}/rooms/${roomCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playerName.trim(),
          token: playerToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '加入房间失败');
      }

      const data = await response.json();
      setPlayerToken(data.playerToken);
      setControlledPlayerId(data.controlledPlayerId);
      setIsHost(data.isHost);
      setPlayers(data.room.players);
      setInRoom(true);

      // Save to localStorage
      localStorage.setItem('playerToken', data.playerToken);
      localStorage.setItem('roomCode', roomCode.trim().toUpperCase());
    } catch (error) {
      setJoinError(error.message);
    } finally {
      setJoinLoading(false);
    }
  };

  // Change role (host only)
  const handleRoleChange = async (playerId, role) => {
    if (!isHost) return;

    try {
      const response = await fetch(`${API_BASE}/rooms/${roomCode}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, role, token: playerToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setPlayers(data.room.players);
    } catch (error) {
      alert(error.message);
    }
  };

  // Randomize roles (host only)
  const handleRandomRoles = async () => {
    if (!isHost) return;

    try {
      const response = await fetch(`${API_BASE}/rooms/${roomCode}/randomize-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: playerToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setPlayers(data.room.players);
    } catch (error) {
      alert(error.message);
    }
  };

  // Select doctor card
  const handleSelectDoctorCard = async (card) => {
    try {
      const response = await fetch(`${API_BASE}/rooms/${roomCode}/doctor-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: controlledPlayerId,
          cardKey: card.key,
          token: playerToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setPlayers(data.room.players);
    } catch (error) {
      alert(error.message);
    }
  };

  // Start game (host only)
  const handleStartGame = () => {
    if (!isHost) return;

    // Validate game start conditions
    const doctorPlayers = players.filter((p) => p.role === ROLES.DOCTOR);
    if (doctorPlayers.length !== 1) {
      alert('需要恰好一名医生才能开始游戏');
      return;
    }

    const doctorCard = players.find((p) => p.role === ROLES.DOCTOR)?.doctorCard;
    if (!doctorCard) {
      alert('医生需要先选择角色卡');
      return;
    }

    if (players.length < 2) {
      alert('至少需要两名玩家才能开始游戏');
      return;
    }

    setGamePhase('game');
  };

  // Get selected doctor card for controlled player
  const selectedDoctorCard = players.find((p) => p.id === controlledPlayerId)?.doctorCard || null;

  // Check if game can start
  const canStartGame = (() => {
    const doctorPlayers = players.filter((p) => p.role === ROLES.DOCTOR);
    if (doctorPlayers.length !== 1) return false;
    const doctorCard = doctorPlayers[0]?.doctorCard;
    if (!doctorCard) return false;
    if (players.length < 2) return false;
    return true;
  })();

  // Render based on game phase
  if (gamePhase === 'lobby') {
    return (
      <Lobby
        roomCode={roomCode}
        onRoomCodeChange={setRoomCode}
        playerName={playerName}
        onPlayerNameChange={setPlayerName}
        inRoom={inRoom}
        onJoinRoom={handleJoinRoom}
        joinDisabled={!roomCode.trim() || !playerName.trim() || joinLoading}
        joinError={joinError}
        joinLoading={joinLoading}
        players={players}
        roles={ROLES}
        onRoleChange={handleRoleChange}
        onRandomRoles={handleRandomRoles}
        selectedDoctorCard={selectedDoctorCard}
        onSelectDoctorCard={handleSelectDoctorCard}
        doctorCards={DOCTOR_CARDS}
        onStartGame={handleStartGame}
        canStartGame={canStartGame}
        isHost={isHost}
        controlledPlayerId={controlledPlayerId}
      />
    );
  }

  if (gamePhase === 'game') {
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2>游戏进行中</h2>
        <p>房间: {roomCode}</p>
        <p>你控制的玩家ID: {controlledPlayerId}</p>
        <p>玩家列表:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {players.map((p) => (
            <li key={p.id}>
              {p.name} - {p.role} {p.id === controlledPlayerId && '(你)'}
            </li>
          ))}
        </ul>
        <p style={{ marginTop: 40, color: '#888' }}>
          游戏逻辑将在后续实现...
        </p>
      </div>
    );
  }

  return null;
}

export default App;
