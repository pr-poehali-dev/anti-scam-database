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
}

interface SearchResult {
  id: number;
  telegram_username: string;
  is_scammer: boolean;
  report_count: number;
  description: string;
}

const Index = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

            {searchResults.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Icon name="Database" size={28} />
                  Результаты поиска
                </h2>
                {searchResults.map((result) => (
                  <Card key={result.id} className="border-primary/20 shadow-lg">
                    <CardContent className="p-6">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;