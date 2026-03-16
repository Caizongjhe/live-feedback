import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ThumbsUp, Send, Maximize2, Smartphone, Trash2, QrCode, User, Ghost, 
  MessageSquare, Loader2, Key, Plus, X, ShieldCheck, MonitorPlay, 
  AlertTriangle, Users, Link, Bell, Sun, Moon, Swords, ChevronUp, ChevronDown, Play, Square, CircleDashed, BarChart3,
  Mail, Lock, ShieldQuestion, UserPlus, ArrowLeft, LogOut, Edit
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

// ==========================================
// Firebase 初始化與設定
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyCJb9pokU5-CCYtvGB_M9Vda8Dgu1meOSM",
  authDomain: "livefeedback-2026.firebaseapp.com",
  projectId: "livefeedback-2026",
  storageBucket: "livefeedback-2026.firebasestorage.app",
  messagingSenderId: "939640309857",
  appId: "1:939640309857:web:fe6250f17d42d3723d4220",
  measurementId: "G-MW575ZFZZ4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'my-military-feedback-v1';

// ==========================================
// EmailJS 設定 (自動寄信)
// ==========================================
// 請在這裡填入您在 EmailJS 取得的三把金鑰
const EMAILJS_SERVICE_ID = "service_jc32b6z"; 
const EMAILJS_TEMPLATE_ID = "template_a11rc87";
const EMAILJS_PUBLIC_KEY = "UMdi2jwmXeBv-818dWmCz";

