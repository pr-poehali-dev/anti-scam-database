import json
import os
import psycopg2
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Admin panel for user management, reports, and search functionality
    Args: event with httpMethod, queryStringParameters, body, headers with X-User-Id
    Returns: HTTP response with admin data, search results, and user management
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': ''
        }
    
    dsn = os.environ.get('DATABASE_URL')
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()
    
    try:
        headers = event.get('headers', {})
        user_id = headers.get('x-user-id') or headers.get('X-User-Id')
        
        if method == 'GET' and user_id == '1001':
            # Admin panel: get all users and reports
            cur.execute("""
                SELECT id, user_id, email, is_creator, avatar_url, created_at
                FROM users
                ORDER BY created_at DESC
            """)
            users = cur.fetchall()
            
            cur.execute("""
                SELECT r.id, r.reporter_id, r.reported_user_id, r.reason, r.created_at, r.status,
                       u1.user_id as reporter_user_id, u1.email as reporter_email,
                       u2.user_id as reported_user_id_str, u2.email as reported_email
                FROM reports r
                JOIN users u1 ON r.reporter_id = u1.id
                JOIN users u2 ON r.reported_user_id = u2.id
                WHERE r.status = 'pending'
                ORDER BY r.created_at DESC
            """)
            reports = cur.fetchall()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({
                    'users': [{
                        'id': u[0],
                        'user_id': u[1],
                        'email': u[2],
                        'is_creator': u[3],
                        'avatar_url': u[4],
                        'created_at': u[5].isoformat() if u[5] else None
                    } for u in users],
                    'reports': [{
                        'id': r[0],
                        'reporter_id': r[1],
                        'reported_user_id': r[2],
                        'reason': r[3],
                        'created_at': r[4].isoformat() if r[4] else None,
                        'status': r[5],
                        'reporter_user_id': r[6],
                        'reporter_email': r[7],
                        'reported_user_id_str': r[8],
                        'reported_email': r[9]
                    } for r in reports]
                }),
                'isBase64Encoded': False
            }
        
        elif method == 'GET':
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
            action = body_data.get('action')
            
            # Admin actions
            if user_id == '1001' and action in ['toggle_creator', 'delete_report']:
                if action == 'toggle_creator':
                    target_user_id = body_data.get('user_id')
                    cur.execute("UPDATE users SET is_creator = NOT is_creator WHERE id = %s RETURNING is_creator", (target_user_id,))
                    new_status = cur.fetchone()[0]
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True, 'is_creator': new_status}),
                        'isBase64Encoded': False
                    }
                
                elif action == 'delete_report':
                    report_id = body_data.get('report_id')
                    cur.execute("UPDATE reports SET status = 'resolved' WHERE id = %s", (report_id,))
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'success': True}),
                        'isBase64Encoded': False
                    }
            
            # Regular scam report
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
        
        elif method == 'PUT':
            body_data = json.loads(event.get('body', '{}'))
            report_id = body_data.get('report_id')
            user_id = body_data.get('user_id')
            rating_type = body_data.get('rating_type')
            
            cur.execute(
                "SELECT id FROM user_ratings WHERE report_id = %s AND user_id = %s",
                (report_id, user_id)
            )
            existing_rating = cur.fetchone()
            
            if existing_rating:
                cur.execute(
                    "UPDATE user_ratings SET rating_type = %s WHERE id = %s",
                    (rating_type, existing_rating[0])
                )
            else:
                cur.execute(
                    "INSERT INTO user_ratings (report_id, user_id, rating_type) VALUES (%s, %s, %s)",
                    (report_id, user_id, rating_type)
                )
            
            cur.execute(
                "UPDATE scam_reports SET likes = (SELECT COUNT(*) FROM user_ratings WHERE report_id = %s AND rating_type = 'like'), dislikes = (SELECT COUNT(*) FROM user_ratings WHERE report_id = %s AND rating_type = 'dislike') WHERE id = %s",
                (report_id, report_id, report_id)
            )
            
            conn.commit()
            
            cur.execute("SELECT likes, dislikes FROM scam_reports WHERE id = %s", (report_id,))
            result = cur.fetchone()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'likes': result[0], 'dislikes': result[1]}),
                'isBase64Encoded': False
            }
    
    finally:
        cur.close()
        conn.close()