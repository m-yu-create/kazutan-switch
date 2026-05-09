/**
 * かずたんすいっち - Firebase Functions
 *
 * records に新規レコードが追加されたとき、
 * 送信者以外のメンバーに紐づく全トークンに通知を送る。
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.notifyOnNewRecord = functions.database
  .ref('/records/{recordId}')
  .onCreate(async (snap, context) => {
    const record = snap.val();
    if (!record) return null;

    const { memberId, buttonId, timestamp } = record;

    // メンバー情報を取得
    const [membersSnap, buttonsSnap, tokensSnap] = await Promise.all([
      admin.database().ref('/members').once('value'),
      admin.database().ref('/buttons').once('value'),
      admin.database().ref('/tokens').once('value'),
    ]);

    const members = membersSnap.val() || {};
    const buttons = buttonsSnap.val() || {};
    const allTokens = tokensSnap.val() || {};

    const sender = members[memberId];
    const button = buttons[buttonId];
    if (!button) {
      console.log('Button not found, skip notification.');
      return null;
    }

    const senderName = sender ? `${sender.emoji}${sender.name}` : 'だれか';
    const title = `${button.emoji} ${button.label}`;
    const body = `${senderName}から届いたよ`;

    // 送信者以外のメンバーのトークンを集める
    const tokenList = [];
    Object.entries(allTokens).forEach(([mid, tokensMap]) => {
      if (mid === memberId) return; // 送信者自身はスキップ
      Object.keys(tokensMap || {}).forEach(t => tokenList.push(t));
    });

    if (tokenList.length === 0) {
      console.log('No tokens to notify.');
      return null;
    }

    // 重複除去
    const tokens = [...new Set(tokenList)];

    const message = {
      notification: { title, body },
      tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Sent: ${response.successCount} / ${tokens.length}`);

      // 失敗トークンは掃除
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const err = resp.error;
          if (
            err.code === 'messaging/invalid-registration-token' ||
            err.code === 'messaging/registration-token-not-registered'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        const updates = {};
        Object.entries(allTokens).forEach(([mid, tokensMap]) => {
          Object.keys(tokensMap || {}).forEach(t => {
            if (tokensToRemove.includes(t)) {
              updates[`/tokens/${mid}/${t}`] = null;
            }
          });
        });
        await admin.database().ref().update(updates);
        console.log(`Cleaned ${tokensToRemove.length} dead tokens.`);
      }
    } catch (e) {
      console.error('Send error:', e);
    }

    return null;
  });
