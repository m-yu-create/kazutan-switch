/**
 * かずたんすいっち - Firebase Functions (v2 SDK)
 *
 * records に新規レコードが追加されたとき、
 * 送信者以外のメンバーに紐づく全トークンに通知を送る。
 *
 * データ構造 (新): tokens/{token} = { memberId, deviceLabel, updated }
 */

const { onValueCreated } = require('firebase-functions/v2/database');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

exports.notifyOnNewRecord = onValueCreated(
  {
    ref: '/records/{recordId}',
    region: 'asia-southeast1',
  },
  async (event) => {
    const record = event.data.val();
    if (!record) return null;

    const { memberId, buttonId } = record;

    const db = getDatabase();
    const [membersSnap, buttonsSnap, tokensSnap] = await Promise.all([
      db.ref('/members').once('value'),
      db.ref('/buttons').once('value'),
      db.ref('/tokens').once('value'),
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

    // 送信者以外のトークンを集める（新仕様優先・旧仕様互換）
    const tokenList = [];
    Object.entries(allTokens).forEach(([key, value]) => {
      if (value && typeof value === 'object' && value.memberId !== undefined) {
        // 新仕様: tokens/{token} = { memberId, ... }
        if (value.memberId !== memberId) tokenList.push(key);
        return;
      }
      // 旧仕様: tokens/{memberId}/{token} = {...}
      if (key === memberId) return;
      if (value && typeof value === 'object') {
        Object.keys(value).forEach(t => tokenList.push(t));
      }
    });

    if (tokenList.length === 0) {
      console.log('No tokens to notify.');
      return null;
    }

    const tokens = [...new Set(tokenList)];

    const message = {
      notification: { title, body },
      tokens,
    };

    try {
      const response = await getMessaging().sendEachForMulticast(message);
      console.log(`Sent: ${response.successCount} / ${tokens.length}`);

      // 失敗トークンは掃除
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const err = resp.error;
          console.warn(`Token ${idx} failed:`, err && err.code);
          if (
            err &&
            (err.code === 'messaging/invalid-registration-token' ||
              err.code === 'messaging/registration-token-not-registered' ||
              err.code === 'messaging/invalid-argument')
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        const updates = {};
        tokensToRemove.forEach(token => {
          updates[`/tokens/${token}`] = null;
        });
        // 旧仕様の同名トークンも掃除
        Object.entries(allTokens).forEach(([key, value]) => {
          if (value && typeof value === 'object' && value.memberId === undefined) {
            Object.keys(value).forEach(t => {
              if (tokensToRemove.includes(t)) {
                updates[`/tokens/${key}/${t}`] = null;
              }
            });
          }
        });
        await db.ref().update(updates);
        console.log(`Cleaned ${tokensToRemove.length} dead tokens.`);
      }
    } catch (e) {
      console.error('Send error:', e);
    }

    return null;
  }
);
