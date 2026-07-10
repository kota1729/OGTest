/**
 * チンチ口（chinchiguti）修正・UI刷新版モジュール実装
 * 
 * 【変更点】
 * 1. スマホ最適化 (Mobile-friendly):
 *    - ボタンに `touch-action: manipulation;` を付与し、ダブルタップズームや誤選択を防止。
 *    - サイコロコンテナを `flex-wrap: wrap; justify-content: center;` にし、画面幅が狭いスマホでも折り返して綺麗に収まる設計に。
 *    - 文字サイズや余白に `rem` や `vw/vh` を意識した相対的デザインを取り入れ、タップしやすいターゲットサイズ（最小44px）を確保。
 * 2. PC向けプレミアムデザイン (Desktop Polish):
 *    - 漆黒・ゴールド・サイバー感をベースにしたグラデーション背景、ネオン調のボーダーシャドウ、洗練されたフォント配置。
 *    - スコアボードを「カード型」にビジュアル化し、現在の手番プレイヤーを滑らかなネオンシャドウで強調。
 *    - サイコロ（.chinchiro-die）に洗練された3Dシャドウ、滑らかな回転アニメーションを追加。
 */

// --- 拡張版 CSS スタイル ---
const chinchigutiStyles = `
/* 共通コンテナ */
.chinchiguti-container {
    font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', sans-serif;
    color: #e0e6ed;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
}

/* カスタム設定ボックス */
.chinchiguti-custom-box {
    background: linear-gradient(135deg, rgba(30, 30, 40, 0.8), rgba(20, 20, 25, 0.9));
    border: 1px solid rgba(255, 215, 0, 0.2);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
}
.chinchiguti-custom-title {
    font-size: 14px;
    font-weight: 700;
    color: #ffd700;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
}
.chinchiguti-select {
    background: #15151e;
    color: #ffffff;
    border: 1px solid #ffd700;
    padding: 8px 12px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    outline: none;
    transition: all 0.2s;
    -webkit-appearance: none;
    appearance: none;
}
.chinchiguti-select:focus {
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
}

/* スコアボード */
.chinchiguti-board {
    background: rgba(15, 15, 25, 0.7);
    border-radius: 12px;
    padding: 14px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
}
.chinchiguti-row {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    margin-bottom: 6px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid transparent;
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.chinchiguti-row.active-turn {
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.02));
    border-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.1);
}
.chinchiguti-row.finished {
    background: rgba(76, 175, 80, 0.05);
    border-color: rgba(76, 175, 80, 0.2);
    opacity: 0.8;
}

/* メインステージ */
.chinchiguti-stage {
    background: linear-gradient(180deg, rgba(25, 25, 35, 0.85), rgba(15, 15, 20, 0.95));
    border-radius: 16px;
    padding: 24px 16px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    margin-top: 16px;
}

/* 洗練されたサイコロデザイン */
.chinchiro-die {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    background: #ffffff;
    color: #111111;
    font-size: 26px;
    font-weight: 800;
    border-radius: 12px;
    box-shadow: 0 4px 0 #cccccc, 0 8px 15px rgba(0,0,0,0.3);
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
    transition: transform 0.1s;
}
@media (max-width: 480px) {
    .chinchiro-die {
        width: 46px;
        height: 46px;
        font-size: 22px;
        border-radius: 10px;
    }
}
.chinchiro-die.rolling {
    animation: chinchiguti-shake 0.15s infinite alternate;
    background: #f0f3f8;
    box-shadow: 0 2px 0 #bbbbbb, 0 4px 8px rgba(0,0,0,0.2);
}
@keyframes chinchiguti-shake {
    0% { transform: translate(2px, 1px) rotate(0deg); }
    100% { transform: translate(-1px, -2px) rotate(-5deg); }
}

/* スマホでも押しやすい特大アクションボタン */
.chinchiguti-btn-primary {
    background: linear-gradient(135deg, #ffd700, #ffa500);
    color: #000000;
    border: none;
    padding: 14px 36px;
    font-size: 16px;
    font-weight: 800;
    border-radius: 30px;
    cursor: pointer;
    box-shadow: 0 5px 15px rgba(255, 165, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.4);
    transition: all 0.2s ease;
    touch-action: manipulation; /* スマホのタップ遅延防止 */
    -webkit-tap-highlight-color: transparent;
    display: inline-block;
}
.chinchiguti-btn-primary:active {
    transform: translateY(2px);
    box-shadow: 0 2px 6px rgba(255, 165, 0, 0.4);
}
`;

