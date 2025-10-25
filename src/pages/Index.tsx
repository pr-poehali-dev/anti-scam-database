import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  user_id: string;
  email: string;
  is_creator: boolean;
  avatar_url?: string;
}

interface Friend {
  id: number;
  user_id: string;
  email: string;
  is_creator: boolean;
  avatar_url?: string;
  status: string;
  friendship_id?: number;
}

interface Chat {
  chat_id: number;
  friend_id: number;
  friend_user_id: string;
  friend_email: string;
  friend_avatar?: string;
  last_message?: string;
  last_message_time?: string;
}

interface Message {
  id: number;
  sender_id: number;
  text: string;
  created_at: string;
  sender_email: string;
  sender_avatar?: string;
}

interface SearchResult {
  id: number;
  telegram_username: string;
  is_scammer: boolean;
  report_count: number;
  description: string;
  evidence_url?: string;
  likes: number;
  dislikes: number;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'profile' | 'friends'>('search');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendUserId, setFriendUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [reportUsername, setReportUsername] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportEvidence, setReportEvidence] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const savedUser = localStorage.getItem('scamkadr_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuth = async () => {
    try {
      const response = await fetch('https://functions.poehali.dev/f1d05e6d-925e-4fa1-83fa-e8b2c8ab171a', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: authMode, email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser(data);
        localStorage.setItem('scamkadr_user', JSON.stringify(data));
        toast({
          title: authMode === 'login' ? 'Вход выполнен' : 'Регистрация успешна',
          description: `Добро пожаловать, ${data.user_id}!`
        });
        setEmail('');
        setPassword('');
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: data.error || 'Что-то пошло не так'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу'
      });
    }
  };

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите username для поиска'
      });
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://functions.poehali.dev/0769ac85-d5d6-4db8-bb26-69a446ef51d9?username=${encodeURIComponent(searchUsername)}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось выполнить поиск'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('scamkadr_user');
    toast({
      title: 'Выход выполнен',
      description: 'До скорой встречи!'
    });
  };

  const loadFriends = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(
        `https://functions.poehali.dev/2f80e002-f06f-423f-a633-a2c26f5c4cf8?user_id=${currentUser.id}`
      );
      const data = await response.json();
      setFriends(data.friends || []);
    } catch (error) {
      console.error('Failed to load friends');
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser || !friendUserId.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Введите ID пользователя'
      });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/2f80e002-f06f-423f-a633-a2c26f5c4cf8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, friend_user_id: friendUserId })
      });

      const data = await response.json();
      if (response.ok) {
        toast({
          title: 'Успешно!',
          description: data.message || 'Заявка в друзья отправлена'
        });
        setFriendUserId('');
        loadFriends();
      } else {
        const data = await response.json();
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: data.error || 'Не удалось добавить друга'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось подключиться к серверу'
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) return;

      try {
        const response = await fetch('https://functions.poehali.dev/1de1e77d-129c-4a35-83e8-5e53edd71c52', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: currentUser.id, avatar_url: `data:image/jpeg;base64,${base64}` })
        });

        const data = await response.json();
        if (response.ok) {
          setCurrentUser(data);
          localStorage.setItem('scamkadr_user', JSON.stringify(data));
          toast({
            title: 'Успешно!',
            description: 'Аватар обновлен'
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: 'Не удалось обновить аватар'
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleReport = async () => {
    if (!currentUser || !reportUsername.trim() || !reportDescription.trim() || !reportEvidence.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Заполните все поля и прикрепите доказательства'
      });
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/0769ac85-d5d6-4db8-bb26-69a446ef51d9', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_username: reportUsername,
          is_scammer: true,
          description: reportDescription,
          evidence_url: reportEvidence,
          reported_by: currentUser.id
        })
      });

      if (response.ok) {
        toast({
          title: 'Успешно!',
          description: 'Отчет о мошеннике отправлен'
        });
        setReportUsername('');
        setReportDescription('');
        setReportEvidence('');
        setShowReportForm(false);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось отправить отчет'
      });
    }
  };

  const handleFriendAction = async (friendshipId: number, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('https://functions.poehali.dev/2f80e002-f06f-423f-a633-a2c26f5c4cf8', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendship_id: friendshipId, action })
      });

      if (response.ok) {
        toast({
          title: 'Успешно!',
          description: action === 'accept' ? 'Заявка принята' : 'Заявка отклонена'
        });
        loadFriends();
      }
    } catch (error) {
      console.error('Failed to handle friend request');
    }
  };

  const handleRating = async (reportId: number, ratingType: 'like' | 'dislike') => {
    if (!currentUser) return;

    try {
      const response = await fetch('https://functions.poehali.dev/0769ac85-d5d6-4db8-bb26-69a446ef51d9', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_id: reportId,
          user_id: currentUser.id,
          rating_type: ratingType
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSearchResults(prev => prev.map(r => 
          r.id === reportId ? { ...r, likes: data.likes, dislikes: data.dislikes } : r
        ));
        toast({
          title: 'Оценка учтена',
          description: ratingType === 'like' ? 'Вы поставили лайк' : 'Вы поставили дизлайк'
        });
      }
    } catch (error) {
      console.error('Failed to rate');
    }
  };

  const loadChats = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(
        `https://functions.poehali.dev/1643f5ec-0f6e-4d2a-8b6e-0e65754bc836?action=chats&user_id=${currentUser.id}`
      );
      const data = await response.json();
      setChats(data.chats || []);
    } catch (error) {
      console.error('Failed to load chats');
    }
  };

  const loadMessages = async (chatId: number) => {
    try {
      const response = await fetch(
        `https://functions.poehali.dev/1643f5ec-0f6e-4d2a-8b6e-0e65754bc836?action=messages&chat_id=${chatId}`
      );
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Failed to load messages');
    }
  };

  const handleStartChat = async (friendId: number) => {
    if (!currentUser) return;
    try {
      const response = await fetch('https://functions.poehali.dev/1643f5ec-0f6e-4d2a-8b6e-0e65754bc836', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_chat', user_id: currentUser.id, friend_id: friendId })
      });
      const data = await response.json();
      if (response.ok) {
        setActiveChat(data.chat_id);
        setActiveTab('friends');
        loadMessages(data.chat_id);
        loadChats();
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось создать чат'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentUser || !activeChat || !newMessage.trim()) return;
    try {
      const response = await fetch('https://functions.poehali.dev/1643f5ec-0f6e-4d2a-8b6e-0e65754bc836', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_message',
          chat_id: activeChat,
          sender_id: currentUser.id,
          message_text: newMessage
        })
      });
      if (response.ok) {
        setNewMessage('');
        loadMessages(activeChat);
        loadChats();
      }
    } catch (error) {
      console.error('Failed to send message');
    }
  };

  useEffect(() => {
    if (currentUser && activeTab === 'friends') {
      loadFriends();
      loadChats();
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    if (activeChat) {
      const interval = setInterval(() => loadMessages(activeChat), 3000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/95 to-secondary/90">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="Shield" size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">ScamKadr</h1>
              <p className="text-sm text-white/80">Проверка пользователей Telegram</p>
            </div>
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-4">
              <Card className="border-primary/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{currentUser.user_id}</p>
                      {currentUser.is_creator && (
                        <Badge variant="default" className="bg-primary">
                          <Icon name="Check" size={12} className="mr-1" />
                          Создатель
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <Icon name="LogOut" size={16} />
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </header>

        {!currentUser ? (
          <div className="max-w-md mx-auto mt-20">
            <Card className="border-primary/20 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-2xl">Вход в систему</CardTitle>
                <CardDescription>Войдите или зарегистрируйтесь для продолжения</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'register')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Вход</TabsTrigger>
                    <TabsTrigger value="register">Регистрация</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Пароль</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleAuth}>
                      Войти
                    </Button>
                  </TabsContent>
                  <TabsContent value="register" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Пароль</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <Button className="w-full" onClick={handleAuth}>
                      Зарегистрироваться
                    </Button>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'search' | 'profile' | 'friends')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="search" className="flex items-center gap-2">
                  <Icon name="Search" size={18} />
                  Поиск
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <Icon name="User" size={18} />
                  Мой профиль
                </TabsTrigger>
                <TabsTrigger value="friends" className="flex items-center gap-2">
                  <Icon name="Users" size={18} />
                  Друзья
                </TabsTrigger>
              </TabsList>

              <TabsContent value="search" className="space-y-8">
                <Card className="border-primary/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Icon name="Search" size={24} />
                      Поиск пользователя
                    </CardTitle>
                    <CardDescription>
                      Введите username пользователя Telegram для проверки
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        placeholder="@username"
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="text-lg"
                      />
                      <Button onClick={handleSearch} disabled={isSearching} size="lg">
                        {isSearching ? (
                          <Icon name="Loader2" size={20} className="animate-spin" />
                        ) : (
                          <>
                            <Icon name="Search" size={20} className="mr-2" />
                            Проверить
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={() => setShowReportForm(!showReportForm)}
                    className="flex items-center gap-2"
                  >
                    <Icon name="AlertTriangle" size={18} />
                    Сообщить о мошеннике
                  </Button>
                </div>

                {showReportForm && (
                  <Card className="border-destructive/20 shadow-xl">
                    <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Icon name="AlertTriangle" size={24} />
                        Отчет о мошеннике
                      </CardTitle>
                      <CardDescription>
                        Заполните все поля и обязательно прикрепите доказательства
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Telegram Username</label>
                        <Input
                          placeholder="@username"
                          value={reportUsername}
                          onChange={(e) => setReportUsername(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Описание обмана</label>
                        <Input
                          placeholder="Что произошло?"
                          value={reportDescription}
                          onChange={(e) => setReportDescription(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Доказательства (URL скриншота)</label>
                        <Input
                          placeholder="https://example.com/proof.jpg"
                          value={reportEvidence}
                          onChange={(e) => setReportEvidence(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleReport} className="w-full">
                        <Icon name="Send" size={18} className="mr-2" />
                        Отправить отчет
                      </Button>
                    </CardContent>
                  </Card>
                )}

            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Icon name="Database" size={28} />
                  Результаты поиска
                </h2>
                {searchResults.map((result) => (
                  <Card key={result.id} className="border-primary/20 shadow-lg">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-xl font-semibold">@{result.telegram_username}</h3>
                              {result.is_scammer ? (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <Icon name="AlertTriangle" size={14} />
                                  Мошенник
                                </Badge>
                              ) : (
                                <Badge variant="default" className="bg-green-500 flex items-center gap-1">
                                  <Icon name="CheckCircle" size={14} />
                                  Безопасен
                                </Badge>
                              )}
                            </div>
                            {result.description && (
                              <p className="text-muted-foreground">{result.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Icon name="Flag" size={16} />
                              <span>Количество отчетов: {result.report_count}</span>
                            </div>
                            {result.evidence_url && (
                              <div className="flex items-center gap-2 text-sm">
                                <Icon name="Link" size={16} className="text-primary" />
                                <a 
                                  href={result.evidence_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                                >
                                  Посмотреть доказательства
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pt-4 border-t">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRating(result.id, 'like')}
                            className="flex items-center gap-2"
                          >
                            <Icon name="ThumbsUp" size={16} />
                            {result.likes}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRating(result.id, 'dislike')}
                            className="flex items-center gap-2"
                          >
                            <Icon name="ThumbsDown" size={16} />
                            {result.dislikes}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

                {searchUsername && searchResults.length === 0 && !isSearching && (
                  <Card className="border-primary/20">
                    <CardContent className="p-8 text-center">
                      <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">
                        Пользователь не найден в базе данных
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Это хороший знак — нет негативных отчетов
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="profile" className="space-y-6">
                <Card className="border-primary/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Icon name="User" size={24} />
                      Мой профиль
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                        {currentUser.avatar_url ? (
                          <img src={currentUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <Icon name="User" size={48} className="text-primary" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-2xl font-bold">{currentUser.user_id}</h2>
                          {currentUser.is_creator && (
                            <Badge variant="default" className="bg-primary">
                              <Icon name="Check" size={14} className="mr-1" />
                              Создатель
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground">{currentUser.email}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Загрузить аватар с телефона</label>
                      <div className="flex gap-3">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarUpload}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="friends" className="space-y-6">
                <Card className="border-primary/20 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Icon name="UserPlus" size={24} />
                      Добавить друга
                    </CardTitle>
                    <CardDescription>
                      Введите ID пользователя (например, #1001)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-3">
                      <Input
                        placeholder="#1001"
                        value={friendUserId}
                        onChange={(e) => setFriendUserId(e.target.value)}
                      />
                      <Button onClick={handleAddFriend}>
                        <Icon name="UserPlus" size={18} className="mr-2" />
                        Добавить
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Icon name="Users" size={28} />
                    Мои друзья ({friends.length})
                  </h2>
                  {friends.length === 0 ? (
                    <Card className="border-primary/20">
                      <CardContent className="p-8 text-center">
                        <Icon name="Users" size={48} className="mx-auto mb-4 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">
                          У вас пока нет друзей
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Добавьте друга по его ID
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {friends.filter(f => f.status === 'pending').length > 0 && (
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold text-white">Заявки в друзья</h3>
                          {friends.filter(f => f.status === 'pending').map((friend) => (
                            <Card key={friend.id} className="border-yellow-500/50 shadow-lg">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                      {friend.avatar_url ? (
                                        <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                      ) : (
                                        <Icon name="User" size={24} className="text-primary" />
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-semibold">{friend.user_id}</p>
                                      <p className="text-xs text-muted-foreground">{friend.email}</p>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleFriendAction(friend.friendship_id!, 'accept')}>
                                      <Icon name="Check" size={16} />
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleFriendAction(friend.friendship_id!, 'reject')}>
                                      <Icon name="X" size={16} />
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {friends.filter(f => f.status === 'accepted').map((friend) => (
                        <Card key={friend.id} className="border-primary/20 shadow-lg">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                  {friend.avatar_url ? (
                                    <img src={friend.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                  ) : (
                                    <Icon name="User" size={32} className="text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold">{friend.user_id}</h3>
                                    {friend.is_creator && (
                                      <Badge variant="default" className="bg-primary text-xs">
                                        <Icon name="Check" size={10} className="mr-1" />
                                        Создатель
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{friend.email}</p>
                                </div>
                              </div>
                              <Button onClick={() => handleStartChat(friend.id)}>
                                <Icon name="MessageCircle" size={18} className="mr-2" />
                                Чат
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </div>

                {activeChat && (
                  <Card className="border-primary/20 shadow-xl mt-6">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Icon name="MessageCircle" size={24} />
                          Чат
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setActiveChat(null)}>
                          <Icon name="X" size={18} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-96 overflow-y-auto space-y-3 p-4 bg-secondary/20 rounded-lg">
                        {messages.length === 0 ? (
                          <p className="text-center text-muted-foreground">Нет сообщений</p>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex gap-3 ${msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {msg.sender_avatar ? (
                                  <img src={msg.sender_avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  <Icon name="User" size={16} className="text-primary" />
                                )}
                              </div>
                              <div className={`max-w-xs ${msg.sender_id === currentUser?.id ? 'bg-primary text-white' : 'bg-card'} p-3 rounded-lg`}>
                                <p className="text-sm">{msg.text}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Введите сообщение..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button onClick={handleSendMessage}>
                          <Icon name="Send" size={18} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;