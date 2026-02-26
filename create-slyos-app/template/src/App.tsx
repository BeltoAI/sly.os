import React, { useState, useRef, useEffect } from 'react';
import SlyOS from '@emilshirokikh/slyos-sdk';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const AVAILABLE_MODELS = [
  'quantum-1.7b',
  'quantum-3b',
  'quantum-code-3b',
  'quantum-8b',
  'voicecore-base',
  'voicecore-small',
];

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('__MODEL_ID__');
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  const slyos = new SlyOS({ apiKey: '__API_KEY__' });
  const knowledgeBaseId = '__KB_ID__' || null;
  const serverUrl = '__SERVER_URL__' || 'https://api.slyos.world';
  const apiKey = '__API_KEY__';

  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };
    setConversations([newConversation, ...conversations]);
    setCurrentConversationId(newConversation.id);
  };

  const deleteConversation = (id: string) => {
    setConversations(conversations.filter((c) => c.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(conversations[0]?.id || null);
      if (conversations.length === 1) {
        createNewConversation();
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages]);

  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);

  // Authenticate and get JWT token for API calls
  const authenticateSDK = async (): Promise<string> => {
    if (jwtToken) {
      return jwtToken;
    }

    try {
      const response = await fetch(`${serverUrl}/api/auth/sdk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.statusText}`);
      }

      const data = await response.json();
      const token = data.token;

      if (!token) {
        throw new Error('No token returned from authentication');
      }

      setJwtToken(token);
      return token;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  };

  // Query the RAG API for knowledge base results
  const queryKnowledgeBase = async (
    query: string,
    token: string
  ): Promise<{ chunks: Array<{ content: string; score: number }> } | null> => {
    try {
      const response = await fetch(
        `${serverUrl}/api/rag/knowledge-bases/${knowledgeBaseId}/query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query,
            topK: 5,
          }),
        }
      );

      if (!response.ok) {
        console.error(`KB query failed: ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Knowledge base query error:', error);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !currentConversation || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const updatedConversation = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
      title:
        currentConversation.messages.length === 0
          ? inputValue.substring(0, 50)
          : currentConversation.title,
    };

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setConversations(
      conversations.map((c) =>
        c.id === currentConversationId
          ? { ...updatedConversation, messages: [...updatedConversation.messages, assistantMessage] }
          : c
      )
    );

    setInputValue('');
    setIsLoading(true);

    try {
      let responseText = '';

      if (knowledgeBaseId) {
        // Use RAG: authenticate, retrieve chunks from KB, then generate with context
        try {
          const token = await authenticateSDK();
          const ragResult = await queryKnowledgeBase(inputValue, token);

          if (ragResult && ragResult.chunks && ragResult.chunks.length > 0) {
            // Build context from retrieved chunks, adapted to model's context window
            const contextWindow = slyos.getModelContextWindow() || 2048;
            const maxContextChars = Math.max(500, (contextWindow - 200) * 3);
            let context = ragResult.chunks
              .map((chunk: any) => chunk.content)
              .join('\n\n');
            if (context.length > maxContextChars) {
              context = context.substring(0, maxContextChars);
            }

            const ragPrompt = `${context}\n\nQuestion: ${inputValue}\nAnswer:`;

            // Use SDK to generate response with context
            const response = await slyos.generate(selectedModel, ragPrompt);
            responseText = response || '';
          } else {
            // No chunks retrieved, fall back to plain generation
            console.warn('No chunks retrieved from knowledge base, using plain generation');
            const response = await slyos.generate(selectedModel, inputValue);
            responseText = response || '';
          }
        } catch (ragError) {
          // If RAG fails, fall back to plain generation
          console.error('RAG query failed, falling back to plain generation:', ragError);
          const response = await slyos.generate(selectedModel, inputValue);
          responseText = response || '';
        }
      } else {
        // No KB configured — plain generation
        const response = await slyos.generate(selectedModel, inputValue);
        responseText = response || '';
      }

      setConversations(
        conversations.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: responseText, isLoading: false }
                    : m
                ),
              }
            : c
        )
      );
    } catch (error) {
      console.error('Error calling SlyOS API:', error);
      setConversations(
        conversations.map((c) =>
          c.id === currentConversationId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        content:
                          'Sorry, I encountered an error. Please check your API key and try again.',
                        isLoading: false,
                      }
                    : m
                ),
              }
            : c
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderMessageContent = (content: string) => {
    const codeBlockRegex = /```(.*?)\n([\s\S]*?)```/g;
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      const language = match[1] || 'code';
      const code = match[2];

      parts.push(
        <div
          key={`code-${match.index}`}
          style={{
            backgroundColor: '#1a1a23',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '8px',
            marginBottom: '8px',
            overflow: 'auto',
            border: '1px solid #2a2a35',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#00d4ff',
              marginBottom: '8px',
              fontWeight: '500',
              fontFamily: 'monospace',
            }}
          >
            {language}
          </div>
          <pre
            style={{
              margin: 0,
              color: '#e0e0e0',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
          >
            {code.trim()}
          </pre>
        </div>
      );

      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#0a0a0f',
        color: '#e0e0e0',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          background-color: #0a0a0f;
          color: #e0e0e0;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes typingDots {
          0%, 20% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-4px);
          }
          60% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Sidebar */}
      <div
        style={{
          width: sidebarOpen ? 280 : 0,
          backgroundColor: '#12121a',
          borderRight: '1px solid #2a2a35',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* New Chat Button */}
        <div style={{ padding: '16px' }}>
          <button
            onClick={createNewConversation}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00e6ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#00d4ff';
            }}
          >
            + New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '16px',
          }}
        >
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setCurrentConversationId(conversation.id)}
              style={{
                padding: '12px 16px',
                marginX: '8px',
                marginBottom: '4px',
                backgroundColor:
                  currentConversationId === conversation.id ? '#1a1a23' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                borderLeft:
                  currentConversationId === conversation.id
                    ? '3px solid #00d4ff'
                    : '3px solid transparent',
                marginLeft: '8px',
                marginRight: '8px',
              }}
              onMouseEnter={(e) => {
                if (currentConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = '#1a1a23';
                }
              }}
              onMouseLeave={(e) => {
                if (currentConversationId !== conversation.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '4px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {conversation.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '12px', color: '#888' }}>
                  {conversation.messages.length} messages
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conversation.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px',
                    transition: 'color 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ff4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#888';
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0a0a0f',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #2a2a35',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#12121a',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00d4ff',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              ☰
            </button>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: '700',
                background: 'linear-gradient(90deg, #00d4ff, #0088ff)',
                backgroundClip: 'text',
                color: 'transparent',
                WebkitBackgroundClip: 'text',
              }}
            >
              SlyOS Chat
            </h1>
          </div>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1a1a23',
              color: '#e0e0e0',
              border: '1px solid #2a2a35',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#00d4ff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a2a35';
            }}
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        {/* Messages Container */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {currentConversation && currentConversation.messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                textAlign: 'center',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '48px',
                    marginBottom: '16px',
                    opacity: 0.5,
                  }}
                >
                  💬
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    color: '#888',
                    maxWidth: '300px',
                  }}
                >
                  Start a conversation by typing a message below
                </p>
              </div>
            </div>
          )}

          {currentConversation?.messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                justifyContent:
                  message.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                {message.isLoading ? (
                  <div
                    style={{
                      backgroundColor: '#1a1a23',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      border: '1px solid #2a2a35',
                      display: 'flex',
                      gap: '4px',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#00d4ff',
                        animation: 'typingDots 1.4s infinite',
                        display: 'inline-block',
                      }}
                    />
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#00d4ff',
                        animation: 'typingDots 1.4s infinite 0.2s',
                        display: 'inline-block',
                      }}
                    />
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#00d4ff',
                        animation: 'typingDots 1.4s infinite 0.4s',
                        display: 'inline-block',
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        backgroundColor:
                          message.role === 'user' ? '#00d4ff' : '#1a1a23',
                        color: message.role === 'user' ? '#000' : '#e0e0e0',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        lineHeight: '1.5',
                        wordWrap: 'break-word',
                        border:
                          message.role === 'user'
                            ? 'none'
                            : '1px solid #2a2a35',
                      }}
                    >
                      {renderMessageContent(message.content)}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#666',
                        paddingX: '4px',
                      }}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div
          style={{
            padding: '24px',
            borderTop: '1px solid #2a2a35',
            backgroundColor: '#12121a',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#1a1a23',
                color: '#e0e0e0',
                border: '1px solid #2a2a35',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: "'Inter', sans-serif",
                transition: 'border-color 0.2s ease',
                outline: 'none',
                ':focus': {
                  borderColor: '#00d4ff',
                },
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#00d4ff';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#2a2a35';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputValue.trim()}
              style={{
                padding: '12px 24px',
                backgroundColor: isLoading ? '#666' : '#00d4ff',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'background-color 0.2s ease',
                opacity: isLoading || !inputValue.trim() ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#00e6ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && inputValue.trim()) {
                  e.currentTarget.style.backgroundColor = '#00d4ff';
                }
              }}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