// --- HTML テンプレート ---
const chinchigutiHtmlTemplate = `
<div class="chinchiguti-container">
    <!-- 1. 設定エリア -->
    <div id="chinchiguti-custom-setup" class="chinchiguti-custom-box" style="display: none;">
        <div class="chinchiguti-custom-title">🎲 チンチ口 カスタム設定 (ホストのみ)</div>
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <label for="chinchiguti-dice-count-select" style="font-size: 13px; color: #b0b8c4;">初期サイコロ数:</label>
            <div style="position: relative;">
                <select id="chinchiguti-dice-count-select" class="chinchiguti-select">
                    <option value="3">3個 (通常)</option>
                    <option value="4">4個</option>
                    <option value="5">5個</option>
                    <option value="6">6個</option>
                    <option value="8">8個</option>
                    <option value="10">10個</option>
                </select>
            </div>
        </div>
    </div>

    <!-- 2. メイン画面 -->
    <div id="chinchiguti-game-screen" style="display: none;">
        <!-- スコアボードコンテナ -->
        <div id="chinchiguti-scoreboard" class="chinchiguti-board"></div>

        <!-- プレイアリーナ -->
        <div class="chinchiguti-stage">
            <!-- 現在のステータス案内 -->
            <div id="chinchiguti-current-turn-info" style="font-size: 15px; font-weight: bold; color: #ffd700; margin-bottom: 16px; min-height: 22px;"></div>
            
            <!-- サイコロ配置エリア (レスポンシブ対応) -->
            <div id="chinchiguti-dice-container" style="display: flex; justify-content: center; align-items: center; gap: 12px; margin: 26px 0; min-height: 60px; flex-wrap: wrap;"></div>

            <!-- 操作インタラクション -->
            <div id="chinchiguti-action-container" style="margin-top: 20px;">
                <button id="chinchiguti-roll-btn" class="chinchiguti-btn-primary">🎲 サイコロを振る</button>
            </div>
        </div>

        <!-- 終了リザルト画面 -->
        <div id="chinchiguti-result-screen" style="display: none; margin-top: 20px; background: linear-gradient(135deg, rgba(255,215,0,0.12), rgba(0,0,0,0.4)); border: 1px solid #ffd700; border-radius: 14px; padding: 20px; text-align: center; box-shadow: 0 8px 25px rgba(0,0,0,0.5);">
            <h3 id="chinchiguti-result-title" style="color: #ffd700; margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">🎉 全てのサイコロが1の目になりました！</h3>
            <p style="font-size: 13px; color: #a0a8b5; margin-bottom: 16px;">【最終ゲーム順位】</p>
            <div id="chinchiguti-final-ranking" style="width: 100%; display: flex; flex-direction: column; gap: 8px;"></div>
        </div>
    </div>
</div>
`;

