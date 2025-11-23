import React from 'react';
import DoctorListButton from './DoctorListButton';
import DoctorCardPopup from './DoctorCardPopup';
import Popup from './Popup';
import RoomCard from './RoomCard';

function Lobby({
  roomCode,
  onRoomCodeChange,
  playerName,
  onPlayerNameChange,
  inRoom,
  onJoinRoom,
  onLeaveRoom,
  joinDisabled,
  joinError,
  joinLoading,
  players,
  roles,
  onRoleChange,
  onRandomRoles,
  selectedDoctorCard,
  onSelectDoctorCard,
  doctorCards,
  onStartGame,
  canStartGame,
  isHost,
  controlledPlayerId,
  availableRooms,
  onCreateRoom,
}) {
  const doctorPlayers = React.useMemo(
    () => players.filter((player) => player.role === roles.DOCTOR),
    [players, roles]
  );

  const lobbyStatus = React.useMemo(() => {
    if (!doctorPlayers.length) return '请先分配至少一名医生。';
    if (doctorPlayers.length > 1) return '医生数量过多，请仅保留一名医生。';
    if (!selectedDoctorCard) return '医生需要先选择角色卡。';
    if (players.length < 2) return '至少需要两名玩家才能开始游戏。';
    return '已准备就绪，可以开始游戏。';
  }, [doctorPlayers, selectedDoctorCard, players.length]);

  const controlledPlayer = players.find((player) => player.id === controlledPlayerId);
  const canChooseDoctorCard = controlledPlayer && controlledPlayer.role === roles.DOCTOR;

  const [showDoctorCards, setShowDoctorCards] = React.useState(false);
  const [showCreatePopup, setShowCreatePopup] = React.useState(false);
  const [showJoinPopup, setShowJoinPopup] = React.useState(false);
  const [showJoinConfirmPopup, setShowJoinConfirmPopup] = React.useState(false);
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const [createRoomCode, setCreateRoomCode] = React.useState('');
  const [joinRoomCode, setJoinRoomCode] = React.useState('');

  const handleCreateRoom = () => {
    if (createRoomCode.trim()) {
      const upperRoomCode = createRoomCode.trim().toUpperCase();
      setShowCreatePopup(false);
      setCreateRoomCode('');
      // Call join with createIfNotExists=true
      onJoinRoom(upperRoomCode, true);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomCode.trim()) {
      const upperRoomCode = joinRoomCode.trim().toUpperCase();
      setShowJoinPopup(false);
      setJoinRoomCode('');
      // Call join with createIfNotExists=false (only join existing)
      onJoinRoom(upperRoomCode, false);
    }
  };

  const handleRoomCardClick = (room) => {
    setSelectedRoom(room);
    setShowJoinConfirmPopup(true);
  };

  const handleConfirmJoinRoom = () => {
    if (selectedRoom) {
      setShowJoinConfirmPopup(false);
      const code = selectedRoom.code;
      setSelectedRoom(null);
      // Join existing room (createIfNotExists=false)
      onJoinRoom(code, false);
    }
  };

  if (!inRoom) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 16px',
          fontFamily: 'sans-serif',
          maxWidth: 960,
          margin: '0 auto',
        }}
      >
        <h2 style={{ marginBottom: 32 }}>游戏大厅</h2>
        
        {/* Player name input */}
        <input
          type="text"
          placeholder="输入昵称"
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          style={{
            padding: '10px 12px',
            fontSize: 16,
            width: 300,
            borderRadius: 6,
            border: '1px solid #ccc',
            marginBottom: 24,
          }}
        />

        {/* Create Room and Join Room buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => setShowCreatePopup(true)}
            disabled={!playerName.trim()}
            style={{
              padding: '12px 32px',
              fontSize: 16,
              borderRadius: 6,
              border: 'none',
              background: playerName.trim() ? '#4A90E2' : '#ccc',
              color: '#fff',
              cursor: playerName.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            创建房间
          </button>
          <button
            onClick={() => setShowJoinPopup(true)}
            disabled={!playerName.trim()}
            style={{
              padding: '12px 32px',
              fontSize: 16,
              borderRadius: 6,
              border: 'none',
              background: playerName.trim() ? '#E94E77' : '#ccc',
              color: '#fff',
              cursor: playerName.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            加入房间
          </button>
        </div>

        {joinError && (
          <div style={{ color: '#E94E77', marginBottom: 16 }}>{joinError}</div>
        )}

        {/* Available rooms section */}
        <div style={{ width: '100%', maxWidth: 800 }}>
          <h3 style={{ marginBottom: 16, color: '#333' }}>可用房间</h3>
          {availableRooms && availableRooms.length > 0 ? (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              {availableRooms.map((room) => (
                <RoomCard
                  key={room.code}
                  room={room}
                  onClick={() => handleRoomCardClick(room)}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: 32,
                color: '#999',
                border: '1px dashed #ccc',
                borderRadius: 8,
              }}
            >
              暂无可用房间
            </div>
          )}
        </div>

        {/* Create Room Popup */}
        <Popup
          isOpen={showCreatePopup}
          onClose={() => setShowCreatePopup(false)}
          title="创建房间"
        >
          <input
            type="text"
            placeholder="输入房间码"
            value={createRoomCode}
            onChange={(e) => setCreateRoomCode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleCreateRoom();
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              borderRadius: 6,
              border: '1px solid #ccc',
              marginBottom: 16,
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowCreatePopup(false)}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={!createRoomCode.trim() || joinLoading}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                background: createRoomCode.trim() && !joinLoading ? '#4A90E2' : '#ccc',
                color: '#fff',
                cursor: createRoomCode.trim() && !joinLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {joinLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </Popup>

        {/* Join Room Popup */}
        <Popup
          isOpen={showJoinPopup}
          onClose={() => setShowJoinPopup(false)}
          title="加入房间"
        >
          <input
            type="text"
            placeholder="输入房间码"
            value={joinRoomCode}
            onChange={(e) => setJoinRoomCode(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleJoinRoom();
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: 16,
              borderRadius: 6,
              border: '1px solid #ccc',
              marginBottom: 16,
            }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowJoinPopup(false)}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: '1px solid #ccc',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={!joinRoomCode.trim() || joinLoading}
              style={{
                padding: '8px 16px',
                fontSize: 14,
                borderRadius: 6,
                border: 'none',
                background: joinRoomCode.trim() && !joinLoading ? '#E94E77' : '#ccc',
                color: '#fff',
                cursor: joinRoomCode.trim() && !joinLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {joinLoading ? '加入中...' : '加入'}
            </button>
          </div>
        </Popup>

        {/* Join Confirmation Popup */}
        <Popup
          isOpen={showJoinConfirmPopup}
          onClose={() => {
            setShowJoinConfirmPopup(false);
            setSelectedRoom(null);
          }}
          title="加入房间"
        >
          {selectedRoom && (
            <div>
              <p style={{ marginBottom: 16 }}>
                确定要加入房间 <strong>{selectedRoom.code}</strong> 吗？
              </p>
              <div style={{ marginBottom: 16, color: '#666', fontSize: 14 }}>
                <div>房主：{selectedRoom.hostName}</div>
                <div>
                  玩家：{selectedRoom.currentPlayers}/{selectedRoom.totalPositions}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowJoinConfirmPopup(false);
                    setSelectedRoom(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmJoinRoom}
                  disabled={joinLoading}
                  style={{
                    padding: '8px 16px',
                    fontSize: 14,
                    borderRadius: 6,
                    border: 'none',
                    background: joinLoading ? '#ccc' : '#4A90E2',
                    color: '#fff',
                    cursor: joinLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {joinLoading ? '加入中...' : '确定'}
                </button>
              </div>
            </div>
          )}
        </Popup>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '32px 24px',
        maxWidth: 960,
        margin: '0 auto',
        fontFamily: 'sans-serif',
      }}
    >
      <DoctorListButton onClick={() => setShowDoctorCards(true)} />
      <DoctorCardPopup
        isOpen={showDoctorCards}
        onClose={() => setShowDoctorCards(false)}
        doctorCards={doctorCards}
      />
      <header style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>房间：{roomCode}</h2>
          <div style={{ color: '#777' }}>等待玩家加入并分配角色，准备开始游戏。</div>
        </div>
        <button
          onClick={onLeaveRoom}
          style={{
            padding: '10px 24px',
            fontSize: 14,
            borderRadius: 6,
            border: '1px solid #D0021B',
            background: '#fff',
            color: '#D0021B',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#D0021B';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fff';
            e.currentTarget.style.color = '#D0021B';
          }}
        >
          离开房间
        </button>
      </header>

      <section
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginBottom: 28,
          background: '#f8f8f8',
          padding: '18px 24px',
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 18 }}>玩家列表</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {players.map((player) => (
            <div
              key={player.id}
              style={{
                flex: '0 0 280px',
                background: '#fff',
                borderRadius: 8,
                padding: '12px 16px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', color: player.color }}>{player.name}</span>
                <span style={{ fontSize: 12, color: '#999' }}>ID: {player.id}</span>
              </div>
              <div style={{ color: player.occupied ? '#4A90E2' : '#999', fontSize: 13 }}>
                {player.id === controlledPlayerId
                  ? '由我控制'
                  : player.occupied
                    ? '已有人加入'
                    : '等待加入'}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <label htmlFor={`role-${player.id}`} style={{ color: '#555', minWidth: 42 }}>
                  身份：
                </label>
                {isHost ? (
                  <select
                    id={`role-${player.id}`}
                    value={player.role}
                    onChange={(e) => onRoleChange(player.id, e.target.value)}
                    style={{ flex: 1, padding: '6px 8px', borderRadius: 6, border: '1px solid #ddd' }}
                  >
                    <option value={roles.DOCTOR}>{roles.DOCTOR}</option>
                    <option value={roles.PATIENT}>{roles.PATIENT}</option>
                  </select>
                ) : (
                  <span style={{ color: '#555' }}>{player.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={onRandomRoles}
            disabled={!isHost}
            style={{
              padding: '8px 18px',
              fontSize: 14,
              borderRadius: 6,
              border: 'none',
              background: isHost ? '#4A90E2' : '#ccc',
              color: '#fff',
              cursor: isHost ? 'pointer' : 'not-allowed',
            }}
          >
            随机分配身份
          </button>
        </div>
      </section>

      <section
        style={{
          marginBottom: 28,
          background: '#f8f8f8',
          padding: '18px 24px',
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>医生角色卡</div>
        {doctorPlayers.length === 0 && <div style={{ color: '#999' }}>暂无医生。</div>}
        {doctorPlayers.map((player) => (
          <div key={player.id} style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              医生：<strong>{player.name}</strong>
              {player.doctorCard ? (
                <span style={{ marginLeft: 8, color: '#4A90E2' }}>已选择：{player.doctorCard.name}</span>
              ) : (
                <span style={{ marginLeft: 8, color: '#E94E77' }}>尚未选择</span>
              )}
            </div>
            {player.id === controlledPlayerId && canChooseDoctorCard && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {doctorCards.map((card) => (
                  <button
                    key={card.key}
                    onClick={() => onSelectDoctorCard(card)}
                    disabled={player.doctorCard?.key === card.key}
                    style={{
                      flex: '0 0 280px',
                      borderRadius: 10,
                      border: player.doctorCard?.key === card.key ? '2px solid #4A90E2' : '1px solid #ddd',
                      background: player.doctorCard?.key === card.key ? '#E6F1FC' : '#fff',
                      padding: '12px 16px',
                      textAlign: 'left',
                      cursor: player.doctorCard?.key === card.key ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 6 }}>{card.name}</div>
                    {card.tags && card.tags.length > 0 && (
                      <div style={{ marginBottom: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {card.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#4A90E2',
                              color: '#fff',
                              padding: '2px 6px',
                              borderRadius: 3,
                              fontSize: 11,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                      耐痛: {card.endurance}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, maxHeight: 60, overflow: 'hidden' }}>
                      {card.primary}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section
        style={{
          marginBottom: 32,
          padding: '18px 24px',
          borderRadius: 10,
          border: '1px dashed #ccc',
          background: '#fff',
        }}
      >
        <div style={{ marginBottom: 12, fontSize: 15, color: canStartGame ? '#4A90E2' : '#D0021B' }}>{lobbyStatus}</div>
        <button
          onClick={onStartGame}
          disabled={!canStartGame || !isHost}
          style={{
            padding: '12px 36px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: canStartGame && isHost ? '#E94E77' : '#ccc',
            color: '#fff',
            cursor: canStartGame && isHost ? 'pointer' : 'not-allowed',
          }}
        >
          开始游戏
        </button>
      </section>
    </div>
  );
}

export default Lobby;
