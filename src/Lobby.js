import React from 'react';
import DoctorListButton from './DoctorListButton';
import DoctorCardPopup from './DoctorCardPopup';

function Lobby({
  roomCode,
  onRoomCodeChange,
  playerName,
  onPlayerNameChange,
  inRoom,
  onJoinRoom,
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

  if (!inRoom) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 16px',
          fontFamily: 'sans-serif',
        }}
      >
        <h2 style={{ marginBottom: 24 }}>加入游戏房间</h2>
        <input
          type="text"
          placeholder="输入房间码"
          value={roomCode}
          onChange={(e) => onRoomCodeChange(e.target.value)}
          style={{
            padding: '10px 12px',
            fontSize: 16,
            width: 240,
            borderRadius: 6,
            border: '1px solid #ccc',
            marginBottom: 12,
          }}
        />
        <input
          type="text"
          placeholder="输入昵称"
          value={playerName}
          onChange={(e) => onPlayerNameChange(e.target.value)}
          style={{
            padding: '10px 12px',
            fontSize: 16,
            width: 240,
            borderRadius: 6,
            border: '1px solid #ccc',
            marginBottom: 18,
          }}
        />
        {joinError && <div style={{ color: '#E94E77', marginBottom: 12 }}>{joinError}</div>}
        <button
          onClick={onJoinRoom}
          disabled={joinDisabled}
          style={{
            padding: '10px 32px',
            fontSize: 16,
            borderRadius: 6,
            border: 'none',
            background: joinDisabled ? '#ccc' : '#4A90E2',
            color: '#fff',
            cursor: joinDisabled ? 'not-allowed' : 'pointer',
            opacity: joinLoading ? 0.8 : 1,
          }}
        >
          {joinLoading ? '加入中...' : '加入'}
        </button>
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
      <header style={{ marginBottom: 32 }}>
        <h2 style={{ marginBottom: 8 }}>房间：{roomCode}</h2>
        <div style={{ color: '#777' }}>等待玩家加入并分配角色，准备开始游戏。</div>
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
