import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Search for Telegram users in scam database
    Args: event with httpMethod, queryStringParameters
    Returns: HTTP response with search results
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
            username = params.get('username', '')
            
            if not username:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, telegram_username, is_scammer, report_count, description, evidence_url, likes, dislikes FROM scam_reports WHERE telegram_username ILIKE %s",
                (f'%{username}%',)
            )
            results = cur.fetchall()
            
            data = [{
                'id': r[0],
                'telegram_username': r[1],
                'is_scammer': r[2],
                'report_count': r[3],
                'description': r[4],
                'evidence_url': r[5],
                'likes': r[6],
                'dislikes': r[7]
            } for r in results]
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'results': data}),
                'isBase64Encoded': False
            }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            telegram_username = body_data.get('telegram_username')
            is_scammer = body_data.get('is_scammer', False)
            description = body_data.get('description', '')
            evidence_url = body_data.get('evidence_url', '')
            reported_by = body_data.get('reported_by')
            
            if not evidence_url:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Evidence required'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "SELECT id, report_count FROM scam_reports WHERE telegram_username = %s",
                (telegram_username,)
            )
            existing = cur.fetchone()
            
            if existing:
                new_count = existing[1] + 1
                cur.execute(
                    "UPDATE scam_reports SET report_count = %s, is_scammer = %s, description = %s, evidence_url = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (new_count, is_scammer, description, evidence_url, existing[0])
                )
                report_id = existing[0]
            else:
                cur.execute(
                    "INSERT INTO scam_reports (telegram_username, is_scammer, report_count, description, evidence_url, reported_by) VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
                    (telegram_username, is_scammer, 1, description, evidence_url, reported_by)
                )
                report_id = cur.fetchone()[0]
            
            cur.execute(
                "INSERT INTO report_evidence (report_id, evidence_url, uploaded_by) VALUES (%s, %s, %s)",
                (report_id, evidence_url, reported_by)
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