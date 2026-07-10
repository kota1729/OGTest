/**
 * チンチ口（chinchiguti）修正版モジュール実装
 * 
 * 【修正内容】
 * 1. カスタム設定UI（ダイス数変更）が表示されないバグを修正
 * 2. シャッフルアニメーション中も .chinchiro-die クラスを適用し、デザインが崩れないよう修正
 * 3. 終了画面における最終ランキング（renderFinalRanking）の未実装部分を追加
 * 4. クラス名や文言の整合性を調整（ダイス数に応じたピンゾロ/全1の目の表示切り替えなど）
 */

// --- CSS スタイル (HTMLの<style>タグ内、または追加分) ---
const chinchigutiStyles = `
.chinchiguti-custom-box {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
}
.chinchiguti-custom-title {
    font-size: 13px;
    font-weight: bold;
    color: #e0e0e0;
    margin-bottom: 6px;
}
`;

// --- HTML テンプレート (ゲームフィールド、およびロビー用) ---
// ロビーまたはゲーム開始前にカスタム設定を表示できるように調整したテンプレート
const chinchigutiHtmlTemplate = `
<!-- チンチ口設定エリア (ゲーム開始前・ホストのみ変更可能) -->
<div id="chinchiguti-custom-setup" class="chinchiguti-custom-box" style="display: none;">
    <div class="chinchiguti-custom-title">🎲 チンチ口 カスタム設定 (ホストのみ)</div>
    <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 12px; color: #aaa;">初期サイコロ数:</span>
        <select id="chinchiguti-dice-count-select" style="background: #2a2a2a; color: white; border: 1px solid #444; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            <option value="3">3個 (通常)</option>
            <option value="4">4個</option>
            <option value="5">5個</option>
            <option value="6">6個</option>
            <option value="8">8個</option>
            <option value="10">10個</option>
        </select>
    </div>
</div>

<!-- ゲームメイン画面 -->
<div id="chinchiguti-game-screen" style="display: none; width: 100%;">
    <!-- スコアボード -->
    <div id="chinchiguti-scoreboard" style="width: 100%; margin-bottom: 12px;"></div>

    <!-- プレイエリア -->
    <div style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; text-align: center; position: relative;">
        <!-- 現在のプレイヤー番 -->
        <div id="chinchiguti-current-turn-info" style="font-size: 14px; font-weight: bold; color: #ffd700; margin-bottom: 10px;"></div>
        
        <!-- サイコロ表示エリア -->
        <div id="chinchiguti-dice-container" style="display: flex; justify-content: center; gap: 10px; margin: 20px 0; min-height: 50px; flex-wrap: wrap;"></div>

        <!-- アクションボタン -->
        <div id="chinchiguti-action-container" style="margin-top: 15px;">
            <button id="chinchiguti-roll-btn" class="btn btn-primary" style="padding: 10px 24px; font-weight: bold;">サイコロを振る</button>
        </div>
    </div>

    <!-- 結果・終了画面 -->
    <div id="chinchiguti-result-screen" style="display: none; margin-top: 15px; background: rgba(255,215,0,0.1); border: 1px solid #ffd700; border-radius: 8px; padding: 15px; text-align: center;">
        <h3 id="chinchiguti-result-title" style="color: #ffd700; margin: 0 0 10px 0; font-size: 18px;">🎉 全てのサイコロが1の目になりました！</h3>
        <p style="font-size: 13px; color: #eee; margin-bottom: 10px;">【最終順位】少ない残りサイコロ数・または早く生存した順</p>
        <div id="chinchiguti-final-ranking" style="margin-top: 14px; width: 100%; display: flex; flex-direction: column; gap: 6px;"></div>
    </div>
</div>
`;

