#!/bin/bash

# Скрипт установки MySQL на macOS

set -e

echo "🍺 Установка MySQL через Homebrew"

# Проверка Homebrew
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew не установлен"
    echo "Установите Homebrew: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "📦 Установка MySQL..."
brew install mysql

echo "🚀 Запуск MySQL сервиса..."
brew services start mysql

echo "⏳ Ожидание запуска MySQL (10 секунд)..."
sleep 10

echo "🔐 Настройка безопасности MySQL..."
echo "Следуйте инструкциям для настройки root пароля (можно оставить пустым для разработки)"

mysql_secure_installation

echo ""
echo "✅ MySQL установлен и запущен!"
echo ""
echo "Проверка статуса:"
brew services list | grep mysql

echo ""
echo "Теперь запустите: ./scripts/setup-mysql.sh"

