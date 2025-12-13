#!/bin/bash

# Улучшенный скрипт для сброса пароля MySQL

set -e

echo "🔐 Сброс пароля MySQL root"
echo ""

# Остановка всех MySQL процессов
echo "1️⃣  Остановка всех MySQL процессов..."
brew services stop mysql 2>/dev/null || true
sudo launchctl unload /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist 2>/dev/null || true
pkill -9 mysqld_safe 2>/dev/null || true
pkill -9 mysqld 2>/dev/null || true
sleep 3

# Проверка что порт свободен
if lsof -i :3306 > /dev/null 2>&1; then
    echo "⚠️  Порт 3306 все еще занят. Попробуем остановить вручную:"
    echo "   sudo /usr/local/mysql/support-files/mysql.server stop"
    echo "   или"
    echo "   sudo killall mysqld"
    read -p "Остановить процессы MySQL вручную и нажать Enter для продолжения..."
fi

# Определяем путь к MySQL
MYSQL_BIN="/opt/homebrew/opt/mysql/bin"
if [ ! -f "$MYSQL_BIN/mysqld_safe" ]; then
    MYSQL_BIN="/usr/local/mysql/bin"
fi

if [ ! -f "$MYSQL_BIN/mysqld_safe" ]; then
    echo "❌ MySQL не найден. Убедитесь что MySQL установлен."
    exit 1
fi

echo "2️⃣  Запуск MySQL в безопасном режиме..."
echo "   Используется: $MYSQL_BIN/mysqld_safe"

# Определяем datadir
MYSQL_DATADIR="/opt/homebrew/var/mysql"
if [ ! -d "$MYSQL_DATADIR" ]; then
    MYSQL_DATADIR="/usr/local/mysql/data"
fi

echo "   Datadir: $MYSQL_DATADIR"

# Запуск в безопасном режиме
cd "$MYSQL_DATADIR"
nohup "$MYSQL_BIN/mysqld_safe" --skip-grant-tables --skip-networking > /tmp/mysql_safe.log 2>&1 &
MYSQL_PID=$!

echo "   PID: $MYSQL_PID"
echo "   Ожидание запуска (15 секунд)..."
sleep 15

# Проверка что процесс запущен
if ! ps -p $MYSQL_PID > /dev/null 2>&1; then
    echo "❌ MySQL не запустился. Логи:"
    cat /tmp/mysql_safe.log | tail -n 20
    exit 1
fi

echo "   ✅ MySQL запущен"

echo ""
echo "3️⃣  Сброс пароля root..."

# Несколько попыток подключения
for i in {1..5}; do
    if mysql -u root << 'MYSQL_SCRIPT' 2>/dev/null
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
SELECT 'Password reset successful' as status;
MYSQL_SCRIPT
    then
        echo "   ✅ Пароль root сброшен (теперь пустой)"
        break
    else
        if [ $i -lt 5 ]; then
            echo "   Попытка $i не удалась, жду 3 секунды..."
            sleep 3
        else
            echo "   ❌ Не удалось сбросить пароль после 5 попыток"
            kill $MYSQL_PID 2>/dev/null || true
            exit 1
        fi
    fi
done

echo ""
echo "4️⃣  Остановка безопасного режима..."
kill $MYSQL_PID 2>/dev/null || true
pkill -9 mysqld_safe 2>/dev/null || true
pkill -9 mysqld 2>/dev/null || true
sleep 3

echo ""
echo "5️⃣  Запуск обычного MySQL..."
brew services start mysql
sleep 5

echo ""
echo "6️⃣  Проверка подключения..."
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "   ✅ Подключение успешно! Пароль root теперь пустой."
else
    echo "   ⚠️  Проверка не удалась, но продолжаем..."
fi

echo ""
echo "✅ Сброс пароля завершен!"
echo ""
echo "Теперь создайте пользователя yazonov:"
echo "   mysql -u root"
echo "   CREATE USER 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';"
echo "   GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "Затем запустите: ./scripts/setup-final.sh"
echo ""

