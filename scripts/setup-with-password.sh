#!/bin/bash

# Интерактивная настройка MySQL с запросом пароля

set -e

echo "🚀 Настройка MySQL для ComicsDB"
echo ""

DUMP_FILE="dump/dump-comicsdb-202512092242.sql"

if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Файл дампа не найден: $DUMP_FILE"
    exit 1
fi

echo "Введите пароль MySQL root (или нажмите Enter если пароля нет):"
read -s MYSQL_PASSWORD
echo ""

if [ -z "$MYSQL_PASSWORD" ]; then
    MYSQL_CMD="mysql -u root"
    echo "Попытка подключения без пароля..."
else
    MYSQL_CMD="mysql -u root -p${MYSQL_PASSWORD}"
    echo "Попытка подключения с паролем..."
fi

# Проверка подключения
if ! $MYSQL_CMD -e "SELECT 1;" &> /dev/null; then
    echo "❌ Не удалось подключиться к MySQL"
    echo "Проверьте:"
    echo "  1. MySQL запущен: brew services list | grep mysql"
    echo "  2. Правильность пароля"
    echo "  3. Или сбросьте пароль (см. MYSQL_PASSWORD.md)"
    exit 1
fi

echo "✅ Подключение успешно"
echo ""

echo "🗄️  Создание базы данных comicsdb..."
$MYSQL_CMD <<EOF
CREATE DATABASE IF NOT EXISTS comicsdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EOF
echo "✅ База данных создана"

echo ""
echo "📥 Импорт дампа (это может занять несколько минут)..."
if [ -z "$MYSQL_PASSWORD" ]; then
    mysql -u root comicsdb < "$DUMP_FILE"
else
    mysql -u root -p"${MYSQL_PASSWORD}" comicsdb < "$DUMP_FILE"
fi
echo "✅ Дамп импортирован"

echo ""
echo "⚙️  Настройка .env файла..."
if [ -z "$MYSQL_PASSWORD" ]; then
    DATABASE_URL="mysql://root@localhost:3306/comicsdb"
else
    DATABASE_URL="mysql://root:${MYSQL_PASSWORD}@localhost:3306/comicsdb"
fi

if [ -f ".env" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    else
        sed -i "s|DATABASE_URL=.*|DATABASE_URL=\"${DATABASE_URL}\"|" .env
    fi
else
    cat > .env <<EOF
DATABASE_URL="${DATABASE_URL}"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
fi
echo "✅ .env файл обновлен"

echo ""
echo "🔄 Синхронизация Prisma..."
npx prisma db pull
npx prisma generate
echo "✅ Prisma синхронизирован"

echo ""
echo "✅ Настройка завершена!"
echo ""
echo "Запустите: npm run dev"

