import React from 'react';

function DoctorCardPopup({ isOpen, onClose, doctorCards }) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '24px',
                    maxWidth: '90vw',
                    maxHeight: '85vh',
                    overflow: 'auto',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        background: 'transparent',
                        border: 'none',
                        fontSize: 28,
                        color: '#888',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        lineHeight: 1,
                    }}
                    title="关闭"
                >
                    ×
                </button>

                <h2 style={{ marginTop: 0, marginBottom: 24, textAlign: 'center' }}>医生列表</h2>

                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 20,
                    }}
                >
                    {doctorCards.map((card) => (
                        <div
                            key={card.key}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 10,
                                padding: '18px',
                                background: '#fafafa',
                                transition: 'box-shadow 0.2s',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 'bold',
                                    fontSize: 18,
                                    marginBottom: 10,
                                    color: '#333',
                                }}
                            >
                                {card.name}
                            </div>

                            {card.tags && card.tags.length > 0 && (
                                <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {card.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                background: '#4A90E2',
                                                color: '#fff',
                                                padding: '3px 8px',
                                                borderRadius: 4,
                                                fontSize: 12,
                                            }}
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginBottom: 8 }}>
                                <span style={{ fontWeight: 'bold', color: '#666' }}>耐痛：</span>
                                <span style={{ color: '#D0021B' }}>{card.endurance}</span>
                            </div>

                            <div style={{ marginBottom: 8 }}>
                                <span style={{ fontWeight: 'bold', color: '#666' }}>主要能力：</span>
                                <div style={{ marginTop: 4, color: '#555', lineHeight: 1.5 }}>
                                    {card.primary}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontWeight: 'bold', color: '#666' }}>次要能力：</span>
                                <div style={{ marginTop: 4, color: '#555', lineHeight: 1.5 }}>
                                    {card.secondary || '无'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default DoctorCardPopup;
