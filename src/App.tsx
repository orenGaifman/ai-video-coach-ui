import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

type YoutubeVideoResult = {
    videoId?: string;
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    viewCount?: number;
    likeCount?: number;
    duration?: string;
    thumbnailUrl?: string;
};

type AgentChatResponse = {
    sessionId?: string;
    reply?: string;     // אם אצלך זה נקרא אחרת—נתאים
    missing?: string[]; // אופציונלי
    items?: YoutubeVideoResult[]; // התוצאות כשיש
};

type ChatMsg = { role: "user" | "agent"; text: string };

function randomSessionId() {
    return "s_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}

export default function App() {
    const [sessionId] = useState(() => randomSessionId());
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ChatMsg[]>([
        { role: "agent", text: "היי! ספר לי קצת על העסק שלך ומה אתה מחפש, ואני אביא השראה מיוטיוב 🙂" },
    ]);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<YoutubeVideoResult[] | null>(null);
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, items, loading]);

    const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

    async function send() {
        if (!canSend) return;

        const text = input.trim();
        setInput("");
        setItems(null);
        setMessages((prev) => [...prev, { role: "user", text }]);
        setLoading(true);

        try {
            const res = await fetch("/api/agent/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, message: text }),
            });

            console.log('Response status:', res.status);
            console.log('Response headers:', res.headers);

            if (!res.ok) {
                const t = await res.text();
                console.log('Error response:', t);
                throw new Error(`HTTP ${res.status}: ${t}`);
            }

            const data: AgentChatResponse = await res.json();
            console.log('API Response:', data); // Debug log

            // התאמה: אם אצלך השדה נקרא "message" או "answer" במקום "reply"
            const replyText =
                data.reply ?? (data as any).message ?? (data as any).answer ?? (data as any).assistantMessage ?? "קיבלתי. מה עוד תרצה להוסיף?";

            setMessages((prev) => [...prev, { role: "agent", text: replyText }]);

            if (data.items && data.items.length > 0) {
                setItems(data.items);
            }
        } catch (e: any) {
            setMessages((prev) => [
                ...prev,
                { role: "agent", text: `שגיאה: ${e?.message ?? "Unknown error"}` },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="page">
            <header className="header">
                <div>
                    <div className="title">AI Video Coach</div>
                    <div className="subtitle">YouTube inspiration agent</div>
                </div>
                <div className="pill">session: {sessionId}</div>
            </header>

            <main className="main">
                <div className="chat">
                    {messages.map((m, idx) => (
                        <div key={idx} className={`msg ${m.role}`}>
                            <div className="bubble">{m.text}</div>
                        </div>
                    ))}

                    {loading && (
                        <div className="msg agent">
                            <div className="bubble">חושב…</div>
                        </div>
                    )}

                    {items && (
                        <div className="results">
                            <div className="resultsTitle">10 סרטונים מובילים (3 חודשים אחרונים)</div>
                            <div className="grid">
                                {items.map((v, i) => (
                                    <a
                                        key={i}
                                        className="card"
                                        href={v.videoId ? `https://www.youtube.com/watch?v=${v.videoId}` : undefined}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <div className="thumb">
                                            {v.thumbnailUrl ? (
                                                <img src={v.thumbnailUrl} alt={v.title ?? "thumb"} />
                                            ) : (
                                                <div className="thumbPlaceholder" />
                                            )}
                                        </div>
                                        <div className="cardBody">
                                            <div className="cardTitle">{v.title ?? "Untitled"}</div>
                                            <div className="cardMeta">
                                                <span>{v.channelTitle ?? ""}</span>
                                                <span className="dot">•</span>
                                                <span>{v.viewCount != null ? `${v.viewCount.toLocaleString()} views` : ""}</span>
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                <div className="composer">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="כתוב הודעה…"
                        onKeyDown={(e) => {
                            if (e.key === "Enter") send();
                        }}
                    />
                    <button onClick={send} disabled={!canSend}>
                        שלח
                    </button>
                </div>
            </main>
        </div>
    );
}
