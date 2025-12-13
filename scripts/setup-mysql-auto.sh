#!/bin/bash

# Автоматическая настройка MySQL для ComicsDB
# Пытается подключиться без пароля, если не получается - запрашивает пароль

set -e

echo "🚀 Настройка MySQL для ComicsDB"
echo ""

DUMP_FILE="dump/dump-comicsdb-202512092242.sql"

# Проверка файла дампа
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл дампа не найден: $DUMP_FILE"
    exit 1
fi

# Попытка подключения без пароля
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ Подключение к MySQL без пароля успешно"
    MYSQL_CMD="mysql -u root"
    MYSQL_CMD_PWD=""
else
    echo "⚠️  Требуется пароль для root пользователя MySQL"
    read -sp "Введите пароль MySQL root (или нажмите Enter для попытки без пароля): " MYSQL_PASSWORD
    echo ""
    
    if [ -z "$MYSQL_PASSWORD" ]; then
        MYSQL_CMD="mysql -u root"
        MYSQL_CMD_PWD=""
    else
        MYSQL_CMD="mysql -u root -p${MYSQL_PASSWORD}"
        MYSQL_CMD_PWD="${MYSQL_PASSWORD}"
    fi
    
    # Проверка подключения
    if ! $MYSQL_CMD -e "SELECT 1;" &> /dev/null; then
        echo "❌ Неверный пароль или не удалось подключиться"
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

if [ -z "$MYSQL_CMD_PWD" ]; then
    mysql -u root comicsdb < "$DUMP_FILE"
else
    mysql -u root -p"${MYSQL_CMD_PWD}" comicsdb < "$DUMP_FILE"
fi

echo "✅ Дамп импортирован"

echo ""
echo "⚙️  Настройка .env файла..."

# Обновление .env файла
if [ -z "$MYSQL_CMD_PWD" ]; then
    DATABASE_URL="mysql://root@localhost:3306/comicsdb"
else
    DATABASE_URL="mysql://root:${MYSQL_CMD_PWD}@localhost:3306/comicsdb"
fi

# Создание или обновление .env
if [ -f ".env" ]; then
    # Обновить существующий DATABASE_URL
    if grep -q "DATABASE_URL=" .env; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
        else
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
        fi
    else
        echo "DATABASE_URL=\"${DATABASE_URL}\"" >> .env
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

