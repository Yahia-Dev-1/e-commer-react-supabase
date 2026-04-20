import React, { useState, useEffect, useRef } from 'react';
import '../styles/Chat.css';
import { useToast } from '../contexts/ToastContext';
import { sendMessage, getMessages, markMessagesAsRead, subscribeToMessages, getAllConversations, deleteConversation } from '../utils/supabase';
import Modal from './Modal';

export default function Chat({ user }) {
  const showToast = useToast();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const messagesEndRef = useRef(null);
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });

  const adminEmail = process.env.REACT_APP_ADMIN_EMAIL || 'admin@example.com';
  const isAdmin = user?.email === adminEmail;

  useEffect(() => {
    if (isAdmin) {
      loadConversations();
    } else {
      loadMessages();
    }

    const unsubscribe = subscribeToMessages(user?.email, () => {
      if (isAdmin) {
        loadConversations();
      } else {
        loadMessages();
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    if (!user?.email) return;

    try {
      const convs = await getAllConversations();
      setConversations(convs);

      // Auto-select first conversation if none selected
      if (!selectedConversation && convs.length > 0) {
        setSelectedConversation(convs[0]);
        loadMessagesForConversation(convs[0]);
      }
    } catch (error) {
          }
    setLoading(false);
  };

  const loadMessages = async () => {
    if (!user?.email) return;

    try {
      const msgs = await getMessages(user.email);
      setMessages(msgs);

      // Mark messages from admin as read
      if (user.email !== adminEmail) {
        await markMessagesAsRead(adminEmail, user.email);
      }
    } catch (error) {
          }
    setLoading(false);
  };

  const loadMessagesForConversation = async (conversation) => {
    try {
      const msgs = await getMessages(conversation.user_email);
      setMessages(msgs);

      // Mark messages as read
      await markMessagesAsRead(adminEmail, conversation.user_email);
    } catch (error) {
          }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    loadMessagesForConversation(conversation);
    setShowConversationList(false);
  };

  const handleDeleteConversation = async (userEmail, e) => {
    e.stopPropagation();
    
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await deleteConversation(userEmail);
      if (selectedConversation?.user_email === userEmail) {
        setSelectedConversation(null);
        setMessages([]);
      }
      await loadConversations();
      if (showToast && typeof showToast === 'function') {
        showToast('Conversation deleted successfully', 'success');
      } else {
        setAlertModal({ isOpen: true, title: 'Success', message: 'Conversation deleted successfully' });
      }
    } catch (error) {
            if (showToast && typeof showToast === 'function') {
        showToast('Failed to delete conversation', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to delete conversation' });
      }
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) return;

    if (!user?.email) {
      if (showToast && typeof showToast === 'function') {
        showToast('Please login to send messages', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Please login to send messages' });
      }
      return;
    }

    try {
      let receiverEmail;
      if (isAdmin && selectedConversation) {
        receiverEmail = selectedConversation.user_email;
      } else {
        receiverEmail = adminEmail;
      }

      await sendMessage(user.email, receiverEmail, newMessage);
      setNewMessage('');
      
      if (isAdmin && selectedConversation) {
        await loadMessagesForConversation(selectedConversation);
        await loadConversations();
      } else {
        await loadMessages();
      }
    } catch (error) {
            if (showToast && typeof showToast === 'function') {
        showToast('Failed to send message. Please try again.', 'error');
      } else {
        setAlertModal({ isOpen: true, title: 'Error', message: 'Failed to send message. Please try again.' });
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!user) {
    return (
      <div className="chat-container">
        <button onClick={() => window.location.href = '/login'} className="login-btn">
          Login
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="chat-loading">
          <div className="spinner"></div>
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {isAdmin && (
        <div className="chat-conversations">
          <div className="conversations-header">
            <h3>Conversations</h3>
            <button 
              className="toggle-conversations-btn"
              onClick={() => setShowConversationList(!showConversationList)}
            >
              {showConversationList ? 'Close' : 'Open'}
            </button>
          </div>
          {showConversationList && (
            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div className="no-conversations">
                  <p>No conversations yet</p>
                </div>
              ) : (
                conversations.map((conv, index) => (
                  <div
                    key={index}
                    className={`conversation-item ${selectedConversation?.user_email === conv.user_email ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <div className="conversation-info">
                      <span className="conversation-user">{conv.user_email}</span>
                      <span className="conversation-count">{conv.unread_count} unread</span>
                    </div>
                    <button
                      className="delete-conversation-btn"
                      onClick={(e) => handleDeleteConversation(conv.user_email, e)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="chat-header">
        <h2>💬 Chat</h2>
        <p>
          {isAdmin && selectedConversation
            ? `Chat with ${selectedConversation.user_email}`
            : isAdmin
            ? 'Select a conversation to start chatting'
            : 'Private conversation with admin'}
        </p>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <h3>No messages yet</h3>
            <p>
              {isAdmin && !selectedConversation
                ? 'Select a conversation to start chatting'
                : 'Start a conversation'}
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isAdminMessage = msg.sender_email === adminEmail;
            return (
              <div key={index} className={`message ${isAdminMessage ? 'admin-message' : 'user-message'}`}>
                <div className="message-content">
                  <p>{msg.message}</p>
                  <span className="message-time">{formatDate(msg.created_at)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isAdmin && !selectedConversation ? 'Select a conversation first' : 'Type your message...'}
          className="chat-input"
          disabled={isAdmin && !selectedConversation}
        />
        <button 
          type="submit" 
          className="send-button" 
          disabled={!newMessage.trim() || (isAdmin && !selectedConversation)}
        >
          Send
        </button>
      </form>

      <Modal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ isOpen: false, title: '', message: '' })}
        title={alertModal.title}
        message={alertModal.message}
        type="alert"
      />
    </div>
  );
}
