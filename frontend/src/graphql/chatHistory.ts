import { gql } from '@apollo/client';

// ========== Hijiki (黑噗噗) 會話查詢 ==========

export const GET_HIJIKI_SESSIONS = gql`
  query GetHijikiSessions {
    getHijikiSessions {
      id
      sessionId
      title
      mode
      totalQueries
      lastActiveAt
      isActive
    }
  }
`;

export const DELETE_HIJIKI_SESSION = gql`
  mutation DeleteHijikiSession($sessionId: String!) {
    deleteHijikiSession(sessionId: $sessionId)
  }
`;

// ========== Tororo (白噗噗) 會話查詢 ==========

export const GET_TORORO_SESSIONS = gql`
  query GetTororoSessions {
    getTororoSessions {
      id
      sessionId
      title
      totalMessages
      lastActiveAt
      isActive
    }
  }
`;

export const GET_TORORO_SESSION = gql`
  query GetTororoSession($sessionId: String!) {
    getTororoSession(sessionId: $sessionId) {
      id
      sessionId
      title
      messages {
        role
        content
        timestamp
      }
      totalMessages
      lastActiveAt
      isActive
    }
  }
`;

export const SAVE_TORORO_MESSAGE = gql`
  mutation SaveTororoMessage($sessionId: String!, $userMessage: String!, $assistantMessage: String!) {
    saveTororoMessage(sessionId: $sessionId, userMessage: $userMessage, assistantMessage: $assistantMessage)
  }
`;

export const DELETE_TORORO_SESSION = gql`
  mutation DeleteTororoSession($sessionId: String!) {
    deleteTororoSession(sessionId: $sessionId)
  }
`;
