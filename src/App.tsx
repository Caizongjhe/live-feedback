import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ThumbsUp, Send, Maximize2, Smartphone, Trash2, QrCode, User, Ghost, 
  MessageSquare, Loader2, Key, Plus, X, ShieldCheck, MonitorPlay, 
  AlertTriangle, Users, Link, Bell, Sun, Moon, Swords, ChevronUp, ChevronDown, Play, Square, CircleDashed, BarChart3,
  Mail, Lock, ShieldQuestion, UserPlus, ArrowLeft, LogOut, Edit, CheckSquare
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

// ==========================================
// EmailJS 設定區 (請填入您的真實金鑰)
// ==========================================
const EMAIL_JS_SERVICE_ID = 'service_jc32b6z';    // 例：'service_xxxxx'
const EMAIL_JS_TEMPLATE_ID = 'template_a11rc87';  // 例：'template_xxxxx'
const EMAIL_JS_PUBLIC_KEY = 'ASNJzlXLmjCgoqN4f';    // 例：'user_xxxxx'

// ==========================================
// Firebase 初始化與設定
// ==========================================
const firebaseConfig = {
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-feedback-app';

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
  
  // 系統視圖控制
  const [viewMode, setViewMode] = useState('lobby'); 
  const [activeTeacherId, setActiveTeacherId] = useState(null); 

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showNewClassModal, setShowNewClassModal] = useState(false);
  
  const [projectorTheme, setProjectorTheme] = useState('light'); 
  const [baseHref, setBaseHref] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState('');
  const [mySessionId, setMySessionId] = useState(null); 
  const [showEnlargedQR, setShowEnlargedQR] = useState(false); 

  // 系統與狀態
  const [currentTopic, setCurrentTopic] = useState('');
  const [agenda, setAgenda] = useState([]); 
  const [activePoll, setActivePoll] = useState(null); 
  
  // 拔河與投票狀態
  const [activePollId, setActivePollId] = useState(null); 
  const [pollState, setPollState] = useState('voting'); 
  const [pollVotes, setPollVotes] = useState({ A: 0, B: 0, counts: {}, total: 0 }); 
  const [myVote, setMyVote] = useState(null); 
  
  // 動畫專屬狀態
  const [isTugAnimating, setIsTugAnimating] = useState(false); 
  const [showResults, setShowResults] = useState(false);
  const [ropePosition, setRopePosition] = useState(50);
  const latestVotes = useRef({ A: 0, B: 0, counts: {}, total: 0 });
  
  // 教官登入與介面狀態
  const [showTeacherQR, setShowTeacherQR] = useState(false);
  const [isTeacherAuthed, setIsTeacherAuthed] = useState(false);
  const [loggedTeacherEmail, setLoggedTeacherEmail] = useState(''); 
  const [showStudentQR, setShowStudentQR] = useState(true);
  const [teacherLayout, setTeacherLayout] = useState('mobile'); 

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
  const [simulatedEmailToast, setSimulatedEmailToast] = useState('');

  // 新增/編輯題目表單狀態 (加入 isMultiple 支援選擇題)
  const [newQuestionType, setNewQuestionType] = useState('text'); 
  const [newQuestionTitle, setNewQuestionTitle] = useState('');
  const [newQuestionOptA, setNewQuestionOptA] = useState('');
  const [newQuestionOptB, setNewQuestionOptB] = useState('');
  const [newVoteOptions, setNewVoteOptions] = useState(['', '', '', '']); 
  const [newIsMultiple, setNewIsMultiple] = useState(false);

  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const [inviteLink, setInviteLink] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [localInviteLink, setLocalInviteLink] = useState(''); 
  const [activeUsers, setActiveUsers] = useState({});
  const [currentTime, setCurrentTime] = useState(Date.now());

  const activePollTypeRef = useRef(null);
  useEffect(() => {
    if (activePoll) activePollTypeRef.current = activePoll.type;
  }, [activePoll]);

  // 1. 處理網址參數 & 決定起始畫面
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modeParam = params.get('mode');
      const teacherParam = params.get('teacher');

      if (modeParam === 'mobile' && teacherParam) {
        setActiveTeacherId(teacherParam);
        setViewMode('mobile');
      } else if (modeParam === 'teacher' && teacherParam) {
        setActiveTeacherId(teacherParam);
        setViewMode('lobby'); 
      } else {
        setViewMode('lobby');
      }

      if (params.get('session')) setMySessionId(params.get('session'));
      
      let href = window.location.href;
      if (href === 'about:srcdoc' || href === 'about:blank' || href.startsWith('blob:')) {
        href = document.referrer || 'https://live-feedback-demo.com';
      }
      if (!href.startsWith('http')) href = 'https://live-feedback-demo.com';

      const url = new URL(href);
      setBaseHref(url.origin + url.pathname);
    } catch (e) {
      setBaseHref('https://live-feedback-demo.com');
    }
  }, []);

  const activeStudentUrl = baseHref && currentSessionId && activeTeacherId ? `${baseHref}?mode=mobile&teacher=${activeTeacherId}&session=${currentSessionId}` : '';
  const activeTeacherUrl = baseHref && activeTeacherId ? `${baseHref}?mode=teacher&teacher=${activeTeacherId}` : '';

  // 2. Firebase 登入認證
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("自訂 Token 驗證失敗，自動切換為匿名登入:", tokenError);
            await signInAnonymously(auth);
          }
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

  // 3. 監聽留言
  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const msgsRef = collection(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`);
    const unsubscribe = onSnapshot(msgsRef, (snapshot) => {
      const fetchedMessages = [];
      snapshot.forEach((doc) => fetchedMessages.push({ id: doc.id, ...doc.data() }));
      fetchedMessages.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(fetchedMessages);
    }, (error) => console.error("資料讀取錯誤:", error));
    return () => unsubscribe();
  }, [user, authLoading, activeTeacherId]);

  // 4. 監聽全域設定
  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const settingsRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global');
    const unsub = onSnapshot(settingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentTopic(data.currentTopic || '');
        setActivePollId(data.activePollId || null);
        setActivePoll(data.activePoll || null); 
        setPollState(data.pollState || 'voting');
        setInviteLink(data.inviteLink || '');
        setShowInviteModal(data.showInviteModal || false);
        setCurrentSessionId(data.currentSessionId || '');
        if (data.inviteLink && !localInviteLink) setLocalInviteLink(data.inviteLink);
      } else {
        const initialSessionId = Date.now().toString();
        setDoc(settingsRef, {
          currentTopic: '', activePollId: null, activePoll: null,
          pollState: 'voting', inviteLink: '', showInviteModal: false,
          currentSessionId: initialSessionId
        });
      }
    }, (error) => console.error("設定讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, localInviteLink, activeTeacherId]);

  // 4-1. 監聽教官個人題庫
  useEffect(() => {
    if (authLoading || !user || !loggedTeacherEmail) return;
    const teacherRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', loggedTeacherEmail);
    const unsub = onSnapshot(teacherRef, (docSnap) => {
      if (docSnap.exists()) {
        setAgenda(Array.isArray(docSnap.data().agenda) ? docSnap.data().agenda : []);
      }
    }, (error) => console.error("題庫讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, loggedTeacherEmail]);

  // 5. 監聽投票數據
  useEffect(() => {
    if (authLoading || !user || !activePollId || !activeTeacherId) {
      setPollVotes({ A: 0, B: 0, counts: {}, total: 0 });
      setMyVote(null);
      return;
    }
    const votesRef = collection(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_votes`);
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
          else {
            if (Array.isArray(data.choice)) {
              data.choice.forEach(c => { countsObj[c] = (countsObj[c] || 0) + 1; });
            } else if (data.choice != null) {
              countsObj[data.choice] = (countsObj[data.choice] || 0) + 1;
            }
          }
          totalCount++; // 以參與的「人數」作為總數計算基準
          if (doc.id === user.uid) userVoted = data.choice;
        }
      });
      setPollVotes({ A: countA, B: countB, counts: countsObj, total: totalCount });
      setMyVote(userVoted);
    }, (error) => console.error("投票讀取錯誤:", error));
    return () => unsub();
  }, [user, authLoading, activePollId, activeTeacherId]);

  useEffect(() => {
    latestVotes.current = pollVotes;
  }, [pollVotes]);

  useEffect(() => {
    let t1, t2;
    if (pollState === 'voting') {
      setIsTugAnimating(false); setShowResults(false); setRopePosition(50);
    } else if (pollState === 'revealed') {
      setIsTugAnimating(true); setShowResults(false); setRopePosition(50);
      const waitTime = (activePollTypeRef.current === 'vote' || activePollTypeRef.current === 'quiz') ? 2000 : 4000;

      t1 = setTimeout(() => {
        setIsTugAnimating(false);
        t2 = setTimeout(() => {
          const votes = latestVotes.current;
          let target = 50;
          if (votes.total > 0 && activePollTypeRef.current === 'poll') {
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

  // 6. 心跳機制
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || viewMode !== 'mobile' || !user || !activeTeacherId) return;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_presence`, user.uid);
    const updatePresence = () => setDoc(presenceRef, { lastActive: Date.now() }, { merge: true }).catch(e => console.error(e));
    updatePresence();
    const interval = setInterval(updatePresence, 15000);
    const cleanup = () => { deleteDoc(presenceRef).catch(() => {}); };
    window.addEventListener('beforeunload', cleanup);
    return () => { clearInterval(interval); window.removeEventListener('beforeunload', cleanup); cleanup(); };
  }, [viewMode, user, authLoading, activeTeacherId]);

  useEffect(() => {
    if (authLoading || !user || !activeTeacherId) return;
    const presenceRef = collection(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_presence`);
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

  // ==========================================
  // 倒數計時器
  // ==========================================
  useEffect(() => {
    let timer;
    if (showVerifyModal && verifyCountdown > 0) {
      timer = setInterval(() => setVerifyCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [showVerifyModal, verifyCountdown]);

  useEffect(() => {
    let timer;
    if (simulatedEmailToast) {
      timer = setTimeout(() => setSimulatedEmailToast(''), 8000); 
    }
    return () => clearTimeout(timer);
  }, [simulatedEmailToast]);

  // ==========================================
  // 互動邏輯
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !activeTeacherId) return;
    const msgId = Date.now().toString() + Math.floor(Math.random() * 1000);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`, msgId), {
      text: inputText.trim(), author: isAnonymous ? "匿名" : (authorName.trim() || "匿名"),
      likes: 0, likedBy: [], lastShaken: null, rotation: Math.floor(Math.random() * 10) - 5,
      createdAt: Date.now(), userId: user.uid
    });
    setInputText(''); 
  };

  const handleLike = async (id) => {
    if (!user || !activeTeacherId) return;
    const targetMsg = messages.find(m => m.id === id);
    if (!targetMsg) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`, id);
    if (targetMsg.likedBy && targetMsg.likedBy.includes(user.uid)) {
      await updateDoc(docRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(docRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
    }
  };

  const handleShake = async (id) => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`, id), { lastShaken: Date.now() });
  };

  const handleReset = async () => {
    if (!user || !activeTeacherId) return;
    messages.forEach(async (msg) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`, msg.id));
    });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global'), { currentTopic: '', activePollId: null, activePoll: null });
    setShowClearModal(false);
  };

  const handleSetTopic = async (topic) => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global'), { currentTopic: topic, activePollId: null, activePoll: null });
  };

  const startEditing = (item) => {
    let copy = JSON.parse(JSON.stringify(item)); 
    if (copy.type === 'vote' || copy.type === 'quiz') {
      if (!copy.options) copy.options = [];
      while (copy.options.length < 4) copy.options.push(''); 
      if (copy.type === 'quiz' && copy.isMultiple === undefined) copy.isMultiple = false;
    }
    setEditFormData(copy); setEditingQuestionId(item.id);
  };

  const cancelEditing = () => { setEditingQuestionId(null); setEditFormData({}); };

  const saveEditing = async () => {
    if (!user || !loggedTeacherEmail || !Array.isArray(agenda) || !activeTeacherId) return;
    if (!editFormData.title.trim()) return;
    if (editFormData.type === 'poll' && (!editFormData.optA.trim() || !editFormData.optB.trim())) return;
    
    let finalData = { ...editFormData };
    if (finalData.type === 'vote' || finalData.type === 'quiz') {
      finalData.options = finalData.options.map(o => o.trim()).filter(o => o);
      if (finalData.options.length < 2) return; 
    }

    const newAgenda = agenda.map(item => item.id === editingQuestionId ? finalData : item);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', loggedTeacherEmail), { agenda: newAgenda });

    if (activePollId === editingQuestionId) {
       const globalRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global');
       if (finalData.type === 'text') await updateDoc(globalRef, { currentTopic: finalData.title });
       else await updateDoc(globalRef, { activePoll: finalData });
    }

    setEditingQuestionId(null); setEditFormData({});
  };

  const validateNewQuestion = () => {
    if (!newQuestionTitle.trim()) return false;
    if (newQuestionType === 'poll' && (!newQuestionOptA.trim() || !newQuestionOptB.trim())) return false;
    if ((newQuestionType === 'vote' || newQuestionType === 'quiz') && newVoteOptions.filter(o => o.trim()).length < 2) return false;
    return true;
  };

  const buildNewItem = () => {
    const newItem = { id: 'q_' + Date.now(), type: newQuestionType, title: newQuestionTitle.trim() };
    if (newQuestionType === 'poll') {
      newItem.optA = newQuestionOptA.trim(); newItem.optB = newQuestionOptB.trim();
    } else if (newQuestionType === 'vote' || newQuestionType === 'quiz') {
      newItem.options = newVoteOptions.map(o => o.trim()).filter(o => o);
      if (newQuestionType === 'quiz') newItem.isMultiple = newIsMultiple;
    }
    return newItem;
  };

  const resetForm = () => { 
    setNewQuestionTitle(''); setNewQuestionOptA(''); setNewQuestionOptB(''); 
    setNewVoteOptions(['', '', '', '']); setNewIsMultiple(false);
  };

  const handleAddQuestion = async (e) => {
    if(e) e.preventDefault();
    if (!user || !loggedTeacherEmail || !validateNewQuestion()) return;
    const newItem = buildNewItem();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', loggedTeacherEmail), { agenda: [...(Array.isArray(agenda) ? agenda : []), newItem] });
    resetForm();
  };

  const handleQuickPublish = async (e) => {
    if(e) e.preventDefault();
    if (!user || !activeTeacherId || !validateNewQuestion()) return;
    const newItem = buildNewItem();
    
    const globalRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global');
    if (newQuestionType === 'text') {
       await updateDoc(globalRef, { currentTopic: newItem.title, activePollId: null, activePoll: null });
    } else {
       await updateDoc(globalRef, { activePollId: newItem.id, currentTopic: '', pollState: 'voting', activePoll: newItem });
    }
    resetForm();
  };

  const handleDeleteQuestion = async (index) => {
    if (!user || !loggedTeacherEmail || !Array.isArray(agenda)) return;
    const newAgenda = agenda.filter((_, i) => i !== index);
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', loggedTeacherEmail), { agenda: newAgenda });
  };

  const handleMoveQuestion = async (index, direction) => {
    if (!user || !loggedTeacherEmail || !Array.isArray(agenda)) return;
    if ((direction === -1 && index === 0) || (direction === 1 && index === agenda.length - 1)) return;
    const newAgenda = [...agenda];
    const temp = newAgenda[index];
    newAgenda[index] = newAgenda[index + direction];
    newAgenda[index + direction] = temp;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', loggedTeacherEmail), { agenda: newAgenda });
  };

  const handlePublishQuestion = async (item) => {
    if (!user || !item || !activeTeacherId) return;
    const globalRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global');
    if (item.type === 'text') {
      await updateDoc(globalRef, { currentTopic: item.title, activePollId: null, activePoll: null });
    } else if (item.type === 'poll' || item.type === 'vote' || item.type === 'quiz') {
      await updateDoc(globalRef, { activePollId: item.id, currentTopic: '', pollState: 'voting', activePoll: item });
    }
  };

  const handleRevealPoll = async () => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global'), { pollState: 'revealed' });
  };

  const handleStopPoll = async () => {
    if (!user || !activeTeacherId) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global'), { activePollId: null, activePoll: null });
  };

  const handleCastVote = async (choice) => {
    if (!user || !activePollId || pollState !== 'voting' || !activeTeacherId) return;
    const voteRef = doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_votes`, user.uid);
    // choice 可能是字串 (單選/拔河) 或是字串陣列 (複選)
    await setDoc(voteRef, { pollId: activePollId, choice: choice, updatedAt: Date.now() }, { merge: true });
  };

  const handleNewClass = async () => {
    if (!user || !activeTeacherId) return;
    messages.forEach(async (msg) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_messages`, msg.id)); });
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', `${activeTeacherId}_settings`, 'global'), {
      currentSessionId: Date.now().toString(), currentTopic: '', activePollId: null, activePoll: null, showInviteModal: false
    });
    setShowNewClassModal(false);
  };

  // ==========================================
  // 教官登入註冊邏輯
  // ==========================================
  const switchAuthMode = (mode) => {
    setTeacherAuthMode(mode);
    setAuthError(''); setAuthSuccess('');
    if (mode === 'login' || mode === 'register') {
      setAuthPassword(''); setAuthConfirmPassword(''); setAuthSecAnswer(''); setAuthInviteCode('');
    }
  };

  const sendEmailJSMail = async (toEmail, code) => {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAIL_JS_SERVICE_ID,
          template_id: EMAIL_JS_TEMPLATE_ID,
          user_id: EMAIL_JS_PUBLIC_KEY,
          template_params: {
            to_email: toEmail,
            verification_code: code,
            code: code               
          }
        })
      });
      if (!response.ok) throw new Error('EmailJS API responded with error');
      return true;
    } catch (error) {
      console.error('Email 寄送錯誤:', error);
      return false;
    }
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
      setAuthError('團隊權限密碼錯誤，您無權創建帳號'); return;
    }
    
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ','); 
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setAuthError('此信箱已被註冊'); return;
      }
      
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(newCode);
      setVerifyCountdown(300); 
      setInputVerifyCode('');
      setShowVerifyModal(true);
      
      setSimulatedEmailToast('正在發送驗證碼信件...');
      const success = await sendEmailJSMail(authEmail, newCode);
      if (success) {
        setSimulatedEmailToast('驗證碼信件已成功發送，請至信箱查看！');
      } else {
        setSimulatedEmailToast('⚠️ 郵件發送失敗。若未配置 EmailJS 金鑰，預設驗證碼為：' + newCode);
      }
      
    } catch (err) {
      setAuthError('系統錯誤，請稍後再試');
    }
  };

  const handleResendCode = async () => {
    if (verifyCountdown > 0) return;
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    setVerificationCode(newCode);
    setVerifyCountdown(300);

    setSimulatedEmailToast('正在重新發送驗證碼信件...');
    const success = await sendEmailJSMail(authEmail, newCode);
    if (success) {
      setSimulatedEmailToast('驗證碼已重新發送，請查收！');
    } else {
      setSimulatedEmailToast('⚠️ 郵件發送失敗。若未配置 EmailJS，預設驗證碼為：' + newCode);
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
        email: authEmail.toLowerCase(), password: authPassword, 
        secQuestion: authSecQuestion, secAnswer: authSecAnswer,
        agenda: [
          { id: 'q_1', type: 'text', title: '大家對這個議題有什麼看法？' },
          { id: 'q_2', type: 'poll', title: '面對重大國家危機，你的選擇是？', optA: '挺身而出保護家園', optB: '專注自己生活就好' },
          { id: 'q_3', type: 'vote', title: '您認為未來最重要的防衛重點？', options: ['網路資訊安全', '無人機防禦與運用', '全民防衛動員意識', '後備軍事系統優化'] }
        ],
        createdAt: Date.now()
      });
      setShowVerifyModal(false);
      setAuthSuccess('帳號創建成功，請重新登入！');
      switchAuthMode('login');
    } catch (err) {
      setAuthError('帳號寫入失敗，請稍後再試');
    }
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    if (!authEmail || !authPassword) { setAuthError('請輸入信箱與密碼'); return; }
    
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        setAuthError('找不到此帳號，請確認信箱是否正確'); return;
      }
      if (snap.data().password !== authPassword) {
        setAuthError('密碼錯誤'); return;
      }
      
      setLoggedTeacherEmail(emailKey);
      setActiveTeacherId(emailKey);
      setIsTeacherAuthed(true);

      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'teacher') {
        setViewMode('teacher');
      } else {
        setViewMode('projector');
      }
    } catch (err) {
      setAuthError('登入失敗，請稍後再試');
    }
  };

  const handleTeacherLogout = () => {
    setIsTeacherAuthed(false);
    setLoggedTeacherEmail('');
    setActiveTeacherId(null);
    setTeacherAuthMode('login');
    setAuthEmail(''); setAuthPassword('');
    setViewMode('lobby');
  };

  const handleForgotEmail = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    if (!authEmail) { setAuthError('請輸入註冊信箱'); return; }
    
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      if (!snap.exists()) { setAuthError('系統中找不到此帳號'); return; }
      setFetchedSecQuestion(snap.data().secQuestion);
      switchAuthMode('forgot_answer');
    } catch (err) { setAuthError('查詢失敗'); }
  };

  const handleForgotAnswer = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      const snap = await getDoc(docRef);
      if (snap.data().secAnswer !== authSecAnswer) { setAuthError('安全提示答案錯誤'); return; }
      switchAuthMode('forgot_reset');
    } catch (err) { setAuthError('驗證失敗'); }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setAuthError(''); setAuthSuccess('');
    if (!authPassword || authPassword !== authConfirmPassword) { setAuthError('新密碼輸入不一致或為空'); return; }
    try {
      const emailKey = authEmail.toLowerCase().replace(/\./g, ',');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'teacher_accounts', emailKey);
      await updateDoc(docRef, { password: authPassword });
      setAuthSuccess('密碼重置成功，請使用新密碼登入');
      switchAuthMode('login');
    } catch (err) { setAuthError('重置失敗'); }
  };

  // ==========================================
  // 畫面輔助邏輯
  // ==========================================
  const getFontSize = (likes) => {
    const scalingLike = likes <= 10 ? likes : 10 + (likes - 10) * 0.2;
    return `clamp(1.5rem, 1.5rem + ${scalingLike * 0.4}vw, 5.5rem)`;
  };
  
  const getColorClass = (likes, theme = 'dark') => {
    if (theme === 'dark') {
      if (likes >= 10) return 'text-rose-500 font-black drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]';
      if (likes >= 7) return 'text-orange-400 font-black drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]';
      if (likes >= 5) return 'text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]';
      if (likes >= 3) return 'text-emerald-400 font-semibold';
      if (likes >= 1) return 'text-indigo-300 font-medium';
      return 'text-slate-400 font-normal';
    } else {
      if (likes >= 10) return 'text-rose-600 font-black drop-shadow-[0_4px_12px_rgba(225,29,72,0.4)]';
      if (likes >= 7) return 'text-orange-500 font-black drop-shadow-[0_3px_8px_rgba(249,115,22,0.3)]';
      if (likes >= 5) return 'text-amber-500 font-bold drop-shadow-[0_3px_6px_rgba(245,158,11,0.3)]';
      if (likes >= 3) return 'text-emerald-600 font-semibold';
      if (likes >= 1) return 'text-indigo-600 font-medium';
      return 'text-slate-500 font-normal';
    }
  };

  const topHalfMessages = messages.filter((_, idx) => idx % 2 === 0);
  const bottomHalfMessages = messages.filter((_, idx) => idx % 2 !== 0);

  const isSessionValid = viewMode !== 'mobile' || (activeTeacherId && (!currentSessionId || mySessionId === currentSessionId));
  const currentActivePollData = activePoll && (activePoll.type === 'poll' || activePoll.type === 'vote' || activePoll.type === 'quiz') ? activePoll : null;

  // ==========================================
  // 登入/註冊表單共用區塊
  // ==========================================
  const renderAuthForms = () => (
    <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md relative animate-in zoom-in-95 duration-500">
      {teacherAuthMode === 'login' && (
        <form onSubmit={handleTeacherLogin} className="flex flex-col">
          <ShieldCheck className="w-16 h-16 text-indigo-500 mb-4 mx-auto" />
          <h3 className="text-2xl font-black text-slate-800 mb-2 text-center">系統大廳登入</h3>
          <p className="text-sm text-slate-500 text-center mb-6">歡迎回到 LiveFeedback</p>
          
          {authSuccess && <p className="text-emerald-500 text-sm mb-4 font-bold text-center bg-emerald-50 py-2 rounded-lg">{authSuccess}</p>}
          {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg">{authError}</p>}
          
          <div className="space-y-4 mb-6">
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="電子信箱" className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="密碼" className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md transition-colors">登入並進入課堂</button>
          
          <div className="flex justify-between items-center mt-6 text-sm font-bold text-slate-500">
            <button type="button" onClick={() => switchAuthMode('forgot_email')} className="hover:text-indigo-600 transition-colors">忘記密碼？</button>
            <button type="button" onClick={() => switchAuthMode('register')} className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"><UserPlus className="w-4 h-4"/> 創建帳號</button>
          </div>
        </form>
      )}

      {teacherAuthMode === 'register' && (
        <form onSubmit={handleRequestVerification} className="flex flex-col">
          <UserPlus className="w-12 h-12 text-indigo-500 mb-3 mx-auto" />
          <h3 className="text-xl font-black text-slate-800 mb-5 text-center">創建專屬帳號</h3>
          {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg">{authError}</p>}
          
          <div className="space-y-3 mb-6">
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="電子信箱" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="設定密碼" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />
            <input type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} placeholder="再次輸入密碼" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />
            
            <div className="border-t border-slate-100 my-2 pt-2"></div>
            <span className="text-xs font-bold text-slate-500 block mb-1">設定找回密碼問題 (例：我小學班導的名字？)</span>
            <input type="text" value={authSecQuestion} onChange={e => setAuthSecQuestion(e.target.value)} placeholder="自訂安全提示問題" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />
            <input type="text" value={authSecAnswer} onChange={e => setAuthSecAnswer(e.target.value)} placeholder="設定安全提示答案" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />

            <div className="border-t border-slate-100 my-2 pt-2"></div>
            <span className="text-xs font-bold text-slate-500 block mb-1">系統團隊權限驗證</span>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="password" value={authInviteCode} onChange={e => setAuthInviteCode(e.target.value)} placeholder="輸入團隊權限密碼 (4碼)" maxLength={4} className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-indigo-500 transition-colors" required />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors text-sm flex justify-center items-center gap-2">發送驗證碼 <Mail className="w-4 h-4"/></button>
          <button type="button" onClick={() => switchAuthMode('login')} className="mt-4 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mx-auto flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> 返回登入</button>
        </form>
      )}

      {teacherAuthMode === 'forgot_email' && (
        <form onSubmit={handleForgotEmail} className="flex flex-col">
          <ShieldQuestion className="w-16 h-16 text-indigo-500 mb-4 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">找回密碼</h3>
          <p className="text-sm text-slate-500 text-center mb-6">請輸入您註冊時的電子信箱</p>
          {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg">{authError}</p>}
          <div className="mb-6 relative">
            <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
            <input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="電子信箱" className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md transition-colors">下一步</button>
          <button type="button" onClick={() => switchAuthMode('login')} className="mt-6 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mx-auto flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> 返回登入</button>
        </form>
      )}

      {teacherAuthMode === 'forgot_answer' && (
        <form onSubmit={handleForgotAnswer} className="flex flex-col">
          <ShieldQuestion className="w-16 h-16 text-indigo-500 mb-4 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">安全驗證</h3>
          <p className="text-sm text-slate-600 text-center font-bold bg-slate-100 p-3 rounded-lg mb-6">{String(fetchedSecQuestion)}</p>
          {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg">{authError}</p>}
          <div className="mb-6">
            <input type="text" value={authSecAnswer} onChange={e => setAuthSecAnswer(e.target.value)} placeholder="請輸入答案" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md transition-colors">驗證答案</button>
          <button type="button" onClick={() => switchAuthMode('login')} className="mt-6 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors mx-auto flex items-center gap-1"><ArrowLeft className="w-4 h-4"/> 返回登入</button>
        </form>
      )}

      {teacherAuthMode === 'forgot_reset' && (
        <form onSubmit={handleForgotReset} className="flex flex-col">
          <Lock className="w-16 h-16 text-emerald-500 mb-4 mx-auto" />
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">重設密碼</h3>
          {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg">{authError}</p>}
          <div className="space-y-4 mb-6">
            <input type="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="輸入新密碼" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
            <input type="password" value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)} placeholder="再次輸入新密碼" className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 transition-colors" required />
          </div>
          <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-lg shadow-md transition-colors">完成重設</button>
        </form>
      )}

      {/* 驗證碼輸入 Modal (內部疊加) */}
      {showVerifyModal && teacherAuthMode === 'register' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in rounded-3xl">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl w-full flex flex-col items-center">
            <Mail className="w-12 h-12 text-indigo-500 mb-3" />
            <h3 className="text-xl font-bold text-slate-800 mb-2 text-center">請輸入驗證碼</h3>
            <p className="text-xs text-slate-500 text-center mb-6 px-2">驗證碼已發送至您的信箱，請於 {Math.floor(verifyCountdown / 60)}:{String(verifyCountdown % 60).padStart(2, '0')} 內輸入以完成註冊。</p>
            
            <input type="text" value={inputVerifyCode} onChange={e => { setInputVerifyCode(e.target.value); setAuthError(''); }} placeholder="請輸入 6 位數" className="w-full text-center text-2xl tracking-[0.5em] px-4 py-3 rounded-xl bg-slate-50 border-2 border-slate-300 focus:border-indigo-500 outline-none mb-4" maxLength={6} />
            
            {authError && <p className="text-rose-500 text-sm mb-4 font-bold text-center bg-rose-50 py-2 rounded-lg w-full">{authError}</p>}
            
            <button onClick={handleConfirmVerification} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors mb-3">確認並創建帳號</button>
            <button onClick={handleResendCode} disabled={verifyCountdown > 0} className="w-full bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold py-3 rounded-xl transition-colors">
              {verifyCountdown > 0 ? `重新寄送 (${Math.floor(verifyCountdown / 60)}:${String(verifyCountdown % 60).padStart(2, '0')})` : '重新寄送一次'}
            </button>
            <button onClick={() => setShowVerifyModal(false)} className="mt-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">取消註冊</button>
          </div>
        </div>
      )}
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <p>正在連線至雲端系統...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative overflow-hidden">
      <style>{`
        @keyframes custom-shake {
          0%, 100% { transform: translateX(0) scale(1.1); }
          15%, 45%, 75% { transform: translateX(-8px) scale(1.15) rotate(-3deg); }
          30%, 60%, 90% { transform: translateX(8px) scale(1.15) rotate(3deg); }
        }
        .animate-shake { animation: custom-shake 0.6s cubic-bezier(.36,.07,.19,.97) both; }
        
        @keyframes tug-struggle {
          0%   { left: 50%; }
          15%  { left: 47%; }
          30%  { left: 53%; }
          50%  { left: 46%; }
          70%  { left: 54%; }
          85%  { left: 48%; }
          100% { left: 50%; }
        }
        .animate-tug-struggle { animation: tug-struggle 4s ease-in-out both; }
        .tug-slide-slow { transition: width 2s ease-out, left 3s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      {/* 頂部切換列 */}
      <div className="bg-white border-b border-slate-200 p-4 flex justify-between items-center shadow-sm z-50 relative shrink-0">
        <button 
          onClick={() => isTeacherAuthed ? setViewMode('projector') : setViewMode('lobby')}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none group cursor-pointer"
          title="返回首頁/大螢幕投影"
        >
          <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <h1 className="text-xl font-bold tracking-tight">LiveFeedback <span className="hidden sm:inline">即時雲端互動</span></h1>
        </button>
        {isTeacherAuthed && viewMode !== 'mobile' && (
          <div className="flex items-center gap-3">
             <span className="text-sm font-bold text-slate-500 hidden md:inline">教室: {activeTeacherId}</span>
             <button onClick={handleTeacherLogout} className="text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-rose-200">
               <LogOut className="w-3 h-3"/><span className="hidden sm:inline">登出系統</span>
             </button>
          </div>
        )}
      </div>

      {/* 信件 Toast 通知 (置頂懸浮) */}
      {simulatedEmailToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-sm bg-white p-4 rounded-2xl shadow-2xl border-l-8 border-indigo-500 animate-in slide-in-from-top-10 fade-in flex items-start gap-3">
          <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Mail className="w-5 h-5"/></div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-800 text-sm mb-1">系統發信通知</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{simulatedEmailToast}</p>
          </div>
          <button onClick={() => setSimulatedEmailToast('')} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
        </div>
      )}

      {/* 主內容區 */}
      <div className="flex-1 overflow-hidden relative">
        
        {/* ==================== 1. 登入大廳 (Lobby) ==================== */}
        {viewMode === 'lobby' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black p-4 animate-in fade-in duration-500">
             <div className="flex flex-col items-center">
                <h1 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-widest drop-shadow-lg text-center leading-tight">
                  準備好進行互動了嗎？<br/>
                  <span className="text-indigo-400 text-2xl md:text-3xl font-bold">請登入您的專屬教室</span>
                </h1>
                {renderAuthForms()}
             </div>
          </div>
        )}

        {/* ==================== 2. 投影機視角 (大白板) ==================== */}
        {viewMode === 'projector' && isTeacherAuthed && (
          <div className={`absolute inset-0 overflow-hidden flex flex-col animate-in fade-in duration-300 transition-colors ${projectorTheme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className={`absolute top-8 left-8 z-40 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border transition-all ${projectorTheme === 'dark' ? 'bg-white/10 backdrop-blur-md border-white/20 text-white' : 'bg-white/90 backdrop-blur-md border-slate-200 text-slate-800'}`}>
              <div className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></div>
              <span className="text-sm font-medium tracking-wider flex items-center">教室在線人數：<strong className={`text-2xl font-black ml-2 ${projectorTheme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>{Number(onlineCount)}</strong></span>
            </div>

            <div className={`absolute top-12 right-0 z-40 flex items-start transition-transform duration-500 ease-in-out ${showStudentQR ? 'translate-x-0' : 'translate-x-[calc(100%-3rem)]'}`}>
              <button onClick={() => setShowStudentQR(!showStudentQR)} className={`w-12 h-14 backdrop-blur-md rounded-l-xl flex items-center justify-center transition-colors border-y border-l shadow-[[-5px_0_15px_rgba(0,0,0,0.2)]] ${projectorTheme === 'dark' ? 'bg-white/10 text-white border-white/20' : 'bg-white/90 text-slate-700 border-slate-200'}`}><QrCode className="w-6 h-6" /></button>
              <div className={`backdrop-blur-md p-4 rounded-bl-2xl shadow-2xl flex flex-col items-center border-b border-l pb-5 ${projectorTheme === 'dark' ? 'bg-white/10 border-white/20 text-white' : 'bg-white/90 border-slate-200 text-slate-800'}`}>
                {activeStudentUrl ? (
                  <div className={`p-2 rounded-xl shadow-inner cursor-pointer hover:scale-105 transition-transform ${projectorTheme === 'dark' ? 'bg-white' : 'bg-slate-100'}`} onClick={() => setShowEnlargedQR(true)}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(activeStudentUrl)}`} alt="Scan to join" className="w-24 h-24" />
                  </div>
                ) : <div className="w-24 h-24 bg-white rounded-xl flex items-center justify-center text-[10px] p-2">無法生成</div>}
                <span className="text-sm font-bold mt-3 tracking-widest drop-shadow-md">點擊可放大</span>
              </div>
            </div>

            {showEnlargedQR && activeStudentUrl && (
              <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-lg animate-in fade-in" onClick={() => setShowEnlargedQR(false)}>
                <div className="bg-white/90 p-8 md:p-12 rounded-[3rem] shadow-[0_0_100px_rgba(255,255,255,0.2)] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-800 mb-8 tracking-widest">掃描加入【即時雲端互動】</h2>
                  <div className="p-4 rounded-3xl shadow-inner bg-slate-100 border-8 border-slate-200">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(activeStudentUrl)}`} alt="Enlarged QR" className="w-64 h-64 md:w-96 md:h-96" />
                  </div>
                  <button onClick={() => setShowEnlargedQR(false)} className="mt-8 bg-slate-800 hover:bg-slate-900 text-white px-10 py-3 rounded-full font-bold text-lg transition-colors shadow-lg">關閉</button>
                </div>
              </div>
            )}

            {currentActivePollData && (
              <div className={`absolute inset-0 z-30 overflow-y-auto ${projectorTheme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-200/80'} backdrop-blur-sm animate-in zoom-in-95 duration-500`}>
                <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12">
                  <div className="w-full max-w-7xl flex flex-col gap-6 md:gap-8 py-8">
                    
                    <div className="text-center px-4 mb-4">
                      <h1 className={`text-4xl md:text-5xl lg:text-6xl font-black drop-shadow-[0_4px_20px_rgba(0,0,0,0.2)] leading-tight break-words px-4 md:px-12 ${projectorTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {String(currentActivePollData.title || '')}
                      </h1>
                    </div>

                    {currentActivePollData.type === 'poll' && (
                      <React.Fragment>
                        <div className="flex justify-between items-end w-full px-4 md:px-12 gap-6 mb-2">
                          <div className="w-[45%] text-left">
                            <h3 className={`font-bold text-xl md:text-3xl line-clamp-3 break-words leading-snug drop-shadow-sm ${projectorTheme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{String(currentActivePollData.optA || '')}</h3>
                          </div>
                          <div className="w-[45%] text-right">
                            <h3 className={`font-bold text-xl md:text-3xl line-clamp-3 break-words leading-snug drop-shadow-sm ${projectorTheme === 'dark' ? 'text-rose-300' : 'text-rose-700'}`}>{String(currentActivePollData.optB || '')}</h3>
                          </div>
                        </div>

                        <div className={`relative w-full h-28 md:h-36 rounded-full shadow-2xl border-4 overflow-hidden backdrop-blur-md ${projectorTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.1)]'}`}>
                          <div className={`absolute top-0 left-0 h-full w-1/2 border-r-2 border-dashed ${projectorTheme === 'dark' ? 'bg-blue-500/10 border-slate-500' : 'bg-blue-50 border-slate-300'}`}></div>
                          <div className={`absolute top-0 right-0 h-full w-1/2 ${projectorTheme === 'dark' ? 'bg-rose-500/10' : 'bg-rose-50'}`}></div>
                          <div className="absolute top-1/2 left-0 w-full h-5 md:h-6 -translate-y-1/2 bg-[#8B4513] shadow-[0_2px_4px_rgba(0,0,0,0.3)] z-0 border-y border-[#5C2E0B]"></div>
                          
                          <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-center drop-shadow-2xl ${isTugAnimating ? 'animate-tug-struggle' : 'tug-slide-slow'}`} style={{ left: `${Number(ropePosition)}%` }}>
                            <div className="w-6 h-24 md:w-8 md:h-32 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)] border-2 border-red-300 relative">
                              <div className="absolute top-2 -left-1 w-8 md:w-10 h-3 md:h-4 bg-red-800 rounded-full"></div>
                              <div className="absolute bottom-2 -left-1 w-8 md:w-10 h-3 md:h-4 bg-red-800 rounded-full"></div>
                            </div>
                          </div>

                          <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-12 z-10 pointer-events-none">
                            <div className={`flex items-baseline gap-2 transition-opacity duration-500 px-5 py-2.5 rounded-[2rem] shadow-lg border ${showResults ? 'opacity-100' : 'opacity-0'} ${projectorTheme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-white/50 backdrop-blur-sm'}`}>
                              <span className={`text-5xl md:text-7xl font-black drop-shadow-md ${projectorTheme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{showResults ? Number(pollVotes.A) : 0}</span>
                              <span className={`font-bold text-lg md:text-2xl ${projectorTheme === 'dark' ? 'text-blue-200' : 'text-blue-500'}`}>人</span>
                            </div>
                          </div>
                          <div className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 z-10 pointer-events-none">
                            <div className={`flex items-baseline gap-2 transition-opacity duration-500 px-5 py-2.5 rounded-[2rem] shadow-lg border ${showResults ? 'opacity-100' : 'opacity-0'} ${projectorTheme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-white/50 backdrop-blur-sm'}`}>
                              <span className={`font-bold text-lg md:text-2xl ${projectorTheme === 'dark' ? 'text-rose-200' : 'text-rose-500'}`}>人</span>
                              <span className={`text-5xl md:text-7xl font-black drop-shadow-md ${projectorTheme === 'dark' ? 'text-rose-400' : 'text-rose-600'}`}>{showResults ? Number(pollVotes.B) : 0}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center px-4 w-full min-h-[6rem] relative mt-2">
                          {!showResults && (
                             <div className={`h-full flex items-center justify-center font-bold animate-pulse tracking-widest text-xl md:text-2xl ${projectorTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                               {isTugAnimating ? '雙方角力中...' : '兵馬集結中，等待教官發起拔河...'}
                             </div>
                          )}
                          {showResults && (
                             <div className="flex justify-between w-full h-full animate-in fade-in duration-700 px-4 md:px-8">
                                <div className="flex flex-wrap content-start gap-2 w-[45%]">
                                  {Array.from({ length: Math.min(Number(pollVotes.A), 50) }).map((_, i) => (
                                     <div key={`a-${i}`} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center animate-in fade-in zoom-in slide-in-from-left-4 ${projectorTheme === 'dark' ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'bg-blue-100 border-blue-300 text-blue-600 shadow-sm'}`} style={{ animationDelay: `${i * 50}ms` }}><User className="w-5 h-5" /></div>
                                  ))}
                                  {Number(pollVotes.A) > 50 && <div className={`text-sm md:text-base font-bold flex items-center ml-2 ${projectorTheme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>+{Number(pollVotes.A) - 50}</div>}
                                </div>
                                <div className="flex flex-wrap content-start justify-end gap-2 w-[45%]">
                                  {Array.from({ length: Math.min(Number(pollVotes.B), 50) }).map((_, i) => (
                                     <div key={`b-${i}`} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center animate-in fade-in zoom-in slide-in-from-right-4 ${projectorTheme === 'dark' ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_10px_rgba(225,29,72,0.3)]' : 'bg-rose-100 border-rose-300 text-rose-600 shadow-sm'}`} style={{ animationDelay: `${i * 50}ms` }}><User className="w-5 h-5" /></div>
                                  ))}
                                  {Number(pollVotes.B) > 50 && <div className={`text-sm md:text-base font-bold flex items-center mr-2 ${projectorTheme === 'dark' ? 'text-rose-300' : 'text-rose-600'}`}>+{Number(pollVotes.B) - 50}</div>}
                                </div>
                             </div>
                          )}
                        </div>
                      </React.Fragment>
                    )}

                    {(currentActivePollData.type === 'vote' || currentActivePollData.type === 'quiz') && (
                      <div className="w-full max-w-5xl mx-auto flex flex-col gap-4 md:gap-6 px-2 md:px-8 mt-2">
                        <div className="flex flex-col gap-5 md:gap-6">
                          {Array.isArray(currentActivePollData.options) ? currentActivePollData.options.map((opt, i) => {
                             const count = showResults ? Number(pollVotes.counts[i.toString()] || 0) : 0;
                             const percentage = pollVotes.total === 0 ? 0 : (count / pollVotes.total) * 100;
                             const displayPercent = showResults ? percentage : 0;

                             return (
                               <div key={i} className="flex flex-col gap-2">
                                 <div className="flex justify-between items-end px-2">
                                    <span className={`text-lg md:text-2xl font-bold break-words pr-4 leading-snug ${projectorTheme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{String(opt)}</span>
                                    <span className={`shrink-0 text-2xl md:text-4xl font-black transition-opacity duration-1000 ${showResults ? 'opacity-100' : 'opacity-0'} ${projectorTheme === 'dark' ? (currentActivePollData.type === 'quiz' ? 'text-emerald-400' : 'text-purple-400') : (currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-purple-600')}`}>{count} <span className="text-lg md:text-xl">票</span></span>
                                 </div>
                                 <div className={`w-full h-6 md:h-10 rounded-full overflow-hidden border-2 ${projectorTheme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}>
                                    <div
                                      className={`h-full flex items-center justify-end px-4 tug-slide-slow ${currentActivePollData.type === 'quiz' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}
                                      style={{ width: `${Number(displayPercent)}%` }}
                                    >
                                       {displayPercent >= 5 && <span className="text-white font-bold text-xs md:text-sm drop-shadow-md animate-in fade-in duration-1000 delay-700">{Number(displayPercent).toFixed(1)}%</span>}
                                    </div>
                                 </div>
                               </div>
                             );
                          }) : null}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}

            {(!activePollId || !currentActivePollData) && (
              <div className="flex-1 flex flex-col w-full h-full p-4 pt-10 pb-12 relative">
                <div className="flex-1 flex flex-wrap justify-center content-end gap-x-6 gap-y-3 md:gap-x-10 md:gap-y-4 overflow-hidden pb-4 px-4 md:px-12">
                  {topHalfMessages.map(msg => <MessageNode key={msg.id} msg={msg} colorClass={getColorClass(msg.likes, projectorTheme)} fontSize={getFontSize(msg.likes)} theme={projectorTheme} />)}
                </div>
                {Boolean(currentTopic) && (
                  <div className="shrink-0 flex justify-center z-30 animate-in zoom-in duration-500 py-3 pointer-events-none max-h-[30vh]">
                    <div className={`backdrop-blur-3xl px-8 py-4 md:px-14 md:py-8 rounded-[2rem] border-[3px] max-w-[90%] md:max-w-[80%] flex items-center justify-center pointer-events-auto transition-all ${projectorTheme === 'dark' ? 'bg-slate-900/90 border-indigo-500/80 shadow-[0_0_80px_rgba(99,102,241,0.6)]' : 'bg-white/90 border-indigo-300 shadow-[0_20px_60px_rgba(99,102,241,0.15)]'}`}>
                      <h1 className={`font-black leading-[1.3] line-clamp-2 text-center break-words drop-shadow-2xl ${projectorTheme === 'dark' ? 'text-white' : 'text-slate-800'}`} style={{ fontSize: 'clamp(1.8rem, 4vw, 4rem)' }}>
                        {String(currentTopic)}
                      </h1>
                    </div>
                  </div>
                )}
                <div className="flex-1 flex flex-wrap justify-center content-start gap-x-6 gap-y-3 md:gap-x-10 md:gap-y-4 overflow-hidden pt-4 px-4 md:px-12">
                  {bottomHalfMessages.map(msg => <MessageNode key={msg.id} msg={msg} colorClass={getColorClass(msg.likes, projectorTheme)} fontSize={getFontSize(msg.likes)} theme={projectorTheme} />)}
                </div>
                {messages.length === 0 && !currentTopic && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`text-4xl md:text-6xl font-black animate-pulse tracking-widest drop-shadow-lg ${projectorTheme === 'dark' ? 'text-slate-500 opacity-40' : 'text-slate-400 opacity-60'}`}>
                      國軍中部地區人才招募中心
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="absolute bottom-6 left-6 z-40 flex items-center gap-4">
              <button onClick={() => setShowTeacherQR(true)} className={`p-4 rounded-full transition-all group ${projectorTheme === 'dark' ? 'text-slate-700 hover:text-indigo-400 hover:bg-slate-800/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-white shadow-sm'}`} title="呼叫教官遙控器">
                <Key className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
              </button>
              <button onClick={() => setProjectorTheme(t => t === 'dark' ? 'light' : 'dark')} className={`p-4 rounded-full transition-all group ${projectorTheme === 'dark' ? 'text-slate-700 hover:text-amber-400 hover:bg-slate-800/50' : 'text-slate-400 hover:text-indigo-600 hover:bg-white shadow-sm'}`} title="切換深淺色模式">
                {projectorTheme === 'dark' ? <Sun className="w-8 h-8 opacity-20 group-hover:opacity-100" /> : <Moon className="w-8 h-8 opacity-40 group-hover:opacity-100" />}
              </button>
            </div>

            {showTeacherQR && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
                <div className="bg-slate-800 p-8 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center relative border border-slate-700 max-w-sm mx-4">
                  <button onClick={() => setShowTeacherQR(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors bg-slate-700 hover:bg-slate-600 p-2 rounded-full"><X className="w-5 h-5" /></button>
                  <ShieldCheck className="w-16 h-16 text-indigo-400 mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-3">教官遙控器</h3>
                  <div className="bg-white p-4 rounded-2xl shadow-inner border-4 border-slate-600 mb-6">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeTeacherUrl)}`} alt="Teacher Login" className="w-48 h-48" />
                  </div>
                  <button 
                    onClick={() => {
                      setShowTeacherQR(false);
                      setTeacherLayout('desktop'); 
                      setViewMode('teacher');
                    }} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <MonitorPlay className="w-5 h-5" /> 在本機直接開啟 (電腦版)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== 3. 手機端視角 (學生互動) ==================== */}
        {viewMode === 'mobile' && (
          <div className="absolute inset-0 bg-slate-200 flex justify-center items-center p-4 sm:p-8 animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-slate-50 h-full max-h-[850px] shadow-2xl rounded-[2.5rem] border-8 border-slate-800 overflow-hidden flex flex-col relative">
              <div className="bg-indigo-600 text-white p-4 pt-8 text-center shadow-md z-20 relative shrink-0">
                <h2 className="font-bold text-lg">
                  {currentActivePollData?.type === 'poll' ? '⚔️ 陣營對決中' : 
                   currentActivePollData?.type === 'vote' ? '📊 投票進行中' : 
                   currentActivePollData?.type === 'quiz' ? '📝 選擇題進行中' : '💬 參與討論'}
                </h2>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-3xl"></div>
              </div>

              {!isSessionValid && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in bg-slate-100/50">
                  <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-white"><AlertTriangle className="w-10 h-10" /></div>
                  <h2 className="text-2xl font-black text-slate-800 mb-3">課堂已更換或無效</h2>
                  <p className="text-slate-600 font-medium mb-8">教官已開啟新的課堂討論。<br/>請重新掃描大螢幕最新的 QR Code 加入！</p>
                </div>
              )}

              {isSessionValid && currentActivePollData && (
                <div className="absolute inset-0 top-[72px] bg-slate-900 z-30 flex flex-col p-6 animate-in slide-in-from-bottom-full duration-500 overflow-y-auto">
                  <div className="flex-1 flex flex-col justify-center gap-6 py-10">
                    <div className="text-center mb-4">
                      {currentActivePollData.type === 'poll' ? <CircleDashed className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-[spin_4s_linear_infinite]" /> : 
                       currentActivePollData.type === 'quiz' ? <CheckSquare className="w-12 h-12 text-emerald-400 mx-auto mb-4" /> : <BarChart3 className="w-12 h-12 text-purple-400 mx-auto mb-4" />}
                      <h2 className="text-2xl font-black text-white leading-snug drop-shadow-md break-words">{String(currentActivePollData.title || '')}</h2>
                      <p className="text-slate-400 mt-2 text-sm font-medium">
                        {currentActivePollData.type === 'quiz' && currentActivePollData.isMultiple 
                          ? '請選擇一個或多個選項，這將影響大局。' 
                          : '請選擇你的選項，這將影響大局。'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4">
                      {currentActivePollData.type === 'poll' ? (
                        <React.Fragment>
                          <button 
                            onClick={() => handleCastVote('A')} 
                            disabled={pollState !== 'voting'}
                            className={`relative overflow-hidden w-full p-6 rounded-2xl border-2 transition-all duration-300 ${myVote === 'A' ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.6)] scale-105' : 'bg-slate-800 border-slate-700'} ${pollState !== 'voting' ? 'cursor-default opacity-90' : 'hover:bg-slate-700'}`}
                          >
                            <div className="flex items-center justify-between z-10 relative">
                              <span className={`text-xl font-bold ${myVote === 'A' ? 'text-white' : 'text-blue-300'}`}>{String(currentActivePollData.optA || '')}</span>
                              {myVote === 'A' && <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><User className="w-4 h-4 text-blue-600" /></div>}
                            </div>
                            {myVote === 'A' && pollState === 'voting' && <div className="absolute inset-0 bg-blue-500 opacity-20 animate-pulse"></div>}
                          </button>
                          <button 
                            onClick={() => handleCastVote('B')} 
                            disabled={pollState !== 'voting'}
                            className={`relative overflow-hidden w-full p-6 rounded-2xl border-2 transition-all duration-300 ${myVote === 'B' ? 'bg-rose-600 border-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.6)] scale-105' : 'bg-slate-800 border-slate-700'} ${pollState !== 'voting' ? 'cursor-default opacity-90' : 'hover:bg-slate-700'}`}
                          >
                            <div className="flex items-center justify-between z-10 relative">
                              <span className={`text-xl font-bold ${myVote === 'B' ? 'text-white' : 'text-rose-300'}`}>{String(currentActivePollData.optB || '')}</span>
                              {myVote === 'B' && <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center"><User className="w-4 h-4 text-rose-600" /></div>}
                            </div>
                            {myVote === 'B' && pollState === 'voting' && <div className="absolute inset-0 bg-rose-500 opacity-20 animate-pulse"></div>}
                          </button>
                        </React.Fragment>
                      ) : (
                        Array.isArray(currentActivePollData.options) && currentActivePollData.options.map((opt, i) => {
                          const isQuizMulti = currentActivePollData.type === 'quiz' && currentActivePollData.isMultiple;
                          const isSelected = isQuizMulti 
                            ? (Array.isArray(myVote) && myVote.includes(i.toString()))
                            : (myVote === i.toString());

                          return (
                            <button 
                              key={i}
                              onClick={() => {
                                if (pollState !== 'voting') return;
                                if (isQuizMulti) {
                                  let current = Array.isArray(myVote) ? [...myVote] : [];
                                  if (current.includes(i.toString())) {
                                    current = current.filter(v => v !== i.toString());
                                  } else {
                                    current.push(i.toString());
                                  }
                                  handleCastVote(current);
                                } else {
                                  handleCastVote(i.toString());
                                }
                              }}
                              disabled={pollState !== 'voting'}
                              className={`relative overflow-hidden w-full p-5 rounded-2xl border-2 transition-all duration-300 ${isSelected ? (currentActivePollData.type === 'quiz' ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_20px_rgba(5,150,105,0.6)] scale-105' : 'bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.6)] scale-105') : 'bg-slate-800 border-slate-700'} ${pollState !== 'voting' ? 'cursor-default opacity-90' : 'hover:bg-slate-700'}`}
                            >
                              <div className="flex items-center justify-between z-10 relative">
                                <span className={`text-lg font-bold text-left ${isSelected ? 'text-white' : (currentActivePollData.type === 'quiz' ? 'text-emerald-300' : 'text-purple-300')}`}>{String(opt)}</span>
                                {isSelected && <div className="w-6 h-6 shrink-0 rounded-full bg-white flex items-center justify-center"><User className={`w-4 h-4 ${currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-purple-600'}`} /></div>}
                              </div>
                              {isSelected && pollState === 'voting' && <div className={`absolute inset-0 opacity-20 animate-pulse ${currentActivePollData.type === 'quiz' ? 'bg-emerald-500' : 'bg-purple-500'}`}></div>}
                            </button>
                          );
                        })
                      )}
                    </div>
                    
                    {/* 已投票確認提示 */}
                    {(() => {
                      const hasVoted = (currentActivePollData.type === 'quiz' && currentActivePollData.isMultiple)
                        ? (Array.isArray(myVote) && myVote.length > 0)
                        : !!myVote;

                      return hasVoted && (
                        <div className="text-center mt-6 animate-in fade-in zoom-in">
                          {pollState === 'voting' ? (
                            <div className="inline-flex flex-col items-center">
                              <Loader2 className={`w-6 h-6 animate-spin mb-2 ${currentActivePollData.type === 'vote' ? 'text-purple-400' : 'text-emerald-400'}`} />
                              <p className={`font-bold mt-2 ${currentActivePollData.type === 'vote' ? 'text-purple-400' : 'text-emerald-400'}`}>已記錄選擇，等待教官揭曉...</p>
                            </div>
                          ) : (
                            <p className={`font-bold text-lg ${currentActivePollData.type === 'vote' ? 'text-purple-400' : 'text-emerald-400'}`}>大局已定，請看大螢幕結果！</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 正常留言牆介面 */}
              {isSessionValid && !currentActivePollData && (
                <>
                  {currentTopic && (
                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex flex-col shrink-0 animate-in slide-in-from-top-2 shadow-sm z-10">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">正在討論的主題</span>
                      <p className="text-indigo-900 font-bold text-sm leading-snug break-words">{String(currentTopic)}</p>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-100 pb-32">
                    {messages.length === 0 ? (
                      <div className="text-center text-slate-400 mt-10 text-sm">尚無留言，發表你的看法吧！</div>
                    ) : (
                      messages.map((msg) => {
                        const isLiked = msg.likedBy && msg.likedBy.includes(user?.uid);
                        return (
                          <div key={msg.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3 animate-in slide-in-from-bottom-2">
                            <div className="bg-slate-100 p-2 rounded-full h-fit shrink-0">
                              {msg.author === '匿名' ? <Ghost className="w-5 h-5 text-slate-500" /> : <User className="w-5 h-5 text-indigo-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-500 font-medium mb-1 truncate">{String(msg.author)}</div>
                              <p className="text-slate-800 leading-relaxed text-sm break-words">{String(msg.text)}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center gap-2 min-w-[3.5rem] shrink-0 border-l border-slate-100 pl-2">
                              <button onClick={() => handleLike(msg.id)} className={`p-1.5 rounded-full group flex flex-col items-center cursor-pointer transition-colors ${isLiked ? 'hover:bg-rose-50 text-indigo-600 hover:text-rose-500' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}>
                                <ThumbsUp className={`w-5 h-5 transition-all ${isLiked ? 'fill-indigo-600 text-indigo-600 scale-110 group-hover:fill-rose-500 group-hover:text-rose-500' : (msg.likes > 0 ? 'fill-indigo-100 text-indigo-500' : 'group-hover:fill-indigo-200 active:scale-75')}`} />
                                <span className={`text-[10px] font-bold mt-1 ${isLiked ? 'text-indigo-600 group-hover:text-rose-500' : (msg.likes > 0 ? 'text-indigo-600' : 'text-slate-500')}`}>{Number(msg.likes)}</span>
                              </button>
                              <button onClick={() => handleShake(msg.id)} className="p-1.5 rounded-full hover:bg-amber-50 text-slate-300 hover:text-amber-500 group flex flex-col items-center">
                                <Bell className="w-5 h-5 transition-all group-hover:fill-amber-200 active:scale-75 active:text-amber-600" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="absolute bottom-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                      <div className="flex items-center justify-between px-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <div className="relative">
                            <input type="checkbox" className="sr-only" checked={isAnonymous} onChange={() => setIsAnonymous(!isAnonymous)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${isAnonymous ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isAnonymous ? 'transform translate-x-4' : ''}`}></div>
                          </div>
                          <span className="text-sm font-medium text-slate-600">匿名發布</span>
                        </label>
                        {!isAnonymous && <input type="text" placeholder="暱稱..." value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="text-sm border-b border-slate-300 px-2 py-1 w-24 focus:outline-none focus:border-indigo-500 bg-transparent" maxLength={10} />}
                      </div>
                      <div className="flex gap-2 relative">
                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="寫下你的想法..." className="flex-1 bg-slate-100 border border-transparent focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl px-4 py-3 text-sm outline-none pr-12" maxLength={100} />
                        <button type="submit" disabled={!inputText.trim()} className="absolute right-1 top-1 bottom-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white aspect-square rounded-lg flex items-center justify-center"><Send className="w-4 h-4 ml-1" /></button>
                      </div>
                    </form>
                  </div>
                </>
              )}

              {showInviteModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-500 bg-white/40 backdrop-blur-md">
                  <div className="bg-white/90 p-8 rounded-3xl shadow-2xl border border-white w-full text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-5"><Users className="w-8 h-8" /></div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">今日互動已結束</h2>
                    <p className="text-slate-600 font-medium mb-8 text-sm">感謝參與！歡迎加入專屬群組。</p>
                    {inviteLink ? (
                      <a href={inviteLink} target="_blank" rel="noopener noreferrer" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"><Link className="w-5 h-5" /> 加入群組</a>
                    ) : <button disabled className="w-full bg-slate-300 text-slate-500 font-bold py-4 rounded-xl">未設定連結</button>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== 手機端視角 (教官遙控器) ==================== */}
        {viewMode === 'teacher' && isTeacherAuthed && (
          <div className="absolute inset-0 bg-slate-200 flex justify-center items-center p-4 sm:p-8 animate-in fade-in duration-300">
            {/* 教官端模擬信件通知 Toast */}
            {simulatedEmailToast && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-sm bg-white p-4 rounded-2xl shadow-2xl border-l-8 border-indigo-500 animate-in slide-in-from-top-10 fade-in flex items-start gap-3">
                <div className="bg-indigo-100 p-2 rounded-full text-indigo-600"><Mail className="w-5 h-5"/></div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm mb-1">系統發信通知</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{simulatedEmailToast}</p>
                </div>
                <button onClick={() => setSimulatedEmailToast('')} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4"/></button>
              </div>
            )}

            <div className={`w-full ${teacherLayout === 'desktop' ? 'max-w-7xl h-[95vh] rounded-[2rem] border-2 border-slate-300' : 'max-w-md h-full max-h-[850px] rounded-[2.5rem] border-8 border-slate-800'} bg-slate-50 shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300`}>
              
              <div className="bg-slate-800 text-white p-3 md:p-4 min-h-[4rem] flex items-center justify-between shadow-md z-10 relative shrink-0">
                <div className="flex-1 flex justify-start">
                  <button onClick={() => setTeacherLayout(l => l === 'mobile' ? 'desktop' : 'mobile')} className="text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-sm bg-slate-700/50 hover:bg-slate-600 px-3 py-1.5 rounded-lg border border-slate-600">
                    {teacherLayout === 'mobile' ? <MonitorPlay className="w-4 h-4"/> : <Smartphone className="w-4 h-4"/>}
                    <span className="hidden sm:inline font-bold">{teacherLayout === 'mobile' ? '切換電腦版' : '切換手機版'}</span>
                  </button>
                </div>

                <div className="flex-1 flex justify-center">
                  <h2 className="font-bold text-base md:text-lg flex items-center gap-2 whitespace-nowrap">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" /> 
                    <span className="hidden sm:inline">教官控制台</span>
                  </h2>
                </div>

                <div className="flex-1 flex justify-end">
                  {isTeacherAuthed && (
                    <button onClick={handleTeacherLogout} className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                      <LogOut className="w-3 h-3"/><span className="hidden sm:inline">登出</span>
                    </button>
                  )}
                </div>
                
                {teacherLayout === 'mobile' && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 md:w-32 h-5 bg-slate-900 rounded-b-3xl"></div>}
              </div>

              <div className={`flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100 ${teacherLayout === 'desktop' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'flex flex-col space-y-4'}`}>
                
                {teacherLayout === 'desktop' ? (
                  <React.Fragment>
                    {/* 電腦版：左側狀態與系統管理區塊 */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                      <div className={`shrink-0 p-5 rounded-2xl shadow-sm border-2 relative overflow-hidden transition-colors ${(activePollId && currentActivePollData) ? (currentActivePollData.type === 'vote' ? 'bg-white border-purple-100' : currentActivePollData.type === 'quiz' ? 'bg-white border-emerald-100' : 'bg-white border-rose-100') : (currentTopic ? 'bg-white border-indigo-100' : 'bg-slate-50 border-slate-200')}`}>
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${(activePollId && currentActivePollData) ? (currentActivePollData.type === 'vote' ? 'bg-purple-500' : currentActivePollData.type === 'quiz' ? 'bg-emerald-500' : 'bg-rose-500') : (currentTopic ? 'bg-indigo-500' : 'bg-slate-300')}`}></div>
                        <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                          <MonitorPlay className="w-4 h-4" /> 大螢幕當前狀態
                        </h3>
                        
                        {activePollId && currentActivePollData ? (
                          <div className="animate-in fade-in flex flex-col h-full">
                            <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded mb-2 tracking-widest w-fit ${currentActivePollData.type === 'vote' ? 'bg-purple-100 text-purple-700' : currentActivePollData.type === 'quiz' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {currentActivePollData.type === 'vote' ? '📊 投票模式' : currentActivePollData.type === 'quiz' ? (currentActivePollData.isMultiple ? '📝 選擇模式 (複選)' : '📝 選擇模式 (單選)') : '⚔️ 拔河模式'}
                            </span>
                            <div className={`text-lg font-black mb-2 leading-snug break-words ${currentActivePollData.type === 'vote' ? 'text-purple-900' : currentActivePollData.type === 'quiz' ? 'text-emerald-900' : 'text-rose-900'}`}>{String(currentActivePollData.title)}</div>
                            
                            {currentActivePollData.type === 'poll' ? (
                              <div className="flex justify-between text-xs font-bold bg-slate-50 p-2 rounded-lg mb-4 border border-slate-100">
                                <span className="text-blue-600 truncate mr-2">{String(currentActivePollData.optA || '')}</span>
                                <span className="text-rose-600 truncate">{String(currentActivePollData.optB || '')}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1 text-xs font-bold bg-slate-50 p-2 rounded-lg mb-4 border border-slate-100">
                                 {Array.isArray(currentActivePollData.options) ? currentActivePollData.options.map((opt, i) => (
                                    <div key={i} className="flex justify-between">
                                      <span className="text-slate-600 truncate pr-2">{String(opt)}</span>
                                      <span className={`${currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-purple-600'} shrink-0`}>{pollVotes.counts[i.toString()] || 0} 票</span>
                                    </div>
                                 )) : <span className="text-slate-400 p-1">選項載入中...</span>}
                              </div>
                            )}

                            <div className={`border rounded-xl p-3 mb-4 text-center shadow-inner flex flex-col items-center justify-center ${currentActivePollData.type === 'vote' ? 'bg-purple-50 border-purple-100' : currentActivePollData.type === 'quiz' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                              <span className={`text-xs font-bold block mb-1 ${currentActivePollData.type === 'vote' ? 'text-purple-400' : currentActivePollData.type === 'quiz' ? 'text-emerald-400' : 'text-rose-400'}`}>目前已收集 / 在線總人數</span>
                              <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${currentActivePollData.type === 'vote' ? 'text-purple-600' : currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-rose-600'}`}>{pollVotes.total} <span className="text-sm">人參與</span></span>
                                <span className="text-slate-400 font-bold text-lg">/ {onlineCount} 人</span>
                              </div>
                            </div>
                            
                            {pollState === 'voting' ? (
                              <button onClick={handleRevealPoll} className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md">
                                <Play className="w-4 h-4 fill-current"/> {currentActivePollData.type === 'poll' ? '開始拔河 (觸發動畫並揭曉)' : '開始結算 (觸發動畫並揭曉)'}
                              </button>
                            ) : (
                              <button onClick={handleStopPoll} className={`w-full mt-auto font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${currentActivePollData.type === 'vote' ? 'bg-purple-100 hover:bg-purple-200 text-purple-700' : currentActivePollData.type === 'quiz' ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'bg-rose-100 hover:bg-rose-200 text-rose-700'}`}>
                                <Square className="w-4 h-4 fill-current"/> 關閉結果與模式
                              </button>
                            )}
                          </div>
                        ) : currentTopic ? (
                          <div className="animate-in fade-in">
                            <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded mb-2 tracking-widest w-fit">💬 留言模式</span>
                            <div className="text-lg font-black text-indigo-900 mb-4 leading-tight min-h-[3rem] break-words">{String(currentTopic)}</div>
                            <button onClick={() => handleSetTopic('')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors">
                              撤下話題
                            </button>
                          </div>
                        ) : (
                          <div className="text-slate-400 font-bold min-h-[3rem] flex items-center justify-center bg-slate-50/50 rounded-lg">
                            （目前無指定主題，學生自由留言）
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700">
                        <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> 系統與課堂管理</h3>
                        <button onClick={() => setShowClearModal(true)} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-3 transition-colors border border-rose-700 shadow-sm"><Trash2 className="w-4 h-4" /> 清空所有學生留言</button>
                        <button onClick={() => setShowNewClassModal(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4 transition-colors border border-amber-600 shadow-sm"><MonitorPlay className="w-4 h-4" /> 開啟新課堂 (重置 QR Code)</button>
                        
                        <div className="pt-4 border-t border-slate-600 flex flex-col gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-400 flex items-center gap-1"><Link className="w-3 h-3" /> 群組邀請連結設定</label>
                            <input type="text" value={localInviteLink} onChange={(e) => setLocalInviteLink(e.target.value)} placeholder="https://..." className="w-full bg-slate-900 text-slate-300 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors" />
                          </div>
                          <button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { showInviteModal: !showInviteModal, inviteLink: localInviteLink })} className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${showInviteModal ? 'bg-white text-slate-900' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'}`}>
                            {showInviteModal ? <React.Fragment><X className="w-4 h-4" /> 收回邀請視窗</React.Fragment> : <React.Fragment><Users className="w-4 h-4" /> 發送課後群組邀請 (凍結畫面)</React.Fragment>}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 電腦版右欄：題庫腳本與新增 */}
                    <div className="lg:col-span-8 flex flex-col gap-6 h-full">
                      <div className="flex-1 flex flex-col bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <h3 className="shrink-0 text-sm font-bold text-slate-800 mb-4 flex items-center justify-between relative z-10">
                          <span className="flex items-center gap-2">📋 課堂題庫腳本</span>
                          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">共 {Array.isArray(agenda) ? agenda.length : 0} 題</span>
                        </h3>

                        <div className="flex-1 overflow-y-auto space-y-3 mb-1 relative z-10 pr-2">
                          {Array.isArray(agenda) && agenda.length === 0 ? (
                             <p className="text-center text-slate-400 text-sm py-2">題庫空空如也</p>
                          ) : (
                             Array.isArray(agenda) && agenda.map((item, idx) => {
                              if(!item) return null;
                              const isActive = (item.type === 'text' && currentTopic === item.title) || ((item.type === 'poll' || item.type === 'vote' || item.type === 'quiz') && activePollId === item.id);
                              
                              if (editingQuestionId === item.id) {
                                return (
                                  <div key={item.id} className="flex flex-col gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 shadow-sm animate-in zoom-in-95">
                                    <span className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><Edit className="w-3 h-3"/> 編輯題目 ({item.type === 'text' ? '文字' : item.type === 'poll' ? '拔河' : item.type === 'vote' ? '投票' : '選擇'})</span>
                                    
                                    <input type="text" value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" placeholder="題目名稱" />
                                    
                                    {editFormData.type === 'poll' && (
                                      <div className="flex gap-2">
                                        <input type="text" value={editFormData.optA || ''} onChange={e => setEditFormData({...editFormData, optA: e.target.value})} className="flex-1 w-0 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" placeholder="選項 A" />
                                        <input type="text" value={editFormData.optB || ''} onChange={e => setEditFormData({...editFormData, optB: e.target.value})} className="flex-1 w-0 bg-white border border-rose-200 rounded-lg px-3 py-2 text-sm" placeholder="選項 B" />
                                      </div>
                                    )}
                                    
                                    {(editFormData.type === 'vote' || editFormData.type === 'quiz') && (
                                      <div className="flex flex-col gap-2">
                                         {editFormData.type === 'quiz' && (
                                           <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200 mb-1">
                                             <span className="text-xs font-bold text-slate-600">允許學生複選</span>
                                             <label className="flex items-center cursor-pointer">
                                               <div className="relative">
                                                 <input type="checkbox" className="sr-only" checked={editFormData.isMultiple || false} onChange={() => setEditFormData({...editFormData, isMultiple: !editFormData.isMultiple})} />
                                                 <div className={`block w-10 h-6 rounded-full transition-colors ${editFormData.isMultiple ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                 <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editFormData.isMultiple ? 'transform translate-x-4' : ''}`}></div>
                                               </div>
                                             </label>
                                           </div>
                                         )}
                                         {[0, 1, 2, 3].map(i => (
                                           <input key={i} type="text" value={editFormData.options?.[i] || ''} onChange={e => {
                                               const newOpts = [...(editFormData.options || ['', '', '', ''])];
                                               while(newOpts.length < 4) newOpts.push('');
                                               newOpts[i] = e.target.value;
                                               setEditFormData({...editFormData, options: newOpts});
                                             }}
                                             placeholder={`選項 ${i+1} ${i >= 2 ? '(選填)' : '(必填)'}`}
                                             className={`w-full bg-white border ${editFormData.type === 'quiz' ? 'border-emerald-200' : 'border-purple-200'} rounded-lg px-3 py-2 text-sm`}
                                           />
                                         ))}
                                      </div>
                                    )}

                                    <div className="flex gap-2 mt-1">
                                      <button onClick={cancelEditing} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-300 transition-colors">取消</button>
                                      <button onClick={saveEditing} className="flex-1 bg-amber-500 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-amber-600 shadow-sm transition-colors">儲存變更</button>
                                    </div>
                                  </div>
                                )
                              }

                              return (
                              <div key={item.id || idx} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${isActive ? (item.type === 'poll' ? 'bg-rose-50 border-rose-200 shadow-sm' : (item.type === 'vote' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-indigo-50 border-indigo-200 shadow-sm')) : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm group'}`}>
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-bold text-slate-700 leading-tight break-words flex items-start gap-2">
                                    <span className="shrink-0 text-base">{item.type === 'text' ? '💬' : (item.type === 'poll' ? '⚔️' : '📊')}</span>
                                    <span className="mt-0.5"><span className="text-slate-400 font-black mr-1">{idx + 1}.</span>{String(item.title || '')}</span>
                                  </p>
                                  <div className="flex flex-col gap-1 shrink-0 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleMoveQuestion(idx, -1)} disabled={idx === 0 || isActive} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                                    <button onClick={() => handleMoveQuestion(idx, 1)} disabled={idx === agenda.length - 1 || isActive} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                                  </div>
                                </div>

                                {item.type === 'poll' && (
                                  <div className="flex text-xs font-medium bg-white rounded shadow-sm overflow-hidden border border-slate-100 mt-1">
                                    <div className="flex-1 bg-blue-50 text-blue-700 px-2 py-1.5 truncate border-r border-slate-100">{String(item.optA || '')}</div>
                                    <div className="flex-1 bg-rose-50 text-rose-700 px-2 py-1.5 truncate">{String(item.optB || '')}</div>
                                  </div>
                                )}

                                {(item.type === 'vote' || item.type === 'quiz') && Array.isArray(item.options) && (
                                  <div className="flex flex-col text-xs font-medium bg-white rounded shadow-sm overflow-hidden border border-slate-100 mt-1">
                                    {item.type === 'quiz' && <div className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 border-b border-slate-100">模式: {item.isMultiple ? '複選' : '單選'}</div>}
                                    {item.options.map((opt, oIdx) => (
                                      <div key={oIdx} className="px-2 py-1 truncate border-b border-slate-100 last:border-b-0 bg-slate-50 text-slate-600">
                                        {oIdx + 1}. {String(opt)}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200/50">
                                  <div className="flex gap-1">
                                    <button onClick={() => startEditing(item)} disabled={isActive} className="text-slate-400 hover:text-amber-500 p-1.5 disabled:opacity-30 transition-colors"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteQuestion(idx)} disabled={isActive} className="text-slate-400 hover:text-rose-500 p-1.5 disabled:opacity-30 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (isActive && (item.type === 'poll' || item.type === 'vote' || item.type === 'quiz')) handleStopPoll();
                                      else if (isActive && item.type === 'text') handleSetTopic('');
                                      else handlePublishQuestion(item);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm ${isActive ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : (item.type === 'poll' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : item.type === 'vote' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : item.type === 'quiz' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')}`}
                                  >
                                    {isActive ? <React.Fragment><Square className="w-3 h-3 fill-current"/> 取消發布</React.Fragment> : <React.Fragment><Play className="w-3 h-3 fill-current"/> {item.type === 'text' ? '發布話題' : '開放集結'}</React.Fragment>}
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner relative z-10">
                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Plus className="w-3 h-3"/> 建立新題目</span>
                        
                        <div className="flex bg-slate-200/50 p-1 rounded-lg">
                          <button type="button" onClick={() => setNewQuestionType('text')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>💬 文字</button>
                          <button type="button" onClick={() => setNewQuestionType('poll')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'poll' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>⚔️ 拔河</button>
                          <button type="button" onClick={() => setNewQuestionType('vote')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'vote' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 投票</button>
                          <button type="button" onClick={() => setNewQuestionType('quiz')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'quiz' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📝 選擇</button>
                        </div>

                        <input type="text" value={newQuestionTitle} onChange={e => setNewQuestionTitle(e.target.value)} placeholder="輸入問題或主題..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors" required />
                        
                        {newQuestionType === 'poll' && (
                          <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                            <input type="text" value={newQuestionOptA} onChange={e => setNewQuestionOptA(e.target.value)} placeholder="選項A (藍方)" className="flex-1 w-0 bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" required />
                            <input type="text" value={newQuestionOptB} onChange={e => setNewQuestionOptB(e.target.value)} placeholder="選項B (紅方)" className="flex-1 w-0 bg-slate-50 border border-rose-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500 transition-colors" required />
                          </div>
                        )}

                        {(newQuestionType === 'vote' || newQuestionType === 'quiz') && (
                          <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                             {newQuestionType === 'quiz' && (
                               <div className="flex items-center justify-between bg-slate-100/50 p-2 rounded-lg border border-slate-200">
                                 <span className="text-xs font-bold text-slate-600">允許學生複選</span>
                                 <label className="flex items-center cursor-pointer">
                                   <div className="relative">
                                     <input type="checkbox" className="sr-only" checked={newIsMultiple} onChange={() => setNewIsMultiple(!newIsMultiple)} />
                                     <div className={`block w-10 h-6 rounded-full transition-colors ${newIsMultiple ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                     <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newIsMultiple ? 'transform translate-x-4' : ''}`}></div>
                                   </div>
                                 </label>
                               </div>
                             )}
                             {newVoteOptions.map((opt, i) => (
                                <input
                                  key={i}
                                  type="text"
                                  value={opt}
                                  onChange={e => {
                                     const newOpts = [...newVoteOptions];
                                     newOpts[i] = e.target.value;
                                     setNewVoteOptions(newOpts);
                                  }}
                                  placeholder={`選項 ${i+1} ${i >= 2 ? '(選填)' : '(必填)'}`}
                                  className={`w-full bg-white border ${newQuestionType === 'quiz' ? 'border-emerald-200 focus:border-emerald-500' : 'border-purple-200 focus:border-purple-500'} rounded-lg px-3 py-2 text-sm outline-none transition-colors`}
                                  required={i < 2}
                                />
                             ))}
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          <button type="button" onClick={handleQuickPublish} disabled={!validateNewQuestion()} className="flex-1 bg-indigo-600 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1"><Play className="w-4 h-4 fill-current"/> 立即發布</button>
                          <button type="button" onClick={handleAddQuestion} disabled={!validateNewQuestion()} className="flex-1 bg-slate-800 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-900 transition-colors shadow-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4"/> 加入腳本</button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    {/* 手機版：原本的垂直排序 */}
                    <div className={`shrink-0 p-5 rounded-2xl shadow-sm border-2 relative overflow-hidden transition-colors ${(activePollId && currentActivePollData) ? (currentActivePollData.type === 'vote' ? 'bg-white border-purple-100' : currentActivePollData.type === 'quiz' ? 'bg-white border-emerald-100' : 'bg-white border-rose-100') : (currentTopic ? 'bg-white border-indigo-100' : 'bg-slate-50 border-slate-200')}`}>
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${(activePollId && currentActivePollData) ? (currentActivePollData.type === 'vote' ? 'bg-purple-500' : currentActivePollData.type === 'quiz' ? 'bg-emerald-500' : 'bg-rose-500') : (currentTopic ? 'bg-indigo-500' : 'bg-slate-300')}`}></div>
                      <h3 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                        <MonitorPlay className="w-4 h-4" /> 大螢幕當前狀態
                      </h3>
                      
                      {activePollId && currentActivePollData ? (
                        <div className="animate-in fade-in flex flex-col gap-4">
                          <span className={`inline-block px-2 py-1 text-[10px] font-bold rounded tracking-widest w-fit ${currentActivePollData.type === 'vote' ? 'bg-purple-100 text-purple-700' : currentActivePollData.type === 'quiz' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {currentActivePollData.type === 'vote' ? '📊 投票模式' : currentActivePollData.type === 'quiz' ? (currentActivePollData.isMultiple ? '📝 選擇模式 (複選)' : '📝 選擇模式 (單選)') : '⚔️ 拔河模式'}
                          </span>
                          <div className={`text-lg font-black leading-snug break-words ${currentActivePollData.type === 'vote' ? 'text-purple-900' : currentActivePollData.type === 'quiz' ? 'text-emerald-900' : 'text-rose-900'}`}>{String(currentActivePollData.title)}</div>
                          
                          {currentActivePollData.type === 'poll' ? (
                            <div className="flex justify-between text-xs font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-blue-600 truncate mr-2">{String(currentActivePollData.optA || '')}</span>
                              <span className="text-rose-600 truncate">{String(currentActivePollData.optB || '')}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 text-xs font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                               {Array.isArray(currentActivePollData.options) ? currentActivePollData.options.map((opt, i) => (
                                  <div key={i} className="flex justify-between">
                                    <span className="text-slate-600 truncate pr-2">{String(opt)}</span>
                                    <span className={`${currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-purple-600'} shrink-0`}>{pollVotes.counts[i.toString()] || 0} 票</span>
                                  </div>
                               )) : <span className="text-slate-400 p-1">選項載入中...</span>}
                            </div>
                          )}

                          <div className={`border rounded-xl p-3 text-center shadow-inner flex flex-col items-center justify-center ${currentActivePollData.type === 'vote' ? 'bg-purple-50 border-purple-100' : currentActivePollData.type === 'quiz' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                            <span className={`text-xs font-bold block mb-1 ${currentActivePollData.type === 'vote' ? 'text-purple-400' : currentActivePollData.type === 'quiz' ? 'text-emerald-400' : 'text-rose-400'}`}>目前已收集 / 在線總人數</span>
                            <div className="flex items-baseline gap-2">
                              <span className={`text-3xl font-black ${currentActivePollData.type === 'vote' ? 'text-purple-600' : currentActivePollData.type === 'quiz' ? 'text-emerald-600' : 'text-rose-600'}`}>{pollVotes.total} <span className="text-sm">人參與</span></span>
                              <span className="text-slate-400 font-bold text-lg">/ {onlineCount} 人</span>
                            </div>
                          </div>
                          
                          {pollState === 'voting' ? (
                            <button onClick={handleRevealPoll} className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-md mt-1">
                              <Play className="w-4 h-4 fill-current"/> {currentActivePollData.type === 'poll' ? '開始拔河 (觸發動畫並揭曉)' : '開始結算 (觸發動畫並揭曉)'}
                            </button>
                          ) : (
                            <button onClick={handleStopPoll} className={`w-full mt-auto font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 mt-1 ${currentActivePollData.type === 'vote' ? 'bg-purple-100 hover:bg-purple-200 text-purple-700' : currentActivePollData.type === 'quiz' ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700' : 'bg-rose-100 hover:bg-rose-200 text-rose-700'}`}>
                              <Square className="w-4 h-4 fill-current"/> 關閉結果與模式
                            </button>
                          )}
                        </div>
                      ) : currentTopic ? (
                        <div className="animate-in fade-in flex flex-col gap-4">
                          <span className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded tracking-widest w-fit">💬 留言模式</span>
                          <div className="text-lg font-black text-indigo-900 leading-tight min-h-[3rem] break-words">{String(currentTopic)}</div>
                          <button onClick={() => handleSetTopic('')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm transition-colors mt-1">
                            撤下話題
                          </button>
                        </div>
                      ) : (
                        <div className="text-slate-400 font-bold min-h-[3rem] flex items-center justify-center bg-slate-50/50 rounded-lg">
                          （目前無指定主題，學生自由留言）
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                      <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center justify-between relative z-10">
                        <span className="flex items-center gap-2">📋 課堂題庫腳本</span>
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">共 {Array.isArray(agenda) ? agenda.length : 0} 題</span>
                      </h3>

                      <div className="space-y-3 mb-4 relative z-10">
                        {Array.isArray(agenda) && agenda.length === 0 ? (
                           <p className="text-center text-slate-400 text-sm py-2">題庫空空如也</p>
                        ) : (
                           Array.isArray(agenda) && agenda.map((item, idx) => {
                            if(!item) return null;
                            const isActive = (item.type === 'text' && currentTopic === item.title) || ((item.type === 'poll' || item.type === 'vote' || item.type === 'quiz') && activePollId === item.id);
                            
                            if (editingQuestionId === item.id) {
                              return (
                                <div key={item.id} className="flex flex-col gap-3 p-4 rounded-xl border bg-amber-50 border-amber-200 shadow-sm animate-in zoom-in-95">
                                  <span className="text-xs font-bold text-amber-600 mb-1 flex items-center gap-1"><Edit className="w-3 h-3"/> 編輯題目 ({item.type === 'text' ? '文字' : item.type === 'poll' ? '拔河' : item.type === 'vote' ? '投票' : '選擇'})</span>
                                  
                                  <input type="text" value={editFormData.title || ''} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" placeholder="題目名稱" />
                                  
                                  {editFormData.type === 'poll' && (
                                    <div className="flex gap-2">
                                      <input type="text" value={editFormData.optA || ''} onChange={e => setEditFormData({...editFormData, optA: e.target.value})} className="flex-1 w-0 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" placeholder="選項 A" />
                                      <input type="text" value={editFormData.optB || ''} onChange={e => setEditFormData({...editFormData, optB: e.target.value})} className="flex-1 w-0 bg-white border border-rose-200 rounded-lg px-3 py-2 text-sm" placeholder="選項 B" />
                                    </div>
                                  )}
                                  
                                  {(editFormData.type === 'vote' || editFormData.type === 'quiz') && (
                                    <div className="flex flex-col gap-2">
                                       {editFormData.type === 'quiz' && (
                                         <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-emerald-200 mb-1">
                                           <span className="text-xs font-bold text-slate-600">允許學生複選</span>
                                           <label className="flex items-center cursor-pointer">
                                             <div className="relative">
                                               <input type="checkbox" className="sr-only" checked={editFormData.isMultiple || false} onChange={() => setEditFormData({...editFormData, isMultiple: !editFormData.isMultiple})} />
                                               <div className={`block w-10 h-6 rounded-full transition-colors ${editFormData.isMultiple ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                               <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editFormData.isMultiple ? 'transform translate-x-4' : ''}`}></div>
                                             </div>
                                           </label>
                                         </div>
                                       )}
                                       {[0, 1, 2, 3].map(i => (
                                         <input key={i} type="text" value={editFormData.options?.[i] || ''} onChange={e => {
                                             const newOpts = [...(editFormData.options || ['', '', '', ''])];
                                             while(newOpts.length < 4) newOpts.push('');
                                             newOpts[i] = e.target.value;
                                             setEditFormData({...editFormData, options: newOpts});
                                           }}
                                           placeholder={`選項 ${i+1} ${i >= 2 ? '(選填)' : '(必填)'}`}
                                           className={`w-full bg-white border ${editFormData.type === 'quiz' ? 'border-emerald-200' : 'border-purple-200'} rounded-lg px-3 py-2 text-sm`}
                                         />
                                       ))}
                                    </div>
                                  )}

                                  <div className="flex gap-2 mt-1">
                                    <button onClick={cancelEditing} className="flex-1 bg-slate-200 text-slate-700 font-bold py-2.5 rounded-lg text-sm hover:bg-slate-300 transition-colors">取消</button>
                                    <button onClick={saveEditing} className="flex-1 bg-amber-50 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-amber-600 shadow-sm transition-colors">儲存變更</button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                            <div key={item.id || idx} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${isActive ? (item.type === 'poll' ? 'bg-rose-50 border-rose-200 shadow-sm' : item.type === 'vote' ? 'bg-purple-50 border-purple-200 shadow-sm' : item.type === 'quiz' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-indigo-50 border-indigo-200 shadow-sm') : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm group'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-slate-700 leading-tight break-words flex items-start gap-2">
                                  <span className="shrink-0 text-base">{item.type === 'text' ? '💬' : item.type === 'poll' ? '⚔️' : item.type === 'vote' ? '📊' : '📝'}</span>
                                  <span className="mt-0.5"><span className="text-slate-400 font-black mr-1">{idx + 1}.</span>{String(item.title || '')}</span>
                                </p>
                                <div className="flex flex-col gap-1 shrink-0 opacity-100 transition-opacity">
                                  <button onClick={() => handleMoveQuestion(idx, -1)} disabled={idx === 0 || isActive} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-4 h-4"/></button>
                                  <button onClick={() => handleMoveQuestion(idx, 1)} disabled={idx === agenda.length - 1 || isActive} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-4 h-4"/></button>
                                </div>
                              </div>

                              {item.type === 'poll' && (
                                <div className="flex text-xs font-medium bg-white rounded shadow-sm overflow-hidden border border-slate-100 mt-1">
                                  <div className="flex-1 bg-blue-50 text-blue-700 px-2 py-1.5 truncate border-r border-slate-100">{String(item.optA || '')}</div>
                                  <div className="flex-1 bg-rose-50 text-rose-700 px-2 py-1.5 truncate">{String(item.optB || '')}</div>
                                </div>
                              )}

                              {(item.type === 'vote' || item.type === 'quiz') && Array.isArray(item.options) && (
                                <div className="flex flex-col text-xs font-medium bg-white rounded shadow-sm overflow-hidden border border-slate-100 mt-1">
                                  {item.type === 'quiz' && <div className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-600 border-b border-slate-100">模式: {item.isMultiple ? '複選' : '單選'}</div>}
                                  {item.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="px-2 py-1 truncate border-b border-slate-100 last:border-b-0 bg-slate-50 text-slate-600">
                                      {oIdx + 1}. {String(opt)}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex justify-between items-center mt-1 pt-2 border-t border-slate-200/50">
                                <div className="flex gap-1">
                                  <button onClick={() => startEditing(item)} disabled={isActive} className="text-slate-400 hover:text-amber-500 p-1.5 disabled:opacity-30 transition-colors"><Edit className="w-4 h-4" /></button>
                                  <button onClick={() => handleDeleteQuestion(idx)} disabled={isActive} className="text-slate-400 hover:text-rose-500 p-1.5 disabled:opacity-30 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <button
                                  onClick={() => {
                                    if (isActive && (item.type === 'poll' || item.type === 'vote' || item.type === 'quiz')) handleStopPoll();
                                    else if (isActive && item.type === 'text') handleSetTopic('');
                                    else handlePublishQuestion(item);
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm ${isActive ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : (item.type === 'poll' ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : item.type === 'vote' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : item.type === 'quiz' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200')}`}
                                >
                                  {isActive ? <React.Fragment><Square className="w-3 h-3 fill-current"/> 取消發布</React.Fragment> : <React.Fragment><Play className="w-3 h-3 fill-current"/> {item.type === 'text' ? '發布話題' : '開放集結'}</React.Fragment>}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner relative z-10">
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mb-1"><Plus className="w-3 h-3"/> 建立新題目</span>
                      
                      <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        <button type="button" onClick={() => setNewQuestionType('text')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>💬 文字</button>
                        <button type="button" onClick={() => setNewQuestionType('poll')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'poll' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>⚔️ 拔河</button>
                        <button type="button" onClick={() => setNewQuestionType('vote')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'vote' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📊 投票</button>
                        <button type="button" onClick={() => setNewQuestionType('quiz')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${newQuestionType === 'quiz' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>📝 選擇</button>
                      </div>

                      <input type="text" value={newQuestionTitle} onChange={e => setNewQuestionTitle(e.target.value)} placeholder="輸入問題或主題..." className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 transition-colors" required />
                      
                      {newQuestionType === 'poll' && (
                        <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <input type="text" value={newQuestionOptA} onChange={e => setNewQuestionOptA(e.target.value)} placeholder="選項A (藍方)" className="flex-1 w-0 bg-slate-50 border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors" required />
                          <input type="text" value={newQuestionOptB} onChange={e => setNewQuestionOptB(e.target.value)} placeholder="選項B (紅方)" className="flex-1 w-0 bg-slate-50 border border-rose-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-rose-500 transition-colors" required />
                        </div>
                      )}

                      {(newQuestionType === 'vote' || newQuestionType === 'quiz') && (
                        <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                           {newQuestionType === 'quiz' && (
                             <div className="flex items-center justify-between bg-slate-100/50 p-2 rounded-lg border border-slate-200">
                               <span className="text-xs font-bold text-slate-600">允許學生複選</span>
                               <label className="flex items-center cursor-pointer">
                                 <div className="relative">
                                   <input type="checkbox" className="sr-only" checked={newIsMultiple} onChange={() => setNewIsMultiple(!newIsMultiple)} />
                                   <div className={`block w-10 h-6 rounded-full transition-colors ${newIsMultiple ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                   <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${newIsMultiple ? 'transform translate-x-4' : ''}`}></div>
                                 </div>
                               </label>
                             </div>
                           )}
                           {newVoteOptions.map((opt, i) => (
                              <input
                                key={i}
                                type="text"
                                value={opt}
                                onChange={e => {
                                   const newOpts = [...newVoteOptions];
                                   newOpts[i] = e.target.value;
                                   setNewVoteOptions(newOpts);
                                }}
                                placeholder={`選項 ${i+1} ${i >= 2 ? '(選填)' : '(必填)'}`}
                                className={`w-full bg-white border ${newQuestionType === 'quiz' ? 'border-emerald-200 focus:border-emerald-500' : 'border-purple-200 focus:border-purple-500'} rounded-lg px-3 py-2 text-sm outline-none transition-colors`}
                                required={i < 2}
                              />
                           ))}
                        </div>
                      )}
                      
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={handleQuickPublish} disabled={!validateNewQuestion()} className="flex-1 bg-indigo-600 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-sm flex items-center justify-center gap-1"><Play className="w-4 h-4 fill-current"/> 立即發布</button>
                        <button type="button" onClick={handleAddQuestion} disabled={!validateNewQuestion()} className="flex-1 bg-slate-800 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-lg text-sm hover:bg-slate-900 transition-colors shadow-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4"/> 加入腳本</button>
                      </div>
                    </div>

                    <div className="shrink-0 bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-700 mt-4">
                      <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> 系統與課堂管理</h3>
                      <button onClick={() => setShowClearModal(true)} className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-3 transition-colors border border-rose-700 shadow-sm"><Trash2 className="w-4 h-4" /> 清空所有學生留言</button>
                      <button onClick={() => setShowNewClassModal(true)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 mb-4 transition-colors border border-amber-600 shadow-sm"><MonitorPlay className="w-4 h-4" /> 開啟新課堂 (重置 QR Code)</button>
                      
                      <div className="pt-4 border-t border-slate-600 flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-slate-400 flex items-center gap-1"><Link className="w-3 h-3" /> 群組邀請連結設定</label>
                          <input type="text" value={localInviteLink} onChange={(e) => setLocalInviteLink(e.target.value)} placeholder="https://..." className="w-full bg-slate-900 text-slate-300 border border-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <button onClick={async () => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), { showInviteModal: !showInviteModal, inviteLink: localInviteLink })} className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${showInviteModal ? 'bg-white text-slate-900' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md'}`}>
                          {showInviteModal ? <React.Fragment><X className="w-4 h-4" /> 收回邀請視窗</React.Fragment> : <React.Fragment><Users className="w-4 h-4" /> 發送課後群組邀請 (凍結畫面)</React.Fragment>}
                        </button>
                      </div>
                    </div>
                  </React.Fragment>
                )}
              </div>
            </div>

            {/* 清空留言確認 Modal (防呆視窗) */}
            {showClearModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mb-4"><Trash2 className="w-8 h-8" /></div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">清空所有留言？</h2>
                  <p className="text-slate-600 font-medium mb-8 text-sm">此操作無法復原，大螢幕上所有的學生留言都會被永久刪除。</p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setShowClearModal(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-colors">取消</button>
                    <button onClick={handleReset} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-rose-700 transition-colors">確定清空</button>
                  </div>
                </div>
              </div>
            )}

            {/* 開啟新課堂確認 Modal (防呆視窗) */}
            {showNewClassModal && (
              <div className="absolute inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4"><MonitorPlay className="w-8 h-8" /></div>
                  <h2 className="text-2xl font-black text-slate-800 mb-2">開啟新課堂？</h2>
                  <p className="text-slate-600 font-medium mb-8 text-sm">這將重置大螢幕 QR Code，並清除先前的所有留言與設定紀錄。</p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setShowNewClassModal(false)} className="flex-1 bg-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-300 transition-colors">取消</button>
                    <button onClick={handleNewClass} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl shadow-md hover:bg-amber-600 transition-colors">確定開啟</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}