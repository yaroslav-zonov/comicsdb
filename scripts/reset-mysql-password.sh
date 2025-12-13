#!/bin/bash

# Скрипт для сброса пароля MySQL root

set -e

echo "🔐 Сброс пароля MySQL root"
echo ""
echo "⚠️  ВНИМАНИЕ: Этот скрипт остановит MySQL и запустит его в безопасном режиме"
echo "   для сброса пароля. Это безопасно для локальной разработки."
echo ""
read -p "Продолжить? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Отменено."
    exit 1
fi

echo ""
echo "1️⃣  Остановка MySQL сервиса..."
brew services stop mysql 2>/dev/null || true

# Остановка всех процессов MySQL
echo "   Остановка всех процессов MySQL..."
pkill mysqld_safe 2>/dev/null || true
pkill mysqld 2>/dev/null || true
sleep 2

echo ""
echo "2️⃣  Запуск MySQL в безопасном режиме (без проверки паролей)..."
/opt/homebrew/opt/mysql/bin/mysqld_safe --skip-grant-tables --skip-networking > /tmp/mysql_safe.log 2>&1 &

# Ждем запуска
echo "   Ожидание запуска MySQL (10 секунд)..."
sleep 10

# Проверка что MySQL запустился
if ! pgrep -f "mysqld_safe" > /dev/null; then
    echo "❌ Не удалось запустить MySQL в безопасном режиме"
    echo "Проверьте логи: cat /tmp/mysql_safe.log"
    exit 1
fi

echo "   ✅ MySQL запущен в безопасном режиме"

echo ""
echo "3️⃣  Сброс пароля root..."

mysql -u root << 'MYSQL_SCRIPT'
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '';
FLUSH PRIVILEGES;
SELECT 'Password reset successful - root password is now empty' as status;
MYSQL_SCRIPT

if [ $? -eq 0 ]; then
    echo "   ✅ Пароль root сброшен (теперь пустой)"
else
    echo "   ⚠️  Возможна ошибка, но продолжаем..."
fi

echo ""
echo "4️⃣  Остановка безопасного режима..."
pkill mysqld_safe
pkill mysqld
sleep 3

echo ""
echo "5️⃣  Запуск обычного MySQL..."
brew services start mysql
sleep 5

echo ""
echo "6️⃣  Проверка подключения без пароля..."
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "   ✅ Подключение успешно! Пароль root теперь пустой."
else
    echo "   ⚠️  Не удалось подключиться. Возможно нужно подождать еще."
    sleep 5
    if mysql -u root -e "SELECT 1;" &> /dev/null; then
        echo "   ✅ Подключение успешно после ожидания!"
    else
        echo "   ❌ Все еще не работает. Попробуйте вручную:"
        echo "      mysql -u root"
        exit 1
    fi
fi

echo ""
echo "✅ Сброс пароля завершен!"
echo ""
echo "Теперь вы можете:"
echo "1. Создать пользователя yazonov:"
echo "   mysql -u root"
echo "   CREATE USER 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';"
echo "   GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "2. Запустить настройку базы данных:"
echo "   ./scripts/setup-final.sh"
echo ""

