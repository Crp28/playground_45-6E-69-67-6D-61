import React from 'react';

function RoomCard({ room, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: '0 0 calc(50% - 8px)',
        minWidth: 240,
        background: '#fff',
        borderRadius: 10,
        padding: 16,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        border: '1px solid #e0e0e0',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#333',
          }}
        >
          {room.code}
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#4A90E2',
            fontWeight: 'bold',
          }}
        >
          {room.currentPlayers}/{room.totalPositions}
        </div>
      </div>
      <div
        style={{
          fontSize: 14,
          color: '#666',
        }}
      >
        房主：{room.hostName}
      </div>
    </div>
  );
}

export default RoomCard;
