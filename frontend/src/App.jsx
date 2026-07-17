import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/base16/dracula.css';
import { motion, AnimatePresence } from "framer-motion";

// استيراد الأيقونات المعتمدة والمصححة بالكامل
import { 
  Send, LogOut, Sparkles, User, Cpu, Copy, Check, MessageSquare, 
  Plus, ShieldCheck, Mail, Info, Facebook, Instagram, 
  PanelRightClose, PanelRightOpen, Code2, Trash2, HelpCircle, PhoneCall,
  Database, Activity, Zap, ShieldAlert, MapPin, Globe, Linkedin, Github
} from "lucide-react";

import './index.css';

const API_URL = "https://flutter-hub-backend.onrender.com/api"; 


// 💻 مكوّن عرض الكود ثيم الماك بوك الفاخر الموحد
const CodeBlock = ({ children, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-wrapper">
      <div className="code-header">
        <span>{language || 'dart'}</span>
        <button onClick={handleCopy} className="copy-btn-pro">
          {copied ? <Check size={14} color="#00ff88" /> : <Copy size={14} />}
          {copied ? 'تم النسخ' : 'نسخ الكود'}
        </button>
      </div>
      <pre className="code-content"><code>{children}</code></pre>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [historySessions, setHistorySessions] = useState([]); 
  const [activeChatId, setActiveChatId] = useState(null); 
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState("playground");
  const [aiModel, setAiModel] = useState("qwen"); 
  // 💡 جعل السايد بار يفتح افتراضياً على الكمبيوتر ويغلق افتراضياً على الجوال تلقائياً
const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ username:'', email:'', password:'' });
  const [authError, setAuthError] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);

  // 💡 تأثير حركي لجلب سكريبت جوجل الرسمي للـ Client ديناميكياً
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 💡 تأثير حركي لبناء وتوليد زر جوجل الرسمي داخل المودال عند فتحه
  useEffect(() => {
    if (showAuth && window.google) {
      /* تفعيل المعرف والـ Callback */
      window.google.accounts.id.initialize({
        client_id: "1068580495439-4f8pf38fsbbthpmqeosoi70jg4grurol.apps.googleusercontent.com",
        callback: handleGoogleCredentialResponse,
      });

      /* توليد الزر التفاعلي الأنيق في العنصر المخصص له */
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { 
          theme: "outline", 
          size: "large", 
          width: "100%", 
          text: authMode === 'login' ? 'signin_with' : 'signup_with',
          shape: "pill"
        }
      );
    }
  }, [showAuth, authMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (token && username) {
      setUser({ token, username });
      fetchHistoryTitles(token);
    }
  }, []);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, loading]);

  const forceLogout = () => {
    localStorage.clear();
    setUser(null);
    setMessages([]);
    setActiveChatId(null);
    setHistorySessions([]);
    setActiveTab("playground");
    window.location.reload();
  };

  const fetchHistoryTitles = async (token) => {
    try {
      const res = await axios.get(`${API_URL}/ai/history-titles`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setHistorySessions(res.data);
    } catch(e) {
      if(e.response?.status === 401) forceLogout();
    }
  };

  const loadSpecificChat = async (chatId) => {
    if(!user) return;
    setActiveChatId(chatId);
    setActiveTab("playground"); 
    
    if(window.innerWidth < 768) setIsSidebarOpen(false); 
    
    try {
      const res = await axios.get(`${API_URL}/ai/history/${chatId}`, { 
        headers: { Authorization: `Bearer ${user.token}` } 
      });
      setMessages(res.data.map(m => ({ 
        role: m.role === 'assistant' ? 'ai' : 'user', 
        content: m.content,
        thinking: m.thinkingContent 
      })));
    } catch(e) {
      console.error(e);
    }
  };

  const startNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setActiveTab("playground");
  };

  const deleteSpecificChat = async (e, chatIdToTrash) => {
    e.stopPropagation(); 
    
    const confirmAction = window.confirm("هل أنت متأكد من حذف هذه المحادثة؟ هذا الإجراء لا يمكن التراجع عنه!");
    if(!confirmAction) return;

    try {
      await axios.delete(`${API_URL}/ai/history/${chatIdToTrash}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });

      setHistorySessions(prev => prev.filter(session => session.chatId !== chatIdToTrash));

      if (activeChatId === chatIdToTrash) {
        startNewChat();
      }
    } catch(err) {
      console.error(err);
      alert("عذراً! المحركات المركزية ترفض الحذف لسبب تقني مؤقت.");
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!user) { setShowAuth(true); return; } 

    const messageText = input;
    const newMsg = { role: "user", content: messageText };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setLoading(true);
    setActiveTab("playground");

    try {
      const res = await axios.post(`${API_URL}/ai/chat`, 
        { 
          message: messageText, 
          chatId: activeChatId || "default", 
          modelType: aiModel 
        }, 
        { headers: { Authorization: `Bearer ${user.token}` }}
      );

      setMessages(prev => [...prev, { 
        role: "ai", 
        content: res.data.reply,
        thinking: res.data.thinking 
      }]);

      if (!activeChatId && res.data.chatId) {
        setActiveChatId(res.data.chatId);
      }
    } catch (err) {
      if(err.response?.status === 401) forceLogout();
      else setMessages(prev => [...prev, { role: "ai", content: "⚠️ حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى." }]);
    } finally {
      setLoading(false);
      fetchHistoryTitles(user.token); 
    }
  };

  const handleCardClick = (promptText) => {
    if (!user) { setShowAuth(true); return; }
    setInput(promptText);
    setTimeout(() => {
      textareaRef.current?.focus(); 
    }, 50);
  };

  const submitAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, authForm);
      if (authMode === 'register') {
        setAuthMode('login');
        setAuthError("تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.");
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.user.username);
        setUser({ token: res.data.token, username: res.data.user.username });
        setShowAuth(false);
        fetchHistoryTitles(res.data.token);
      }
    } catch(err) {
       setAuthError(err.response?.data?.error || "فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.");
    }
  };

  // 💡 دالة معالجة واستقبال التوكن من جوجل وإرساله للباكيند
  const handleGoogleCredentialResponse = async (response) => {
    setAuthError("");
    try {
      const res = await axios.post(`${API_URL}/auth/google`, {
        credential: response.credential
      });
      
      // حفظ الجلسة تماماً كما تفعل دالة الدخول العادية
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      setUser({ token: res.data.token, username: res.data.user.username });
      setShowAuth(false);
      fetchHistoryTitles(res.data.token);
    } catch (err) {
       setAuthError(err.response?.data?.error || "فشل تسجيل الدخول عبر حساب جوجل، جرب الدخول العادي.");
    }
  };
  return (
    <div className="dashboard-container">
      <div className="liquid-canvas"></div>

      {/* ================================== */}
      {/* 🚀 1. السايد بار الفاتح المعزول (Sidebar) */}
      {/* ================================== */}
      <aside className={`sidebar-pro ${!isSidebarOpen ? 'closed' : ''}`}>
        
        <div className="sidebar-header" onClick={startNewChat} style={{cursor: 'pointer'}}>
          <div className="logo-icon-sphere">
             <Cpu size={18} color="white" />
          </div>
          FLUTTER<span style={{color:'var(--primary-purple)'}}>HUB</span>
        </div>
        
        <div className="sidebar-menu">
          <div className="menu-item new-chat-btn" onClick={startNewChat}>
            <Plus size={18} /> <span>محادثة جديدة</span>
          </div>
          
          <div className="history-label">سجل أعمالك البرمجية</div>
          <div className="history-list custom-scrollbar">
            {historySessions.map((session, i) => (
              <div 
                key={i} 
                className={`history-item ${activeChatId === session.chatId && activeTab === 'playground' ? 'active' : ''}`} 
                onClick={() => loadSpecificChat(session.chatId)}
              >
                <div style={{display:'flex', alignItems:'center', gap:'8px', overflow:'hidden'}}>
                   <MessageSquare size={14} style={{flexShrink:0}} />
                   <span title={session.title} style={{whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{session.title}</span>
                </div>

                <button 
                  onClick={(e) => deleteSpecificChat(e, session.chatId)} 
                  className="delete-chat-btn" 
                  title="محو من السجل"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {historySessions.length === 0 && user && <small style={{color:'#94a3b8', padding:'10px', fontSize: '0.8rem'}}>الأرشيف ما يزال خالياً.</small>}
          </div>
        </div>

        <div className="sidebar-footer">
          {user ? (
            <div className="user-profile-badge">
               <div style={{width:'30px', height:'30px', borderRadius:'50%', background:'var(--primary-purple)', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:'10px', flexShrink: 0}}>
                 <User size={14} color="white" />
               </div>
               <span style={{fontSize:'0.85rem', flex:1, overflow:'hidden', whiteSpace: 'nowrap', fontWeight: 'bold'}}>{user.username}</span>
               <LogOut size={16} color="#ff4d4d" onClick={forceLogout} style={{cursor:'pointer', marginRight:'8px'}} title="تسجيل الخروج"/>
            </div>
          ) : (
            <button className="new-chat-btn" onClick={()=>setShowAuth(true)} style={{width:'100%'}}> تسجيل الدخول </button>
          )}
        </div>
      </aside>

      {/* ================================== */}
      {/* 🚀 2. لوحة العمل العائمة المحدثة بالكامل */}
      {/* ================================== */}
      <div className="app-layout">
        
        {/* ---- الناف بار المينيمال الأنيق ---- */}
        <nav className="header-minimal">
          <div className="nav-links-clean">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="toggle-sidebar-btn" title="توسيع واجهة برمجة فلاتر">
              {isSidebarOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
            </button>
             
            <button onClick={() => setActiveTab("about")} className={`nav-link-clean ${activeTab === "about" ? "active" : ""}`}>
              <Info size={16} /> من نحن
            </button>
            <button onClick={() => setActiveTab("contact")} className={`nav-link-clean ${activeTab === "contact" ? "active" : ""}`}>
              <Mail size={16} /> تواصل معنا
            </button>
          </div>
          <div className="social-zone">
            <div className="social-icons-wrapper">
              <a href="https://www.facebook.com/profile.php?id=100046199149058" target="_blank" rel="noopener noreferrer" className="social-icon-item" title="Facebook">
                <Facebook size={16} />
              </a>
              <a href="https://www.instagram.com/musabaljashani?igsh=MTJxM3lpaHJxc3I0NA==" target="_blank" rel="noopener noreferrer" className="social-icon-item" title="Instagram">
                <Instagram size={16} />
              </a>
              <a href="https://www.linkedin.com/in/musab-algashany-2b37b9370?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" className="social-icon-item" title="LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="https://github.com/musab110" target="_blank" rel="noopener noreferrer" className="social-icon-item" title="GitHub">
                <Github size={16} />
              </a>
              <a href="https://wa.me/967716085729" target="_blank" rel="noopener noreferrer" className="social-icon-item" title="WhatsApp">
                 <svg viewBox="0 0 24 24" fill="currentColor" style={{width: 16, height: 16}}>
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.382.012 12.052.012c3.232.001 6.27 1.258 8.554 3.544 2.283 2.285 3.541 5.321 3.539 8.553-.005 6.625-5.385 11.937-12.05 11.937-2.006-.001-3.978-.5-5.753-1.449L0 24zm6.59-2.031c1.599.948 3.1 1.442 4.887 1.443 5.489 0 9.957-4.391 9.961-9.789.002-2.614-1.017-5.074-2.871-6.931C16.719 4.836 14.254 3.815 11.64 3.815c-5.492 0-9.959 4.392-9.963 9.791-.001 1.884.51 3.4 1.485 4.93L2.14 21.872l4.507-1.903z"/>
                 </svg>
              </a>
            </div>
          </div>
        </nav>

        {/* ---- حيز المحتوى الديناميكي التفاعلي ---- */}
        <main className="content-canvas custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          <AnimatePresence mode="wait">
            
            {/* 1. صفحة الشات ومساحة العمل (Playground) */}
            {activeTab === "playground" && (
              <motion.div key="chat" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0}} style={{width:'100%'}}>
                
                {messages.length === 0 && !loading && (
                  <div style={{textAlign: 'center', marginTop: '4vh'}}>
                    <div className="welcome-sphere"></div>
                    <h2 style={{fontSize: 'clamp(1.5rem, 4vw, 2.4rem)', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-1px'}}>
                      مرحباً، {user ? user.username : 'المطور المحترف'}
                    </h2>
                    <p style={{color: 'var(--text-secondary)', fontSize: '1.05rem', marginTop: '10px', fontWeight: 500}}>
                      كيف يمكنني مساعدتك اليوم في بناء وتطوير برمجيات تطبيقات Flutter؟
                    </p>

                    <div className="welcome-cards-carousel custom-scrollbar">
                      
                      <div className="welcome-card-item" onClick={() => handleCardClick("ساعدني في بناء موديل JSON متكامل ومحمي بلغة Dart للبيانات القادمة من الـ API.")}>
                        <div className="welcome-card-icon"><Code2 size={16} /></div>
                        <div className="welcome-card-title">تحليل الـ JSON</div>
                        <div className="welcome-card-desc">تحويل ردود الـ API لـ Models متكاملة وخالية من الأخطاء البرمجية.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("أعطني واجهة مستخدم مبتكرة باستخدام الـ Widgets لصفحة ترحيب زجاجية أنيقة.")}>
                        <div className="welcome-card-icon"><Sparkles size={16} /></div>
                        <div className="welcome-card-title">واجهات متميزة</div>
                        <div className="welcome-card-desc">ابتكار وبناء تصاميم متجاوبة وسلسة لواجهات تطبيقاتك.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("لدي خطأ 'setState() called after dispose()' في الكود، كيف أحله بأمان؟")}>
                        <div className="welcome-card-icon"><HelpCircle size={16} /></div>
                        <div className="welcome-card-title">حل الأخطاء الشائعة</div>
                        <div className="welcome-card-desc">شرح وتصحيح أخطاء لغة Dart وحالات فلاتر بأقصى أمان كودي.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("كيف أقوم بإنشاء وإعداد قاعدة بيانات SQLite محلية في تطبيق Flutter مع عمليات CRUD؟")}>
                        <div className="welcome-card-icon"><Database size={16} /></div>
                        <div className="welcome-card-title">تفعيل قاعدة بيانات SQLite</div>
                        <div className="welcome-card-desc">تخزين البيانات محلياً مع بناء دوال الإضافة والتعديل والحذف.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("اشرح لي الفرق العملي بين Bloc و Provider في إدارة الحالة مع مثال تطبيقي بسيط.")}>
                        <div className="welcome-card-icon"><Activity size={16} /></div>
                        <div className="welcome-card-title">إدارة الحالة State</div>
                        <div className="welcome-card-desc">تحليل الفروقات والسيناريوهات المثالية لاستخدام Bloc أو Provider.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("كيف أصمم حركة تنقل (Custom Page Route Transition) مخصصة وسلسة بين شاشتين في Flutter؟")}>
                        <div className="welcome-card-icon"><Zap size={16} /></div>
                        <div className="welcome-card-title">تأثيرات الحركات الحيوية</div>
                        <div className="welcome-card-desc">برمجة انتقالات مميزة وفائقة النعومة ومحاكية لنظام iOS.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("ما هي أفضل الطرق لتقليل حجم حزمة تطبيق Flutter (App Bundle) وتحسين سرعة استجابة الشاشات؟")}>
                        <div className="welcome-card-icon"><ShieldAlert size={16} /></div>
                        <div className="welcome-card-title">تحسين حجم وأداء التطبيق</div>
                        <div className="welcome-card-desc">ممارسات ذهبية لتقليل المساحة البرمجية ورفع كفاءة الذاكرة الحركية.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("كيف يمكنني تشفير وتخزين رمز الدخول (JWT Token) بأمان داخل ذاكرة الهاتف في Flutter؟")}>
                        <div className="welcome-card-icon"><ShieldCheck size={16} /></div>
                        <div className="welcome-card-title">أمان وتشفير البيانات</div>
                        <div className="welcome-card-desc">استخدام حزمة flutter_secure_storage لحماية بيانات تسجيل الدخول.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("كيف أقوم بدمج خرائط جوجل (Google Maps) وتتبع موقع المستخدم الحالي بالخلفية في تطبيق Flutter؟")}>
                        <div className="welcome-card-icon"><MapPin size={16} /></div>
                        <div className="welcome-card-title">خدمات الموقع GPS</div>
                        <div className="welcome-card-desc">ربط خرائط جوجل وتفعيل ميزة تحديد الموقع الجغ الصيدلي للمستخدم.</div>
                      </div>

                      <div className="welcome-card-item" onClick={() => handleCardClick("أريد كوداً نموذجياً لربط تطبيق Flutter بخدمة REST API خارجية باستخدام حزمة Dio مع معالجة الأخطاء.")}>
                        <div className="welcome-card-icon"><Globe size={16} /></div>
                        <div className="welcome-card-title">الاتصال بـ REST APIs</div>
                        <div className="welcome-card-desc">بناء طبقة اتصالات خارجية قوية للتحقق من الاتصال بالشبكة ومعالجة أخطائها.</div>
                      </div>

                    </div>
                  </div>
                )}
                
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: msg.role === 'ai' ? 'row' : 'row-reverse', gap: '20px', margin: '0 auto 30px', width: '100%', maxWidth: '850px'}}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'ai' ? 'linear-gradient(135deg, var(--primary-purple) 0%, #1a0033 100%)' : '#e2e8f0', boxShadow: msg.role === 'ai' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none', padding: '9px'}}>
                      {msg.role === 'ai' ? <Cpu size={22} color="white"/> : <User size={22} color="#0f172a"/>}
                    </div>

                    <div style={{ flex: 1, textAlign: msg.role === 'ai' ? 'right' : 'left' }}>
                      <div className="pro-bubble" style={{ background: 'rgba(0, 0, 0, 0.015)', padding: '22px', borderRadius: '18px', border: '1px solid rgba(0, 0, 0, 0.03)', boxShadow: '0 4px 15px rgba(0,0,0,0.01)'}}>
                        
                        {msg.role === 'ai' && msg.thinking && (
                          <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                            <details style={{ outline: 'none' }}>
                              <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: 'var(--primary-purple)' }}>
                                💡 عرض تفاصيل التفكير وتخطيط البنية (Chain of Thought)
                              </summary>
                              <div style={{ marginTop: '10px', whiteSpace: 'pre-line', fontFamily: 'monospace', lineHeight: '1.6', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                {msg.thinking}
                              </div>
                            </details>
                          </div>
                        )}

                        <div className="markdown-content">
                           <ReactMarkdown 
                              rehypePlugins={[rehypeHighlight]} 
                              components={{
                                 code({node, inline, className, children, ...props}) {
                                   const match = /language-(\w+)/.exec(className || '');
                                   return !inline ? (
                                      <CodeBlock language={match ? match[1] : 'dart'}>{children}</CodeBlock>
                                   ) : (<code style={{background:'rgba(0,0,0,0.05)', padding:'2px 5px', borderRadius:'4px', fontFamily:'monospace', color: '#e11d48'}} {...props}>{children}</code>);
                                 }
                              }}
                           >
                              {msg.content}
                           </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </motion.div>
            )}

            {/* 2. صفحة من نحن (About Us) */}
            {activeTab === "about" && (
              <motion.div key="about" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0}} style={{maxWidth: '800px', margin: '20px auto', width:'100%', textAlign:'right'}}>
                <div style={{background: 'rgba(0,0,0,0.01)', border: '1px solid rgba(0,0,0,0.04)', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.01)'}}>
                  <div className="logo-icon-sphere" style={{width: '50px', height: '50px', margin: '0 0 20px auto'}}><Cpu size={26} color="white" /></div>
                  <h2 style={{fontSize: '2rem', fontWeight: 900, marginBottom: '15px'}}>حول منصة Flutter Mastery Hub</h2>
                  <p style={{color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '20px'}}>
                    مرحباً بك في المنصة البرمجية المخصصة لتعليم واحتراف وتطوير تطبيقات الهواتف الذكية باستخدام إطار عمل <strong>Flutter</strong> ولغة البرمجة <strong>Dart</strong>. تم تصميم هذه المنصة وتهيئتها برمجياً بواسطةم/ مصعب الجعشني  لتكون دليلك المتكامل في سوق العمل.
                  </p>
                  <p style={{color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '1.05rem', marginBottom: '20px'}}>
                    تسعى المنصة لتسريع بيئة تطوير وبناء الحلول البرمجية الفعالة، لتزود المطورين والمهندسين بأفضل الممارسات الهندسية المعترف بها دولياً في صياغة الأكواد وهيكلتها، بعيداً عن التعقيد.
                  </p>
                  <div style={{borderRight: '3px solid var(--primary-purple)', paddingRight: '20px', margin: '30px 0'}}>
                    <h4 style={{fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary-purple)'}}>الرؤية والهدف:</h4>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '5px'}}>
                      تحسين جودة صناعة البرمجيات في المنطقة العربية ورفع كفاءة مبرمجي الأجهزة الذكية لمنافسة المستويات العالمية وشركات التقنية الكبرى.
                    </p>
                  </div>
                  <button onClick={() => setActiveTab("playground")} className="new-chat-btn" style={{width: 'fit-content'}}>العودة لمساحة العمل وبدء البرمجة</button>
                </div>
              </motion.div>
            )}

            {/* 3. صفحة تواصل معنا (Contact Us) المحدثة بجناحين في غاية الأناقة */}
            {activeTab === "contact" && (
              <motion.div key="contact" initial={{opacity:0, y:15}} animate={{opacity:1, y:0}} exit={{opacity:0}} style={{maxWidth: '900px', margin: '20px auto', width:'100%', textAlign:'right'}}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '30px',
                  background: 'rgba(0,0,0,0.01)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  padding: '40px',
                  borderRadius: '24px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.01)'
                }} className="contact-grid-layout">
                  
                  {/* الجناح الأيمن: نموذج المراسلة المينيمال */}
                  <div style={{ borderLeft: '1px solid rgba(0, 0, 0, 0.05)', paddingLeft: '30px' }} className="contact-form-side">
                    <h2 style={{fontSize: '1.7rem', fontWeight: 900, marginBottom: '10px'}}>أرسل لنا رسالة مباشرة</h2>
                    <p style={{color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.9rem'}}>
                       نسعد باستقبال استفساراتكم التقنية أو اقتراحاتكم، وسيتواصل معكم فريق الدعم البرمجي بأقرب فرصة ممكنة.
                    </p>

                    {contactSubmitted ? (
                      <motion.div initial={{scale:0.9}} animate={{scale:1}} style={{textAlign: 'center', padding: '30px 0'}}>
                        <div className="logo-icon-sphere" style={{width: '45px', height: '45px', margin: '0 auto 15px'}}><Check size={22} color="white" /></div>
                        <h3 style={{fontWeight: 'bold', color: 'var(--text-primary)'}}>تم إرسال رسالتك بنجاح!</h3>
                        <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px'}}>نشكرك على اهتمامك بمشروعنا وسنتواصل معك بأقرب فرصة ممكنة.</p>
                        <button onClick={() => setContactSubmitted(false)} style={{background: 'none', border: 'none', color: 'var(--primary-purple)', borderBottom: '1px solid var(--primary-purple)', cursor: 'pointer', marginTop: '20px', fontWeight: 'bold'}}>إرسال رسالة أخرى</button>
                      </motion.div>
                    ) : (
                      <form onSubmit={(e) => { e.preventDefault(); setContactSubmitted(true); }} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <div style={{display: 'flex', gap: '15px'}} className="contact-input-row">
                          <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'14px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none', flex: 1, fontSize:'0.9rem'}} type="text" placeholder="الاسم الكامل" required/>
                          <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'14px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none', flex: 1, fontSize:'0.9rem'}} type="email" placeholder="البريد الإلكتروني" required />
                        </div>
                        <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'14px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none', fontSize:'0.9rem'}} type="text" placeholder="موضوع الرسالة" required />
                        <textarea style={{background:'#ffffff', color:'var(--text-primary)', padding:'14px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none', minHeight: '120px', fontSize:'0.9rem', resize: 'none'}} placeholder="تفاصيل رسالتك..." required />
                        <button type="submit" className="new-chat-btn" style={{width: '100%', padding: '14px', marginTop: '10px'}}><PhoneCall size={18} style={{marginLeft: '8px'}} /> إرسال الرسالة </button>
                      </form>
                    )}
                  </div>

                  {/* الجناح الأيسر: قنوات التواصل المباشر والأزرار المضيئة */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="contact-channels-side">
                    <h3 style={{fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px'}}>قنوات التواصل المباشر</h3>
                    <p style={{color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.85rem'}}>
                      يمكنك التواصل معنا مباشرة وعرض ملفاتنا البرمجية عبر منصاتنا الرسمية أدناه:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      
                      {/* WhatsApp */}
                      <a href="https://wa.me/967716085729" target="_blank" rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                          borderRadius: '12px', background: 'rgba(37, 211, 102, 0.05)', border: '1px solid rgba(37, 211, 102, 0.1)',
                          textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.08)'; e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.05)'; e.currentTarget.style.borderColor = 'rgba(37, 211, 102, 0.1)'; }}
                      >
                        <div style={{ background: '#25D366', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 24 24" fill="currentColor" style={{width: 14, height: 14}}>
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.003 5.324 5.382.012 12.052.012c3.232.001 6.27 1.258 8.554 3.544 2.283 2.285 3.541 5.321 3.539 8.553-.005 6.625-5.385 11.937-12.05 11.937-2.006-.001-3.978-.5-5.753-1.449L0 24zm6.59-2.031c1.599.948 3.1 1.442 4.887 1.443 5.489 0 9.957-4.391 9.961-9.789.002-2.614-1.017-5.074-2.871-6.931C16.719 4.836 14.254 3.815 11.64 3.815c-5.492 0-9.959 4.392-9.963 9.791-.001 1.884.51 3.4 1.485 4.93L2.14 21.872l4.507-1.903z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>واتساب / WhatsApp</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>دعم فني وتواصل برمجي فوري ومباشر</div>
                        </div>
                      </a>

                      {/* LinkedIn */}
                      <a href="https://www.linkedin.com/in/musab-algashany-2b37b9370?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" target="_blank" rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                          borderRadius: '12px', background: 'rgba(10, 102, 194, 0.05)', border: '1px solid rgba(10, 102, 194, 0.1)',
                          textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.08)'; e.currentTarget.style.borderColor = 'rgba(10, 102, 194, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(10, 102, 194, 0.05)'; e.currentTarget.style.borderColor = 'rgba(10, 102, 194, 0.1)'; }}
                      >
                        <div style={{ background: '#0a66c2', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Linkedin size={14} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>لينكد إن / LinkedIn</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>تصفح شبكتنا المهنية والتواصل الاحترافي</div>
                        </div>
                      </a>

                      {/* GitHub */}
                      <a href="https://github.com/musab110" target="_blank" rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                          borderRadius: '12px', background: 'rgba(15, 23, 42, 0.05)', border: '1px solid rgba(15, 23, 42, 0.1)',
                          textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.08)'; e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(15, 23, 42, 0.05)'; e.currentTarget.style.borderColor = 'rgba(15, 23, 42, 0.1)'; }}
                      >
                        <div style={{ background: '#0f172a', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Github size={14} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>جيت هاب / GitHub</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>تصفح مستودعات الكود والمشاريع مفتوحة المصدر</div>
                        </div>
                      </a>

                      {/* Instagram */}
                      <a href="https://www.instagram.com/musabaljashani?igsh=MTJxM3lpaHJxc3I0NA==" target="_blank" rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                          borderRadius: '12px', background: 'rgba(225, 48, 108, 0.05)', border: '1px solid rgba(225, 48, 108, 0.1)',
                          textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.08)'; e.currentTarget.style.borderColor = 'rgba(225, 48, 108, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.05)'; e.currentTarget.style.borderColor = 'rgba(225, 48, 108, 0.1)'; }}
                      >
                        <div style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Instagram size={14} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>إنستغرام / Instagram</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>متابعة التحديثات البصرية ومستجدات أعمالنا البرمجية</div>
                        </div>
                      </a>

                      {/* Facebook */}
                      <a href="https://www.facebook.com/profile.php?id=100046199149058" target="_blank" rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', 
                          borderRadius: '12px', background: 'rgba(24, 119, 242, 0.05)', border: '1px solid rgba(24, 119, 242, 0.1)',
                          textDecoration: 'none', color: 'var(--text-primary)', transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(24, 119, 242, 0.08)'; e.currentTarget.style.borderColor = 'rgba(24, 119, 242, 0.25)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(24, 119, 242, 0.05)'; e.currentTarget.style.borderColor = 'rgba(24, 119, 242, 0.1)'; }}
                      >
                        <div style={{ background: '#1877f2', color: 'white', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Facebook size={14} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'right' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>فيسبوك / Facebook</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>تصفح منشوراتنا الاجتماعية لجديد أخبارنا التقنية</div>
                        </div>
                      </a>

                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* ================================== */}
        {/* 🚀 3. القاعدة الكثيفة والتذليل الانيق المتوهج */}
        {/* ================================== */}
        {activeTab === "playground" && (
          <div className="bottom-section">
              <div className="dock-container">
                 
                 {user && (
                   <div style={{display:'flex', justifyContent:'center', marginBottom:'15px'}}>
                     <div className="model-switcher">
                       <button onClick={() => setAiModel("qwen")} className={`model-btn ${aiModel === "qwen" ? "active qwen" : ""}`}>
                            (سريع)
                       </button>
                       <button onClick={() => setAiModel("deepseek")} className={`model-btn ${aiModel === "deepseek" ? "active deepseek" : ""}`}>
                            (عميق)
                       </button>
                     </div>
                   </div>
                 )}

                 <div className="glass-input-bar">
                    {/* 💡 ربط مرجع الـ ref للتأثير التلقائي */}
                    <textarea 
                       ref={textareaRef}
                       value={input}
                       placeholder={user ? "اكتب رسالتك هنا..." : "يرجى تسجيل الدخول لبدء المحادثة."}
                       onChange={(e) => setInput(e.target.value)} 
                       disabled={!user || loading}
                       onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                       style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', resize: 'none', fontSize:'1rem', paddingTop:'8px', minHeight: '35px' }}
                    />
                    {user ? (
                       <button onClick={handleSendMessage} disabled={loading} className="pro-send-btn" style={{ background: aiModel === "deepseek" ? '#e879f9' : 'var(--primary-purple)' }}>
                         <Send size={18}/>
                       </button>
                    ) : (
                       <button onClick={() => setShowAuth(true)} className="new-chat-btn"> تسجيل الدخول!</button>
                    )}
                 </div>
              </div>
          </div>
        )}
        
        {/* تذييل الصفحة المحدث */}
        <footer className="premium-footer">
           <div className="developer-signature">
              <span>جميع الحقوق محفوظة © 2026. تم التطوير بواسطة م.مصعب الجعشني.</span>
           </div>
           <div className="footer-links-wrapper">
              <a href="#" className="footer-link-item">شروط الخدمة</a>
              <span style={{color: 'rgba(0,0,0,0.1)'}}>|</span>
              <a href="#" className="footer-link-item">سياسة الخصوصية</a>
              <span style={{color: 'rgba(0,0,0,0.1)'}}>|</span>
              <a href="#" className="footer-link-item">مركز المساعدة</a>
           </div>
        </footer>
      </div>

      {/* --- شاشة الدخول والتسجيل --- */}
      <AnimatePresence>
  {showAuth && (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} style={{position:'fixed', inset:0, background:'rgba(5, 0, 10, 0.4)', backdropFilter:'blur(20px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
       <motion.div initial={{scale:0.9, y:30}} animate={{scale:1, y:0}} style={{background:'rgba(255, 255, 255, 0.95)', padding:'40px', width:'100%', maxWidth:'420px', borderRadius:'24px', border:'1px solid rgba(0,0,0,0.06)', boxShadow:'0 25px 50px rgba(0,0,0,0.1)'}}>
          
          <h2 style={{margin:'0 0 10px', textAlign:'center', fontSize:'1.8rem', fontWeight:900, color:'var(--text-primary)'}}>
            <ShieldCheck size={28} color="var(--primary-purple)" style={{verticalAlign:'middle', marginLeft:'10px'}}/>  
            {authMode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h2>
          
          <p style={{textAlign:'center', color:'var(--text-secondary)', marginBottom:'25px'}}>
            {authMode === 'login' ? 'قم بتسجيل الدخول للمتابعة.' : 'ابدأ رحلة التعلم معنا اليوم.'}
          </p>
          
          {/* تم إصلاح خطأ فتح وإغلاق الفورم هنا */}
          <form onSubmit={submitAuth} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
             {authMode === 'register' && (
                <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'15px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none'}} type="text" placeholder="اسم المستخدم" value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} required/>
             )}
             <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'15px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none'}} type="email" placeholder="البريد الإلكتروني" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} required />
             <input style={{background:'#ffffff', color:'var(--text-primary)', padding:'15px', borderRadius:'12px', border:'1px solid rgba(0,0,0,0.06)', outline:'none'}} type="password" placeholder="كلمة المرور" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
             
             {authError && <div style={{color:'#ff4d4d', fontSize:'0.9rem', textAlign:'center'}}>{authError}</div>}
             
             {/* تم حذف الزر المكرر وترك زر واحد فقط */}
             <button type="submit" className="new-chat-btn" style={{padding:'15px', marginTop:'15px', fontSize:'1.1rem'}}>{authMode==='login'?'تسجيل الدخول':'إنشاء حساب'}</button>
          </form>

          {/* الفاصل البصري لزر جوجل */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '20px 0' }}>
             <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.06)' }}></div>
             <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>أو المتابعة باستخدام</span>
             <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.06)' }}></div>
          </div>

          {/* حاوية زر جوجل الذكي */}
          <div id="google-signin-btn" style={{ width: '100%', minHeight: '44px' }}></div>
          
          <div style={{marginTop:'25px', textAlign:'center', color:'var(--text-secondary)', fontSize:'0.9rem', cursor:'pointer'}} onClick={()=>setAuthMode(authMode==='login'?'register':'login')}>
             {authMode==='login'?' ليس لديك حساب؟ إنشاء حساب':'لديك حساب بالفعل؟ تسجيل الدخول! '}
          </div>
          
          <div style={{textAlign:'center', marginTop:'20px'}}>
             <button onClick={()=>setShowAuth(false)} style={{background:'none', border:'none', color:'#666', cursor:'pointer', borderBottom:'1px solid #666', fontWeight:'bold'}}> إغلاق</button>
          </div>
       </motion.div>
    </motion.div>
  )}
</AnimatePresence>

    </div>
  );
}