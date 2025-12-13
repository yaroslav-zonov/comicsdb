#!/bin/bash

# Скрипт для создания пользователя yazonov через старый MySQL

echo "🔧 Создание пользователя yazonov в MySQL"
echo ""
echo "Обнаружен старый MySQL на /usr/local/mysql"
echo ""
echo "Попробуем несколько способов создания пользователя:"
echo ""

# Способ 1: Через старый MySQL root (может потребоваться пароль)
echo "1️⃣  Попытка через /usr/local/mysql/bin/mysql как root..."
if /usr/local/mysql/bin/mysql -u root -e "SELECT 1;" 2>/dev/null; then
    echo "   ✅ Подключение как root успешно (без пароля)"
    /usr/local/mysql/bin/mysql -u root << 'EOF'
CREATE USER IF NOT EXISTS 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';
GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';
FLUSH PRIVILEGES;
SELECT 'User yazonov created successfully' as status;
EOF
    if [ $? -eq 0 ]; then
        echo "   ✅ Пользователь yazonov создан!"
        exit 0
    fi
elif /usr/local/mysql/bin/mysql -u root -p')Op[hN92)8O*' -e "SELECT 1;" 2>/dev/null; then
    echo "   ✅ Подключение как root с паролем успешно"
    /usr/local/mysql/bin/mysql -u root -p')Op[hN92)8O*' << 'EOF'
CREATE USER IF NOT EXISTS 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';
GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';
FLUSH PRIVILEGES;
SELECT 'User yazonov created successfully' as status;
EOF
    if [ $? -eq 0 ]; then
        echo "   ✅ Пользователь yazonov создан!"
        exit 0
    fi
else
    echo "   ❌ Не удалось подключиться как root"
fi

echo ""
echo "2️⃣  Попытка через Homebrew MySQL..."
if mysql -u root -e "SELECT 1;" 2>/dev/null; then
    echo "   ✅ Подключение к Homebrew MySQL как root успешно"
    mysql -u root << 'EOF'
CREATE USER IF NOT EXISTS 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';
GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';
FLUSH PRIVILEGES;
SELECT 'User yazonov created successfully' as status;
EOF
    if [ $? -eq 0 ]; then
        echo "   ✅ Пользователь yazonov создан!"
        exit 0
    fi
else
    echo "   ❌ Не удалось подключиться к Homebrew MySQL"
fi

echo ""
echo "❌ Не удалось автоматически создать пользователя"
echo ""
echo "Выполните вручную:"
echo ""
echo "1. Подключитесь к MySQL:"
echo "   /usr/local/mysql/bin/mysql -u root -p"
echo "   или"
echo "   mysql -u root -p"
echo ""
echo "2. В MySQL консоли выполните:"
echo "   CREATE USER 'yazonov'@'localhost' IDENTIFIED BY ')Op[hN92)8O*';"
echo "   GRANT ALL PRIVILEGES ON *.* TO 'yazonov'@'localhost';"
echo "   FLUSH PRIVILEGES;"
echo "   EXIT;"
echo ""
echo "3. Затем запустите:"
echo "   ./scripts/setup-final.sh"
echo ""