// スタイルを自動でドキュメントにインジェクトするヘルパー
if (typeof document !== 'undefined' && !document.getElementById('chinchiguti-custom-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'chinchiguti-custom-styles';
    styleEl.innerHTML = chinchigutiStyles;
    document.head.appendChild(styleEl);
}

// --- JavaScript モジュール実装 ---
const ChinchigutiModule = {
    id: "chinchiguti",
    name: "チンチ口",
    
    createInitialState: function(players) {
        const state = {
            isStarted: false,
            isEnded: false,
            config: {
                initialDiceCount: 3
            },
            playerData: {},
            turnOrder: [],
            currentTurnIndex: 0,
            lastRoll: [],
            rolling: false
        };
        
        players.forEach(p => {
            state.playerData[p.id] = {
                id: p.id,
                name: p.name,
                diceCount: 3,
                active: true,
                finishTurn: null,
                totalRolls: 0
            };
        });
        
        return state;
    },

    syncUI: function(gameState, myId, isHost, socket) {
        const customSetupEl = document.getElementById('chinchiguti-custom-setup');
        const gameScreenEl = document.getElementById('chinchiguti-game-screen');
        const diceContainer = document.getElementById('chinchiguti-dice-container');
        const rollBtn = document.getElementById('chinchiguti-roll-btn');
        const turnInfoEl = document.getElementById('chinchiguti-current-turn-info');
        const resultScreenEl = document.getElementById('chinchiguti-result-screen');
        const resultTitleEl = document.getElementById('chinchiguti-result-title');
        const selectEl = document.getElementById('chinchiguti-dice-count-select');

        if (!gameScreenEl) return;

        // 1. 設定画面同期
        if (!gameState.isStarted) {
            customSetupEl.style.display = 'block';
            if (selectEl) {
                selectEl.disabled = !isHost;
                if (isHost && !selectEl.dataset.hasListener) {
                    selectEl.dataset.hasListener = "true";
                    selectEl.addEventListener('change', (e) => {
                        socket.emit('game-action', {
                            type: 'change-config',
                            initialDiceCount: parseInt(e.target.value, 10)
                        });
                    });
                }
                selectEl.value = gameState.config.initialDiceCount;
            }
            gameScreenEl.style.display = 'none';
            return;
        } else {
            customSetupEl.style.display = 'none';
            gameScreenEl.style.display = 'block';
        }

        // 2. 手番ステータス同期
        const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
        const isMyTurn = (currentTurnPlayerId === myId) && !gameState.isEnded && !gameState.rolling;

        if (gameState.isEnded) {
            turnInfoEl.innerHTML = "<span style='color: #ff4d4d;'>🏁 GAME OVER</span>";
            rollBtn.style.display = 'none';
            resultScreenEl.style.display = 'block';
            
            if (gameState.config.initialDiceCount === 3) {
                resultTitleEl.innerText = "🎉 全て1の目「ピンゾロ」達成でゲーム終了！";
            } else {
                resultTitleEl.innerText = `🎉 全て1の目（${gameState.config.initialDiceCount}個）達成でゲーム終了！`;
            }

            this.renderFinalRanking(gameState);
        } else {
            resultScreenEl.style.display = 'none';
            rollBtn.style.display = isMyTurn ? 'inline-block' : 'none';
            
            const currentPlayer = gameState.playerData[currentTurnPlayerId];
            if (currentPlayer) {
                turnInfoEl.innerHTML = isMyTurn 
                    ? "✨ <span style='color: #fff; font-weight: 800;'>あなたの番です！</span> ボタンをタップして振ってください。" 
                    : `⏳ <span style='color: #aaa;'>${currentPlayer.name} さんがロール中...</span>`;
            }
        }

        // 3. スコアボード描画
        this.renderScoreboard(gameState, currentTurnPlayerId);

        // 4. サイコロ表示 (非アニメーション時)
        if (!gameState.rolling) {
            if (window.chinchigutiRollingInterval) {
                clearInterval(window.chinchigutiRollingInterval);
                window.chinchigutiRollingInterval = null;
            }
            diceContainer.innerHTML = '';
            if (gameState.lastRoll && gameState.lastRoll.length > 0) {
                gameState.lastRoll.forEach(val => {
                    const die = document.createElement('div');
                    die.className = 'chinchiro-die';
                    die.innerText = val;
                    if (val === 1) {
                        die.style.color = '#ff3b30';
                        die.style.textShadow = '0 0 10px rgba(255, 59, 48, 0.3)';
                    }
                    diceContainer.appendChild(die);
                });
            } else {
                const activePlayer = gameState.playerData[currentTurnPlayerId];
                const count = activePlayer ? activePlayer.diceCount : gameState.config.initialDiceCount;
                for (let i = 0; i < count; i++) {
                    const die = document.createElement('div');
                    die.className = 'chinchiro-die';
                    die.style.opacity = '0.25';
                    die.style.background = 'rgba(255,255,255,0.1)';
                    die.style.color = '#fff';
                    die.style.boxShadow = 'none';
                    die.innerText = '●';
                    diceContainer.appendChild(die);
                }
            }
        }

        // 5. ボタンイベントバインド (スマホの応答性を考慮し touchend / click 両対応または標準最適化)
        if (!rollBtn.dataset.hasListener) {
            rollBtn.dataset.hasListener = "true";
            
            const handleRollAction = (e) => {
                e.preventDefault(); // ダブルタップなどの不要な挙動を抑止
                if (gameState.rolling) return;
                
                const currentPlayerDiceCount = gameState.playerData[gameState.turnOrder[gameState.currentTurnIndex]].diceCount;
                this.playRollingAnimation(currentPlayerDiceCount);
                
                socket.emit('game-action', { type: 'roll' });
            };

            // スマホ環境なら touchstart で最速発火、なければ click
            if ('ontouchstart' in window) {
                rollBtn.addEventListener('touchstart', handleRollAction, { passive: false });
            } else {
                rollBtn.addEventListener('click', handleRollAction);
            }
        }
    },

    playRollingAnimation: function(diceCount) {
        const diceContainer = document.getElementById('chinchiguti-dice-container');
        if (!diceContainer) return;

        if (window.chinchigutiRollingInterval) {
            clearInterval(window.chinchigutiRollingInterval);
        }

        diceContainer.innerHTML = '';
        const diceElements = [];

        for (let i = 0; i < diceCount; i++) {
            const die = document.createElement('div');
            die.className = 'chinchiro-die rolling';
            die.innerText = Math.floor(Math.random() * 6) + 1;
            diceContainer.appendChild(die);
            diceElements.push(die);
        }

        window.chinchigutiRollingInterval = setInterval(() => {
            diceElements.forEach(die => {
                die.innerText = Math.floor(Math.random() * 6) + 1;
            });
        }, 80);
    },

    renderScoreboard: function(gameState, currentTurnPlayerId) {
        const scoreboardEl = document.getElementById('chinchiguti-scoreboard');
        if (!scoreboardEl) return;

        let html = `
        <div style="display: flex; font-size: 11px; color: #8892b0; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); font-weight: bold; text-transform: uppercase; letter-spacing: 1px; padding-left: 12px; padding-right: 12px;">
            <div style="flex: 2;">PLAYER</div>
            <div style="flex: 1; text-align: center;">DICE LEFT</div>
            <div style="flex: 2; text-align: right;">STATUS / ROLLS</div>
        </div>
        <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 4px;">`;

        gameState.turnOrder.forEach(pId => {
            const p = gameState.playerData[pId];
            const isCurrent = (pId === currentTurnPlayerId && !gameState.isEnded);
            
            let rowClass = "chinchiguti-row";
            if (isCurrent) rowClass += " active-turn";
            if (!p.active) rowClass += " finished";

            html += `
            <div class="${rowClass}">
                <div style="flex: 2; font-size: 14px; font-weight: ${isCurrent ? '700' : '500'}; color: ${isCurrent ? '#ffd700' : '#ffffff'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${isCurrent ? '⚡ ' : ''}${p.name}
                </div>
                <div style="flex: 1; text-align: center; font-size: 15px; font-weight: 800; color: ${p.diceCount === 0 ? '#4caf50' : '#e0e6ed'};">
                    ${p.diceCount} <span style="font-size: 11px; font-weight: normal; color: #666;">pcs</span>
                </div>
                <div style="flex: 2; text-align: right; font-size: 12px;">
                    ${!p.active 
                        ? `<span style="background: rgba(76,175,80,0.2); color: #4caf50; padding: 2px 8px; border-radius: 12px; font-weight: bold;">🎉 脱出成功</span>` 
                        : `<span style="color: #8892b0;">生存中 (${p.totalRolls}回)</span>`}
                </div>
            </div>`;
        });

        html += '</div>';
        scoreboardEl.innerHTML = html;
    },

    renderFinalRanking: function(gameState) {
        const rankingEl = document.getElementById('chinchiguti-final-ranking');
        if (!rankingEl) return;

        const playersArray = Object.values(gameState.playerData);
        playersArray.sort((a, b) => {
            if (!a.active && !b.active) return (a.finishTurn || 999) - (b.finishTurn || 999);
            if (!a.active) return -1;
            if (!b.active) return 1;
            if (a.diceCount !== b.diceCount) return a.diceCount - b.diceCount;
            return a.totalRolls - b.totalRolls;
        });

        let html = '';
        playersArray.forEach((p, index) => {
            const rank = index + 1;
            let rankColor = '#ffffff';
            let bgGradient = 'rgba(255,255,255,0.03)';
            let medal = `第 ${rank} 位`;
            
            if (rank === 1) { 
                rankColor = '#ffd700'; 
                medal = '🥇 1位 (👑 王様)'; 
                bgGradient = 'rgba(255,215,0,0.08)';
            } else if (rank === 2) { 
                rankColor = '#b4b4b4'; 
                medal = '🥈 2位'; 
                bgGradient = 'rgba(180,180,180,0.05)';
            } else if (rank === 3) { 
                rankColor = '#cd7f32'; 
                medal = '🥉 3位'; 
            }

            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: ${bgGradient}; padding: 12px 16px; border-radius: 10px; border-left: 4px solid ${rankColor}; border-top: 1px solid rgba(255,255,255,0.02); box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                <span style="font-weight: 800; color: ${rankColor}; font-size: 14px;">${medal}</span>
                <span style="font-weight: bold; color: #ffffff; font-size: 14px; flex-grow: 1; margin-left: 20px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.name}</span>
                <span style="font-size: 12px; font-weight: 500;">
                    ${!p.active ? `<span style="color:#4caf50;">Cleared</span>` : `<span style="color:#ff8c00;">残り ${p.diceCount}個</span>`} <span style="color: #666;">(${p.totalRolls}回)</span>
                </span>
            </div>`;
        });

        rankingEl.innerHTML = html;
    }
};
