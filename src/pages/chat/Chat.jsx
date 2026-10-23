import { useState, useRef, useEffect, useCallback } from 'react'
import { Col, Row, ListGroup, Form, InputGroup, Button, Badge } from 'react-bootstrap'
import { chatService } from '../../services/chatService'

export const Chat = ({ currentUser }) => {
    const [user, setUser] = useState(currentUser)
    const [isSyncConfigured, setIsSyncConfigured] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const [newMessage, setNewMessage] = useState('')
    const messagesEndRef = useRef(null)

    const [conversations, setConversations] = useState([])
    const [activeChat, setActiveChat] = useState(null)
    const [messages, setMessages] = useState([])
    const [onlineUsers, setOnlineUsers] = useState(new Set())

    const activeChatRef = useRef(activeChat)
    const userRef = useRef(user)

    useEffect(() => { activeChatRef.current = activeChat }, [activeChat])
    useEffect(() => { userRef.current = user }, [user])

    const fetchConversations = useCallback(async () => {
        const data = await chatService.getConversations()
        setConversations(data || [])
        return data || []
    }, [])

    const fetchConversationsRef = useRef(fetchConversations)
    useEffect(() => { fetchConversationsRef.current = fetchConversations }, [fetchConversations])

    const reloadMessages = useCallback(async (chatId) => {
        if (!chatId || String(chatId).startsWith('new-')) {
            setMessages([])
            return
        }
        const data = await chatService.getMessages(chatId)
        const formatted = (data || []).map(m => ({
            ...m,
            isMine: String(m.senderId) === String(userRef.current?.id)
        }))
        setMessages(formatted)
        
        await chatService.markAsRead(chatId)
        await fetchConversationsRef.current()
        window.dispatchEvent(new Event('chat-read-sync'))
    }, [])

    const reloadMessagesRef = useRef(reloadMessages)
    useEffect(() => { reloadMessagesRef.current = reloadMessages }, [reloadMessages])

    // Inicialización de usuario, estado de sincronización y usuarios online
    useEffect(() => {
        const initChat = async () => {
            setIsLoading(true)
            if (currentUser) {
                setUser(currentUser)
            } else if (window.api?.getCurrentUser) {
                const res = await window.api.getCurrentUser()
                if (res?.success && res.data) setUser(res.data)
            }

            if (window.api?.getSyncConfig) {
                const cfg = await window.api.getSyncConfig()
                if (!cfg?.syncUrl || !cfg?.syncToken) {
                    setIsSyncConfigured(false)
                    setIsLoading(false)
                    return
                }
                setIsSyncConfigured(true)
            }

            if (window.api?.getChatOnlineUsers) {
                const onlineRes = await window.api.getChatOnlineUsers()
                if (onlineRes?.success && Array.isArray(onlineRes.data)) {
                    setOnlineUsers(new Set(onlineRes.data.map(String)))
                }
            }

            await fetchConversations()
            setIsLoading(false)
        }
        initChat()
    }, [currentUser, fetchConversations])

    useEffect(() => {
        if (!activeChat) return
        reloadMessages(activeChat.id)
    }, [activeChat?.id, reloadMessages])

    // Escucha reactiva de eventos Pusher puenteados desde Electron
    useEffect(() => {
        const handleChatEvent = async (event) => {
            const { type, data } = event.detail || {}
            if (!type || !data) return

            const currentActive = activeChatRef.current
            const currentUsr = userRef.current

            if (type === 'new-message') {
                const isSameConversation = currentActive && (
                    String(currentActive.id) === String(data.conversationId) ||
                    (data.originalVirtualId && String(currentActive.id) === String(data.originalVirtualId))
                )

                if (isSameConversation) {
                    if (String(currentActive.id).startsWith('new-')) {
                        setActiveChat(prev => ({ ...prev, id: data.conversationId, isNewChat: false }))
                    } else {
                        // Añadimos el mensaje de inmediato si no existe y recargamos para sincronizar estado de lectura
                        setMessages(prev => {
                            const exists = prev.some(m => String(m.id) === String(data.id))
                            if (exists) return prev
                            return [...prev, {
                                ...data,
                                isMine: String(data.senderId) === String(currentUsr?.id)
                            }]
                        })
                        await reloadMessagesRef.current(data.conversationId)
                    }
                } else {
                    await fetchConversationsRef.current()
                }
            }

            if (type === 'messages-read') {
                if (String(data.readBy) !== String(currentUsr?.id)) {
                    if (currentActive && String(currentActive.id) === String(data.conversationId)) {
                        setMessages(prev => prev.map(m => m.isMine ? { ...m, isRead: true } : m))
                        await reloadMessagesRef.current(data.conversationId)
                    } else {
                        await fetchConversationsRef.current()
                    }
                }
            }
        }

        const handleOnlineUsers = (event) => {
            const onlineIds = event.detail || []
            setOnlineUsers(new Set(onlineIds.map(String)))
        }

        const handleUsersSynced = () => { fetchConversationsRef.current() }

        window.addEventListener('electron-chat-event', handleChatEvent)
        window.addEventListener('electron-chat-online-users', handleOnlineUsers)
        window.addEventListener('local-users-synced', handleUsersSynced)

        return () => {
            window.removeEventListener('electron-chat-event', handleChatEvent)
            window.removeEventListener('electron-chat-online-users', handleOnlineUsers)
            window.removeEventListener('local-users-synced', handleUsersSynced)
        }
    }, [])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (!newMessage.trim() || !activeChat) return

        const textToSend = newMessage
        setNewMessage('')

        const isVirtualChat = String(activeChat.id).startsWith('new-')
        const recipientData = isVirtualChat ? activeChat.recipientData : null

        const sentMsg = await chatService.sendMessage(activeChat.id, textToSend, recipientData)
        
        if (sentMsg) {
            if (isVirtualChat) {
                setActiveChat(prev => ({ ...prev, id: sentMsg.conversationId || sentMsg.id, isNewChat: false }))
            } else {
                reloadMessages(activeChat.id)
            }
        }
    }

    const formatTime = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const isContactOnline = (chatObj) => {
        if (!chatObj || !chatObj.recipientData) return false
        const targetId = String(chatObj.recipientData.id)
        return onlineUsers.has(targetId) || onlineUsers.has(`electron_shop_${targetId}`)
    }

    const filteredConversations = conversations.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (isLoading) {
        return (
            <div className="d-flex align-items-center justify-content-center h-100 bg-white" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando Chat...</span>
                </div>
            </div>
        )
    }

    if (!isSyncConfigured) {
        return (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted bg-white p-5 text-center">
                <i className="bi bi-cloud-slash" style={{ fontSize: '4rem', opacity: 0.5 }}></i>
                <h4 className="mt-3 text-dark">Chat No Disponible</h4>
                <p className="mb-0">Para usar el chat interno, debes vincular esta caja con tu cuenta de la nube en <strong className="text-primary">Configuración &gt; Sincronización</strong>.</p>
            </div>
        )
    }

    return (
        <div className="chat-container bg-white" style={{ margin: '-24px', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
            <Row className="g-0 h-100 w-100">
                
                {/* PANEL IZQUIERDO */}
                <Col md={4} lg={3} className="border-end h-100 d-flex flex-column bg-white">
                    <div className="px-3 border-bottom bg-white d-flex align-items-center" style={{ height: '70px', minHeight: '70px' }}>
                        <InputGroup>
                            <InputGroup.Text className="bg-white border-end-0"><i className="bi bi-search"></i></InputGroup.Text>
                            <Form.Control 
                                placeholder="Buscar chat..." 
                                className="border-start-0" 
                                style={{ boxShadow: 'none' }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </InputGroup>
                    </div>
                    
                    <div className="overflow-auto flex-grow-1">
                        <ListGroup variant="flush">
                            {filteredConversations.map((chat) => {
                                const onlineStatus = isContactOnline(chat)
                                return (
                                    <ListGroup.Item 
                                        key={chat.id} 
                                        action 
                                        active={activeChat?.id === chat.id}
                                        onClick={() => setActiveChat(chat)}
                                        className="border-bottom p-3 cursor-pointer rounded-0"
                                        style={{ borderLeft: activeChat?.id === chat.id ? '4px solid #0d6efd' : '4px solid transparent' }}
                                    >
                                        <div className="d-flex align-items-center">
                                            <div className="position-relative me-3">
                                                <div className="bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}>
                                                    {chat.name?.charAt(0).toUpperCase()}
                                                </div>
                                                {onlineStatus && (
                                                    <span className="position-absolute bottom-0 end-0 p-1 bg-success border border-white rounded-circle" style={{ width: '12px', height: '12px' }}></span>
                                                )}
                                            </div>
                                            <div className="flex-grow-1 overflow-hidden">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <h6 className="mb-0 text-truncate fw-bold">{chat.name}</h6>
                                                    <small className={activeChat?.id === chat.id ? 'text-white' : 'text-muted'} style={{ fontSize: '0.75rem' }}>
                                                        {typeof chat.time === 'string' && chat.time.includes('T') ? formatTime(chat.time) : chat.time}
                                                    </small>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <small className={`text-truncate ${activeChat?.id === chat.id ? 'text-white-50' : 'text-muted'}`}>
                                                        {chat.lastMessage}
                                                    </small>
                                                    {chat.unread > 0 && (
                                                        <Badge bg={activeChat?.id === chat.id ? 'light' : 'danger'} text={activeChat?.id === chat.id ? 'primary' : 'white'} pill>
                                                            {chat.unread}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                )
                            })}
                        </ListGroup>
                    </div>
                </Col>

                {/* PANEL DERECHO */}
                <Col md={8} lg={9} className="h-100 d-flex flex-column bg-light">
                    {activeChat ? (
                        <>
                            <div className="px-3 border-bottom bg-white d-flex align-items-center justify-content-between shadow-sm" style={{ height: '70px', minHeight: '70px', zIndex: 10 }}>
                                <div className="d-flex align-items-center">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-3" style={{ width: '40px', height: '40px' }}>
                                        {activeChat.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{activeChat.name}</h6>
                                        {isContactOnline(activeChat) ? (
                                            <small className="text-success">En línea</small>
                                        ) : (
                                            <small className="text-muted">Desconectado</small>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow-1 p-4 overflow-auto" style={{ backgroundColor: '#efeae2', minHeight: 0 }}>
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`d-flex mb-3 ${msg.isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                                        <div style={{ maxWidth: '75%' }}>
                                            {!msg.isMine && <small className="text-muted d-none mb-1 ms-2">{msg.sender}</small>}
                                            <div 
                                                className={`p-3 rounded-3 shadow-sm ${msg.isMine ? 'bg-primary text-white rounded-bottom-end-0' : 'bg-white text-dark rounded-bottom-start-0'}`}
                                                style={{ display: 'inline-block' }}
                                            >
                                                {msg.text}
                                            </div>
                                            <small className={`d-block mt-1 ${msg.isMine ? 'text-end text-muted me-2' : 'text-muted ms-2'}`} style={{ fontSize: '0.7rem' }}>
                                                {formatTime(msg.time)} 
                                                {msg.isMine && <i className={`bi bi-check2-all ms-1 ${msg.isRead ? 'text-primary' : 'text-secondary'}`}></i>}
                                            </small>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            <div className="p-3 bg-light border-top">
                                <Form onSubmit={handleSendMessage} className="w-100">
                                    <InputGroup size="lg" className="shadow-sm rounded">
                                        <Form.Control 
                                            placeholder="Escribe un mensaje..." 
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            className="bg-white border-0"
                                            style={{ borderRadius: '0.5rem 0 0 0.5rem', boxShadow: 'none' }}
                                        />
                                        <Button variant="primary" type="submit" disabled={!newMessage.trim()} style={{ borderRadius: '0 0.5rem 0.5rem 0' }}>
                                            <i className="bi bi-send-fill"></i>
                                        </Button>
                                    </InputGroup>
                                </Form>
                            </div>
                        </>
                    ) : (
                        <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted bg-white">
                            <i className="bi bi-chat-dots" style={{ fontSize: '4rem', opacity: 0.5 }}></i>
                            <h4 className="mt-3">Selecciona una conversación</h4>
                            <p className="mb-0">Tus mensajes sincronizados aparecerán aquí.</p>
                        </div>
                    )}
                </Col>
            </Row>
        </div>
    )
}