#!/bin/bash

# Финальная настройка с учетными данными через переменные окружения

set -e

export MYSQL_USER="yazonov"
export MYSQL_PASSWORD=")Op[hN92)8O*"
DUMP_FILE="dump/dump-comicsdb-202512092242.sql"

echo "🚀 Настройка MySQL для ComicsDB"
echo ""

if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл дампа не найден: $DUMP_FILE"
    exit 1
fi

# Используем mysql с переменной окружения MYSQL_PWD для безопасности
export MYSQL_PWD="$MYSQL_PASSWORD"

echo "📊 Проверка подключения..."

# Проверка подключения
if mysql -u "$MYSQL_USER" -e "SELECT 1;" &> /dev/null; then
    echo "✅ Подключение успешно"
else
    echo "⚠️  Пользователь $MYSQL_USER не найден, пытаюсь создать..."
    
    # Пробуем подключиться как root с паролем
    if mysql -u root -e "SELECT 1;" &> /dev/null 2>&1; then
        echo "Создание пользователя $MYSQL_USER..."
        mysql -u root <<EOF
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        echo "✅ Пользователь создан"
    else
        echo "❌ Не удалось подключиться к MySQL"
        echo "Возможно, учетные данные для удаленного сервера?"
        echo "Попробуйте указать хост: mysql -u $MYSQL_USER -h <host>"
        exit 1
    fi
fi

echo ""
echo "🗄️  Создание базы данных comicsdb..."

mysql -u "$MYSQL_USER" <<EOF
CREATE DATABASE IF NOT EXISTS comicsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "✅ База данных создана"

echo ""
echo "📥 Импорт дампа (это может занять несколько минут)..."
echo "Пожалуйста, подождите..."

mysql -u "$MYSQL_USER" comicsdb < "$DUMP_FILE"

echo "✅ Дамп импортирован"

echo ""
echo "⚙️  Настройка .env файла..."

# URL-кодирование пароля для DATABASE_URL
MYSQL_PASSWORD_URL=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$MYSQL_PASSWORD'))" 2>/dev/null || echo "$MYSQL_PASSWORD" | sed 's/)/%29/g; s/(/%28/g; s/\[/%5B/g; s/\]/%5D/g; s/\*/%2A/g; s/!/%21/g')
DATABASE_URL="mysql://${MYSQL_USER}:${MYSQL_PASSWORD_URL}@localhost:3306/comicsdb"

if [ -f ".env" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    fi
else
    cat > .env <<EOF
# Database - MySQL
DATABASE_URL="${DATABASE_URL}"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# VK OAuth (для аутентификации)
VK_CLIENT_ID=""
VK_CLIENT_SECRET=""

# Facebook OAuth (для аутентификации)
FACEBOOK_CLIENT_ID=""
FACEBOOK_CLIENT_SECRET=""

# Redis (опционально)
REDIS_URL="redis://localhost:6379"

# Elasticsearch (опционально)
ELASTICSEARCH_URL="http://localhost:9200"
EOF
fi

echo "✅ .env файл обновлен"

echo ""
echo "🔄 Синхронизация Prisma..."

npx prisma db pull
npx prisma generate

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Проверьте подключение: npx prisma studio"
echo "   2. Запустите приложение: npm run dev"
echo ""

# Очистка переменной окружения
unset MYSQL_PWD

