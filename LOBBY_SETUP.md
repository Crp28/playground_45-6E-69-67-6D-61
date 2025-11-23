# Lobby and Game System Setup

## Overview
The application now has a proper separation between the Lobby (pre-game) and Game phases, with backend synchronization so multiple players can join the same room.

## Architecture

### Frontend Components
- **App.js**: Main controller that manages transitions between Lobby and Game phases
- **Lobby.js**: Pre-game waiting room for player setup
- **Game component**: (To be implemented) The actual game logic

### Backend
- **server/index.js**: Express server managing rooms, players, and state

## How It Works

### 1. Starting the System

**Terminal 1 - Start Backend:**
```bash
cd playground_45-6E-69-67-6D-61
node server/index.js
```
Server runs on `http://localhost:4000`

**Terminal 2 - Start Frontend:**
```bash
cd playground_45-6E-69-67-6D-61
npm start
```
Frontend runs on `http://localhost:3000`

### 2. Joining a Room

1. **First Player (becomes Host):**
   - Enter a room code (e.g., "ABC123")
   - Enter your nickname
   - Click "加入" (Join)
   - You become the host and control Player 1

2. **Additional Players:**
   - Enter the SAME room code
   - Enter your nickname
   - Click "加入"
   - You'll be assigned to the next available player slot

### 3. Pre-Game Lobby Features

**Host Controls:**
- Manually assign roles (医生/病患) to each player
- Use "随机分配身份" to randomly assign one doctor and rest as patients
- Start the game once conditions are met

**Doctor Player:**
- If assigned the doctor role, select your doctor character card
- View all available doctor cards using the "医生列表" button (top right)

**Game Start Conditions:**
- Exactly 1 player with doctor role
- Doctor has selected their character card
- At least 2 players in the room

### 4. Room Persistence

- Rooms are created automatically when first player joins
- Player tokens are saved in localStorage for reconnection
- Multiple browser tabs/windows can join the same room with the same code

## API Endpoints

### POST `/api/rooms/:code/join`
Join or rejoin a room
- Body: `{ name: string, token?: string }`
- Returns: `{ playerToken, controlledPlayerId, isHost, room }`

### GET `/api/rooms/:code`
Get current room state
- Returns: `{ room }`

### PATCH `/api/rooms/:code/roles`
Change a player's role (host only)
- Body: `{ playerId, role, token }`
- Returns: `{ room }`

### POST `/api/rooms/:code/randomize-roles`
Randomly assign roles (host only)
- Body: `{ token }`
- Returns: `{ room }`

### POST `/api/rooms/:code/doctor-card`
Select doctor character card
- Body: `{ playerId, cardKey, token }`
- Returns: `{ room }`

## Testing the System

### Test Scenario 1: Single Room, Multiple Players

1. Open browser window 1:
   - Join room "TEST1" as "Alice"
   - Assign yourself as "医生" (Doctor)
   - Select a doctor card

2. Open browser window 2:
   - Join room "TEST1" as "Bob"
   - You should see Alice already in the lobby
   - Alice (host) can assign you as "病患" (Patient)

3. In window 1 (Alice):
   - Click "开始游戏" once all conditions met
   - Both windows transition to game phase

### Test Scenario 2: Multiple Rooms

- Window 1: Join room "ROOM-A" as "Player1"
- Window 2: Join room "ROOM-B" as "Player2"
- Each room operates independently

## Next Steps

To complete the game integration:

1. **Create Game Component**: Extract game logic from `App_old.js` into a new `Game.js` component
2. **Add WebSocket/Polling**: For real-time game state synchronization
3. **Game State API**: Backend endpoints for game actions (move, attack, etc.)
4. **Persistent Game State**: Store game state in backend, not just lobby state

## File Changes

### New Files
- `src/App.js` - New version with lobby/game phase management
- `src/App_old.js` - Backup of original game logic (for reference)
- `src/App_new.js` - Staging file (can be deleted)

### Modified Files
- All original files remain unchanged except App.js

### Server Files
- `server/index.js` - Already had the backend implementation

## Troubleshooting

**Cannot connect to backend:**
- Ensure `node server/index.js` is running
- Check console for CORS errors
- Verify API_BASE url in App.js matches server port

**Players can't see each other:**
- Make sure both entered EXACT same room code (case-insensitive)
- Check browser console for API errors
- Verify localStorage has playerToken saved

**"只有房主可以执行此操作":**
- Only the first player (host) can change roles and start game
- Other players can only select doctor card if assigned doctor role
