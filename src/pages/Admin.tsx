import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Icon from '@/components/ui/icon';
import funcUrls from '../../backend/func2url.json';

interface User {
  id: number;
  user_id: string;
  email: string;
  is_creator: boolean;
  avatar_url: string | null;
  created_at: string;
}

interface Report {
  id: number;
  reporter_id: number;
  reported_user_id: number;
  reason: string;
  created_at: string;
  status: string;
  reporter_user_id: string;
  reporter_email: string;
  reported_user_id_str: string;
  reported_email: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUserId = localStorage.getItem('user_id');

  useEffect(() => {
    if (currentUserId !== '1001') {
      window.location.href = '/';
      return;
    }
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const response = await fetch(funcUrls.search, {
        method: 'GET',
        headers: {
          'X-User-Id': currentUserId || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCreator = async (userId: number) => {
    try {
      const response = await fetch(funcUrls.search, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId || ''
        },
        body: JSON.stringify({
          action: 'toggle_creator',
          user_id: userId
        })
      });

      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error toggling creator:', error);
    }
  };

  const handleDeleteReport = async (reportId: number) => {
    try {
      const response = await fetch(funcUrls.search, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUserId || ''
        },
        body: JSON.stringify({
          action: 'delete_report',
          report_id: reportId
        })
      });

      if (response.ok) {
        await loadAdminData();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  if (currentUserId !== '1001') {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" size={48} className="animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Icon name="Shield" size={32} className="text-primary" />
            Админ-панель
          </h1>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Icon name="Home" size={18} className="mr-2" />
            На главную
          </Button>
        </div>

        {/* Reports Section */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Icon name="AlertTriangle" size={24} />
              Жалобы ({reports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Нет активных жалоб</p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id} className="border-muted">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">Жалоба</Badge>
                            <span className="text-sm text-muted-foreground">
                              {new Date(report.created_at).toLocaleString('ru-RU')}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm">
                              <strong>От:</strong> {report.reporter_email} (ID: {report.reporter_user_id})
                            </p>
                            <p className="text-sm">
                              <strong>На:</strong> {report.reported_email} (ID: {report.reported_user_id_str})
                            </p>
                            <p className="text-sm mt-2">
                              <strong>Причина:</strong> {report.reason}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Icon name="Trash2" size={16} className="mr-2" />
                          Удалить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Users" size={24} />
              Пользователи ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="border-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            <Icon name="User" size={24} className="text-primary" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.email}</p>
                            {user.is_creator && (
                              <Badge className="bg-gradient-to-r from-blue-500 to-purple-500">
                                <Icon name="BadgeCheck" size={14} className="mr-1" />
                                Создатель
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {user.user_id} • Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={user.is_creator ? "destructive" : "default"}
                        onClick={() => handleToggleCreator(user.id)}
                      >
                        <Icon name={user.is_creator ? "X" : "BadgeCheck"} size={16} className="mr-2" />
                        {user.is_creator ? 'Убрать галочку' : 'Выдать галочку'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
