import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Friend management system - send requests, accept, reject, list friends
    Args: event with httpMethod, body, queryStringParameters
    Returns: HTTP response with friendship data
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
            user_id = params.get('user_id')
            
            cur.execute("""
                SELECT u.id, u.user_id, u.email, u.is_creator, u.avatar_url, f.status, f.id
                FROM friendships f
                JOIN users u ON (f.friend_id = u.id OR f.user_id = u.id)
                WHERE (f.user_id = %s OR f.friend_id = %s) AND u.id != %s
            """, (user_id, user_id, user_id))
            
            friends = cur.fetchall()
            
            data = [{
                'id': f[0],
                'user_id': f[1],
                'email': f[2],
                'is_creator': f[3],
                'avatar_url': f[4],
                'status': f[5],
                'friendship_id': f[6]
            } for f in friends]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'friends': data}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            user_id = body_data.get('user_id')
            friend_user_id = body_data.get('friend_user_id')
            
            cur.execute("SELECT id FROM users WHERE user_id = %s", (friend_user_id,))
            friend = cur.fetchone()
            
            if not friend:
                return {
                    'statusCode': 404,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'User not found'}),
                    'isBase64Encoded': False
                }
            
            friend_id = friend[0]
            
            cur.execute(
                "INSERT INTO friendships (user_id, friend_id, status) VALUES (%s, %s, 'pending') ON CONFLICT DO NOTHING",
                (user_id, friend_id)
            )
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True, 'message': 'Friend request sent'}),
                'isBase64Encoded': False
            }
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            friendship_id = body_data.get('friendship_id')
            action = body_data.get('action')
            
            if action == 'accept':
                cur.execute(
                    "UPDATE friendships SET status = 'accepted' WHERE id = %s",
                    (friendship_id,)
                )
            elif action == 'reject':
                cur.execute(
                    "UPDATE friendships SET status = 'rejected' WHERE id = %s",
                    (friendship_id,)
                )
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'success': True}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()