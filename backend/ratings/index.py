import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Rating system for scam reports - like/dislike
    Args: event with httpMethod, body
    Returns: HTTP response with updated ratings
    '''
    method: str = event.get('httpMethod', 'POST')
    
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
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        report_id = body_data.get('report_id')
        user_id = body_data.get('user_id')
        rating_type = body_data.get('rating_type')
        
        if rating_type not in ['like', 'dislike']:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Invalid rating type'}),
                'isBase64Encoded': False
            }
        
        cur.execute(
            "SELECT rating_type FROM user_ratings WHERE report_id = %s AND user_id = %s",
            (report_id, user_id)
        )
        existing = cur.fetchone()
        
        if existing:
            old_rating = existing[0]
            if old_rating == rating_type:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'message': 'Already rated'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "UPDATE user_ratings SET rating_type = %s WHERE report_id = %s AND user_id = %s",
                (rating_type, report_id, user_id)
            )
            
            if old_rating == 'like':
                cur.execute("UPDATE scam_reports SET likes = likes - 1 WHERE id = %s", (report_id,))
            else:
                cur.execute("UPDATE scam_reports SET dislikes = dislikes - 1 WHERE id = %s", (report_id,))
        else:
            cur.execute(
                "INSERT INTO user_ratings (report_id, user_id, rating_type) VALUES (%s, %s, %s)",
                (report_id, user_id, rating_type)
            )
        
        if rating_type == 'like':
            cur.execute("UPDATE scam_reports SET likes = likes + 1 WHERE id = %s RETURNING likes, dislikes", (report_id,))
        else:
            cur.execute("UPDATE scam_reports SET dislikes = dislikes + 1 WHERE id = %s RETURNING likes, dislikes", (report_id,))
        
        result = cur.fetchone()
        conn.commit()
        
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'success': True,
                'likes': result[0],
                'dislikes': result[1]
            }),
            'isBase64Encoded': False
        }
    
    finally:
        cur.close()
        conn.close()
