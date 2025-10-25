import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Chat system - create chats, send messages, get chat history
    Args: event with httpMethod, body, queryStringParameters
    Returns: HTTP response with chat data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        if method == 'GET':
            params = event.get('queryStringParameters', {})
            action = params.get('action')
            
            if action == 'chats':
                user_id = params.get('user_id')
                
                cur.execute("""
                    SELECT DISTINCT c.id, u.id, u.user_id, u.email, u.avatar_url,
                           (SELECT message_text FROM messages 
                            WHERE chat_id = c.id 
                            ORDER BY created_at DESC LIMIT 1) as last_message,
                           (SELECT created_at FROM messages 
                            WHERE chat_id = c.id 
                            ORDER BY created_at DESC LIMIT 1) as last_message_time
                    FROM chats c
                    JOIN chat_participants cp ON c.id = cp.chat_id
                    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = %s
                    JOIN users u ON cp.user_id = u.id AND u.id != %s
                    ORDER BY last_message_time DESC NULLS LAST
                """, (user_id, user_id))
                
                chats = cur.fetchall()
                
                data = [{
                    'chat_id': c[0],
                    'friend_id': c[1],
                    'friend_user_id': c[2],
                    'friend_email': c[3],
                    'friend_avatar': c[4],
                    'last_message': c[5],
                    'last_message_time': c[6].isoformat() if c[6] else None
                } for c in chats]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chats': data}),
                    'isBase64Encoded': False
                }
            
            elif action == 'messages':
                chat_id = params.get('chat_id')
                
                cur.execute("""
                    SELECT m.id, m.sender_id, m.message_text, m.created_at, u.email, u.avatar_url
                    FROM messages m
                    JOIN users u ON m.sender_id = u.id
                    WHERE m.chat_id = %s
                    ORDER BY m.created_at ASC
                """, (chat_id,))
                
                messages = cur.fetchall()
                
                data = [{
                    'id': m[0],
                    'sender_id': m[1],
                    'text': m[2],
                    'created_at': m[3].isoformat(),
                    'sender_email': m[4],
                    'sender_avatar': m[5]
                } for m in messages]
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'messages': data}),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'create_chat':
                user_id = body_data.get('user_id')
                friend_id = body_data.get('friend_id')
                
                # Check if chat already exists
                cur.execute("""
                    SELECT c.id FROM chats c
                    JOIN chat_participants cp1 ON c.id = cp1.chat_id AND cp1.user_id = %s
                    JOIN chat_participants cp2 ON c.id = cp2.chat_id AND cp2.user_id = %s
                """, (user_id, friend_id))
                
                existing_chat = cur.fetchone()
                
                if existing_chat:
                    chat_id = existing_chat[0]
                else:
                    cur.execute("INSERT INTO chats DEFAULT VALUES RETURNING id")
                    chat_id = cur.fetchone()[0]
                    
                    cur.execute(
                        "INSERT INTO chat_participants (chat_id, user_id) VALUES (%s, %s), (%s, %s)",
                        (chat_id, user_id, chat_id, friend_id)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chat_id': chat_id}),
                    'isBase64Encoded': False
                }
            
            elif action == 'send_message':
                chat_id = body_data.get('chat_id')
                sender_id = body_data.get('sender_id')
                message_text = body_data.get('message_text')
                
                cur.execute(
                    "INSERT INTO messages (chat_id, sender_id, message_text) VALUES (%s, %s, %s) RETURNING id, created_at",
                    (chat_id, sender_id, message_text)
                )
                result = cur.fetchone()
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'message_id': result[0],
                        'created_at': result[1].isoformat()
                    }),
                    'isBase64Encoded': False
                }
    
    finally:
        cur.close()
        conn.close()