// ==========================================
// 獨立元件：單個留言節點
// ==========================================
const MessageNode = React.memo(({ msg, colorClass, fontSize, theme = 'dark' }) => {
  const [isShaking, setIsShaking] = useState(false);
  const prevShaken = useRef(msg.lastShaken);

  useEffect(() => {
    if (msg.lastShaken && msg.lastShaken !== prevShaken.current) {
      setIsShaking(true);
      const t = setTimeout(() => setIsShaking(false), 600);
      prevShaken.current = msg.lastShaken;
      return () => clearTimeout(t);
    }
  }, [msg.lastShaken]);

  return (
    <div 
      className={`transition-all duration-700 ease-out flex flex-col items-center group cursor-default ${colorClass}`}
      style={{ fontSize: fontSize, transform: `rotate(${Number(msg.rotation)}deg)`, lineHeight: '1.2' }}
    >
      <div className={`transition-colors duration-300 ${isShaking ? 'animate-shake text-amber-300 drop-shadow-[0_0_25px_rgba(252,211,77,0.9)] scale-110 z-50' : ''}`}>
        <span className="text-center drop-shadow-md px-2 block">{String(msg.text)}</span>
      </div>
      <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-6 text-sm px-3 py-1 rounded-full whitespace-nowrap z-20 pointer-events-none flex items-center gap-2 border shadow-lg ${theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'}`}>
        <span className="truncate max-w-[100px]">{String(msg.author)}</span>
        <span className="flex items-center text-indigo-500"><ThumbsUp className="w-3 h-3 fill-current mr-1"/> {Number(msg.likes)}</span>
      </div>
    </div>
  );
});

// ==========================================
// 主應用程式
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // 核心路由與房間狀態
  const [viewMode, setViewMode] = useState('auth'); // 'auth' (初始登入) | 'projector' (大螢幕) | 'teacher' (遙控器) | 'mobile' (學生)
  const [activeTeacherId, setActiveTeacherId] = useState(''); // 目前房間的教官 ID (信箱轉碼)
  const [baseHref, setBaseHref] = useState('');

  // 資料狀態
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  
  // 大螢幕專屬狀態
  const [projectorTheme, setProjectorTheme] = useState('light'); 
  const [showEnlargedQR, setShowEnlargedQR] = useState(false); 
  const [showTeacherQR, setShowTeacherQR] = useState(false);

  // 系統與互動狀態
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [mySessionId, setMySessionId] = useState(null); 
  const [currentTopic, setCurrentTopic] = useState('');
  const [agenda, setAgenda] = useState([]); 
  const [activePoll, setActivePoll] = useState(null); 
  const [activePollId, setActivePollId] = useState(null); 
  const [pollState, setPollState] = useState('voting'); 
  const [pollVotes, setPollVotes] = useState({ A: 0, B: 0, counts: {}, total: 0 }); 
  const [myVote, setMyVote] = useState(null); 
  
  // 動畫專屬狀態
  const [isTugAnimating, setIsTugAnimating] = useState(false); 
  const [showResults, setShowResults] = useState(false);
  const [ropePosition, setRopePosition] = useState(50);
  const latestVotes = useRef({ A: 0, B: 0, counts: {}, total: 0 });
  
  // 教官管理介面狀態
  const [showClearModal, setShowClearModal] = useState(false);
  const [showNewClassModal, setShowNewClassModal] = useState(false);

  // 登入註冊表單狀態
  const [teacherAuthMode, setTeacherAuthMode] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authSecQuestion, setAuthSecQuestion] = useState('');
  const [authSecAnswer, setAuthSecAnswer] = useState('');
  const [authInviteCode, setAuthInviteCode] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [fetchedSecQuestion, setFetchedSecQuestion] = useState('');
  
  // 驗證碼相關狀態
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [inputVerifyCode, setInputVerifyCode] = useState('');
  const [verifyCountdown, setVerifyCountdown] = useState(0);

  // 題目表單狀態
  const [newQuestionType, setNewQuestionType] = useState('text'); 
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionOptA, setNewQuestionOptA] = useState('');
  const [newQuestionOptB, setNewQuestionOptB] = useState('');
  const [newVoteOptions, setNewVoteOptions] = useState(['', '', '', '']); 

  const [activeUsers, setActiveUsers] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  const activePollTypeRef = useRef(null);
  useEffect(() => { if (activePoll) activePollTypeRef.current = activePoll.type; }, [activePoll]);

  // 1. 處理網址參數與路由隔離
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const tid = params.get('tid'); // Teacher ID
      
      if (mode === 'mobile' && tid) {
        setViewMode('mobile');
        setActiveTeacherId(tid);
        if (params.get('session')) setMySessionId(params.get('session'));
      } else if (mode === 'teacher' && tid) {
        setViewMode('teacher');
        setActiveTeacherId(tid);
      } else {
        setViewMode('auth'); // 預設進入登入大廳
      }
      
      let href = window.location.href;
      if (href === 'about:srcdoc' || href === 'about:blank' || href.startsWith('blob:')) {
        href = document.referrer || window.location.origin;
      }
      const url = new URL(href);
      setBaseHref(url.origin + url.pathname);
    } catch (e) {
      setBaseHref(window.location.origin);
    }
  }, []);

  const activeStudentUrl = baseHref && currentSessionId && activeTeacherId ? `${baseHref}?mode=mobile&session=${currentSessionId}&tid=${activeTeacherId}` : '';
  const activeTeacherUrl = baseHref && activeTeacherId ? `${baseHref}?mode=teacher&tid=${activeTeacherId}` : '';

  // 2. Firebase 登入認證
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("認證失敗:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 動態房間路徑生成器 (避免衝突的核心)
  const getRoomCollection = (collectionName) => `room_${activeTeacherId}_${collectionName}`;

  // 3. 監聽留言 (僅限目前教官的房間)
  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const msgsRef = collection(db, 'artifacts', appId, 'public', 'data', getRoomCollection('messages'));
    const unsubscribe = onSnapshot(msgsRef, (snapshot) => {
      const fetchedMessages = [];
      snapshot.forEach((doc) => fetchedMessages.push({ id: doc.id, ...doc.data() }));
      fetchedMessages.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(fetchedMessages);
    }, (error) => console.error("資料讀取錯誤:", error));
    return () => unsubscribe();
  }, [user, authLoading, activeTeacherId]);

  // 4. 監聽全域設定 (僅限目前教官的房間)
  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global');
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentTopic(data.currentTopic || '');
        setActivePollId(data.activePollId || null);
        setActivePoll(data.activePoll || null); 
        setPollState(data.pollState || 'voting');
        setCurrentSessionId(data.currentSessionId || '');
      } else {
        const initialSessionId = Date.now().toString();
        setDoc(settingsRef, { currentTopic: '', activePollId: null, activePoll: null, pollState: 'voting', currentSessionId: initialSessionId });
      }
    }, (error) => console.error("設定讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, activeTeacherId]);

  // 5. 監聽教官題庫
  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const teacherRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', activeTeacherId);
    const unsub = onSnapshot(teacherRef, (docSnap) => {
      if (docSnap.exists()) {
        setAgenda(Array.isArray(docSnap.data().agenda) ? docSnap.data().agenda : []);
      }
    }, (error) => console.error("題庫讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, activeTeacherId]);

  // 6. 監聽投票數據 (僅限目前教官的房間)
  useEffect(() => {
    if (authLoading || !user || !activePollId || !activeTeacherId) {
      setPollVotes({ A: 0, B: 0, counts: {}, total: 0 });
      setMyVote(null);
      return;
    }
    const votesRef = collection(db, 'artifacts', appId, 'public', 'data', getRoomCollection('votes'));
    const unsub = onSnapshot(votesRef, (snapshot) => {
      let countA = 0, countB = 0;
      let countsObj = {};
      let totalCount = 0;
      let userVoted = null;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pollId === activePollId) {
          if (data.choice === 'A') countA++;
          else if (data.choice === 'B') countB++;
          else countsObj[data.choice] = (countsObj[data.choice] || 0) + 1;
          totalCount++;
          if (doc.id === user.uid) userVoted = data.choice;
        }
      });
      setPollVotes({ A: countA, B: countB, counts: countsObj, total: totalCount });
      setMyVote(userVoted);
    }, (error) => console.error("投票讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, activePollId, activeTeacherId]);

  useEffect(() => { latestVotes.current = pollVotes; }, [pollVotes]);

  useEffect(() => {
    let t1, t2;
    if (pollState === 'voting') {
      setIsTugAnimating(false); setShowResults(false); setRopePosition(50);
    } else if (pollState === 'revealed') {
      setIsTugAnimating(true); setShowResults(false); setRopePosition(50);
      const waitTime = activePollTypeRef.current === 'vote' ? 2000 : 4000;
      t1 = setTimeout(() => {
        setIsTugAnimating(false);
        t2 = setTimeout(() => {
          const votes = latestVotes.current;
          let target = 50;
          if (votes.total > 0) {
            const diffPercentage = ((votes.B - votes.A) / votes.total) * 35;
            target = Math.min(Math.max(50 + diffPercentage, 15), 85);
          }
          setRopePosition(target); 
          setShowResults(true); 
        }, 50);
      }, waitTime); 
    }
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pollState]);

  // 7. 在線人數機制 (依據房間隔離)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || viewMode !== 'mobile' || !user || !activeTeacherId) return;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('presence'), user.uid);
    const updatePresence = () => setDoc(presenceRef, { lastActive: Date.now() }, { merge: true }).catch(e => console.error(e));
    updatePresence();
    const interval = setInterval(updatePresence, 15000);
    const cleanup = () => { deleteDoc(presenceRef).catch(() => {}); };
    window.addEventListener('beforeunload', cleanup);
    return () => { clearInterval(interval); window.removeEventListener('beforeunload', cleanup); cleanup(); };
  }, [viewMode, user, authLoading, activeTeacherId]);

  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const presenceRef = collection(db, 'artifacts', appId, 'public', 'data', getRoomCollection('presence'));
    const unsub = onSnapshot(presenceRef, (snapshot) => {
      const users = {};
      snapshot.forEach(doc => { users[doc.id] = doc.data().lastActive; });
      setActiveUsers(users);
    }, (error) => console.error("人數讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, activeTeacherId]);

  const onlineCount = useMemo(() => {
    return Object.values(activeUsers).filter(lastActive => currentTime - lastActive < 35000).length;
  }, [activeUsers, currentTime]);

  useEffect(() => {
    let timer;
    if (showVerifyModal && verifyCountdown > 0) {
      timer = setInterval(() => setVerifyCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showVerifyModal, verifyCountdown]);

  // ==========================================
  // 教官登入、註冊與 EmailJS 寄信邏輯
  // ==========================================
  const switchAuthMode = (mode) => {
    setTeacherAuthMode(mode); setAuthError(''); setAuthSuccess('');
    if (mode === 'login' || mode === 'register') { setAuthPassword(''); setAuthConfirmPassword(''); setAuthSecAnswer(''); setAuthInviteCode(''); }
  };

  const handleRequestVerification = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    
    if (!authEmail || !authPassword || !authSecQuestion || !authSecAnswer || !authInviteCode) {
      setAuthError('請填寫所有欄位'); return;
    }
    if (authPassword !== authConfirmPassword) {
      setAuthError('兩次密碼輸入不一致'); return;
    }
    if (authInviteCode !== '0609') {
      setAuthError('團隊權限密碼錯誤'); return;
    }
    
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ','); 
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) { setAuthError('此信箱已被註冊'); return; }
      
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // EmailJS 寄發驗證信邏輯 (改為直接透過 Fetch API)
      if (EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID") {
        try {
          const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              service_id: EMAILJS_SERVICE_ID,
              template_id: EMAILJS_TEMPLATE_ID,
              user_id: EMAILJS_PUBLIC_KEY,
              template_params: {
                to_email: authEmail,
                code: newCode
              }
            })
          });

          if (!response.ok) {
            // 抓取 EmailJS 官方回傳的真實錯誤原因
            const errorText = await response.text();
            throw new Error(errorText);
          }
          
          setAuthSuccess(`驗證碼已發送至 ${authEmail}`);
        } catch (emailErr) {
          console.error("EmailJS 錯誤:", emailErr);
          // 將真實原因顯示在畫面上！
          setAuthError(`信件失敗：${emailErr.message}`);
          return;
        }
      } else {
        setAuthSuccess(`【系統提醒】尚未設定自動寄信，驗證碼為：${newCode}`);
      }

      setVerificationCode(newCode);
      setVerifyCountdown(300); 
      setInputVerifyCode('');
      setShowVerifyModal(true);
    } catch (err) {
      setAuthError('系統錯誤，請稍後再試');
    }
  };

  const handleConfirmVerification = async () => {
    setAuthError('');
    if (!inputVerifyCode || inputVerifyCode !== verificationCode) {
      setAuthError('驗證碼錯誤或已過期'); return;
    }
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ','); 
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      
      await setDoc(docRef, {
        email: authEmail.toLowerCase(),
        password: authPassword, 
        secQuestion: authSecQuestion,
        secAnswer: authSecAnswer,
        agenda: [
          { id: 'q_1', type: 'text', title: '歡迎大家分享看法！' },
          { id: 'q_2', type: 'poll', title: '目前的互動體驗如何？', optA: '非常有趣', optB: '還在適應中' }
        ],
        createdAt: Date.now()
      });
      setShowVerifyModal(false);
      setAuthSuccess('帳號創建成功，請重新登入！');
      switchAuthMode('login');
    } catch (err) {
      setAuthError('帳號寫入失敗');
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      
      if (!snap.exists() || snap.data().password !== authPassword) {
        setAuthError('信箱或密碼錯誤'); return;
      }
      
      setActiveTeacherId(emailKey);
      
      if (viewMode === 'auth') {
        setViewMode('projector'); 
      } else if (viewMode === 'teacher') {
        // 從遙控器網址登入，確保 authLoading 結束後顯示 teacher 介面
      }
      
    } catch (err) {
      setAuthError('登入失敗，請稍後再試');
    }
  };

  const handleTeacherLogout = () => {
    if (viewMode === 'projector') {
       setActiveTeacherId('');
       setViewMode('auth');
    } else {
       setActiveTeacherId('');
       setViewMode('teacher');
    }
  };

  const handleForgotEmail = async (e) => {
    e.preventDefault();
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey));
      if (!snap.exists()) { setAuthError('找不到此帳號'); return; }
      setFetchedSecQuestion(snap.data().secQuestion);
      switchAuthMode('forgot_answer');
    } catch (err) { setAuthError('查詢失敗'); }
  };
  const handleForgotAnswer = async (e) => {
    e.preventDefault();
    const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
    const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey));
    if (snap.data().secAnswer !== authSecAnswer) { setAuthError('安全提示答案錯誤'); return; }
    switchAuthMode('forgot_reset');
  };
  const handleForgotReset = async (e) => {
    e.preventDefault();
    if (authPassword !== authConfirmPassword) { setAuthError('新密碼不一致'); return; }
    const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey), { password: authPassword });
    setAuthSuccess('重置成功，請使用新密碼登入');
    switchAuthMode('login');
  };

  // ==========================================
  // 核心互動邏輯 (寫入目前房間)
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeTeacherId) return;
    const msgId = Date.now().toString() + Math.floor(Math.random() * 1000);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('messages'), msgId), {
      text: inputText.trim(), author: isAnonymous ? "匿名" : (authorName.trim() || "匿名"),
      likes: 0, likedBy: [], rotation: Math.floor(Math.random() * 10) - 5, createdAt: Date.now(), userId: user.uid
    });
    setInputText(''); 
  };

  const handleLike = async (id) => {
    if (!user || !activeTeacherId) return;
    const targetMsg = messages.find(m => m.id === id);
    if (!targetMsg) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('messages'), id);
    if (targetMsg.likedBy && targetMsg.likedBy.includes(user.uid)) {
      await updateDoc(docRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(docRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
    }
  };

  const handleShake = async (id) => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('messages'), id), { lastShaken: Date.now() });
  };

  // ==========================================
  // 教官管理邏輯 (影響目前房間設定)
  // ==========================================
  const handleSetTopic = async (topic) => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global'), { currentTopic: topic, activePollId: null, activePoll: null });
  };

  const handlePublishQuestion = async (item) => {
    if (!user || !item || !activeTeacherId) return;
    const globalRef = doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global');
    if (item.type === 'text') {
      await updateDoc(globalRef, { currentTopic: item.title, activePollId: null, activePoll: null });
    } else {
      await updateDoc(globalRef, { activePollId: item.id, currentTopic: '', pollState: 'voting', activePoll: item });
    }
  };

  const handleRevealPoll = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global'), { pollState: 'revealed' });
  };

  const handleStopPoll = async () => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global'), { activePollId: null, activePoll: null });
  };

  const handleCastVote = async (choice) => {
    if (!user || !activePollId || pollState !== 'voting' || !activeTeacherId) return;
    const voteRef = doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('votes'), user.uid);
    await setDoc(voteRef, { pollId: activePollId, choice: choice, updatedAt: Date.now() }, { merge: true });
  };

  const validateNewQuestion = () => {
    if (!newQuestionTitle.trim()) return false;
    if (newQuestionType === 'poll' && (!newQuestionOptA.trim() || !newQuestionOptB.trim())) return false;
    if (newQuestionType === 'vote' && newVoteOptions.filter(o => o.trim()).length < 2) return false;
    return true;
  };

  const handleAddQuestion = async (e) => {
    if(e) e.preventDefault();
    if (!user || !activeTeacherId || !validateNewQuestion()) return;
    const newItem = { id: 'q_' + Date.now(), type: newQuestionType, title: newQuestionTitle.trim() };
    if (newQuestionType === 'poll') { newItem.optA = newQuestionOptA.trim(); newItem.optB = newQuestionOptB.trim(); } 
    else if (newQuestionType === 'vote') { newItem.options = newVoteOptions.map(o => o.trim()).filter(o => o); }
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', activeTeacherId), { agenda: [...(Array.isArray(agenda) ? agenda : []), newItem] });
    setNewQuestionTitle(''); setNewQuestionOptA(''); setNewQuestionOptB(''); setNewVoteOptions(['', '', '', '']);
    setShowNewClassModal(false);
  };

  const handleDeleteQuestion = async (index) => {
    if (!user || !activeTeacherId || !Array.isArray(agenda)) return;
    const newAgenda = agenda.filter((_, i) => i !== index);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', activeTeacherId), { agenda: newAgenda });
  };

  // 清空教室：透過更換 Session ID 隔離舊留言，並清除當前話題
  const handleClearRoom = async () => {
    if (!user || !activeTeacherId) return;
    const newSessionId = Date.now().toString();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', getRoomCollection('settings'), 'global'), {
      currentSessionId: newSessionId,
      currentTopic: '',
      activePollId: null,
      activePoll: null,
      pollState: 'voting'
    });
    setShowClearModal(false);
  };

  // ==========================================
  // 畫面輔助邏輯
  // ==========================================
  const maxLikes = useMemo(() => Math.max(...messages.map(m => m.likes), 0), [messages]);
  const getHeatScore = (likes) => likes === 0 ? 0 : (Math.min(likes / 25, 1) * 0.3) + ((likes / Math.max(maxLikes, 1)) * 0.7);
  const getFontSize = (likes) => `clamp(1rem, 1rem + ${getHeatScore(likes) * 3.5}vw, 4.5rem)`;
  const getColorClass = (likes, theme = 'dark') => {
    const score = getHeatScore(likes);
    if (theme === 'dark') {
      if (score >= 0.8) return 'text-rose-500 font-black drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]';
      if (score >= 0.35) return 'text-emerald-400 font-bold';
      return 'text-slate-400 font-normal';
    }
    return score >= 0.8 ? 'text-rose-600 font-black' : 'text-slate-500 font-normal';
  };

  const isSessionValid = viewMode !== 'mobile' || !currentSessionId || mySessionId === currentSessionId;
  const currentActivePollData = activePoll && (activePoll.type === 'poll' || activePoll.type === 'vote') ? activePoll : null;

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white"><Loader2 className="animate-spin mr-2"/>正在載入系統...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <style>{`
        @keyframes custom-shake { 0%, 100% { transform: scale(1.1); } 15%, 45%, 75% { transform: scale(1.15) rotate(-3deg); } 30%, 60%, 90% { transform: scale(1.15) rotate(3deg); } }
        .animate-shake { animation: custom-shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes tug-struggle { 0%, 100% { left: 50%; } 25% { left: 47%; } 75% { left: 53%; } }
        .animate-tug-struggle { animation: tug-struggle 4s ease-in-out both; }
        .tug-slide-slow { transition: width 2s ease-out, left 3s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {/* 導覽列 (只在非學生模式顯示) */}
      {viewMode !== 'mobile' && (
        <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-50 shrink-0">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xl">
            <MessageSquare className="w-6 h-6" /> LiveFeedback <span className="hidden sm:inline">即時雲端互動</span>
          </div>
          {viewMode === 'projector' && activeTeacherId && (
             <button onClick={handleTeacherLogout} className="text-sm font-bold text-slate-500 hover:text-rose-500 transition-colors flex items-center gap-1">
               登出教室 <LogOut className="w-4 h-4"/>
             </button>
          )}
        </div>
      )}

      <div className="flex-1 relative">
        
        {/* ==================== 全新首頁：教官大廳 (auth) ==================== */}
        {viewMode === 'auth' && (
          <div className="absolute inset-0 bg-slate-100 flex justify-center items-center p-4">
             <div className="bg-white p-8 rounded-3xl shadow-xl border w-full max-w-md">
                {teacherAuthMode === 'login' ? (
                  <form onSubmit={handleTeacherLogin}>
                     <ShieldCheck className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
                     <h2 className="text-2xl font-black text-center mb-2 text-slate-800">教官大廳登入</h2>
                     <p className="text-center text-slate-500 text-sm mb-6 font-bold">登入後將為您開啟專屬的獨立教室</p>
                     
                     {authError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-bold">{authError}</div>}
                     {authSuccess && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl mb-4 text-sm font-bold">{authSuccess}</div>}
                     
                     <div className="space-y-3 mb-6">
                       <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="電子信箱" className="w-full bg-slate-50 p-4 rounded-xl border outline-none focus:border-indigo-500" required />
                       <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="密碼" className="w-full bg-slate-50 p-4 rounded-xl border outline-none focus:border-indigo-500" required />
                     </div>
                     <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold shadow-lg transition-colors">開啟我的專屬大螢幕</button>
                     
                     <div className="flex justify-between items-center mt-6 text-sm font-bold text-slate-500">
                        <button type="button" onClick={() => switchAuthMode('forgot_email')} className="hover:text-indigo-600">忘記密碼？</button>
                        <button type="button" onClick={() => switchAuthMode('register')} className="text-indigo-600 flex items-center gap-1"><UserPlus className="w-4 h-4"/> 新教官註冊</button>
                     </div>
                  </form>
                ) : teacherAuthMode === 'register' ? (
                  <form onSubmit={handleRequestVerification}>
                     <UserPlus className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                     <h2 className="text-xl font-black text-center mb-6 text-slate-800">註冊專屬教室帳號</h2>
                     
                     {authError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-bold">{authError}</div>}
                     {authSuccess && <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl mb-4 text-sm font-bold">{authSuccess}</div>}
                     
                     <div className="space-y-3 mb-6">
                        <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="您的信箱 (作為教室 ID)" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                        <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="設定密碼" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                        <input type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} placeholder="確認密碼" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                        <input type="text" value={authSecQuestion} onChange={e => setAuthSecQuestion(e.target.value)} placeholder="忘記密碼提示 (例: 寵物名)" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                        <input type="text" value={authSecAnswer} onChange={e => setAuthSecAnswer(e.target.value)} placeholder="提示答案" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                        <input type="password" value={authInviteCode} onChange={e => setAuthInviteCode(e.target.value)} placeholder="團隊密碼 (0609)" className="w-full bg-slate-50 p-3 rounded-xl border outline-none focus:border-indigo-500 text-sm" required />
                     </div>
                     <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2"><Mail className="w-4 h-4"/> 發送驗證信</button>
                     <button type="button" onClick={() => switchAuthMode('login')} className="w-full text-slate-500 font-bold mt-4 flex items-center justify-center gap-1 text-sm"><ArrowLeft className="w-4 h-4"/>返回登入</button>
                  </form>
                ) : (
                  <form onSubmit={teacherAuthMode === 'forgot_email' ? handleForgotEmail : teacherAuthMode === 'forgot_answer' ? handleForgotAnswer : handleForgotReset}>
                     <ShieldQuestion className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                     <h2 className="text-xl font-black text-center mb-6 text-slate-800">找回密碼</h2>
                     {authError && <div className="bg-rose-50 text-rose-600 p-3 rounded-xl mb-4 text-sm font-bold">{authError}</div>}
                     
                     {teacherAuthMode === 'forgot_email' && <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="請輸入註冊信箱" className="w-full bg-slate-50 p-4 rounded-xl mb-6 border outline-none" required />}
                     {teacherAuthMode === 'forgot_answer' && (
                        <>
                           <p className="text-center text-indigo-600 font-bold mb-4">{fetchedSecQuestion}</p>
                           <input type="text" value={authSecAnswer} onChange={e => setAuthSecAnswer(e.target.value)} placeholder="請輸入答案" className="w-full bg-slate-50 p-4 rounded-xl mb-6 border outline-none" required />
                        </>
                     )}
                     {teacherAuthMode === 'forgot_reset' && (
                        <div className="space-y-3 mb-6">
                           <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="新密碼" className="w-full bg-slate-50 p-4 rounded-xl border outline-none" required />
                           <input type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} placeholder="確認新密碼" className="w-full bg-slate-50 p-4 rounded-xl border outline-none" required />
                        </div>
                     )}
                     <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">下一步</button>
                     <button type="button" onClick={() => switchAuthMode('login')} className="w-full text-slate-500 font-bold mt-4 flex items-center justify-center gap-1 text-sm"><ArrowLeft className="w-4 h-4"/>返回登入</button>
                  </form>
                )}
             </div>

             {/* 驗證碼輸入 Modal */}
             {showVerifyModal && (
               <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-sm text-center">
                     <Mail className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                     <h3 className="text-xl font-bold text-slate-800 mb-2">信箱驗證</h3>
                     <p className="text-sm text-slate-500 mb-6">驗證碼已寄出至信箱，請於 {Math.floor(verifyCountdown / 60)}:{String(verifyCountdown % 60).padStart(2, '0')} 內輸入。</p>
                     
                     <input type="text" value={inputVerifyCode} onChange={e => setInputVerifyCode(e.target.value)} placeholder="請輸入 6 位數" className="w-full text-center text-2xl tracking-[0.5em] p-4 rounded-xl bg-slate-50 border-2 border-slate-200 outline-none focus:border-indigo-500 mb-6" maxLength={6} />
                     
                     {authError && <div className="text-rose-500 text-sm font-bold mb-4">{authError}</div>}
                     
                     <button onClick={handleConfirmVerification} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">確認並啟用教室</button>
                     <button onClick={() => setShowVerifyModal(false)} className="mt-4 text-sm font-bold text-slate-400">取消</button>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* ==================== 投影機視角 (大螢幕) ==================== */}
        {viewMode === 'projector' && activeTeacherId && (
          <div className={`absolute inset-0 overflow-hidden flex flex-col transition-colors duration-500 ${projectorTheme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            <div className={`absolute top-8 left-8 z-40 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${projectorTheme === 'dark' ? 'bg-white/10 backdrop-blur-md border-white/20' : 'bg-white/90 backdrop-blur-md border-slate-200'}`}>
              <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></div>
              <span className="text-sm font-medium tracking-wider flex items-center">在線人數：<strong className={`text-2xl font-black ml-2 ${projectorTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{Number(onlineCount)}</strong></span>
            </div>

            <div className={`absolute top-12 right-0 z-40 flex items-start transition-transform duration-500`}>
              <div className={`backdrop-blur-md p-4 rounded-l-2xl shadow-2xl flex flex-col items-center border-b border-l pb-5 ${projectorTheme === 'dark' ? 'bg-white/10 border-white/20' : 'bg-white/90 border-slate-200'}`}>
                {activeStudentUrl ? (
                  <div className={`p-2 rounded-xl shadow-inner cursor-pointer hover:scale-105 transition-transform ${projectorTheme === 'dark' ? 'bg-white' : 'bg-slate-100'}`} onClick={() => setShowEnlargedQR(true)}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(activeStudentUrl)}`} alt="Join QR" className="w-24 h-24" />
                  </div>
                ) : <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center text-[10px] p-2">載入中</div>}
                <span className="text-sm font-bold mt-3 tracking-widest drop-shadow-md">掃描加入互動</span>
              </div>
            </div>

            {/* 大螢幕 QR Code 放大 */}
            {showEnlargedQR && activeStudentUrl && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg" onClick={() => setShowEnlargedQR(false)}>
                <div className="bg-white/90 p-8 rounded-[3rem] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                  <h2 className="text-3xl font-black text-slate-800 mb-8 tracking-widest">掃描加入專屬教室</h2>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(activeStudentUrl)}`} alt="Enlarged QR" className="w-64 h-64 border-8 border-white shadow-lg rounded-xl" />
                  <button onClick={() => setShowEnlargedQR(false)} className="mt-8 bg-slate-800 text-white px-10 py-3 rounded-full font-bold">關閉</button>
                </div>
              </div>
            )}

            {/* 進行中的投票或拔河 */}
            {currentActivePollData ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                  <h1 className="text-5xl lg:text-6xl font-black mb-12 drop-shadow-lg text-center break-words max-w-5xl">{currentActivePollData.title}</h1>
                  
                  {currentActivePollData.type === 'poll' && (
                    <div className="w-full max-w-5xl relative">
                        <div className="flex justify-between items-end mb-4 px-12">
                          <h3 className={`font-bold text-3xl ${projectorTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{currentActivePollData.optA}</h3>
                          <h3 className={`font-bold text-3xl ${projectorTheme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>{currentActivePollData.optB}</h3>
                        </div>
                        <div className={`relative h-36 rounded-full shadow-2xl border-4 overflow-hidden backdrop-blur-md ${projectorTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                          <div className={`absolute top-0 left-0 h-full w-1/2 border-r-2 border-dashed ${projectorTheme === 'dark' ? 'bg-blue-500/10 border-slate-500' : 'bg-blue-50 border-slate-300'}`}></div>
                          <div className={`absolute top-0 right-0 h-full w-1/2 ${projectorTheme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'}`}></div>
                          <div className="absolute top-1/2 left-0 w-full h-6 -translate-y-1/2 bg-[#8B4513] border-y border-[#5C2E0B]"></div>
                          <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 ${isTugAnimating ? 'animate-tug-struggle' : 'tug-slide-slow'}`} style={{ left: `${ropePosition}%` }}>
                            <div className="w-8 h-32 bg-red-600 rounded-full border-2 border-red-300 relative shadow-[0_0_15px_rgba(220,38,38,0.8)]">
                               <div className="absolute top-2 -left-1 w-10 h-4 bg-red-800 rounded-full"></div>
                               <div className="absolute bottom-2 -left-1 w-10 h-4 bg-red-800 rounded-full"></div>
                            </div>
                          </div>
                          
                          {/* 顯示數字 */}
                          <div className="absolute top-1/2 -translate-y-1/2 left-12 z-10">
                            <div className={`flex items-baseline gap-2 transition-opacity duration-500 ${showResults ? 'opacity-100' : 'opacity-0'}`}>
                              <span className={`text-7xl font-black ${projectorTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{pollVotes.A}</span>
                            </div>
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 right-12 z-10">
                            <div className={`flex items-baseline gap-2 transition-opacity duration-500 ${showResults ? 'opacity-100' : 'opacity-0'}`}>
                              <span className={`text-7xl font-black ${projectorTheme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{pollVotes.B}</span>
                            </div>
                          </div>
                        </div>
                    </div>
                  )}

                  {currentActivePollData.type === 'vote' && (
                    <div className="w-full max-w-5xl flex flex-col gap-6">
                      {Array.isArray(currentActivePollData.options) && currentActivePollData.options.map((opt, i) => {
                         const count = showResults ? Number(pollVotes.counts[i.toString()] || 0) : 0;
                         const percentage = pollVotes.total === 0 ? 0 : (count / pollVotes.total) * 100;
                         return (
                           <div key={i} className="flex flex-col gap-2">
                             <div className="flex justify-between items-end px-2">
                                <span className="text-2xl font-bold">{opt}</span>
                                <span className={`text-4xl font-black transition-opacity ${showResults ? 'opacity-100' : 'opacity-0'} ${projectorTheme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>{count} 票</span>
                             </div>
                             <div className={`w-full h-10 rounded-full overflow-hidden border-2 ${projectorTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}>
                                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-end px-4 tug-slide-slow" style={{ width: `${percentage}%` }}>
                                   {percentage >= 5 && <span className="text-white font-bold text-sm">{percentage.toFixed(1)}%</span>}
                                </div>
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col w-full h-full p-4 relative pt-20">
                <div className="flex-1 flex flex-wrap justify-center content-end gap-10 overflow-hidden pb-4 px-12">
                  {messages.filter((_, i) => i % 2 === 0).map(msg => <MessageNode key={msg.id} msg={msg} colorClass={getColorClass(msg.likes, projectorTheme)} fontSize={getFontSize(msg.likes)} theme={projectorTheme} />)}
                </div>
                {currentTopic && (
                  <div className="shrink-0 flex justify-center z-30 py-3 pointer-events-none">
                    <div className={`backdrop-blur-3xl px-14 py-8 rounded-[2rem] border-[3px] shadow-[0_20px_60px_rgba(99,102,241,0.15)] flex items-center justify-center ${projectorTheme === 'dark' ? 'bg-slate-900/90 border-indigo-500/80 text-white' : 'bg-white/90 border-indigo-300 text-slate-800'}`}>
                      <h1 className="font-black text-center break-words text-5xl leading-tight">{currentTopic}</h1>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-wrap justify-center content-start gap-10 overflow-hidden pt-4 px-12">
                  {messages.filter((_, i) => i % 2 !== 0).map(msg => <MessageNode key={msg.id} msg={msg} colorClass={getColorClass(msg.likes, projectorTheme)} fontSize={getFontSize(msg.likes)} theme={projectorTheme} />)}
                </div>
                {messages.length === 0 && !currentTopic && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-6xl font-black opacity-20 tracking-widest">國軍中部地區人才招募中心</div>
                  </div>
                )}
              </div>
            )}

            {/* 左下角遙控器圖示 */}
            <div className="absolute bottom-6 left-6 z-40 flex items-center gap-4">
              <button onClick={() => setShowTeacherQR(true)} className={`p-4 rounded-full transition-all group ${projectorTheme === 'dark' ? 'text-slate-700 hover:text-indigo-400' : 'text-slate-400 hover:text-indigo-600'}`} title="呼叫教官遙控器">
                <Key className="w-8 h-8 opacity-40 group-hover:opacity-100" />
              </button>
              <button onClick={() => setProjectorTheme(t => t === 'dark' ? 'light' : 'dark')} className={`p-4 rounded-full transition-all group ${projectorTheme === 'dark' ? 'text-slate-700 hover:text-amber-400' : 'text-slate-400 hover:text-indigo-600'}`}>
                {projectorTheme === 'dark' ? <Sun className="w-8 h-8 opacity-40 group-hover:opacity-100" /> : <Moon className="w-8 h-8 opacity-40 group-hover:opacity-100" />}
              </button>
            </div>

            {showTeacherQR && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md" onClick={() => setShowTeacherQR(false)}>
                <div className="bg-slate-800 p-8 rounded-3xl text-center border border-slate-700 max-w-sm" onClick={e => e.stopPropagation()}>
                  <ShieldCheck className="w-16 h-16 text-indigo-400 mb-4 mx-auto" />
                  <h3 className="text-2xl font-bold text-white mb-6">登入教官遙控器</h3>
                  <div className="bg-white p-4 rounded-2xl mb-6">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeTeacherUrl)}`} alt="Teacher Login" className="mx-auto" />
                  </div>
                  <p className="text-slate-400 text-sm font-bold mb-4">請用手機掃描登入</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 手機端視角 (學生) ==================== */}
        {viewMode === 'mobile' && (
          <div className="absolute inset-0 bg-slate-200 flex justify-center items-center p-4">
            <div className="w-full max-w-md bg-slate-50 h-full max-h-[850px] shadow-2xl rounded-[2.5rem] border-8 border-slate-800 flex flex-col overflow-hidden relative">
              <div className="bg-indigo-600 text-white p-4 pt-8 text-center shadow-md relative shrink-0">
                <h2 className="font-bold text-lg">{currentActivePollData ? (currentActivePollData.type === 'poll' ? '⚔️ 陣營對決中' : '📊 投票進行中') : '💬 參與討論'}</h2>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-3xl"></div>
              </div>

              {!isSessionValid ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6"><AlertTriangle className="w-10 h-10" /></div>
                  <h2 className="text-2xl font-black text-slate-800 mb-3">課堂已更換</h2>
                  <p className="text-slate-600 font-medium">教官已開啟新課堂，請重新掃描大螢幕 QR Code。</p>
                </div>
              ) : currentActivePollData ? (
                <div className="flex-1 bg-slate-900 flex flex-col p-6 overflow-y-auto">
                  <div className="flex-1 flex flex-col justify-center gap-6 py-10">
                    <div className="text-center mb-4">
                      {currentActivePollData.type === 'poll' ? <CircleDashed className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-[spin_4s_linear_infinite]" /> : <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4" />}
                      <h2 className="text-2xl font-black text-white">{currentActivePollData.title}</h2>
                    </div>
                    <div className="flex flex-col gap-4">
                      {currentActivePollData.type === 'poll' ? (
                        <>
                          <button onClick={() => handleCastVote('A')} disabled={pollState !== 'voting'} className={`p-6 rounded-2xl border-2 transition-all font-bold text-xl ${myVote === 'A' ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-blue-300'}`}>{currentActivePollData.optA}</button>
                          <button onClick={() => handleCastVote('B')} disabled={pollState !== 'voting'} className={`p-6 rounded-2xl border-2 transition-all font-bold text-xl ${myVote === 'B' ? 'bg-rose-600 border-rose-400 text-white' : 'bg-slate-800 border-slate-700 text-rose-300'}`}>{currentActivePollData.optB}</button>
                        </>
                      ) : (
                        Array.isArray(currentActivePollData.options) && currentActivePollData.options.map((opt, i) => (
                          <button key={i} onClick={() => handleCastVote(i.toString())} disabled={pollState !== 'voting'} className={`p-5 rounded-2xl border-2 transition-all font-bold text-lg text-left ${myVote === i.toString() ? 'bg-purple-600 border-purple-400 text-white' : 'bg-slate-800 border-slate-700 text-purple-300'}`}>{opt}</button>
                        ))
                      )}
                    </div>
                    {myVote && (
                      <div className="text-center mt-6">
                        {pollState === 'voting' ? <p className="font-bold text-emerald-400 animate-pulse">已記錄選擇，等待揭曉...</p> : <p className="font-bold text-emerald-400">大局已定，請看大螢幕！</p>}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {currentTopic && (
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex flex-col shrink-0 shadow-sm z-10">
                      <span className="text-[10px] font-bold text-indigo-400">討論主題</span>
                      <p className="text-indigo-900 font-bold text-sm">{currentTopic}</p>
                    </div>
                  )}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 pb-24">
                    {messages.map(msg => (
                      <div key={msg.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
                        <div className="bg-slate-100 p-2 rounded-full h-fit shrink-0">{msg.author === '匿名' ? <Ghost className="w-5 h-5 text-slate-500" /> : <User className="w-5 h-5 text-indigo-500" />}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-slate-500 font-medium mb-1 truncate">{msg.author}</div>
                          <p className="text-slate-800 text-sm break-words">{msg.text}</p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-2 min-w-[3.5rem] shrink-0 border-l border-slate-100 pl-2">
                          <button onClick={() => handleLike(msg.id)} className={`p-1.5 rounded-full flex flex-col items-center transition-colors ${msg.likedBy?.includes(user?.uid) ? 'text-rose-500' : 'text-slate-400 hover:text-indigo-600'}`}>
                            <ThumbsUp className={`w-5 h-5 ${msg.likedBy?.includes(user?.uid) ? 'fill-current' : ''}`} />
                            <span className="text-[10px] font-bold mt-1">{msg.likes}</span>
                          </button>
                          <button onClick={() => handleShake(msg.id)} className="p-1.5 rounded-full text-slate-300 hover:text-amber-500"><Bell className="w-5 h-5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 w-full bg-white border-t p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                      <div className="flex justify-between px-1">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600"><input type="checkbox" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} className="rounded text-indigo-600"/>匿名發布</label>
                        {!isAnonymous && <input type="text" placeholder="暱稱..." value={authorName} onChange={e => setAuthorName(e.target.value)} className="text-sm border-b px-2 py-1 w-24 outline-none" maxLength={10} />}
                      </div>
                      <div className="flex gap-2 relative">
                        <input type="text" value={inputText} onChange={e => setInputText(e.target.value)} placeholder="寫下你的想法..." className="flex-1 bg-slate-100 focus:bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-300 pr-12" maxLength={100} />
                        <button type="submit" disabled={!inputText.trim()} className="absolute right-1 top-1 bottom-1 bg-indigo-600 text-white aspect-square rounded-lg flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4 ml-1"/></button>
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ==================== 遙控器視角 (教官) ==================== */}
        {viewMode === 'teacher' && (
          <div className="absolute inset-0 bg-slate-200 flex justify-center items-center p-4">
            <div className="w-full max-w-md bg-slate-50 h-full max-h-[850px] shadow-2xl rounded-[2.5rem] border-8 border-slate-800 flex flex-col overflow-hidden relative">
              <div className="bg-slate-800 text-white p-4 text-center shadow-md relative shrink-0 flex justify-between items-center">
                <div className="w-8"></div>
                <h2 className="font-bold flex items-center justify-center gap-2"><ShieldCheck className="text-emerald-400 w-5 h-5"/> 教官遙控器</h2>
                <button onClick={handleTeacherLogout} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl"></div>
              </div>

              {!isTeacherAuthed ? (
                <div className="flex-1 flex items-center justify-center p-6 bg-slate-100">
                  <form onSubmit={handleTeacherLogin} className="bg-white p-8 rounded-3xl shadow-lg border w-full text-center">
                     <Lock className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
                     <h3 className="font-bold text-xl mb-6">安全登入</h3>
                     {authError && <div className="text-rose-500 text-sm font-bold mb-4">{authError}</div>}
                     <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="信箱帳號" className="w-full bg-slate-50 p-4 rounded-xl border mb-3 outline-none" required />
                     <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="密碼" className="w-full bg-slate-50 p-4 rounded-xl border mb-6 outline-none" required />
                     <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold">登入遙控器</button>
                  </form>
                </div>
              ) : (
                <div className="flex-1 bg-slate-100 p-4 overflow-y-auto flex flex-col gap-4 pb-10">
                  
                  {/* 控制面板：清空教室與新增題目 */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                     <button onClick={() => setShowNewClassModal(true)} className="bg-white border-2 border-indigo-100 hover:border-indigo-300 text-indigo-700 font-bold py-3 rounded-2xl flex justify-center items-center gap-2 shadow-sm transition-all"><Plus className="w-5 h-5"/> 新增題目</button>
                     <button onClick={() => setShowClearModal(true)} className="bg-white border-2 border-rose-100 hover:border-rose-300 text-rose-700 font-bold py-3 rounded-2xl flex justify-center items-center gap-2 shadow-sm transition-all"><Trash2 className="w-5 h-5"/> 清空教室</button>
                  </div>

                  {/* 大螢幕狀態卡片 */}
                  <div className={`p-5 rounded-2xl border-2 ${(activePollId && currentActivePollData) ? (currentActivePollData.type === 'vote' ? 'bg-white border-purple-200 shadow-lg' : 'bg-white border-rose-200 shadow-lg') : (currentTopic ? 'bg-white border-indigo-200 shadow-md' : 'bg-slate-50 border-slate-200')}`}>
                    <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> 當前狀態</h3>
                    {activePollId && currentActivePollData ? (
                      <div className="flex flex-col h-full">
                         <span className="inline-block text-[10px] font-bold rounded mb-2 w-fit bg-slate-100 px-2 py-1">{currentActivePollData.type === 'vote' ? '📊 投票' : '⚔️ 拔河'}</span>
                         <div className="text-lg font-black mb-4">{currentActivePollData.title}</div>
                         <div className="bg-slate-50 border rounded-xl p-3 mb-4 text-center font-bold text-lg text-indigo-600">{pollVotes.total} <span className="text-sm text-slate-500">/ {onlineCount} 人投票</span></div>
                         {pollState === 'voting' ? (
                           <button onClick={handleRevealPoll} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Play className="w-4 h-4 fill-current"/> 開始結算</button>
                         ) : (
                           <button onClick={handleStopPoll} className="w-full bg-slate-200 text-slate-600 font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Square className="w-4 h-4 fill-current"/> 關閉結果</button>
                         )}
                      </div>
                    ) : currentTopic ? (
                      <div>
                         <div className="text-lg font-black text-indigo-900 mb-4">{currentTopic}</div>
                         <button onClick={() => handleSetTopic('')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">撤下話題</button>
                      </div>
                    ) : <div className="text-slate-400 font-bold text-center">自由留言模式</div>}
                  </div>

                  {/* 題庫管理 */}
                  <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-4">📋 題庫腳本管理</h3>
                    <div className="space-y-3">
                       {agenda.length === 0 ? (
                          <div className="text-center text-sm text-slate-400 py-4">目前沒有任何題目，請點擊上方新增。</div>
                       ) : (
                         agenda.map((item, idx) => {
                            const isActive = (item.type === 'text' && currentTopic === item.title) || (activePollId === item.id);
                            return (
                              <div key={idx} className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 hover:border-slate-300'}`}>
                                 <div className="flex justify-between items-start gap-2">
                                    <div className="font-bold text-slate-800 flex-1">{idx+1}. {item.title}</div>
                                    <button onClick={() => handleDeleteQuestion(idx)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors bg-white rounded-md border"><Trash2 className="w-4 h-4"/></button>
                                 </div>
                                 <button onClick={() => isActive ? (item.type === 'text' ? handleSetTopic('') : handleStopPoll()) : handlePublishQuestion(item)} className={`py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm ${isActive ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                    {isActive ? '取消發布' : '發布至大螢幕'}
                                 </button>
                              </div>
                            )
                         })
                       )}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== 教官功能 Modal 區塊 ===== */}

              {/* 1. 清空教室確認 Modal */}
              {showClearModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6" onClick={() => setShowClearModal(false)}>
                  <div className="bg-white p-6 rounded-3xl w-full text-center" onClick={e => e.stopPropagation()}>
                    <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 mb-2">確定要清空教室嗎？</h3>
                    <p className="text-sm text-slate-500 mb-6">這將會清除螢幕上所有的學生留言，並讓學生重新進入乾淨的畫面。此操作無法復原。</p>
                    <div className="flex gap-3">
                      <button onClick={() => setShowClearModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold">取消</button>
                      <button onClick={handleClearRoom} className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold">確定清空</button>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 新增題目 Modal */}
              {showNewClassModal && (
                <div className="absolute inset-0 z-50 bg-slate-100 flex flex-col">
                  <div className="bg-white p-4 flex justify-between items-center border-b shadow-sm shrink-0">
                    <h3 className="font-bold text-lg">新增互動題目</h3>
                    <button onClick={() => setShowNewClassModal(false)} className="p-2 bg-slate-100 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <form id="new-question-form" onSubmit={handleAddQuestion} className="space-y-6">
                      
                      {/* 題型選擇 */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">選擇互動類型</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => setNewQuestionType('text')} className={`py-3 px-2 rounded-xl text-sm font-bold border-2 flex flex-col items-center gap-1 transition-all ${newQuestionType === 'text' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <MessageSquare className="w-5 h-5"/> 一般討論
                          </button>
                          <button type="button" onClick={() => setNewQuestionType('poll')} className={`py-3 px-2 rounded-xl text-sm font-bold border-2 flex flex-col items-center gap-1 transition-all ${newQuestionType === 'poll' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <Swords className="w-5 h-5"/> 雙方對決
                          </button>
                          <button type="button" onClick={() => setNewQuestionType('vote')} className={`py-3 px-2 rounded-xl text-sm font-bold border-2 flex flex-col items-center gap-1 transition-all ${newQuestionType === 'vote' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                            <BarChart3 className="w-5 h-5"/> 多項投票
                          </button>
                        </div>
                      </div>

                      {/* 題目輸入 */}
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">主標題 / 討論主題</label>
                        <input type="text" value={newQuestionTitle} onChange={e => setNewQuestionTitle(e.target.value)} placeholder="請輸入您想發問的內容..." className="w-full bg-white border-2 border-slate-200 p-4 rounded-xl outline-none focus:border-indigo-500" required />
                      </div>

                      {/* 雙方對決選項設定 */}
                      {newQuestionType === 'poll' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-blue-600 mb-2">選項 A (藍方)</label>
                            <input type="text" value={newQuestionOptA} onChange={e => setNewQuestionOptA(e.target.value)} placeholder="例如：非常同意" className="w-full bg-blue-50 border-2 border-blue-200 p-3 rounded-xl outline-none focus:border-blue-500" required />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-rose-600 mb-2">選項 B (紅方)</label>
                            <input type="text" value={newQuestionOptB} onChange={e => setNewQuestionOptB(e.target.value)} placeholder="例如：不同意" className="w-full bg-rose-50 border-2 border-rose-200 p-3 rounded-xl outline-none focus:border-rose-500" required />
                          </div>
                        </div>
                      )}

                      {/* 多項投票選項設定 */}
                      {newQuestionType === 'vote' && (
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">設定投票選項 (至少填寫兩項)</label>
                          <div className="space-y-3">
                            {newVoteOptions.map((opt, i) => (
                              <input key={i} type="text" value={opt} onChange={e => { const newOpts = [...newVoteOptions]; newOpts[i] = e.target.value; setNewVoteOptions(newOpts); }} placeholder={`選項 ${i+1}`} className="w-full bg-white border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-purple-500" required={i < 2} />
                            ))}
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                  <div className="p-4 bg-white border-t shrink-0">
                    <button form="new-question-form" type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">儲存並加入題庫</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}