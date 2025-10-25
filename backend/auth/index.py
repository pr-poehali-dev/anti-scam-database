import json
import os
import hashlib
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: User authentication and registration
    Args: event with httpMethod, body
    Returns: HTTP response with user data or error
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    action = body_data.get('action')
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        if action == 'register':
            email = body_data.get('email')
            password = body_data.get('password')
            
            cur.execute("SELECT COUNT(*) FROM users")
            user_count = cur.fetchone()[0]
            user_id = f"#{1000 + user_count}"
            
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            is_creator = user_count == 0
            
            cur.execute(
                "INSERT INTO users (user_id, email, password_hash, is_creator) VALUES (%s, %s, %s, %s) RETURNING id, user_id, email, is_creator",
                (user_id, email, password_hash, is_creator)
            )
            user = cur.fetchone()
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'id': user[0],
                    'user_id': user[1],
                    'email': user[2],
                    'is_creator': user[3]
                }),
                'isBase64Encoded': False
            }
        
        elif action == 'login':
            email = body_data.get('email')
            password = body_data.get('password')
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            cur.execute(
                "SELECT id, user_id, email, is_creator FROM users WHERE email = %s AND password_hash = %s",
                (email, password_hash)
            )
            user = cur.fetchone()
            
            if not user:
                return {
                    'statusCode': 401,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Invalid credentials'}),
                    'isBase64Encoded': False
                }
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'id': user[0],
                    'user_id': user[1],
                    'email': user[2],
                    'is_creator': user[3]
                }),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()
