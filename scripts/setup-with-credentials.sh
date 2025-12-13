#!/bin/bash

# Настройка MySQL с предоставленными учетными данными

set -e

MYSQL_USER="yazonov"
MYSQL_PASSWORD=")Op[hN92)8O*"
DUMP_FILE="dump/dump-comicsdb-202512092242.sql"

echo "🚀 Настройка MySQL для ComicsDB"
echo ""

# Проверка файла дампа
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл дампа не найден: $DUMP_FILE"
    exit 1
fi

# Попытка подключения с разными вариантами
echo "📊 Проверка подключения к MySQL..."

# Вариант 1: пользователь yazonov
if mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    echo "✅ Подключение успешно (пользователь: $MYSQL_USER)"
    MYSQL_CMD="mysql -u $MYSQL_USER -p$MYSQL_PASSWORD"
    MYSQL_USER_FINAL="$MYSQL_USER"
elif mysql -u root -p"$MYSQL_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    echo "✅ Подключение успешно (пользователь: root)"
    MYSQL_CMD="mysql -u root -p$MYSQL_PASSWORD"
    MYSQL_USER_FINAL="root"
else
    echo "❌ Не удалось подключиться с предоставленными учетными данными"
    echo "Попробую создать пользователя или использовать root без пароля..."
    
    # Попытка подключиться как root без пароля
    if mysql -u root -e "SELECT 1;" &> /dev/null; then
        echo "✅ Подключение как root без пароля успешно"
        MYSQL_CMD="mysql -u root"
        MYSQL_USER_FINAL="root"
        
        # Создаем пользователя yazonov
        echo "Создание пользователя $MYSQL_USER..."
        mysql -u root <<EOF
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'localhost' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON *.* TO '$MYSQL_USER'@'localhost';
FLUSH PRIVILEGES;
EOF
        MYSQL_CMD="mysql -u $MYSQL_USER -p$MYSQL_PASSWORD"
        MYSQL_USER_FINAL="$MYSQL_USER"
    else
        echo "❌ Не удалось подключиться к MySQL"
        exit 1
    fi
fi

echo ""
echo "🗄️  Создание базы данных comicsdb..."

$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS comicsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF

echo "✅ База данных создана"

echo ""
echo "📥 Импорт дампа (это может занять несколько минут)..."
echo "Пожалуйста, подождите..."

$MYSQL_CMD comicsdb < "$DUMP_FILE"

echo "✅ Дамп импортирован"

echo ""
echo "⚙️  Настройка .env файла..."

# URL для подключения (экранируем специальные символы в пароле для URL)
MYSQL_PASSWORD_URL=$(echo "$MYSQL_PASSWORD" | sed 's/)/%29/g; s/(/%28/g; s/\[/%5B/g; s/\]/%5D/g; s/\*/%2A/g; s/!/%21/g')
DATABASE_URL="mysql://${MYSQL_USER_FINAL}:${MYSQL_PASSWORD_URL}@localhost:3306/comicsdb"

# Создание или обновление .env
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
echo "🔄 Синхронизация Prisma с базой данных..."

npx prisma db pull
npx prisma generate

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "📝 Следующие шаги:"
echo "   1. Проверьте подключение: npx prisma studio"
echo "   2. Запустите приложение: npm run dev"
echo ""

