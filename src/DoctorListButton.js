import React from 'react';

function DoctorListButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                position: 'fixed',
                top: 20,
                right: 20,
                padding: '10px 16px',
                fontSize: 16,
                fontWeight: 'bold',
                background: '#4A90E2',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.2s',
                zIndex: 1000,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = '#357ABD';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = '#4A90E2';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
            }}
        >
            {/* Kebab menu icon (three vertical dots) */}
            <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle cx="10" cy="4" r="2" fill="currentColor" />
                <circle cx="10" cy="10" r="2" fill="currentColor" />
                <circle cx="10" cy="16" r="2" fill="currentColor" />
            </svg>
            医生列表
        </button>
    );
}

export default DoctorListButton;