// --- JavaScript ゲームレジストリの実装 ---
const ChinchigutiModule = {
    id: "chinchiguti",
    name: "チンチ口",
    
    // 初期状態の生成
    createInitialState: function(players) {
        const state = {
            isStarted: false,
            isEnded: false,
            config: {
                initialDiceCount: 3 // デフォルトのサイコロ数
            },
            playerData: {}, // id -> { name, diceCount, active: true, finishTurn: null }
            turnOrder: [],
            currentTurnIndex: 0,
            lastRoll: [],
            rolling: false,
            winnerId: null
        };
        
        players.forEach(p => {
            state.playerData[p.id] = {
                id: p.id,
                name: p.name,
                diceCount: 3, // 初期化時は後でconfigに合わせて同期
                active: true,
                finishTurn: null,
                totalRolls: 0
            };
        });
        
        return state;
    },

    // UIの同期処理
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

        // 【修正1】カスタム設定UIの表示制御ロジックを最適化
        // ゲーム開始前（ロビー状態、または準備中）かつホストの場合に設定可能にする
        if (!gameState.isStarted) {
            customSetupEl.style.display = 'block';
            // ホスト以外は選択不可にする
            if (selectEl) {
                selectEl.disabled = !isHost;
                // 値の同期イベント登録（一度だけ）
                if (isHost && !selectEl.dataset.hasListener) {
                    selectEl.dataset.hasListener = "true";
                    selectEl.addEventListener('change', (e) => {
                        socket.emit('game-action', {
                            type: 'change-config',
                            initialDiceCount: parseInt(e.target.value, 10)
                        });
                    });
                }
                // 現在の値を反映
                selectEl.value = gameState.config.initialDiceCount;
            }
            gameScreenEl.style.display = 'none';
            return; // 開始前はここまで
        } else {
            // ゲーム開始後はカスタム設定を非表示にする
            customSetupEl.style.display = 'none';
            gameScreenEl.style.display = 'block';
        }

        // 進行中の手番処理
        const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
        const isMyTurn = (currentTurnPlayerId === myId) && !gameState.isEnded && !gameState.rolling;

        if (gameState.isEnded) {
            turnInfoEl.innerText = "ゲーム終了";
            rollBtn.style.display = 'none';
            resultScreenEl.style.display = 'block';
            
            // 文言の調整（ダイス数に応じて変化）
            if (gameState.config.initialDiceCount === 3) {
                resultTitleEl.innerText = "🎉 全て1の目「ピンゾロ」達成でゲーム終了！";
            } else {
                resultTitleEl.innerText = `🎉 全て1の目（${gameState.config.initialDiceCount}個）達成でゲーム終了！`;
            }

            // 【修正3】最終ランキングの描画処理を呼び出し
            this.renderFinalRanking(gameState);
        } else {
            resultScreenEl.style.display = 'none';
            rollBtn.style.display = isMyTurn ? 'inline-block' : 'none';
            
            const currentPlayer = gameState.playerData[currentTurnPlayerId];
            if (currentPlayer) {
                turnInfoEl.innerText = isMyTurn ? "🔴 あなたの番です！サイコロを振ってください。" : `⏳ ${currentPlayer.name} さんがサイコロを振っています...`;
            }
        }

        // スコアボードの描画
        this.renderScoreboard(gameState, currentTurnPlayerId);

        // サイコロの表示 (アニメーション中でない場合のみ上書き描画)
        if (!gameState.rolling) {
            diceContainer.innerHTML = '';
            if (gameState.lastRoll && gameState.lastRoll.length > 0) {
                gameState.lastRoll.forEach(val => {
                    // 【修正2】クラス名を 'chinchiro-die' に統一してデザインを適用
                    const die = document.createElement('div');
                    die.className = 'chinchiro-die';
                    die.innerText = val;
                    if (val === 1) die.style.color = '#ff4d4d'; // 1の目は赤くハイライト
                    diceContainer.appendChild(die);
                });
            } else {
                // まだ誰も振っていない時のプレースホルダー
                const activePlayer = gameState.playerData[currentTurnPlayerId];
                const count = activePlayer ? activePlayer.diceCount : gameState.config.initialDiceCount;
                for (let i = 0; i < count; i++) {
                    const die = document.createElement('div');
                    die.className = 'chinchiro-die';
                    die.style.opacity = '0.3';
                    die.innerText = '?';
                    diceContainer.appendChild(die);
                }
            }
        }

        // ボタンのクリックイベント（一度だけ登録）
        if (!rollBtn.dataset.hasListener) {
            rollBtn.dataset.hasListener = "true";
            rollBtn.addEventListener('click', () => {
                if (gameState.rolling) return;
                
                // クライアント側で先行シャッフルアニメーションを開始
                this.playRollingAnimation(gameState.playerData[currentTurnPlayerId].diceCount);
                
                socket.emit('game-action', { type: 'roll' });
            });
        }
    },

    // 【修正2】アニメーション中もサイコロの見た目（CSS）が崩れないように修正
    playRollingAnimation: function(diceCount) {
        const diceContainer = document.getElementById('chinchiguti-dice-container');
        if (!diceContainer) return;

        diceContainer.innerHTML = '';
        const diceElements = [];

        for (let i = 0; i < diceCount; i++) {
            const die = document.createElement('div');
            // クラス名を 'chinchiro-die rolling' にして枠線や背景のスタイルを維持
            die.className = 'chinchiro-die rolling';
            die.innerText = Math.floor(Math.random() * 6) + 1;
            diceContainer.appendChild(die);
            diceElements.push(die);
        }

        // 100msごとに数値をシャッフル
        const interval = setInterval(() => {
            diceElements.forEach(die => {
                if (die.classList.contains('rolling')) {
                    die.innerText = Math.floor(Math.random() * 6) + 1;
                }
            });
        }, 100);

        // セーフティタイマー（サーバーから同期が来たらクリアされるが、念のため3秒で止める）
        setTimeout(() => {
            clearInterval(interval);
        }, 3000);

        // グローバルにインターバルIDを保持して、syncUI側でクリアできるようにしても良い
        window.chinchigutiRollingInterval = interval;
    },

    // スコアボードのレンダリング
    renderScoreboard: function(gameState, currentTurnPlayerId) {
        const scoreboardEl = document.getElementById('chinchiguti-scoreboard');
        if (!scoreboardEl) return;

        let html = '<div style="background: rgba(255,255,255,0.05); border-radius: 6px; padding: 10px;">';
        html += '<div style="display:flex; font-size:12px; color:#aaa; padding-bottom:6px; border-bottom:1px solid #444; font-weight:bold;">';
        html += '<div style="flex:2;">プレイヤー</div>';
        html += '<div style="flex:1; text-align:center;">残りサイコロ</div>';
        html += '<div style="flex:2; text-align:right;">状態 / 投擲回数</div>';
        html += '</div>';

        gameState.turnOrder.forEach(pId => {
            const p = gameState.playerData[pId];
            const isCurrent = (pId === currentTurnPlayerId && !gameState.isEnded);
            const bg = isCurrent ? 'background: rgba(255,215,0,0.15);' : '';
            
            // 【修正4】クラス名を独自のものに変更、または最適化
            html += `<div style="display:flex; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); ${bg}">`;
            
            // 名前
            html += `<div style="flex:2; font-size:13px; font-weight:${isCurrent ? 'bold' : 'normal'}; color:${isCurrent ? '#ffd700' : '#fff'}">`;
            html += `${isCurrent ? '▶ ' : ''}${p.name}`;
            html += `</div>`;

            // 残りサイコロ数
            html += `<div style="flex:1; text-align:center; font-size:14px; font-weight:bold; color:#e0e0e0;">`;
            html += `${p.diceCount} 個`;
            html += `</div>`;

            // 状態・回数
            html += `<div style="flex:2; text-align:right; font-size:12px; color:#aaa;">`;
            if (!p.active) {
                html += `<span style="color:#4caf50; font-weight:bold;">🎉 抜出成功</span> (${p.totalRolls}回)`;
            } else {
                html += `生存中 (${p.totalRolls}回)`;
            }
            html += `</div>`;
            
            html += `</div>`;
        });

        html += '</div>';
        scoreboardEl.innerHTML = html;
    },

    // 【修正3】未実装だった最終ランキング表示機能を実装
    renderFinalRanking: function(gameState) {
        const rankingEl = document.getElementById('chinchiguti-final-ranking');
        if (!rankingEl) return;

        // ランキングのロジック構築
        // 1. すでに上がった人（!active）は、finishTurn（抜けた順）または投擲回数が少ない順で上に
        // 2. まだ残っている人は、残りダイス数が少ない順、同数の場合は投擲回数などでソート
        const playersArray = Object.values(gameState.playerData);
        
        playersArray.sort((a, b) => {
            // 両方上がっている場合
            if (!a.active && !b.active) {
                return (a.finishTurn || 999) - (b.finishTurn || 999);
            }
            // 片方だけ上がっている場合、上がっている方が上位
            if (!a.active) return -1;
            if (!b.active) return 1;
            
            // 両方残っている場合は残りダイス数が少ない方が上位
            if (a.diceCount !== b.diceCount) {
                return a.diceCount - b.diceCount;
            }
            // ダイス数も同じなら、投擲回数が少ない方を上位にする
            return a.totalRolls - b.totalRolls;
        });

        let html = '';
        playersArray.forEach((p, index) => {
            const rank = index + 1;
            let rankColor = '#fff';
            let medal = `第 ${rank} 位`;
            
            if (rank === 1) { rankColor = '#ffd700'; medal = '🥇 1位 (👑王様)'; }
            else if (rank === 2) { rankColor = '#c0c0c0'; medal = '🥈 2位'; }
            else if (rank === 3) { rankColor = '#cd7f32'; medal = '🥉 3位'; }

            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; border-left: 4px solid ${rankColor};">
                <span style="font-weight: bold; color: ${rankColor}; font-size: 13px;">${medal}</span>
                <span style="font-weight: bold; color: #fff; font-size: 13px; flex-grow: 1; margin-left: 15px;">${p.name}</span>
                <span style="font-size: 12px; color: #aaa;">
                    ${!p.active ? `<span style="color:#4caf50; font-weight:bold;">脱出成功</span>` : `残り ${p.diceCount}個`} (${p.totalRolls}回)
                </span>
            </div>`;
        });

        rankingEl.innerHTML = html;
    },

    // サーバーサイドのアクションハンドラ (参考用・ロジック構築用)
    handleServerAction: function(gameState, action, playerId) {
        if (action.type === 'change-config' && !gameState.isStarted) {
            gameState.config.initialDiceCount = action.initialDiceCount;
            // 参加中プレイヤーの初期ダイス数も同期して更新
            Object.values(gameState.playerData).forEach(p => {
                p.diceCount = action.initialDiceCount;
            });
            return gameState;
        }

        if (action.type === 'start-game' && !gameState.isStarted) {
            gameState.isStarted = true;
            // 順番をシャッフル
            gameState.turnOrder = Object.keys(gameState.playerData).sort(() => Math.random() - 0.5);
            gameState.currentTurnIndex = 0;
            gameState.isEnded = false;
            return gameState;
        }

        if (action.type === 'roll' && gameState.isStarted && !gameState.isEnded) {
            const currentTurnPlayerId = gameState.turnOrder[gameState.currentTurnIndex];
            if (currentTurnPlayerId !== playerId) return gameState; // 手番違い

            const p = gameState.playerData[playerId];
            p.totalRolls++;

            // ダイスを振る
            const rolls = [];
            for (let i = 0; i < p.diceCount; i++) {
                rolls.push(Math.floor(Math.random() * 6) + 1);
            }
            gameState.lastRoll = rolls;

            // 1の目の数を数える
            const oneCount = rolls.filter(v => v === 1).length;

            if (oneCount > 0) {
                // 1の目の数だけダイスが減る
                p.diceCount -= oneCount;
                if (p.diceCount <= 0) {
                    p.diceCount = 0;
                    p.active = false;
                    // 何番目に抜けたかを記録
                    const finishedCount = Object.values(gameState.playerData).filter(pl => !pl.active).length;
                    p.finishTurn = finishedCount;
                }
            }

            // 全員のサイコロが1になる、または1人を除いて全員脱出したか等の終了条件チェック
            // チンチ口のルール：「全員のサイコロが1になるまで終わらない（＝全員がactiveでない、または最後の1人のダイスが0になった瞬間）」
            const activePlayers = Object.values(gameState.playerData).filter(pl => pl.active);
            
            // 終了判定: 生存者が0になった、もしくは最後の1人もダイスを全て減らしきった場合
            if (activePlayers.length === 0) {
                gameState.isEnded = true;
                return gameState;
            }

            // 次の現役プレイヤーに手番を移す
            let nextIndex = gameState.currentTurnIndex;
            do {
                nextIndex = (nextIndex + 1) % gameState.turnOrder.length;
            } while (!gameState.playerData[gameState.turnOrder[nextIndex]].active && nextIndex !== gameState.currentTurnIndex);

            gameState.currentTurnIndex = nextIndex;
            
            // 手番が変わるタイミングで前回のロール表示用のプレースホルダーにするため、
            // 厳密にはクライアント側で少しディレイを挟んで同期するとよりスムーズです。
            return gameState;
        }

        return gameState;
    }
};
