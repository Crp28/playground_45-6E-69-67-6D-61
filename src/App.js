import React, { useState } from 'react';

// 玩家角色类型
const ROLES = {
  DOCTOR: '医生',
  PATIENT: '病患',
};

// 颜色分配
const ROLE_COLORS = {
  [ROLES.DOCTOR]: '#4A90E2', // 蓝色
  [ROLES.PATIENT]: '#E94E77', // 红色
};

// 生成18x18棋盘，每格含四边状态和探索标记
const BOARD_SIZE = 18;
function generateBoard() {
  // edges: {N: null|'wall'|'secret', E: null|'wall'|'secret', S: null|'wall'|'secret', W: null|'wall'|'secret'}
  // marks: 标记（如空心圆、尸体、大门等）
  return Array.from({ length: BOARD_SIZE }, (_, row) =>
    Array.from({ length: BOARD_SIZE }, (_, col) => ({
      row,
      col,
      edges: { N: null, E: null, S: null, W: null },
      marks: [], // [{type, color}]
    }))
  );
}

// 棋子样式
function Piece({ role, color }) {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,


      }}
    >
      {role === ROLES.DOCTOR ? '医' : '患'}
    </div>
  );
}

// 房间与玩家管理（仅前端演示，后续可接入socket.io）
function App() {
  // 医生自动袭击病患（可被主动调用）
  function tryDoctorAttack(row, col, allowSidePanel, diceType = 'attack') {
    const doctor = players.find(p => p.role === ROLES.DOCTOR);
    if (!doctor) return;
    const doctorPos = playerPositions[doctor.id];
    if (!doctorPos || doctorPos.x !== row || doctorPos.y !== col) return;
    players.forEach(p => {
      if (p.role === ROLES.PATIENT) {
        const pos = playerPositions[p.id];
        if (pos && pos.x === row && pos.y === col) {
          if (!pendingDamage[p.id] || pendingDamage[p.id].type !== 'attack') {
            addShowCard({ type: 'event', content: `医生自动袭击病患（${p.name}），判定中...` });
            // 统一所有骰子类型为'attack'
            showDiceModal(1, (results) => {
              let amount = 1;
              if (results[0] === 6) amount = 2;
              if (results[0] === 1) amount = 0;
              if (amount > 0) {
                setPlayerStats(stats => {
                  const s = { ...stats[p.id] };
                  s.pain = Math.max(0, s.pain - amount);
                  return { ...stats, [p.id]: s };
                });
                addShowCard({ type: 'event', content: `医生袭击判定结果：${results[0]}，${p.name}直接受到${amount}点疼痛伤害` });
              } else {
                addShowCard({ type: 'event', content: `医生袭击判定结果：${results[0]}，${p.name}未受伤害` });
              }
            }, 'attack');
          }
        }
      }
    });
  }
  // 病患待选伤害弹窗 { [id]: { type: 'doctorEvent'|'attack', amount: number } }
  const [pendingDamage, setPendingDamage] = useState({});
  // 右侧控制区域内容类型：'info' | 'edge' | 'dice'
  const [sidePanelContent, setSidePanelContent] = useState('info');
  // 探索墙体/暗道时选择边弹窗
  const [exploreEdgeModal, setExploreEdgeModal] = useState(null); // {row, col, cardType}
  // 病患用三张障碍牌换一张重症牌（弹窗选择具体障碍牌）
  const [exchangeModal, setExchangeModal] = useState(false);
  const [selectedObstacles, setSelectedObstacles] = useState([]);
  const handleExchangeObstaclesForCritical = () => {
    const obstacles = playerHands.disease
      .map((card, idx) => ({ card, idx }))
      .filter(obj => obj.card.startsWith('障碍'));
    if (obstacles.length < 3) return alert('需要至少三张障碍牌');
    setExchangeModal(true);
    setSelectedObstacles([]);
  };
  const handleConfirmExchange = () => {
    if (selectedObstacles.length !== 3) return alert('请选择三张障碍牌');
    setPlayerHands(hands => {
      const newDisease = hands.disease.filter((_, idx) => !selectedObstacles.includes(idx));
      return { ...hands, disease: [...newDisease, '重症：病情加重'] };
    });
    setExchangeModal(false);
    setSelectedObstacles([]);
    alert('已用三张障碍牌换一张重症牌');
  };
  const handleToggleObstacle = (idx) => {
    setSelectedObstacles(selected =>
      selected.includes(idx)
        ? selected.filter(i => i !== idx)
        : selected.length < 3 ? [...selected, idx] : selected
    );
  };

  // 暗道穿越与博弈弹窗
  const [tunnelBattle, setTunnelBattle] = useState(null); // {from, to, opponent, phase}
  const handleTunnelMove = (from, to) => {
    // 检查目标格附近是否有对方阵营角色
    const opponent = players.find(p => {
      if (p.id === players[currentPlayerIdx].id) return false;
      const pos = playerPositions[p.id];
      return pos && Math.abs(pos.x - to.x) <= 1 && Math.abs(pos.y - to.y) <= 1 && p.role !== players[currentPlayerIdx].role;
    });
    if (opponent) {
      setTunnelBattle({ from, to, opponent, phase: 'choose' });
    } else {
      // 直接移动
      setPlayerPositions(poss => ({ ...poss, [players[currentPlayerIdx].id]: { x: to.x, y: to.y } }));
      setRemainingSteps(s => s - 1);
      handleDrawCard('explore');
      if (remainingSteps - 1 <= 0) setMoving(false);
    }
  };
  // 博弈选择处理
  const handleTunnelBattleChoice = (doctorAction, patientAction) => {
    // 处理博弈结果
    let msg = '';
    if (doctorAction === '追杀' && patientAction === '逃跑') {
      msg = '密道形同虚设，博弈结束';
    } else if (doctorAction === '追杀' && patientAction === '偷袭') {
      msg = '医生受到一次袭击判定，下一次移动减少1格，博弈结束';
    } else if (doctorAction === '伺击' && patientAction === '逃跑') {
      msg = '医生伺击未生效，跳过移动阶段，博弈结束';
    } else if (doctorAction === '伺击' && patientAction === '偷袭') {
      msg = '病患受到一次袭击判定或丢弃一个道具，博弈结束';
    }
    setTunnelBattle({ ...tunnelBattle, phase: 'result', result: msg });
    // TODO: 处理具体效果
  };
  const handleTunnelBattleEnd = () => setTunnelBattle(null);
  // 玩家初始属性
  const initialStats = {
    sanity: 6, // 理智
    pain: 6,   // 耐痛
    speed: 4,  // 病患基础移速
    state: 'normal', // 状态：normal, crazy, dead
  };
  // 玩家属性（仅病患，医生无理智条，耐痛由角色卡决定）
  const [playerStats, setPlayerStats] = useState({
    2: { ...initialStats },
    3: { ...initialStats },
    4: { ...initialStats },
    // 1号为医生，后续可根据医生卡设置
  });

  // exploredCells 记录已探索格子，禁止重复探索
  const [exploredCells, setExploredCells] = useState(new Set());
  // 用于记录最近一次移动的来时方向
  const lastMoveDirRef = React.useRef(null);
  // 统一弹窗控制器逻辑：每次探索到新格子（未探索），都弹窗让玩家选边
  const handleExploreEffect = (playerId, row, col, cardType, moveDir) => {
    const cellKey = `${row}-${col}`;
    if (exploredCells.has(cellKey)) return; // 已探索过不再触发
    // 墙体/暗道牌，始终弹窗让玩家选边
    if (cardType === '墙体' || cardType === '暗道') {
      // moveDir = 玩家选择的边（只有弹窗按钮点击后才有值）
      if (!moveDir) {
        // 检查是否医生且有病患同格
        let showAttackDice = false;
        const player = players.find(p => p.id === playerId);
        if (player && player.role === ROLES.DOCTOR) {
          const hasPatient = players.some(p => p.role === ROLES.PATIENT && playerPositions[p.id] && playerPositions[p.id].x === row && playerPositions[p.id].y === col);
          if (hasPatient) showAttackDice = true;
        }
        setExploreEdgeModal({ row, col, cardType, playerId, moveDir: lastMoveDirRef.current });
        setSidePanelContent(prev => {
          const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
          let filtered = arr.filter(item => item.type !== 'edge');
          filtered = [...filtered, { type: 'edge' }];
          // 只追加 attack 类型骰子
          if (showAttackDice && !arr.some(item => item.type === 'dice' && item.diceType === 'attack')) {
            filtered.push({ type: 'dice', diceType: 'attack' });
          }
          return filtered;
        });
        // 不再在tryDoctorAttack里追加dice控制器
        if (showAttackDice) {
          setTimeout(() => {
            tryDoctorAttack(row, col, true, 'attack'); // 只处理伤害，不追加控制器
          }, 100);
        }
        return;
      }
      // 只判断已有墙体（暗道不判断）
      const cell = board[row][col];
      if (cardType === '墙体' && cell.edges[moveDir] === 'wall') {
        addShowCard({ type: 'explore', content: `该边已存在墙体，无法重复放置！` });
        return;
      }
      setExploredCells(prev => new Set(prev).add(cellKey));
      setBoard(prev => {
        const newBoard = prev.map(rowArr => rowArr.map(cell => ({ ...cell, edges: { ...cell.edges }, marks: [...cell.marks] })));
        const cell = newBoard[row][col];
        const player = players.find(p => p.id === playerId);
        if (cardType === '墙体') {
          // 禁止墙体覆盖暗道（本格和对面格都检测）
          const [dRow, dCol, oppDir] = moveDir === 'N' ? [-1, 0, 'S'] : moveDir === 'S' ? [1, 0, 'N'] : moveDir === 'E' ? [0, 1, 'W'] : [0, -1, 'E'];
          const nRow = row + dRow, nCol = col + dCol;
          if (cell.edges[moveDir] === 'secret') {
            addShowCard({ type: 'explore', content: `该边已有暗道，无法放置墙体！` });
            return newBoard;
          }
          if (nRow >= 0 && nRow < BOARD_SIZE && nCol >= 0 && nCol < BOARD_SIZE) {
            if (newBoard[nRow][nCol].edges[oppDir] === 'secret') {
              addShowCard({ type: 'explore', content: `对面边已有暗道，无法放置墙体！` });
              return newBoard;
            }
          }
          cell.edges[moveDir] = 'wall';
          if (nRow >= 0 && nRow < BOARD_SIZE && nCol >= 0 && nCol < BOARD_SIZE) {
            newBoard[nRow][nCol].edges[oppDir] = 'wall';
          }
          cell.marks.push({ type: 'circle', color: player.color });
        } else if (cardType === '暗道') {
          // 暗道不能覆盖已有暗道
          if (cell.edges[moveDir] === 'secret') {
            addShowCard({ type: 'explore', content: `该边已存在暗道，无法重复放置！` });
            return newBoard;
          }
          // 暗道取代墙体（本格和对面格都覆盖墙体并放暗道）
          if (cell.edges[moveDir] === 'wall') {
            cell.edges[moveDir] = null;
          }
          cell.edges[moveDir] = 'secret';
          // 对面格也覆盖墙体并放暗道
          const [dRow, dCol, oppDir] = moveDir === 'N' ? [-1, 0, 'S'] : moveDir === 'S' ? [1, 0, 'N'] : moveDir === 'E' ? [0, 1, 'W'] : [0, -1, 'E'];
          const nRow = row + dRow, nCol = col + dCol;
          if (nRow >= 0 && nRow < BOARD_SIZE && nCol >= 0 && nCol < BOARD_SIZE) {
            const oppCell = newBoard[nRow][nCol];
            if (oppCell.edges[oppDir] === 'wall') {
              oppCell.edges[oppDir] = null;
            }
            oppCell.edges[oppDir] = 'secret';
            // 检查本格和对面格该边是否都为暗道，如果是，则去掉对面格的暗道
            if (cell.edges[moveDir] === 'secret' && oppCell.edges[oppDir] === 'secret') {
              oppCell.edges[oppDir] = null;
            }
          }
          cell.marks.push({ type: 'circle', color: player.color });
        }
        return newBoard;
      });
      return;
    }
    // 其他探索牌
    setExploredCells(prev => new Set(prev).add(cellKey));
    setBoard(prev => {
      const newBoard = prev.map(rowArr => rowArr.map(cell => ({ ...cell, edges: { ...cell.edges }, marks: [...cell.marks] })));
      const cell = newBoard[row][col];
      const player = players.find(p => p.id === playerId);
      if (cardType === '大门') {
        cell.marks.push({ type: 'door' });
      } else if (cardType === '尸体') {
        cell.marks.push({ type: 'corpse' });
        if (player.role === ROLES.DOCTOR) {
          setRemainingSteps(s => {
            if (s <= 0) {
              setMoving(true); // 步数归零时直接获得2步并继续行动
              return 2;
            }
            return s - 1 + 2;
          });
        } else {
          setTimeout(() => handleDrawCard('item'), 500);
        }
      } else if (cardType === '意外') {
        cell.marks.push({ type: 'circle', color: player.color });
        if (player.role === ROLES.DOCTOR) {
          // 追加意外判定掷骰器
          setSidePanelContent(prev => {
            const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
            let filtered = arr.filter(item => item.type !== 'dice' || (item.diceType !== 'event' && item.diceType !== 'attack'));
            // 追加 event 判定
            if (!arr.some(item => item.type === 'dice' && item.diceType === 'event')) {
              filtered.push({ type: 'dice', diceType: 'event' });
            }
            // 追加 attack 判定（医生与病患同格才需要）
            const hasPatient = players.some(p => p.role === ROLES.PATIENT && playerPositions[p.id] && playerPositions[p.id].x === row && playerPositions[p.id].y === col);
            if (hasPatient && !arr.some(item => item.type === 'dice' && item.diceType === 'attack')) {
              filtered.push({ type: 'dice', diceType: 'attack' });
            }
            return filtered;
          });
          // 触发意外判定和袭击判定（医生与病患同格时）
          showDiceModal(1, (results) => {
            addShowCard({ type: 'event', content: `医生意外判定结果：${results[0]}` });
            if ([4, 5, 6].includes(results[0])) {
              const newPending = {};
              players.forEach(p => {
                if (p.role === ROLES.PATIENT) {
                  newPending[p.id] = { type: 'doctorEvent', amount: 1 };
                }
              });
              setPendingDamage(newPending);
            }
          }, 'event');
          const hasPatient = players.some(p => p.role === ROLES.PATIENT && playerPositions[p.id] && playerPositions[p.id].x === row && playerPositions[p.id].y === col);
          if (hasPatient) {
            showDiceModal(1, (results) => {
              let amount = 1;
              if (results[0] === 6) amount = 2;
              if (results[0] === 1) amount = 0;
              const patient = players.find(p => p.role === ROLES.PATIENT && playerPositions[p.id] && playerPositions[p.id].x === row && playerPositions[p.id].y === col);
              if (amount > 0 && patient) {
                setPlayerStats(stats => {
                  const s = { ...stats[patient.id] };
                  s.pain = Math.max(0, s.pain - amount);
                  return { ...stats, [patient.id]: s };
                });
                addShowCard({ type: 'event', content: `医生袭击判定结果：${results[0]}，${patient.name}直接受到${amount}点疼痛伤害` });
              } else if (patient) {
                addShowCard({ type: 'event', content: `医生袭击判定结果：${results[0]}，${patient.name}未受伤害` });
              }
            }, 'attack');
          }
        } else {
          setTimeout(() => handleDrawCard('event'), 500);
        }
        return newBoard;
      } else if (cardType === '密室') {
        // 密室效果：当前格四边全部放置暗道（本格和对面格都覆盖墙体并放暗道，之后如有双暗道则去掉对面格的暗道）
        ['N', 'E', 'S', 'W'].forEach(dir => {
          // 本格已有暗道则跳过
          if (cell.edges[dir] === 'secret') return;
          if (cell.edges[dir] === 'wall') cell.edges[dir] = null;
          cell.edges[dir] = 'secret';
          // 对面格也覆盖墙体并放暗道
          const [dRow, dCol, oppDir] = dir === 'N' ? [-1, 0, 'S'] : dir === 'S' ? [1, 0, 'N'] : dir === 'E' ? [0, 1, 'W'] : [0, -1, 'E'];
          const nRow = row + dRow, nCol = col + dCol;
          if (nRow >= 0 && nRow < BOARD_SIZE && nCol >= 0 && nCol < BOARD_SIZE) {
            const oppCell = newBoard[nRow][nCol];
            if (oppCell.edges[oppDir] === 'wall') oppCell.edges[oppDir] = null;
            oppCell.edges[oppDir] = 'secret';
            // 检查本格和对面格该边是否都为暗道，如果是，则去掉对面格的暗道
            if (cell.edges[dir] === 'secret' && oppCell.edges[oppDir] === 'secret') {
              oppCell.edges[oppDir] = null;
            }
          }
        });
        cell.marks.push({ type: 'circle', color: '#333' });
      } else {
        cell.marks.push({ type: 'circle', color: player.color });
      }
      // 探索流程全部结束后，医生与病患同格则触发袭击
      // 仅医生行动时
      if (players[currentPlayerIdx].role === ROLES.DOCTOR) {
        // 检查当前格是否有病患
        const doctorId = players[currentPlayerIdx].id;
        const doctorPos = playerPositions[doctorId];
        if (doctorPos && doctorPos.x === row && doctorPos.y === col) {
          const hasPatient = players.some(p => p.role === ROLES.PATIENT && playerPositions[p.id] && playerPositions[p.id].x === row && playerPositions[p.id].y === col);
          if (hasPatient) {
            setTimeout(() => {
              tryDoctorAttack(row, col);
            }, 100); // 确保探索信息栏已显示后再触发袭击
          }
        }
      }
      return newBoard;
    });
  };
  // 墙体/暗道弹窗选择边
  // 修复2：放置墙/暗道后只关闭自身控制器
  const handleEdgeSelect = (dir) => {
    if (!exploreEdgeModal) return;
    handleExploreEffect(
      exploreEdgeModal.playerId,
      exploreEdgeModal.row,
      exploreEdgeModal.col,
      exploreEdgeModal.cardType,
      dir
    );
    setExploreEdgeModal(null);
    closePanelType('edge'); // 只关闭自身，不清空sidePanelContent
  };
  // 游戏状态
  const [gameStarted, setGameStarted] = useState(false);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0); // 当前行动玩家索引
  const [playerPositions, setPlayerPositions] = useState({}); // {playerId: {x, y}}
  const [diceRolls, setDiceRolls] = useState({}); // {playerId: {xRolls: [], yRolls: []}}
  const [selectingDoctorCard, setSelectingDoctorCard] = useState(false);
  const [selectedDoctorCard, setSelectedDoctorCard] = useState(null);
  const [moveSteps, setMoveSteps] = useState(0);
  const [remainingSteps, setRemainingSteps] = useState(0);
  const [moving, setMoving] = useState(false);

  // 医生角色卡（示例）
  const DOCTOR_CARDS = [
    { key: 'heal', name: '治疗专家', desc: '可额外治疗一次' },
    { key: 'speed', name: '急救员', desc: '移速+2' },
    { key: 'shield', name: '防护者', desc: '免疫一次障碍牌' },
  ];

  // 掷骰决定出生点
  const rollDiceForPlayer = (playerId) => {
    const xRolls = [randDice(), randDice(), randDice()];
    const yRolls = [randDice(), randDice(), randDice()];
    setDiceRolls(r => ({ ...r, [playerId]: { xRolls, yRolls } }));
    // 取和作为坐标
    const x = xRolls.reduce((a, b) => a + b, 0);
    const y = yRolls.reduce((a, b) => a + b, 0);
    setPlayerPositions(pos => ({ ...pos, [playerId]: { x, y } }));
  };
  function randDice() { return Math.floor(Math.random() * 6) + 1; }

  // 医生选择角色卡
  const handleSelectDoctorCard = (card) => {
    setSelectedDoctorCard(card);
    setSelectingDoctorCard(false);
  };

  // 开始游戏
  const handleStartGame = () => {
    // 所有玩家掷骰
    players.forEach(p => rollDiceForPlayer(p.id));
    setGameStarted(true);
    // 医生选择角色卡
    if (players.find(p => p.role === ROLES.DOCTOR)) {
      setSelectingDoctorCard(true);
    }
    setCurrentPlayerIdx(0);
  };

  // 移动流程
  const getMoveSpeed = (player) => {
    let speed = player.role === ROLES.DOCTOR ? 6 : 4;
    if (selectedDoctorCard && selectedDoctorCard.key === 'speed' && player.role === ROLES.DOCTOR) speed += 2;
    // TODO: 受卡牌/效果影响
    return speed;
  };
  const handleChooseMoveSteps = (steps) => {
    setMoveSteps(steps);
    setRemainingSteps(steps);
    setMoving(true);
  };
  // 移动一格（支持传入目标格，自动检查障碍物）
  const handleMoveOneStep = (target) => {
    const player = players[currentPlayerIdx];
    const pos = playerPositions[player.id];
    let newPos = pos;
    if (target) {
      // 检查目标格是否合法（未被墙体阻挡，未越界）
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      if (Math.abs(dx) + Math.abs(dy) === 1) { // 只允许上下左右一步
        // 检查墙体阻挡
        let dir = null;
        if (dx === 1) dir = 'S';
        else if (dx === -1) dir = 'N';
        else if (dy === 1) dir = 'E';
        else if (dy === -1) dir = 'W';
        const cell = board[pos.x][pos.y];
        if (cell.edges[dir] !== 'wall') {
          newPos = { x: target.x, y: target.y };
        }
      }
    } else {
      // 默认向右移动（无障碍检测）
      if (pos.y + 1 < BOARD_SIZE && board[pos.x][pos.y].edges['E'] !== 'wall') {
        newPos = { x: pos.x, y: pos.y + 1 };
      }
    }
    setPlayerPositions(poss => ({ ...poss, [player.id]: newPos }));
    setRemainingSteps(s => s - 1);
    handleDrawCard('explore');
    if (remainingSteps - 1 <= 0) setMoving(false);
  };
  const handleEndTurn = () => {
    setMoveSteps(0);
    setRemainingSteps(0);
    setMoving(false);
    setCurrentPlayerIdx(idx => (idx + 1) % players.length);
  };
  // 丢弃道具弹窗
  const [discardMsg, setDiscardMsg] = useState(null);

  // 使用/丢弃手牌（仅UI，后续补充具体逻辑）
  const handleUseCard = (type, idx) => {
    // TODO: 实现具体效果
    alert(`使用了${type === 'item' ? '道具' : '病'}手牌：${playerHands[type][idx]}`);
  };
  const handleDiscardItem = (idx) => {
    // 移除道具手牌
    setPlayerHands(hands => {
      const newItems = [...hands.item];
      const card = newItems.splice(idx, 1)[0];
      setDiscardMsg(`已丢弃道具“${card}”到当前位置`);
      setTimeout(() => setDiscardMsg(null), 2000);
      return { ...hands, item: newItems };
    });
  };
  const [roomCode, setRoomCode] = useState('');
  const [inRoom, setInRoom] = useState(false);
  // 玩家颜色分配
  const PLAYER_COLORS = ['#4A90E2', '#E94E77', '#F5A623', '#7ED321', '#B8E986', '#50E3C2', '#9013FE', '#D0021B'];
  const [players, setPlayers] = useState([
    { id: 1, name: '房主', role: ROLES.DOCTOR, color: PLAYER_COLORS[0] },
    { id: 2, name: '玩家2', role: ROLES.PATIENT, color: PLAYER_COLORS[1] },
    { id: 3, name: '玩家3', role: ROLES.PATIENT, color: PLAYER_COLORS[2] },
    { id: 4, name: '玩家4', role: ROLES.PATIENT, color: PLAYER_COLORS[3] },
  ]);
  // 检查两格之间是否有墙体阻挡
  function isBlocked(from, to) {
    if (!from || !to) return false;
    if (from.x === to.x && from.y === to.y + 1) return board[from.x][from.y].edges.W === 'wall';
    if (from.x === to.x && from.y === to.y - 1) return board[from.x][from.y].edges.E === 'wall';
    if (from.x === to.x + 1 && from.y === to.y) return board[from.x][from.y].edges.N === 'wall';
    if (from.x === to.x - 1 && from.y === to.y) return board[from.x][from.y].edges.S === 'wall';
    return false;
  }
  // 获取可移动格子（上下左右，边界限制，墙体阻挡）
  const getMovableCells = () => {
    if (!gameStarted || !moving) return [];
    const player = players[currentPlayerIdx];
    const pos = playerPositions[player.id];
    const dirs = [
      { dx: 1, dy: 0 }, // 右
      { dx: -1, dy: 0 }, // 左
      { dx: 0, dy: 1 }, // 下
      { dx: 0, dy: -1 }, // 上
    ];
    return dirs
      .map(d => ({ x: pos.x + d.dx, y: pos.y + d.dy }))
      .filter(c => c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE)
      .filter(c => !isBlocked(pos, c));
  };

  // 点击棋盘格进行移动（移动后探索新格子）
  const handleCellClick = (row, col) => {
    if (!gameStarted || !moving || exploreEdgeModal || diceModals.length > 0) return;
    const movable = getMovableCells();
    if (!movable.some(c => c.x === row && c.y === col)) return;
    // 移动前清空信息栏
    setShowCardList([]);
    const player = players[currentPlayerIdx];
    const pos = playerPositions[player.id];
    let moveDir = null;
    // 判断来时方向（即玩家是从哪个方向移动到新格子的）
    if (row === pos.x + 1 && col === pos.y) moveDir = 'S';
    else if (row === pos.x - 1 && col === pos.y) moveDir = 'N';
    else if (row === pos.x && col === pos.y + 1) moveDir = 'E';
    else if (row === pos.x && col === pos.y - 1) moveDir = 'W';
    lastMoveDirRef.current = moveDir; // 记录来时方向
    if (isBlocked(pos, { x: row, y: col })) {
      alert('有墙体阻挡，无法移动！');
      return;
    }
    // 关键：移动后立即更新玩家位置
    setPlayerPositions(poss => ({ ...poss, [player.id]: { x: row, y: col } }));
    setRemainingSteps(s => s - 1);
    const cellKey = `${row}-${col}`;
    if (!exploredCells.has(cellKey)) {
      // 未探索格，先探索，探索流程结束后再判断袭击
      handleDrawCard('explore', { row, col });
      // 探索流程结束后，医生与病患同格则触发袭击
      // 只有医生行动时才触发
      if (players[currentPlayerIdx].role === ROLES.DOCTOR) {
        tryDoctorAttack(row, col);
      }
    } else {
      // 已探索格，直接判断袭击
      if (players[currentPlayerIdx].role === ROLES.DOCTOR) {
        tryDoctorAttack(row, col);
      }
    }
    if (remainingSteps - 1 <= 0) setMoving(false);
  };
  const [board, setBoard] = useState(generateBoard());

  // 五种牌库
  const DECKS = [
    { key: 'explore', name: '探索牌库' },
    { key: 'item', name: '道具牌库' },
    { key: 'event', name: '意外牌库' },
    { key: 'obstacle', name: '障碍牌库' },
    { key: 'critical', name: '重症牌库' },
  ];

  // 玩家手牌（演示用，后续可扩展为每个玩家独立手牌）
  const [playerHands, setPlayerHands] = useState({
    item: [], // 道具手牌
    disease: [], // 病手牌（障碍+重症）
  });

  // 展示牌内容通知区域（右上角，非弹窗）
  const [showCardList, setShowCardList] = useState([]); // [{type, content, id}]
  const addShowCard = (card) => {
    setShowCardList(prev => [...prev, { ...card, id: Date.now() + Math.random() }]);
  };
  const removeShowCard = (id) => {
    setShowCardList(prev => prev.filter(c => c.id !== id));
  };

  // 探索牌库初始化（1大门，2暗道，15墙体，2尸体，5意外）
  const INIT_EXPLORE_DECK = [
    '大门',
    '暗道', '暗道',
    '密室',
    ...Array(15).fill('墙体'),
    '尸体', '尸体',
    ...Array(5).fill('意外'),
  ];
  // 其他牌库
  const MOCK_CARDS = {
    event: ['意外：突发状况', '意外：天气变化'],
    item: ['道具：药品', '道具：工具'],
    obstacle: ['障碍：病毒', '障碍：封锁'],
    critical: ['重症：病情加重', '重症：紧急救治'],
  };
  // 探索牌库状态
  const [exploreDeck, setExploreDeck] = useState(shuffle([...INIT_EXPLORE_DECK]));
  function shuffle(arr) {
    return arr.slice().sort(() => Math.random() - 0.5);
  }

  // 抽牌逻辑（探索牌库有特殊效果）
  const handleDrawCard = (deckKey, exploreInfo = null) => {
    if (deckKey === 'explore') {
      // 每次抽牌都立即洗回牌库（即探索牌永不为空）
      const cardType = exploreDeck[0];
      setExploreDeck(deck => {
        // 抽出当前牌后，剩余牌洗回牌库并加回刚抽出的牌
        const newDeck = deck.slice(1);
        const reshuffled = shuffle([...newDeck, cardType]);
        return reshuffled;
      });
      // 触发探索效果在新格子
      if (exploreInfo) {
        handleExploreEffect(players[currentPlayerIdx].id, exploreInfo.row, exploreInfo.col, cardType, exploreInfo.moveDir);
      }
      addShowCard({ type: 'explore', content: `探索牌：${cardType}` });
    } else if (deckKey === 'event') {
      const cards = MOCK_CARDS.event;
      const card = cards[Math.floor(Math.random() * cards.length)];
      addShowCard({ type: deckKey, content: card });
    } else if (deckKey === 'item') {
      const cards = MOCK_CARDS.item;
      const card = cards[Math.floor(Math.random() * cards.length)];
      setPlayerHands(hands => ({ ...hands, item: [...hands.item, card] }));
      addShowCard({ type: deckKey, content: `获得道具牌：${card}` });
    } else if (deckKey === 'obstacle' || deckKey === 'critical') {
      const cards = MOCK_CARDS[deckKey];
      const card = cards[Math.floor(Math.random() * cards.length)];
      setPlayerHands(hands => ({ ...hands, disease: [...hands.disease, card] }));
      addShowCard({ type: deckKey, content: `获得病牌：${card}` });
    }
  };

  // 加入房间
  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setInRoom(true);
    }
  };

  // 更改身份
  const handleChangeRole = (playerId, newRole) => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId
          ? { ...p, role: newRole, color: ROLE_COLORS[newRole] }
          : p
      )
    );
    // TODO: 通报所有人（后端实现）
  };

  // 掷骰控制器区域
  // 多类型掷骰控制器区域
  const [diceModals, setDiceModals] = useState([]); // [{ diceType, count, onResult }]
  const [diceResultsList, setDiceResultsList] = useState([]); // [{ diceType, results }]
  const showDiceModal = (count = 1, onResult = null, diceType = 'default') => {
    setDiceModals(prev => {
      if (prev.some(m => m.diceType === diceType)) return prev;
      return [...prev, { diceType, count, onResult }];
    });
    setDiceResultsList(prev => {
      if (prev.some(r => r.diceType === diceType)) return prev;
      return [...prev, { diceType, results: [] }];
    });
    setSidePanelContent(prev => {
      const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
      if (!arr.some(item => item.type === 'dice' && item.diceType === diceType)) {
        return [...arr, { type: 'dice', diceType }];
      }
      return arr;
    });
  };
  const handleRollDice = (diceType) => {
    const modal = diceModals.find(m => m.diceType === diceType);
    if (!modal) return;
    const results = Array.from({ length: modal.count }, () => Math.floor(Math.random() * 6) + 1);
    setDiceResultsList(prev => prev.map(r => r.diceType === diceType ? { ...r, results } : r));
    if (modal.onResult) modal.onResult(results);
  };
  const handleCloseDiceModal = (diceType) => {
    setDiceModals(prev => prev.filter(m => m.diceType !== diceType));
    setDiceResultsList(prev => prev.filter(r => r.diceType !== diceType));
    closePanelType('dice', diceType);
  };

  // 关闭控制器只移除对应项（放在顶层，供所有控制器调用）
  const closePanelType = (type, diceType) => {
    setSidePanelContent(prev => {
      const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
      return arr.filter(item => {
        if (item.type !== type) return true;
        if (type === 'dice' && diceType && item.diceType !== diceType) return true;
        return false;
      });
    });
  };

  // 顶层 useEffect：医生移动后自动袭击病患
  React.useEffect(() => {
    if (!gameStarted) return;
    const doctor = players.find(p => p.role === ROLES.DOCTOR);
    if (!doctor) return;
    const doctorPos = playerPositions[doctor.id];
    if (!doctorPos) return;
    // 仅在没有探索弹窗/流程时自动判定医生袭击（如玩家手动移动到已探索格）
    if (sidePanelContent !== 'edge' && sidePanelContent !== 'dice' && sidePanelContent !== 'exchangeModal') {
      const doctor = players.find(p => p.role === ROLES.DOCTOR);
      if (!doctor) return;
      const doctorPos = playerPositions[doctor.id];
      if (!doctorPos) return;
      tryDoctorAttack(doctorPos.x, doctorPos.y);
    }
  }, [playerPositions, gameStarted]);

  // 病患选择伤害处理函数（顶层定义）
  const handlePatientChooseDamage = (pid, type) => {
    setPlayerStats(stats => {
      const s = { ...stats[pid] };
      const amount = pendingDamage[pid]?.amount || 1;
      if (type === 'sanity') s.sanity = Math.max(0, s.sanity - amount);
      else if (type === 'pain') s.pain = Math.max(0, s.pain - amount);
      return { ...stats, [pid]: s };
    });
    setPendingDamage(prev => {
      const copy = { ...prev };
      delete copy[pid];
      return copy;
    });
  };

  // 放置控制器组件
  function EdgeController({ modal, board, handleEdgeSelect }) {
    if (!modal) return null;
    const getOppositeDir = dir => ({ N: 'S', S: 'N', E: 'W', W: 'E' }[dir]);
    let forbiddenDir = null;
    if (modal.moveDir) forbiddenDir = getOppositeDir(modal.moveDir);
    const cell = board[modal.row][modal.col];
    const [row, col] = [modal.row, modal.col];
    const disableWallBtn = dir => {
      if (forbiddenDir === dir) return true;
      if (cell.edges[dir] === 'wall' || cell.edges[dir] === 'secret') return true;
      // 检查对面格该边是否有暗道
      const [dRow, dCol, oppDir] = dir === 'N' ? [-1, 0, 'S'] : dir === 'S' ? [1, 0, 'N'] : dir === 'E' ? [0, 1, 'W'] : [0, -1, 'E'];
      const nRow = row + dRow, nCol = col + dCol;
      if (nRow >= 0 && nRow < BOARD_SIZE && nCol >= 0 && nCol < BOARD_SIZE) {
        const oppCell = board[nRow][nCol];
        if (oppCell.edges[oppDir] === 'secret') return true;
      }
      return false;
    };
    const disableSecretBtn = dir => false;
    return (
      <div style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 1px 8px #aaa',
        padding: '18px 24px',
        textAlign: 'center',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        minWidth: 220,
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8 }}>选择要放置{modal.cardType}的边</div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <button
            style={{ width: 48, height: 48, fontSize: 22, borderRadius: '50%', marginBottom: 4 }}
            onClick={() => handleEdgeSelect('N')}
            disabled={modal.cardType === '墙体' ? disableWallBtn('N') : disableSecretBtn('N')}
          >↑</button>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
            <button
              style={{ width: 48, height: 48, fontSize: 22, borderRadius: '50%' }}
              onClick={() => handleEdgeSelect('W')}
              disabled={modal.cardType === '墙体' ? disableWallBtn('W') : disableSecretBtn('W')}
            >←</button>
            <button
              style={{ width: 48, height: 48, fontSize: 22, borderRadius: '50%' }}
              onClick={() => handleEdgeSelect('E')}
              disabled={modal.cardType === '墙体' ? disableWallBtn('E') : disableSecretBtn('E')}
            >→</button>
          </div>
          <button
            style={{ width: 48, height: 48, fontSize: 22, borderRadius: '50%', marginTop: 4 }}
            onClick={() => handleEdgeSelect('S')}
            disabled={modal.cardType === '墙体' ? disableWallBtn('S') : disableSecretBtn('S')}
          >↓</button>
        </div>
      </div>
    );
  }

  // 掷骰控制器组件
  function DiceController({ diceType }) {
    const modal = diceModals.find(m => m.diceType === diceType);
    const diceResults = diceResultsList.find(r => r.diceType === diceType)?.results || [];
    if (!modal) return null;
    return (
      <div style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 1px 8px #aaa',
        padding: '18px 24px',
        textAlign: 'center',
        marginBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        minWidth: 220,
      }}>
        <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8 }}>
          掷骰判定{diceType === 'attack' ? '（袭击）' : diceType === 'event' ? '（意外）' : ''}
        </div>
        <div style={{ marginBottom: 8 }}>骰子数量：{modal.count}</div>
        {diceResults.length === 0 && (<button style={{ fontSize: 18, padding: '8px 32px', marginBottom: 8 }} onClick={() => handleRollDice(diceType)}>掷骰</button>)}
        {diceResults.length > 0 && (
          <>
            <div style={{ fontSize: 22, color: '#4A90E2', marginBottom: 8 }}>
              结果：{diceResults.join(', ')}
            </div>
            <button style={{ fontSize: 15, padding: '6px 18px' }} onClick={() => handleCloseDiceModal(diceType)}>关闭</button>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif', position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
      {/* 棋盘、右侧控制栏（唯一） */}
      <div>
        {/* ...棋盘渲染代码... */}
      </div>
      {!inRoom ? (
        <div style={{ maxWidth: 320, margin: '0 auto', textAlign: 'center' }}>
          <h2>加入游戏房间</h2>
          <input
            type="text"
            placeholder="输入房间码"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            style={{ padding: 8, fontSize: 16, width: '80%' }}
          />
          <br /><br />
          <button onClick={handleJoinRoom} style={{ padding: '8px 24px', fontSize: 16 }}>
            加入
          </button>
        </div>
      ) : (
        <div>
          <h2>房间：{roomCode}</h2>
          {!gameStarted ? (
            <div style={{ marginBottom: 24 }}>
              <button style={{ fontSize: 18, padding: '8px 32px' }} onClick={handleStartGame}>开始游戏</button>
            </div>
          ) : null}
          {/* 医生选择角色卡弹窗 */}
          {selectingDoctorCard && (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
            }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: '32px 48px', boxShadow: '0 2px 16px #aaa', textAlign: 'center' }}>
                <h3>选择医生角色卡</h3>
                {DOCTOR_CARDS.map(card => (
                  <div key={card.key} style={{ margin: '12px 0' }}>
                    <button style={{ fontSize: 16, padding: '6px 18px' }} onClick={() => handleSelectDoctorCard(card)}>{card.name}</button>
                    <span style={{ marginLeft: 12, color: '#888' }}>{card.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* 玩家出生点与棋子放置 */}
          {gameStarted && (
            <div style={{ marginBottom: 24 }}>
              <h3>玩家出生点</h3>
              <ul>
                {players.map(p => (
                  <li key={p.id}>
                    {p.name}（{p.role}）：
                    {diceRolls[p.id] ?
                      `x轴(${diceRolls[p.id].xRolls.join(',')})=${playerPositions[p.id].x}, y轴(${diceRolls[p.id].yRolls.join(',')})=${playerPositions[p.id].y}`
                      : '未掷骰'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {/* 当前玩家行动流程 */}
          {gameStarted && (
            <div style={{ marginBottom: 24, background: '#f8f8f8', borderRadius: 8, padding: 16 }}>
              <h3>当前玩家回合：{players[currentPlayerIdx].name}（{players[currentPlayerIdx].role}）</h3>
              {!moving ? (
                <div>
                  <div>请选择本回合移动步数（上限：{getMoveSpeed(players[currentPlayerIdx])}）</div>
                  <input type="number" min={1} max={getMoveSpeed(players[currentPlayerIdx])}
                    value={moveSteps} onChange={e => setMoveSteps(Number(e.target.value))} style={{ width: 60, marginRight: 12 }} />
                  <button onClick={() => handleChooseMoveSteps(moveSteps)} disabled={moveSteps < 1 || moveSteps > getMoveSpeed(players[currentPlayerIdx])}>确定</button>
                </div>
              ) : (
                <div>
                  <div>剩余步数：{remainingSteps}</div>
                  <button onClick={handleEndTurn} disabled={remainingSteps <= 0 || !!exploreEdgeModal}>结束回合</button>
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
            {/* 玩家属性条展示 */}
            <div>
              <h3>玩家属性</h3>
              <ul>
                {players.map(player => (
                  <li key={player.id} style={{ marginBottom: 8 }}>
                    <span style={{ color: player.color, fontWeight: 'bold' }}>{player.name}</span>
                    <span style={{ marginLeft: 8 }}>{player.role}</span>
                    {player.role === ROLES.PATIENT && playerStats[player.id] && (
                      <span style={{ marginLeft: 12 }}>
                        理智：<span style={{ color: '#9013FE' }}>{playerStats[player.id].sanity}</span>
                        &nbsp;|&nbsp;耐痛：<span style={{ color: '#D0021B' }}>{playerStats[player.id].pain}</span>
                        &nbsp;|&nbsp;状态：{playerStats[player.id].state === 'crazy' ? '疯狂' : playerStats[player.id].state === 'dead' ? '死亡' : '正常'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>玩家列表</h3>
              <ul>
                {players.map(player => (
                  <li key={player.id} style={{ marginBottom: 8 }}>
                    <Piece role={player.role} color={player.color} />
                    <span style={{ marginLeft: 8 }}>{player.name}</span>
                    <span style={{ marginLeft: 8, color: player.color }}>{player.role}</span>
                    <select
                      value={player.role}
                      onChange={e => handleChangeRole(player.id, e.target.value)}
                      style={{ marginLeft: 8 }}
                    >
                      <option value={ROLES.DOCTOR}>医生</option>
                      <option value={ROLES.PATIENT}>病患</option>
                    </select>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>五种牌库</h3>
              <div style={{ display: 'flex', gap: 12 }}>
                {DECKS.map(deck => (
                  <div key={deck.key} style={{
                    background: '#fafafa',
                    border: '1px solid #bbb',
                    borderRadius: 6,
                    padding: '8px 12px',
                    minWidth: 72,
                    textAlign: 'center',
                    boxShadow: '0 1px 4px #eee',
                  }}>
                    {deck.name}
                    <br />
                    <button
                      style={{ marginTop: 6, fontSize: 14, padding: '2px 10px' }}
                      onClick={() => handleDrawCard(deck.key)}
                    >抽牌</button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>玩家手牌</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <strong>道具手牌：</strong>
                  <div style={{ marginLeft: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {playerHands.item.length === 0 ? '（空）' :
                      playerHands.item.map((card, idx) => (
                        <span key={idx} style={{
                          background: '#e3f7ff',
                          border: '1px solid #4A90E2',
                          borderRadius: 6,
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {card}
                          <button style={{ fontSize: 12 }} onClick={() => handleUseCard('item', idx)}>使用</button>
                          <button style={{ fontSize: 12 }} onClick={() => handleDiscardItem(idx)}>丢弃</button>
                        </span>
                      ))}
                  </div>
                </div>
                <div>
                  <strong>病手牌：</strong>
                  <div style={{ marginLeft: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {playerHands.disease.length === 0 ? '（空）' :
                      playerHands.disease.map((card, idx) => (
                        <span key={idx} style={{
                          background: '#ffe3e3',
                          border: '1px solid #E94E77',
                          borderRadius: 6,
                          padding: '4px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          {card}
                          <button style={{ fontSize: 12 }} onClick={() => handleUseCard('disease', idx)}>使用</button>
                        </span>
                      ))}
                  </div>
                  {/* 病患换重症牌入口，仅病患且障碍牌>=3时可用 */}
                  <button style={{ marginLeft: 8, fontSize: 12 }} onClick={handleExchangeObstaclesForCritical}>用三张障碍牌换一张重症牌</button>
                  {/* 障碍牌选择弹窗 */}
                  {exchangeModal && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                      background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
                    }}>
                      <div style={{ background: '#fff', borderRadius: 10, padding: '32px 48px', boxShadow: '0 2px 16px #aaa', textAlign: 'center' }}>
                        <h3>选择三张障碍牌进行交换</h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                          {playerHands.disease.map((card, idx) =>
                            card.startsWith('障碍') ? (
                              <label key={idx} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedObstacles.includes(idx)}
                                  onChange={() => handleToggleObstacle(idx)}
                                  disabled={
                                    !selectedObstacles.includes(idx) && selectedObstacles.length >= 3
                                  }
                                />
                                <span style={{ background: '#ffe3e3', border: '1px solid #E94E77', borderRadius: 6, padding: '4px 10px' }}>{card}</span>
                              </label>
                            ) : null
                          )}
                        </div>
                        <button style={{ fontSize: 14, padding: '6px 18px', marginRight: 12 }} onClick={handleConfirmExchange}>确认交换</button>

                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* 暗道博弈弹窗 */}
              {tunnelBattle && tunnelBattle.phase === 'choose' && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                  background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
                }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: '32px 48px', boxShadow: '0 2px 16px #aaa', textAlign: 'center' }}>
                    <h3>暗道博弈</h3>
                    <div>医生（{tunnelBattle.opponent.name}）选择：</div>
                    <button onClick={() => handleTunnelBattleChoice('追杀', null)} style={{ margin: 8 }}>追杀</button>
                    <button onClick={() => handleTunnelBattleChoice('伺击', null)} style={{ margin: 8 }}>伺击</button>
                    <div>病患（{players[currentPlayerIdx].name}）选择：</div>
                    <button onClick={() => handleTunnelBattleChoice(null, '逃跑')} style={{ margin: 8 }}>逃跑</button>
                    <button onClick={() => handleTunnelBattleChoice(null, '偷袭')} style={{ margin: 8 }}>偷袭</button>
                  </div>
                </div>
              )}
              {tunnelBattle && tunnelBattle.phase === 'result' && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                  background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
                }}>
                  <div style={{ background: '#fff', borderRadius: 10, padding: '32px 48px', boxShadow: '0 2px 16px #aaa', textAlign: 'center' }}>
                    <h3>博弈结果</h3>
                    <div>{tunnelBattle.result}</div>
                    <button style={{ marginTop: 16 }} onClick={handleTunnelBattleEnd}>关闭</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start' }}>
            <div>
              <h3>棋盘</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${BOARD_SIZE}, 28px)`,
                  gridTemplateRows: `repeat(${BOARD_SIZE}, 28px)`,
                  gap: 0,
                  background: '#eee',
                  padding: 8,
                  borderRadius: 0,
                  overflow: 'auto',
                  maxWidth: 540,
                  maxHeight: 540,
                }}
              >
                {board.flat().map(cell => {
                  // 检查是否有尸体或大门标记
                  const hasCorpse = cell.marks.some(m => m.type === 'corpse');
                  const hasDoor = cell.marks.some(m => m.type === 'door');
                  // 棋盘格是否有玩家
                  const playerOnCell = Object.entries(playerPositions).find(([pid, pos]) => pos.x === cell.row && pos.y === cell.col);
                  // 当前玩家可移动格子
                  const movableCells = getMovableCells();
                  const isMovable = movableCells.some(c => c.x === cell.row && c.y === cell.col);
                  // 当前玩家位置
                  const currentPlayer = players[currentPlayerIdx];
                  const currentPos = playerPositions[currentPlayer.id];
                  // 背景色优先级：大门 > 尸体 > 默认
                  let cellBg = '#fff';
                  if (hasDoor) cellBg = '#FFE9B3'; // 淡金色
                  else if (hasCorpse) cellBg = '#d2d2d2'; // 淡灰色
                  return (
                    <div
                      key={`${cell.row}-${cell.col}`}
                      onClick={() => handleCellClick(cell.row, cell.col)}
                      style={{
                        width: 28,
                        height: 28,
                        background: cellBg,
                        border: '1px solid #ccc',
                        borderRadius: 0,
                        position: 'relative',
                        cursor: isMovable && !exploreEdgeModal ? 'pointer' : 'default',
                        overflow: 'hidden', // 防止背景色超出格子
                      }}
                    >
                      {/* 可移动色块，单独渲染在最底层，zIndex: 0 */}
                      {isMovable && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: currentPlayer.color,
                          opacity: 0.18, // 更低透明度
                          zIndex: 1,
                          pointerEvents: 'none',
                          borderRadius: 0,
                        }} />
                      )}
                      <>
                        {/* N边 */}
                        {cell.edges.N === 'wall' && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0, zIndex: 2 }}>
                            <div style={{ height: '6px', width: '100%', background: '#888', borderRadius: 0 }} />
                          </div>
                        )}
                        {cell.edges.N === 'secret' && (
                          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0, zIndex: 2 }}>
                            <svg width="28" height="6" style={{ position: 'absolute', top: 0, left: 0 }}>
                              <ellipse cx="14" cy="3" rx="12" ry="2" fill="none" stroke="#9013FE" strokeWidth="2" />
                            </svg>
                          </div>
                        )}
                        {/* S边 */}
                        {cell.edges.S === 'wall' && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0, zIndex: 2 }}>
                            <div style={{ height: '6px', width: '100%', background: '#888', borderRadius: 0 }} />
                          </div>
                        )}
                        {cell.edges.S === 'secret' && (
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0, zIndex: 2 }}>
                            <svg width="28" height="6" style={{ position: 'absolute', bottom: 0, left: 0 }}>
                              <ellipse cx="14" cy="3" rx="12" ry="2" fill="none" stroke="#9013FE" strokeWidth="2" />
                            </svg>
                          </div>
                        )}
                        {/* W边 */}
                        {cell.edges.W === 'wall' && (
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, zIndex: 2 }}>
                            <div style={{ width: '6px', height: '100%', background: '#888', borderRadius: 0 }} />
                          </div>
                        )}
                        {cell.edges.W === 'secret' && (
                          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0, zIndex: 2 }}>
                            <svg width="6" height="28">
                              <ellipse cx="3" cy="14" rx="2" ry="12" fill="none" stroke="#9013FE" strokeWidth="2" />
                            </svg>
                          </div>
                        )}
                        {/* E边 */}
                        {cell.edges.E === 'wall' && (
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 0, zIndex: 2 }}>
                            <div style={{ width: '6px', height: '100%', background: '#888', borderRadius: 0 }} />
                          </div>
                        )}
                        {cell.edges.E === 'secret' && (
                          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 0, zIndex: 2 }}>
                            <svg width="28" height="28" style={{ position: 'absolute', right: 0, top: 0 }}>
                              <ellipse cx="25" cy="14" rx="2" ry="12" fill="none" stroke="#9013FE" strokeWidth="2" />
                            </svg>
                          </div>
                        )}
                      </>
                      {/* 玩家棋子 */}
                      {playerOnCell && (
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 1000,
                        }}>
                          <Piece role={players.find(p => p.id === Number(playerOnCell[0])).role}
                            color={players.find(p => p.id === Number(playerOnCell[0])).color} />
                        </div>
                      )}

                      {/* 格子内标记（大门、尸体、空心圆） */}
                      {cell.marks.map((mark, idx) => (
                        mark.type === 'door' ? (
                          <span key={idx} style={{ position: 'absolute', bottom: 0 + idx * 12, right: -1, fontSize: 22, color: '#4A90E2', zIndex: 20 }}>🚪</span>
                        ) : mark.type === 'corpse' ? (
                          <span key={idx} style={{ position: 'absolute', bottom: 0 + idx * 12, right: -1, fontSize: 22, color: '#D0021B', zIndex: 20 }}>💀</span>
                        ) : mark.type === 'circle' ? (
                          <span key={idx} style={{
                            position: 'absolute',
                            bottom: 6 + idx * 12,
                            right: 9,
                            width: 6,
                            height: 6,
                            border: `2px solid ${mark.color || '#9013FE'}`,
                            borderRadius: '50%',
                            background: 'transparent',
                            display: 'inline-block',

                          }} />
                        ) : null
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 信息栏和边选择控制器区域 */}
            <div style={{ minWidth: 260, marginLeft: 32 }}>
              {/* 信息栏始终可见 */}
              {/* 病患伤害选择弹窗（每个病患自己界面显示） */}
              {Object.entries(pendingDamage).map(([pid, info]) => {
                const patient = players.find(p => p.id === Number(pid));
                if (!patient) return null;
                // 仅医生意外判定时显示选择弹窗，且仅显示给当前病患
                if (info.type === 'doctorEvent') {
                  if (currentPlayerIdx !== players.findIndex(p => p.id === Number(pid))) return null;
                  return (
                    <div key={pid} style={{
                      background: '#fff',
                      borderRadius: 10,
                      boxShadow: '0 1px 8px #aaa',
                      padding: '18px 24px',
                      textAlign: 'center',
                      marginBottom: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 12,
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 8 }}>
                        医生意外判定：请选择承受1点伤害类型
                      </div>
                      <button style={{ fontSize: 16, padding: '6px 18px', marginBottom: 8 }} onClick={() => handlePatientChooseDamage(pid, 'sanity')}>理智 -{info.amount}</button>
                      <button style={{ fontSize: 16, padding: '6px 18px' }} onClick={() => handlePatientChooseDamage(pid, 'pain')}>疼痛 -{info.amount}</button>
                    </div>
                  );
                }
                return null;
              })}
              <div style={{
                background: '#f8f8f8',
                borderRadius: 8,
                boxShadow: '0 1px 4px #eee',
                padding: '12px 18px',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'left',
                marginBottom: 24,
              }}>
                {showCardList.length > 0 ? (
                  showCardList.map(card => (
                    <div key={card.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div>{card.content}</div>
                      </div>
                      <button
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: 20,
                          color: '#888',
                          cursor: 'pointer',
                          marginLeft: 10,
                          marginTop: 2,
                        }}
                        onClick={() => removeShowCard(card.id)}
                        title="关闭"
                      >×</button>
                    </div>
                  ))
                ) : (
                  <div style={{ color: '#bbb', fontWeight: 'normal', fontSize: 14 }}>暂无信息</div>
                )}
              </div>
              {/* 放置指示器和掷骰判定等，始终在信息栏下方，仅在需要时显示 */}
              {/* 信息栏下方，控制器区域 */}
              <div style={{ display: 'flex', flexDirection: 'row', gap: 16 }}>
                {Array.isArray(sidePanelContent) && sidePanelContent.map((item, idx) => {
                  if (item.type === 'edge') {
                    return <EdgeController key={idx} modal={exploreEdgeModal} board={board} handleEdgeSelect={handleEdgeSelect} />;
                  }
                  if (item.type === 'dice') {
                    return <DiceController key={item.diceType || idx} diceType={item.diceType} />;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
          {/* 丢弃道具提示弹窗 */}
          {discardMsg && (
            <div style={{
              position: 'fixed',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0  2px 8px #aaa',
              padding: '12px 32px',
              fontSize: 16,
              color: '#4A90E2',
              zIndex: 1000,
            }}>{discardMsg}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
