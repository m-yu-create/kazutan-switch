// Service Worker for Firebase Cloud Messaging
// ⚠️ 二重通知を防ぐため、onBackgroundMessageは実装しない
//    （初期化のみ。あとはFCMの自動表示に任せる）

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// app.jsと同じFirebase設定
firebase.initializeApp({
  apiKey: "AIzaSyCzi_ZptjvIPOEB5gcHT42ZGqpdcSAafF8",
  authDomain: "kazutan-switch.firebaseapp.com",
  databaseURL: "https://kazutan-switch-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kazutan-switch",
  storageBucket: "kazutan-switch.firebasestorage.app",
  messagingSenderId: "216367206536",
  appId: "1:216367206536:web:bc7801a343f0e12c0a4f3d"
});

// 初期化のみ。onBackgroundMessageを書くと二重通知になるので書かない。
firebase.messaging();
