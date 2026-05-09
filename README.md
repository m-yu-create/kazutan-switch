# 💕 かずたんすいっち

ボタンをぽちっと押すだけで、離れている相手に気持ちが届くアプリ。
「会いたい」「寂しい」「疲れた」などのスイッチを押すと、もう一人の端末に通知が飛びます。

---

## ✨ 機能

- 💕 **すいっちボタン** - ワンタップで気持ちを送信
- 🎀 **ボタン追加自由** - 好きな絵文字とラベルでボタンを増やせる
- 👥 **メンバー管理** - 絵文字付きで2人以上対応
- 🔒 **あいことばロック** - 開くたびに「みちくん」（日本語OK）
- 📜 **履歴の編集・削除**
- 📊 **分析タブ** - 時間帯/曜日/カレンダー/組み合わせ
- 🔔 **プッシュ通知** - Firebase Cloud Messaging
- 📱 **PWA対応** - ホーム画面に追加してアプリ化

---

## 📁 ファイル構成

```
kazutan-switch/
├── index.html              ← UIとスタイル
├── app.js                  ← アプリのロジック
├── manifest.json           ← PWA定義
├── firebase-messaging-sw.js ← FCMのService Worker
├── icon-512.png            ← PWAアイコン
├── icon-192.png
├── apple-touch-icon.png
├── favicon.png
└── functions/              ← Cloud Functions
    ├── index.js            ← 通知送信処理
    └── package.json
```

---

## 🚀 セットアップ手順

### STEP 1. Firebase プロジェクト作成

1. https://console.firebase.google.com/ で「プロジェクトを追加」
2. プロジェクト名を任意で入力（例: `kazutan-switch`）
3. Google Analytics は不要なら「無効」でOK

### STEP 2. Realtime Database を有効化

1. 左メニュー「Realtime Database」 → 「データベースを作成」
2. ロケーション: `asia-southeast1`（東京リージョンに近い）推奨
3. 開始モード: 「テストモード」でOK（あとで `.read/.write: true` でも可）

### STEP 3. ウェブアプリを登録

1. プロジェクト設定 → 「アプリを追加」 → ウェブ `</>`
2. アプリ名（例: `kazutan-switch-web`）
3. 表示される `firebaseConfig` をメモ

### STEP 4. コードを書き換え

`app.js` の冒頭にある `firebaseConfig` と `VAPID_KEY` を自分のものに差し替え。
**`firebase-messaging-sw.js` の中の `firebaseConfig` も同じ内容に**忘れずに書き換え。

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

VAPIDキーの取り方：
- Firebase Console → プロジェクト設定 → 「クラウドメッセージング」タブ
- 「ウェブ構成」 → 「鍵ペアを生成」 → 表示された文字列をコピー

### STEP 5. GitHub Pages へデプロイ

1. GitHub で新しいリポジトリ作成（Public）
2. すべてのファイル（functions/ 以外でもOK）をアップロード
3. Settings → Pages → Branch: `main` / `/ (root)` → Save
4. 数分後 `https://〇〇.github.io/リポジトリ名/` で公開される

### STEP 6. PWAとして使う

スマホで上記URLを開く：
- **iPhone**: Safari → 共有ボタン → 「ホーム画面に追加」
- **Android**: Chrome → 「ホーム画面に追加」

### STEP 7. 通知（Functions）の設定

通知を有効にするには **Blazeプラン（従量課金）への変更が必要**ですが、無料枠が大きいので 2人運用なら **月$0** に収まります。

#### 7-1. Blazeプランに変更

1. Firebase Console → 左下「アップグレード」
2. クレジットカード登録
3. **必ず予算アラートを $1 に設定**（Cloud Console → 請求 → 予算とアラート）

#### 7-2. Functions のデプロイ（PCで作業）

```bash
# Node.js 20+ をインストールしておく
npm install -g firebase-tools

cd kazutan-switch
firebase login
firebase init   # → Functions と Hosting を選ぶ／ Use existing project
                # 既存の functions/ を上書きしないよう注意

cd functions
npm install

cd ..
firebase deploy --only functions
```

成功すると `notifyOnNewRecord` というFunctionが作られます。

---

## 🎨 デザイン

- **カラー**: やさしいパステル（ピンク `#f7b2c4` ＋ 水色 `#b8d8ec`）
- **フォント**: Zen Maru Gothic（本文） / Klee One（見出し）
- **トーン**: ふんわり丸い角、グラデーション、絵文字多め

---

## ⚠️ 過去のハマりポイントと回避策

- ❌ Netlify → クレジット制限ですぐ尽きる → ✅ **GitHub Pages**
- ❌ `<input type="password">` → 日本語入力できない → ✅ **`type="text"` で id `greetingText`**
- ❌ Service Worker で `onBackgroundMessage` 実装 → 二重通知 → ✅ **初期化のみ**
- ❌ ローディング画面で永遠ループ → ✅ **アプリ表示しつつ後追いで反映**

---

## 💰 想定コスト

| 項目 | 月額 |
|---|---|
| GitHub Pages | $0 |
| Realtime Database | $0（無料枠1GB） |
| FCM 通知 | $0（無制限無料） |
| Functions | $0（無料枠の0.1%以下） |

→ **予算アラート $1 で安全装置**、年間 $0 見込み

---

## 🔑 あいことば

`みちくん`

（変えたいときは `app.js` の `SECRET_WORD` を編集）
