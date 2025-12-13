#!/bin/bash

# Скрипт установки и настройки MySQL для ComicsDB

set -e

echo "🚀 Настройка MySQL для ComicsDB"
echo ""

# Проверка наличия MySQL
if command -v mysql &> /dev/null; then
    echo "✅ MySQL уже установлен"
    mysql --version
else
    echo "📦 Установка MySQL..."
    
    # Проверка наличия Homebrew
    if command -v brew &> /dev/null; then
        echo "Установка через Homebrew..."
        brew install mysql
        brew services start mysql
    else
        echo "❌ Homebrew не найден. Пожалуйста, установите MySQL вручную:"
        echo "   - macOS: brew install mysql"
        echo "   - Ubuntu/Debian: sudo apt-get install mysql-server"
        echo "   - Или скачайте с https://dev.mysql.com/downloads/mysql/"
        exit 1
    fi
fi

echo ""
echo "📊 Проверка подключения к MySQL..."

# Попытка подключения
if mysql -u root -e "SELECT 1;" &> /dev/null; then
    echo "✅ Подключение к MySQL успешно"
    MYSQL_PASSWORD=""
else
    echo "⚠️  Требуется пароль для root пользователя MySQL"
    read -sp "Введите пароль MySQL root (или нажмите Enter если пароля нет): " MYSQL_PASSWORD
    echo ""
    
    if [ -z "$MYSQL_PASSWORD" ]; then
        MYSQL_CMD="mysql -u root"
    else
        MYSQL_CMD="mysql -u root -p${MYSQL_PASSWORD}"
    fi
fi

echo ""
echo "🗄️  Создание базы данных comicsdb..."

if [ -z "$MYSQL_PASSWORD" ]; then
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS comicsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
else
    mysql -u root -p"${MYSQL_PASSWORD}" <<EOF
CREATE DATABASE IF NOT EXISTS comicsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
fi

echo "✅ База данных создана"

echo ""
echo "📥 Импорт дампа..."

DUMP_FILE="dump/dump-comicsdb-202512092242.sql"

if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл дампа не найден: $DUMP_FILE"
    exit 1
fi

if [ -z "$MYSQL_PASSWORD" ]; then
    mysql -u root comicsdb < "$DUMP_FILE"
else
    mysql -u root -p"${MYSQL_PASSWORD}" comicsdb < "$DUMP_FILE"
fi

echo "✅ Дамп импортирован"

echo ""
echo "⚙️  Настройка .env файла..."

# Обновление .env файла
if [ -z "$MYSQL_PASSWORD" ]; then
    DATABASE_URL="mysql://root@localhost:3306/comicsdb"
else
    DATABASE_URL="mysql://root:${MYSQL_PASSWORD}@localhost:3306/comicsdb"
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

