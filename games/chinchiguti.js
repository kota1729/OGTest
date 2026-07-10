// GameRegistryに新規ゲーム「チンチ口（chinchiguti）」として登録
GameRegistry.chinchiguti = {
    // チンチ口専用のHTMLテンプレート（IDやクラスをchinchiguti専用に完全分離）
    template: `
        <div class="chinchiguti-board" id="chinchiguti-board-area">
            <div class="spectator-banner" id="chinchiguti-spectator-banner" style="display:none;">👀 観戦中：このゲームが終わるまでお待ちください</div>

            <!-- カスタム設定エリア（ゲーム開始前・ホストのみ操作可能） -->
            <div class="panel" id="chinchiguti-custom-setup" style="margin-bottom: 10px; display: none;">
                <div class="panel-title" style="font-size: 0.9rem;">⚙️ チンチ口 カスタム設定</div>
                <label style="flex-direction: row; justify-content: space-between; align-items: center; gap: 10px;">
                    <span>使用するサイコロの数 (1〜10):</span>
                    <input type="text" id="inp-chinchiguti-dice-count" value="3" style="width: 60px; text-align: center; padding: 5px;">
                </label>
            </div>

            <!-- 勝者発表オーバーレイ -->
            <div class="winner-overlay" id="chinchiguti-winner-overlay" style="display:none;">
                <div class="winner-trophy">👑</div>
                <div class="winner-name" id="chinchiguti-winner-name">優勝！</div>
                <div class="winner-card-info" id="chinchiguti-winner-hand">全て1の目「ピンゾロ」達成！</div>
                <div id="chinchiguti-final-ranking" style="margin-top:14px; width:100%; display:flex; flex-direction:column; gap:6px;"></div>
                <button class="btn btn-success" style="margin-top:14px;" onclick="GameRegistry.chinchiguti.hostGame()">もう一度プレイする</button>
                <button class="btn" style="margin-top:6px;" onclick="sendReturnToLobby()">ロビーへ戻る</button>
            </div>

            <div id="chinchiguti-playing-area">
                <div class="direction-indicator" id="chinchiguti-turn-indicator">現在の番: -</div>

                <!-- ダイス表示ステージ -->
                <div class="dice-stage" id="chinchiguti-dice-stage" style="min-height: 120px; padding: 20px 5px;">
                    <div class="chinchiguti-dish" id="chinchiguti-dish-element" style="width: 100%; max-width: 450px; height: auto; min-height: 100px; border-radius: 12px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; padding: 15px; background: radial-gradient(circle, #4a2c15 0%, #2a1608 100%);">
                        <!-- 動的にサイコロが生成されます -->
                    </div>
                </div>
                <div style="text-align:center; font-size:0.85rem; color:var(--accent-color); font-weight:bold; min-height:1.2em; margin-bottom: 8px;" id="chinchiguti-current-hand-label"></div>

                <div class="action-container">
                    <button class="btn btn-success" id="btn-chinchiguti-roll" onclick="GameRegistry.chinchiguti.rollDice()" disabled>🎲 サイコロを振る</button>
                </div>

                <div class="hand-section" style="margin-top:10px;">
                    <div class="hand-title"><span>各プレイヤーの直前の出目</span></div>
                    <div class="chinchiguti-scoreboard" id="chinchiguti-scoreboard"></div>
                </div>

                <details class="chinchiguti-rules" open>
                    <summary>📖 チンチ口（ちんちぐち）のルールを見る</summary>
                    <div class="rules-body">
                        <h4>遊び方</h4>
                        <ol>
                            <li>カスタム設定で指定された数（初期値は3個）のサイコロをお皿の中で振ります。</li>
                            <li><strong>すべてのサイコロが「1（⚀）」、つまり【ピンゾロ】が出るまで絶対に終わらない</strong>無限サバイバルゲームです。</li>
                            <li>1回振ってピンゾロが出なければ、即座に次のプレイヤーへターンが回ります。</li>
                            <li>誰かがピンゾロを出した瞬間、そのプレイヤーの勝利でゲームは幕を閉じます！</li>
                        </ol>
                    </div>
                </details>
            </div>
        </div>
    `,

    isRolling: false,
    rollAnimTimer: null,
    rollingInterval: null,

    init: function() {
        this.isRolling = false;
        this.rollAnimTimer = null;
        this.rollingInterval = null;
    },

    handleData: function(data) {
        if (data.type === 'CHINCHIGUTI_ROLLING') {
            this.playRollingAnimation();
        }
    },

    diceFace: function(n) {
        const faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        return faces[Math.max(1, Math.min(6, n)) - 1];
    },

    // チンチ口のホスト開始処理
    hostGame: function() {
        if (sortedPlayers.length < 2) { customAlert("2人以上のプレイヤーが必要です。"); return; }
        
        // カスタムサイコロ数の取得（1〜10個に制限）
        let diceCountInput = document.getElementById('inp-chinchiguti-dice-count');
        let diceCount = diceCountInput ? parseInt(diceCountInput.value, 10) : 3;
        if (isNaN(diceCount) || diceCount < 1) diceCount = 1;
        if (diceCount > 10) diceCount = 10;

        gameState.isStarted = true; 
        gameState.gameType = 'chinchiguti'; // ゲームタイプを独自に設定
        gameState.chinchigutiDiceCount = diceCount; 
        gameState.roster = sortedPlayers.map(p => ({ accId: p.accId, name: p.name }));
        gameState.turnIndex = Math.floor(Math.random() * gameState.roster.length);
        gameState.chinchigutiResults = {};
        
        gameState.roster.forEach(p => {
            const defaultDice = Array(diceCount).fill(1);
            gameState.chinchigutiResults[p.accId] = { dice: defaultDice, attempts: 0, label: '未投入', isPinzoro: false };
        });
        
        gameState.isEnded = false; 
        gameState.winner = null; 
        gameState.winnerHandText = '';
        this.isRolling = false;

        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    // サイコロを振るアクション
    rollDice: function() {
        const activePlayer = getActivePlayer();
        if (!activePlayer || activePlayer.accId !== myAccountId) return;
        if (this.isRolling) return;

        this.isRolling = true;
        const rollBtn = document.getElementById('btn-chinchiguti-roll');
        if (rollBtn) rollBtn.disabled = true;

        broadcast({ type: 'CHINCHIGUTI_ROLLING' });
        this.playRollingAnimation();

        if (this.rollAnimTimer) clearTimeout(this.rollAnimTimer);
        this.rollAnimTimer = setTimeout(() => { this.finalizeRoll(); }, 900);
    },

    // 演出用アニメーション
    playRollingAnimation: function() {
        const diceCount = gameState.chinchigutiDiceCount || 3;
        const dish = document.getElementById('chinchiguti-dish-element');
        if (!dish) return;

        if (this.rollingInterval) clearInterval(this.rollingInterval);
        this.rollingInterval = setInterval(() => {
            const tempDice = Array(diceCount).fill(0).map(() => this.diceFace(1 + Math.floor(Math.random() * 6)));
            dish.innerHTML = tempDice.map(face => `
                <div class="chinchiguti-die rolling" style="position: static; transform: rotate(${Math.floor(Math.random() * 40) - 20}deg); font-size: 2.2rem; width: 52px; height: 52px;">${face}</div>
            `).join('');
        }, 90);

        setTimeout(() => {
            if (this.rollingInterval) { clearInterval(this.rollingInterval); this.rollingInterval = null; }
        }, 850);
    },

    // 出目の確定と判定
    finalizeRoll: function() {
        const myResult = gameState.chinchigutiResults[myAccountId];
        if (!myResult) { this.isRolling = false; return; }

        const diceCount = gameState.chinchigutiDiceCount || 3;
        const dice = Array(diceCount).fill(0).map(() => 1 + Math.floor(Math.random() * 6));
        
        // 【チンチ口ルール】すべてのダイスが「1」ならピンゾロ
        const isPinzoro = dice.every(val => val === 1);
        
        myResult.attempts += 1;
        myResult.dice = dice;
        myResult.isPinzoro = isPinzoro;

        if (isPinzoro) {
            myResult.label = '🎉 ピンゾロ達成！！！';
            gameState.isEnded = true;
            gameState.winner = myName;
            gameState.winnerHandText = `ピンゾロ (${dice.map(() => '1').join('-')})`;
        } else {
            const pinCount = dice.filter(v => v === 1).length;
            myResult.label = `1の目: ${pinCount}/${diceCount}個`;
            
            // ターンを次の人に交代
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.roster.length;
        }

        this.isRolling = false;
        broadcast({ type: 'SYNC_GAME', state: gameState });
        syncGameUI();
    },

    renderScoreboard: function() {
        const wrapper = document.getElementById('chinchiguti-scoreboard');
        if (!wrapper) return;
        wrapper.innerHTML = "";

        gameState.roster.forEach((p, idx) => {
            const r = gameState.chinchigutiResults[p.accId] || { dice: [], attempts: 0, label: '-', isPinzoro: false };
            const isTurn = (!gameState.isEnded && idx === gameState.turnIndex);
            const row = document.createElement('div');
            row.className = `chinchiro-score-row ${isTurn ? 'active-turn' : ''} ${r.isPinzoro ? 'finished' : ''}`;

            let diceHtml = '<span style="color:#666; font-size:0.72rem;">未投入</span>';
            if (r.attempts > 0) {
                diceHtml = `<div class="chinchiro-mini-dice">${r.dice.map(d => `<div class="chinchiro-mini-die">${this.diceFace(d)}</div>`).join('')}</div>`;
            }

            row.innerHTML = `
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span style="font-weight:bold; ${p.accId === myAccountId ? 'color:var(--accent-color);' : ''}">${p.name}${isTurn ? ' 🎲' : ''}</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    ${diceHtml}
                    <span class="chinchiro-hand-label">${r.label}</span>
                </div>
            `;
            wrapper.appendChild(row);
        });
    },

    syncUI: function() {
        document.getElementById('game-title-label').textContent = "新感覚ダイスゲーム：チンチ口";
        
        // 既存他ゲーム画面の非表示レイヤー処理
        const unoBoard = document.getElementById('uno-board-area'); if (unoBoard) unoBoard.classList.remove('active');
        const drawBoard = document.getElementById('draw-board-area'); if (drawBoard) drawBoard.classList.remove('active');
        const drawResult = document.getElementById('draw-result-area'); if (drawResult) drawResult.classList.remove('active');
        const oldChinchiro = document.getElementById('chinchiro-board-area'); if (oldChinchiro) oldChinchiro.classList.remove('active');
        
        // チンチ口のメインボードを表示
        document.getElementById('chinchiguti-board-area').classList.add('active');

        // ホストのみカスタム設定の表示
        const customSetupEl = document.getElementById('chinchiguti-custom-setup');
        if (customSetupEl) {
            const isHost = (sortedPlayers[0]?.id === myId);
            customSetupEl.style.display = (!gameState.isStarted && isHost) ? 'block' : 'none';
        }

        const activePlayer = getActivePlayer();
        const isMyTurn = (activePlayer && activePlayer.accId === myAccountId);
        const amInRoster = !gameState.roster || !gameState.roster.length || gameState.roster.some(p => p.accId === myAccountId);
        document.getElementById('chinchiguti-spectator-banner').style.display = (!amInRoster && !gameState.isEnded) ? 'block' : 'none';

        const infoBar = document.getElementById('game-info');
        const dish = document.getElementById('chinchiguti-dish-element');

        // ゲーム終了（誰かがピンゾロを出した時）
        if (gameState.isEnded) {
            this.rollAnimTimer && clearTimeout(this.rollAnimTimer);
            document.getElementById('chinchiguti-winner-overlay').style.display = 'flex';
            document.getElementById('chinchiguti-playing-area').style.display = 'none';
            document.getElementById('chinchiguti-winner-name').textContent = `${gameState.winner} がピンゾロ達成！`;
            document.getElementById('chinchiguti-winner-hand').textContent = `設定された ${gameState.chinchigutiDiceCount}個 すべてが「1」になりました！`;
            if (infoBar) infoBar.textContent = `🎉 終了！${gameState.winner}さんの勝利です！`;
            return;
        }

        document.getElementById('chinchiguti-winner-overlay').style.display = 'none';
        document.getElementById('chinchiguti-playing-area').style.display = 'block';

        if (document.getElementById('chinchiguti-turn-indicator')) {
            document.getElementById('chinchiguti-turn-indicator').textContent =
                `現在の番: ${activePlayer ? activePlayer.name : '-'} さん (全${gameState.roster.length}人中 / 設定ダイス: ${gameState.chinchigutiDiceCount || 3}個)`;
        }

        const myResult = gameState.chinchigutiResults[myAccountId];
        const handLabelEl = document.getElementById('chinchiguti-current-hand-label');
        const rollBtn = document.getElementById('btn-chinchiguti-roll');

        // サイコロ停止中の盤面描画
        if (!this.isRolling && dish) {
            const activeResult = activePlayer ? gameState.chinchigutiResults[activePlayer.accId] : null;
            if (activeResult && activeResult.attempts > 0) {
                dish.innerHTML = activeResult.dice.map(d => `
                    <div class="chinchiro-die" style="position: static; font-size: 2.4rem; width: 56px; height: 56px; color: ${d === 1 ? 'var(--danger-color)' : '#111'}">${this.diceFace(d)}</div>
                `).join('');
                if (handLabelEl) handLabelEl.textContent = activeResult.label;
            } else {
                const diceCount = gameState.chinchigutiDiceCount || 3;
                dish.innerHTML = Array(diceCount).fill('？').map(q => `
                    <div class="chinchiro-die" style="position: static; font-size: 2.2rem; width: 52px; height: 52px; color: #aaa;">${q}</div>
                `).join('');
                if (handLabelEl) handLabelEl.textContent = 'サイコロが振られるのを待っています';
            }
        }

        // ボタンの制御
        if (isMyTurn && myResult && !this.isRolling) {
            rollBtn.disabled = false;
            rollBtn.textContent = '🎲 サイコロを振る';
        } else {
            rollBtn.disabled = true;
            rollBtn.textContent = this.isRolling ? '⚡ シャッフル中...' : '🎲 相手の番です';
        }

        // 共通インフォバー表示
        if (infoBar) {
            if (!amInRoster) {
                infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}が挑戦中...(観戦中)`;
            } else if (isMyTurn) {
                infoBar.textContent = `🎲 あなたの番です！ピンゾロ（すべて1の目）を狙って振るべし！`;
            } else {
                infoBar.textContent = `⏱️ ${activePlayer ? activePlayer.name : '相手'}のターンです...`;
            }
        }

        this.renderScoreboard();
    }
};