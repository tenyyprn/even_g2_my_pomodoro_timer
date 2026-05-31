# Even G2 ポモドーロ (Pomodoro Timer)

Even Realities **G2** スマートグラス向けの Even Hub プラグイン。視界に集中タイマーを表示し、手元のタッチパッド/リングだけで操作できます。マイク・ネットワーク不要。

- **表示**: 緑 HUD に「フェーズ（作業/休憩/長休憩）＋残り時間 MM:SS ＋セッション進捗 ●○」
- **操作（グラス）**: タップ=開始/一時停止 · 上スワイプ=次フェーズへスキップ · 下スワイプ=現フェーズをリセット · ダブルタップ=終了
- **スマホ**: 同じタイマー表示＋ボタン操作＋時間設定（作業/休憩/長休憩の分、長休憩までのセット数）。設定は端末に保存（localStorage）
- フェーズ切替時にスマホが**バイブ**（ポケットでも気づける／グラスにスピーカーは無い）

> Even Hub のモデルでは、プラグインのロジックはスマホ上で動作し、グラスは描画とタッチ入力を担当します。

## セットアップ
```bash
npm install
```

## 開発
```bash
npm run dev        # Vite 開発サーバ (http://localhost:5173) — スマホUI確認
npm run build      # tsc 型チェック + 本番ビルド
npm run simulate   # evenhub-simulator でグラス描画をシミュレート
npm run qr         # スマホ Even App から sideload する QR を生成
npm run pack       # ビルドして even-g2-pomodoro.ehpk を生成
```

### 実機への搭載
- **QR sideload**: `npm run dev` 起動 → 別ターミナルで `npm run qr`（PC の LAN IP を自動検出）→ Even アプリでスキャン。ホットリロード可。
- **Hub 配布**: `npm run pack` で `.ehpk` を生成し、[hub.evenrealities.com](https://hub.evenrealities.com) の開発者ポータルにアップロード。

> このアプリはマイク・ネットワーク権限を使いません（`app.json` の permissions は空）。

## 構成
| ファイル | 役割 |
|---|---|
| `src/main.ts` | bridge 初期化・1コンテナ描画・タッチイベント処理・1秒ループ |
| `src/pomodoro.ts` | タイマー状態マシン（フェーズ遷移・残時間・設定）。タイムスタンプ基準で正確 |
| `src/ui.ts` | スマホ companion UI（表示・ボタン・設定） |
| `app.json` | Even Hub マニフェスト |

## 操作まとめ
| 操作 | グラス | スマホ |
|---|---|---|
| 開始/一時停止 | タップ | 開始ボタン |
| 現フェーズをリセット | 下スワイプ | リセットボタン |
| 次フェーズへスキップ | 上スワイプ | スキップボタン |
| 終了 | ダブルタップ | — |

## メモ
- TLS 傍受環境では `npm install` が証明書エラーになる場合があります。社内 CA を `NODE_EXTRA_CA_CERTS` で渡すか、暫定的に `NODE_TLS_REJECT_UNAUTHORIZED=0 npm install --strict-ssl=false` を使用してください。
"# even_g2_my_pomodoro_timer" 
